import { PDFDocument } from 'pdf-lib'
import { pdfjs, pdfjsOptions } from '@/lib/pdfjs'

// 144 DPI, independent of the preview size and of the device pixel ratio.
const EXPORT_SCALE = 2
// Stay below the canvas size limits of browsers (iOS: 16.7 Mpx in area, 16384 px per side elsewhere).
const MAX_CANVAS_PIXELS = 16_000_000
const MAX_CANVAS_SIDE = 16_000
const JPEG_QUALITY = 0.6

function canvasToJpeg(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
            'image/jpeg',
            JPEG_QUALITY,
        ),
    )
}

/**
 * Rasterizes every page of a PDF, annotations and form fields included, into an image-only PDF. Each
 * page keeps its displayed size (in PDF points, rotation applied). The watermark is drawn on the
 * result afterwards, so nothing in the source document can cover it and it cannot be removed.
 */
export async function flattenPdf(bytes: Uint8Array): Promise<Uint8Array> {
    // pdf.js transfers the buffer to its worker: give it a copy.
    const loadingTask = pdfjs.getDocument({
        ...pdfjsOptions,
        data: bytes.slice(),
        // Fail instead of silently dropping content that cannot be decoded (e.g. a broken scan image).
        stopAtErrors: true,
    })
    try {
        const source = await loadingTask.promise
        if (source.numPages === 0) throw new Error('PDF without pages')
        const output = await PDFDocument.create()
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
            const page = await source.getPage(pageNumber)
            const pageSize = page.getViewport({ scale: 1 })
            const scale = Math.min(
                EXPORT_SCALE,
                Math.sqrt(MAX_CANVAS_PIXELS / (pageSize.width * pageSize.height)),
                MAX_CANVAS_SIDE / pageSize.width,
                MAX_CANVAS_SIDE / pageSize.height,
            )
            const viewport = page.getViewport({ scale })
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(viewport.width))
            canvas.height = Math.max(1, Math.round(viewport.height))
            try {
                // Stretch the rendering to the integer canvas size, so no edge is cut or left blank.
                const transform = [canvas.width / viewport.width, 0, 0, canvas.height / viewport.height, 0, 0]
                await page.render({ canvas, viewport, transform }).promise
                const jpeg = await canvasToJpeg(canvas)
                const image = await output.embedJpg(await jpeg.arrayBuffer())
                output
                    .addPage([pageSize.width, pageSize.height])
                    .drawImage(image, { x: 0, y: 0, width: pageSize.width, height: pageSize.height })
            } finally {
                page.cleanup()
                canvas.width = canvas.height = 0
            }
        }
        return await output.save()
    } finally {
        await loadingTask.destroy()
    }
}
