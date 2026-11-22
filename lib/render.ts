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

export function loadPdf(source: Uint8Array | string): PDFDocumentLoadingTask {
    return pdfjs.getDocument(
        typeof source === 'string'
            ? { ...pdfjsOptions, url: source }
            : // pdf.js transfers the buffer to its worker: give it a copy.
              { ...pdfjsOptions, data: source.slice() },
    )
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
 * Whether the file can be rendered: pdf.js opens it (not protected by a user password, not corrupt),
 * it has pages, and it is not a pure XFA form (whose filled content is not drawn on the canvas, only
 * a "please wait" placeholder page).
 */
export async function isReadablePdf(bytes: Uint8Array) {
    const task = loadPdf(bytes)
    try {
        const doc = await task.promise
        // `isPureXfa` is only computed with XFA rendering enabled: read the form flags instead.
        const { info } = (await doc.getMetadata()) as { info: { IsXFAPresent?: boolean; IsAcroFormPresent?: boolean } }
        const isPureXfa = !!info.IsXFAPresent && !info.IsAcroFormPresent
        return doc.numPages > 0 && !isPureXfa
    } catch {
        return false
    } finally {
        await task.destroy()
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
