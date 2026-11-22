import * as zip from '@zip.js/zip.js'
import { fileTypeFromBuffer } from 'file-type'
import {
    concatTransformationMatrix,
    drawObject,
    PDFDocument,
    popGraphicsState,
    pushGraphicsState,
} from 'pdf-lib'

export type SourceFile = { name: string; bytes: Uint8Array }
export type ProcessResult = { files: SourceFile[]; rejected: string[] }

// Bounds for archives: nested ZIPs and huge batches would otherwise exhaust the tab's memory.
const MAX_ZIP_DEPTH = 3
const MAX_FILES = 200
const MAX_ZIP_ENTRIES = 2000
const MAX_TOTAL_BYTES = 500 * 1024 * 1024
// pdf-lib decodes PNGs into RGBA in memory.
const MAX_PNG_PIXELS = 50_000_000

const ZIP_MIME_TYPES = new Set([
    'application/zip',
    'application/x-zip-compressed',
    // file-type reports some plain ZIPs as these ZIP-based formats (e.g. a META-INF/ entry → JAR).
    'application/java-archive',
])

class LimitError extends Error {}

async function detectType(name: string, declaredType: string, bytes: Uint8Array) {
    const detected = (await fileTypeFromBuffer(bytes))?.mime
    const isZipContainer = bytes[0] === 0x50 && bytes[1] === 0x4b // "PK"
    if (isZipContainer && (/\.zip$/i.test(name) || ZIP_MIME_TYPES.has(declaredType) || ZIP_MIME_TYPES.has(detected ?? ''))) {
        return 'application/zip'
    }
    if (detected) return detected
    // file-type requires %PDF at offset 0, PDF readers tolerate leading bytes.
    if (declaredType === 'application/pdf' || /\.pdf$/i.test(name)) return 'application/pdf'
    return declaredType
}

/** Keeps the archive's folder structure but never an absolute path or a `..` segment. */
function sanitizeEntryName(name: string) {
    const segments = name
        .replace(/\\/g, '/')
        .split('/')
        .filter((segment) => segment && segment !== '.' && segment !== '..')
    return segments.join('/') || 'document'
}

function withPdfExtension(name: string) {
    return /\.pdf$/i.test(name) ? name : name.replace(/\.(jpe?g|png)$/i, '') + '.pdf'
}

/** EXIF orientation (1–8) of a JPEG, 1 when absent or unreadable. */
export function getJpegOrientation(bytes: Uint8Array): number {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1
    let offset = 2
    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset)
        if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return 1 // not a marker / start of scan
        const length = view.getUint16(offset + 2)
        const exif = offset + 4
        if (marker === 0xffe1 && exif + 14 <= view.byteLength && view.getUint32(exif) === 0x45786966) {
            const tiff = exif + 6 // after "Exif\0\0"
            const little = view.getUint16(tiff) === 0x4949
            const ifd = tiff + view.getUint32(tiff + 4, little)
            if (ifd + 2 > view.byteLength) return 1
            const count = view.getUint16(ifd, little)
            for (let i = 0; i < count; i++) {
                const entry = ifd + 2 + i * 12
                if (entry + 12 > view.byteLength) return 1
                if (view.getUint16(entry, little) === 0x0112) {
                    const orientation = view.getUint16(entry + 8, little)
                    return orientation >= 1 && orientation <= 8 ? orientation : 1
                }
            }
            return 1
        }
        offset += 2 + length
    }
    return 1
}

/**
 * Maps the image's unit square to the page for each EXIF orientation (stored size W×H), so the photo
 * is displayed upright without re-encoding it. See the EXIF spec for the meaning of each value.
 */
function orientationMatrix(orientation: number, W: number, H: number): [number, number, number, number, number, number] {
    switch (orientation) {
        case 2: return [-W, 0, 0, H, W, 0] // mirrored horizontally
        case 3: return [-W, 0, 0, -H, W, H] // rotated 180°
        case 4: return [W, 0, 0, -H, 0, H] // mirrored vertically
        case 5: return [0, -W, -H, 0, H, W] // transposed
        case 6: return [0, -W, H, 0, 0, W] // rotated 90° clockwise
        case 7: return [0, W, H, 0, 0, 0] // transversed
        case 8: return [0, W, -H, 0, H, 0] // rotated 90° counter-clockwise
        default: return [W, 0, 0, H, 0, 0]
    }
}

function pngPixels(bytes: Uint8Array) {
    if (bytes.byteLength < 24) return 0
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return view.getUint32(16) * view.getUint32(20) // IHDR width × height
}

