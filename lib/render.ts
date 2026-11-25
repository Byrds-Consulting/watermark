// pdf.js rendering shared by the preview and the export, so that both show exactly the same
// thing. Browser-only: import it dynamically (or from an `ssr: false` component).
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

// Bundle the worker instead of loading it from a third-party CDN: the files never leave the browser.
// The legacy build (see `turbopack.resolveAlias` in next.config.ts) polyfills the very recent JS APIs
// that the modern pdf.js build requires (Map#getOrInsertComputed, Promise.try, …).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
).toString()

// Runtime assets copied to public/pdfjs/ by scripts/copy-pdfjs-assets.mjs. Without them pdf.js
// cannot decode JPEG 2000 / JBIG2 / CCITT images (common in scans), CJK text or non-embedded fonts.
const pdfjsOptions = {
    wasmUrl: '/pdfjs/wasm/',
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    iccUrl: '/pdfjs/iccs/',
    // Fail instead of silently dropping content pdf.js cannot parse.
    stopAtErrors: true,
}

export type PageSize = { width: number; height: number }

/**
 * The pdf.js worker could not be downloaded or started. pdf.js caches this failure for the rest of
 * the page's life, so only reloading the page can recover.
 */
export class PdfWorkerStartError extends Error {
    // Checked by name: the UI cannot import this browser-only module statically.
    override name = 'PdfWorkerStartError'
}

export function loadPdf(
    source: Uint8Array | string,
    {
        enableXfa = false,
        disableFontFace = false,
        worker,
        password,
    }: { enableXfa?: boolean; disableFontFace?: boolean; worker?: pdfjs.PDFWorker; password?: string } = {},
): PDFDocumentLoadingTask {
    const options = { ...pdfjsOptions, enableXfa, disableFontFace, worker, password }
    return pdfjs.getDocument(
        typeof source === 'string'
            ? { ...options, url: source }
            : // pdf.js transfers the buffer to its worker: give it a copy.
              { ...options, data: source.slice() },
    )
}

// Upper bound for validating one file once the worker runs (malformed files can keep it busy forever).
const VALIDATION_TIMEOUT_MS = 20_000
// Time given to pdf.js to clean up a validated document before its worker is terminated.
const CLEANUP_GRACE_MS = 2_000

function withTimeout<T>(promise: Promise<T>, ms: number) {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out')), ms)
        promise.then(resolve, reject).finally(() => clearTimeout(timer))
    })
}

function isPasswordError(error: unknown) {
    return error instanceof pdfjs.PasswordException || (error instanceof Error && error.name === 'PasswordException')
}

/** Displayed size of every page, in PDF points (crop box and /Rotate applied). */
export async function getPageSizes(doc: PDFDocumentProxy): Promise<PageSize[]> {
    const sizes: PageSize[] = []
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const { width, height } = (await doc.getPage(pageNumber)).getViewport({ scale: 1 })
        sizes.push({ width, height })
    }
    return sizes
}

/**
 * - `readable`: pdf.js opens the file, it has pages, and it is not a pure XFA form (whose filled
 *   content is not drawn on the canvas, only a "please wait" placeholder page). A PDF with only an
 *   owner password (printing/copying restrictions) opens without one, so it is readable.
 * - `password`: a password is needed to open it.
 * - `unreadable`: anything else (corrupt, pure XFA, no pages, too slow to parse).
 */
export type PdfStatus = 'readable' | 'password' | 'unreadable'

/**
 * Whether the file can be rendered, see `PdfStatus`. With `password`, `password` means that this
 * password is wrong.
 */
export async function checkPdf(bytes: Uint8Array, password?: string): Promise<PdfStatus> {
    // XFA parsing enabled here only, so that pdf.js reports documents that need XFA rendering
    // (/NeedsRendering, XFA data and no AcroForm fields): their static page is a placeholder.
    // Documents that merely carry XFA data next to usable static pages are accepted.
    // A dedicated worker, terminated afterwards: tearing down a document can hang after some XFA
    // loading failures, and must never block the upload of the other files.
    const worker = new pdfjs.PDFWorker()
    try {
        // Not counted in the per-file deadline (slow network on the first download). A worker that
        // cannot start is not the file's fault: the error propagates (upload failed, retry).
        await worker.promise
    } catch (error) {
        worker.destroy()
        throw new PdfWorkerStartError('pdf.js worker failed to start', { cause: error })
    }
    // No fonts registered in the page: validation does not render anything.
    const task = loadPdf(bytes, { enableXfa: true, disableFontFace: true, worker, password })
    try {
        const doc = await withTimeout(task.promise, VALIDATION_TIMEOUT_MS)
        return doc.numPages > 0 && !doc.isPureXfa ? 'readable' : 'unreadable'
    } catch (error) {
        // Without an `onPassword` callback, pdf.js rejects with a PasswordException (checked by name:
        // the worker's error is rebuilt on this side).
        return isPasswordError(error) ? 'password' : 'unreadable'
    } finally {
        // Let pdf.js clean up normally, but never wait forever for it.
        await withTimeout(task.destroy(), CLEANUP_GRACE_MS).catch(() => {})
        worker.destroy()
    }
}

/**
 * pdf.js replaces images it fails to decode with nothing, even with `stopAtErrors`: every image the
 * page paints must resolve to actual data.
 */
async function assertImagesDecoded(page: PDFPageProxy) {
    const { fnArray, argsArray } = await page.getOperatorList()
    const imageOps = new Set<number>([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintImageXObjectRepeat])
    const objIds = new Set<string>()
    fnArray.forEach((fn, idx) => {
        const objId = argsArray[idx]?.[0]
        if (imageOps.has(fn) && typeof objId === 'string') objIds.add(objId)
    })
    await Promise.all(
        [...objIds].map(
            (objId) =>
                new Promise<void>((resolve, reject) => {
                    const pool = objId.startsWith('g_') ? page.commonObjs : page.objs
                    // Waits until the worker has sent the image (decoded, or null when it failed).
                    pool.get(
                        objId,
                        (data: unknown) =>
                            data == null
                                ? reject(new Error(`Image ${objId} of page ${page.pageNumber} could not be decoded`))
                                : resolve(),
                        reject,
                    )
                }),
        ),
    )
}

/**
 * Renders `page`, then `overlay` (the watermark, same displayed size) on top of it, into one canvas
 * at `scale`. Drawing the watermark into the pixels makes it impossible to remove from the export.
 */
export async function renderPage(
    page: PDFPageProxy,
    overlay: PDFPageProxy | null,
    scale: number,
    { strict = false } = {},
): Promise<HTMLCanvasElement> {
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    // Stretch the rendering to the integer canvas size, so no edge is cut or left blank.
    const transform = [canvas.width / viewport.width, 0, 0, canvas.height / viewport.height, 0, 0]
    await page.render({ canvas, viewport, transform }).promise
    if (strict) await assertImagesDecoded(page)
    if (overlay) {
        const layer = document.createElement('canvas')
        layer.width = canvas.width
        layer.height = canvas.height
        // pdf.js asks for an opaque context by default, which turns the transparent background black:
        // create a transparent one first (getContext returns the existing context afterwards).
        layer.getContext('2d', { alpha: true })
        const overlayViewport = overlay.getViewport({ scale: canvas.width / overlay.getViewport({ scale: 1 }).width })
        await overlay.render({ canvas: layer, viewport: overlayViewport, background: 'transparent' }).promise
        canvas.getContext('2d')!.drawImage(layer, 0, 0, canvas.width, canvas.height)
        layer.width = layer.height = 0
    }
    return canvas
}
