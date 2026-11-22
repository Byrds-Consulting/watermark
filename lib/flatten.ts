import { PDFDocument } from 'pdf-lib'
import { pdfjs, pdfjsOptions } from '@/lib/pdfjs'

// 144 DPI, independent of the preview size and of the device pixel ratio.
const EXPORT_SCALE = 2
// Stay below the canvas size limits of mobile browsers (iOS: 16.7 Mpx).
const MAX_CANVAS_PIXELS = 16_000_000
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
 * Rasterizes every page of a (watermarked) PDF into an image-only PDF, so the watermark cannot be
 * removed by editing the file. Each page keeps its displayed size in PDF points.
 */
export async function flattenPdf(bytes: Uint8Array): Promise<Uint8Array> {
    // pdf.js transfers the buffer to its worker: give it a copy.
    const loadingTask = pdfjs.getDocument({ ...pdfjsOptions, data: bytes.slice() })
    try {
        const source = await loadingTask.promise
        const output = await PDFDocument.create()
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
            const page = await source.getPage(pageNumber)
            const pageSize = page.getViewport({ scale: 1 })
            const scale = Math.min(
                EXPORT_SCALE,
                Math.sqrt(MAX_CANVAS_PIXELS / (pageSize.width * pageSize.height)),
            )
            const viewport = page.getViewport({ scale })
            const canvas = document.createElement('canvas')
            canvas.width = Math.floor(viewport.width)
            canvas.height = Math.floor(viewport.height)
            try {
                await page.render({ canvas, viewport }).promise
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
