import { PDFDocument } from 'pdf-lib'
import { createWatermarkOverlay, type WatermarkStyle } from '@/lib/pdf'
import { getPageSizes, loadPdf, renderPage } from '@/lib/render'

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
 * Renders every page of a PDF (annotations and form fields included, as displayed) with the
 * watermark drawn into the same pixels, and packs the images into a new PDF. Nothing in the source
 * can cover the watermark, and it cannot be removed from the result. Each page keeps its displayed
 * size in PDF points.
 */
export async function flattenPdf(
    bytes: Uint8Array,
    watermarkText: string,
    watermarkStyle: WatermarkStyle,
): Promise<Uint8Array> {
    const sourceTask = loadPdf(bytes)
    let overlayTask: ReturnType<typeof loadPdf> | undefined
    try {
        const source = await sourceTask.promise
        if (source.numPages === 0) throw new Error('PDF without pages')
        const sizes = await getPageSizes(source)
        overlayTask = loadPdf(await createWatermarkOverlay(sizes, watermarkText, watermarkStyle))
        const overlay = await overlayTask.promise
        const output = await PDFDocument.create()
        output.setProducer('Dossier PDF (https://dossierpdf.fr)')
        output.setCreator('Dossier PDF (https://dossierpdf.fr)')
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber++) {
            const page = await source.getPage(pageNumber)
            const { width, height } = sizes[pageNumber - 1]
            const scale = Math.min(
                EXPORT_SCALE,
                Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
                MAX_CANVAS_SIDE / width,
                MAX_CANVAS_SIDE / height,
            )
            const canvas = await renderPage(page, await overlay.getPage(pageNumber), scale, { strict: true })
            try {
                const image = await output.embedJpg(await (await canvasToJpeg(canvas)).arrayBuffer())
                output.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height })
            } finally {
                page.cleanup()
                canvas.width = canvas.height = 0
            }
        }
        return await output.save()
    } finally {
        await Promise.all([sourceTask.destroy(), overlayTask?.destroy()])
    }
}