async function imageToPdf(bytes: Uint8Array, type: 'image/png' | 'image/jpeg') {
    if (type === 'image/png' && pngPixels(bytes) > MAX_PNG_PIXELS) throw new Error('Image too large')
    const pdfDoc = await PDFDocument.create()
    const image = type === 'image/png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
    const { width: W, height: H } = image.size()
    const orientation = type === 'image/jpeg' ? getJpegOrientation(bytes) : 1
    const swapped = orientation >= 5
    const page = pdfDoc.addPage(swapped ? [H, W] : [W, H])
    const name = page.node.newXObject('Image', image.ref)
    page.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(...orientationMatrix(orientation, W, H)),
        drawObject(name),
        popGraphicsState(),
    )
    return await pdfDoc.save()
}

type Budget = { bytes: number; entries: number }

async function processBuffer(
    name: string,
    declaredType: string,
    bytes: Uint8Array,
    depth: number,
    result: ProcessResult,
    budget: Budget,
) {
    const type = await detectType(name, declaredType, bytes)
    if (type === 'application/zip') {
        if (depth >= MAX_ZIP_DEPTH) {
            result.rejected.push(name)
            return
        }
        // zip.js decodes names itself: UTF-8 flag, unflagged UTF-8 (macOS), CP437 otherwise, Unicode Path field.
        const zipReader = new zip.ZipReader(new zip.Uint8ArrayReader(bytes), {
            strictness: 'tolerant',
        })
        try {
            // The generator reads the central directory lazily, so the entry budget bounds memory too.
            for await (const entry of zipReader.getEntriesGenerator()) {
                if (++budget.entries > MAX_ZIP_ENTRIES) throw new LimitError('Archive trop volumineuse')
                if (entry.directory || /(^|\/)(__MACOSX\/|\._)/.test(entry.filename)) continue
                const entryName = sanitizeEntryName(entry.filename)
                budget.bytes += entry.uncompressedSize
                if (budget.bytes > MAX_TOTAL_BYTES) throw new LimitError('Archive trop volumineuse')
                try {
                    const entryBytes = await entry.getData!(new zip.Uint8ArrayWriter())
                    await processBuffer(entryName, '', entryBytes, depth + 1, result, budget)
                } catch (error) {
                    if (error instanceof LimitError) throw error
                    result.rejected.push(entryName)
                }
            }
        } finally {
            await zipReader.close()
        }
    } else if (type === 'application/pdf') {
        result.files.push({ name: withPdfExtension(name), bytes })
    } else if (type === 'image/jpeg' || type === 'image/png') {
        result.files.push({ name: withPdfExtension(name), bytes: await imageToPdf(bytes, type) })
    } else {
        result.rejected.push(name)
    }
    if (result.files.length > MAX_FILES) throw new LimitError('Trop de fichiers')
}

/** Reads the selected files, expands ZIP archives and converts images to PDF. */
export async function processFiles(files: File[]): Promise<ProcessResult> {
    const result: ProcessResult = { files: [], rejected: [] }
    const budget: Budget = { bytes: 0, entries: 0 }
    for (const file of files) {
        budget.bytes += file.size
        if (budget.bytes > MAX_TOTAL_BYTES) throw new LimitError('Fichiers trop volumineux')
        try {
            const bytes = new Uint8Array(await file.arrayBuffer())
            await processBuffer(file.name, file.type, bytes, 0, result, budget)
        } catch (error) {
            if (error instanceof LimitError) throw error
            result.rejected.push(file.name)
        }
    }
    return result
}

export function isLimitError(error: unknown): error is Error {
    return error instanceof LimitError
}

/**
 * Makes paths unique (case-insensitively), `a.pdf`, `a (2).pdf`, …, so that they can all be extracted
 * from one ZIP: a path can neither repeat another one nor be used both as a file and as a folder.
 */
export function uniqueNames(names: string[]) {
    const files = new Set<string>()
    const folders = new Set<string>()
    const parents = (path: string) => path.split('/').slice(0, -1).map((_, i, all) => all.slice(0, i + 1).join('/'))
    const isFree = (path: string) =>
        !files.has(path) && !folders.has(path) && parents(path).every((parent) => !files.has(parent))
    return names.map((original) => {
        // Renaming the file cannot help when one of its folders is already a file: flatten its path.
        const name = parents(original.toLowerCase()).some((parent) => files.has(parent))
            ? original.replace(/\//g, '_')
            : original
        let candidate = name
        for (let i = 2; !isFree(candidate.toLowerCase()); i++) {
            candidate = name.replace(/(\.[^./]*)?$/, (ext) => ` (${i})${ext}`)
        }
        const key = candidate.toLowerCase()
        files.add(key)
        parents(key).forEach((parent) => folders.add(parent))
        return candidate
    })
}
