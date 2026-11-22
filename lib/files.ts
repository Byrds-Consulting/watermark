import * as zip from '@zip.js/zip.js'
import { fileTypeFromBuffer } from 'file-type'
import { PDFDocument } from 'pdf-lib'

export type SourceFile = { name: string; bytes: Uint8Array }
export type ProcessResult = { files: SourceFile[]; rejected: string[] }

// Bounds for archives: nested ZIPs and huge batches would otherwise exhaust the tab's memory.
const MAX_ZIP_DEPTH = 3
const MAX_FILES = 200
const MAX_TOTAL_BYTES = 500 * 1024 * 1024

class LimitError extends Error {}

async function detectType(name: string, declaredType: string, bytes: Uint8Array) {
    const detected = (await fileTypeFromBuffer(bytes))?.mime
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

async function imageToPdf(bytes: Uint8Array, type: 'image/png' | 'image/jpeg') {
    const pdfDoc = await PDFDocument.create()
    const image = type === 'image/png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
    const { width, height } = image.size()
    const page = pdfDoc.addPage([width, height])
    page.drawImage(image, { x: 0, y: 0, width, height })
    return await pdfDoc.save()
}

async function processBuffer(
    name: string,
    declaredType: string,
    bytes: Uint8Array,
    depth: number,
    result: ProcessResult,
    budget: { bytes: number },
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
            for (const entry of await zipReader.getEntries()) {
                if (entry.directory) continue
                const entryName = sanitizeEntryName(entry.filename)
                if (/(^|\/)(__MACOSX\/|\._)/.test(entry.filename)) continue
                budget.bytes += entry.uncompressedSize
                if (budget.bytes > MAX_TOTAL_BYTES) throw new LimitError('Archive trop volumineuse')
                try {
                    const entryBytes = await entry.getData(new zip.Uint8ArrayWriter())
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
        result.files.push({ name, bytes })
    } else if (type === 'image/jpeg' || type === 'image/png') {
        result.files.push({ name: name.replace(/\.(jpe?g|png)$/i, '') + '.pdf', bytes: await imageToPdf(bytes, type) })
    } else {
        result.rejected.push(name)
    }
    if (result.files.length > MAX_FILES) throw new LimitError('Trop de fichiers')
}

/** Reads the selected files, expands ZIP archives and converts images to PDF. */
export async function processFiles(files: File[]): Promise<ProcessResult> {
    const result: ProcessResult = { files: [], rejected: [] }
    const budget = { bytes: 0 }
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

/** Makes names unique (case-insensitively): `a.pdf`, `a (2).pdf`, … */
export function uniqueNames(names: string[]) {
    const seen = new Set<string>()
    return names.map((name) => {
        let candidate = name
        for (let i = 2; seen.has(candidate.toLowerCase()); i++) {
            candidate = name.replace(/(\.[^./]*)?$/, (ext) => ` (${i})${ext}`)
        }
        seen.add(candidate.toLowerCase())
        return candidate
    })
}
