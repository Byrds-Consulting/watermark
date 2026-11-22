import {
    degrees,
    layoutMultilineText,
    PDFDocument,
    type PDFPageDrawTextOptions,
    rgb,
    StandardFonts,
    TextAlignment,
} from 'pdf-lib'

const cos45 = 0.70710678119
const sin45 = 0.70710678119

let charsetPromise: Promise<Set<number>> | undefined
/** Code points that the watermark font (Helvetica Bold, WinAnsi encoding) can draw. */
function getWatermarkCharset() {
    charsetPromise ??= (async () => {
        const font = await (await PDFDocument.create()).embedFont(StandardFonts.HelveticaBold)
        return new Set(font.getCharacterSet())
    })()
    return charsetPromise
}

/** Characters of `text` that cannot be drawn in the watermark (emoji, most non-Latin scripts, …). */
export async function getUnsupportedWatermarkChars(text: string) {
    const charset = await getWatermarkCharset()
    return [...new Set(Array.from(text).filter((char) => char !== '\n' && !charset.has(char.codePointAt(0)!)))]
}

async function loadPDF(existingPdfBytes: Uint8Array) {
    // try {
    return await PDFDocument.load(existingPdfBytes)
    // TODO: Handles errors gracefully (ex: alert if a pdf is password protected)
    // } catch (err) {
    //     console.error('Encrypted file')
    //     return await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true })
    // }
}

export async function watermarkPdf(existingPdfBytes: Uint8Array, text = '') {
    // Drop what the font cannot encode instead of throwing on the whole document.
    const unsupported = new Set(await getUnsupportedWatermarkChars(text))
    text = Array.from(text.replace(/\r\n?/g, '\n'))
        .filter((char) => !unsupported.has(char))
        .join('')
    while (text.length < 10) {
        text = ` ${text} `
    }
    //   const url = 'https://pdf-lib.js.org/assets/with_update_sections.pdf'
    //   const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())

    const pdfDoc = await loadPDF(existingPdfBytes)
    // pdf-lib would otherwise add a blank, unwatermarked page on save.
    if (pdfDoc.getPageCount() === 0) throw new Error('PDF without pages')
    // Form fields are annotations, drawn over the page content (and the watermark) by viewers:
    // merge them into the page content first. Best effort, the export flattens everything anyway.
    try {
        pdfDoc.getForm().flatten()
    } catch {
        // Unusual form structures: keep the fields as they are.
    }
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pages = pdfDoc.getPages()
    for (const page of pages) {
        // Place the watermark in the visible area: the crop box clipped to the media box, whose
        // origin is not always (0, 0).
        const media = page.getMediaBox()
        const crop = page.getCropBox()
        const originX = Math.max(media.x, crop.x)
        const originY = Math.max(media.y, crop.y)
        const width = Math.max(1, Math.min(media.x + media.width, crop.x + crop.width) - originX)
        const height = Math.max(1, Math.min(media.y + media.height, crop.y + crop.height) - originY)
        const textMaxLength = text.split('\n').reduce((res, str) => Math.max(res, str.length), 0)

        // Sized on the shorter side, so that lines fit along the diagonal of landscape pages too.
        const size = (1.1 * (2 * Math.min(width, height))) / textMaxLength
        const multiText = layoutMultilineText(text, {
            alignment: TextAlignment.Center,
            font: helveticaFont,
            fontSize: size,
            bounds: { x: 0, y: 0, width: 10000, height: 10000 },
        })
        const maxMultilineWidth = multiText.lines.reduce((res, str) => Math.max(res, str.width), 0)

        const textOptions: PDFPageDrawTextOptions & {
            x: number
            y: number
            size: number
            lineHeight: number
        } = {
            x: originX + (width - (maxMultilineWidth + size) * cos45) / 2,
            y: originY + height / 2,
            size,
            font: helveticaFont,
            lineHeight: size,
            // color: rgb(0.95, 0.1, 0.1),
            color: rgb(1, 0, 0),
            opacity: 0.25,
            wordBreaks: [' '],
            rotate: degrees(-45),
        }
        const optimalLines = 5
        const lines = Math.max(
            optimalLines,
            Math.ceil((optimalLines * height) / width),
        )
        for (const n of Array(lines).keys()) {
            for (let i = 0; i < multiText.lines.length; i++) {
                const xOffset = Math.abs(maxMultilineWidth - multiText.lines[i].width) / 2
                page.drawText(`${multiText.lines[i].text}`, {
                    ...textOptions,

                    // Centered as a block
                    // x: textOptions.x + (xOffset - i * textOptions.lineHeight) * cos45,
                    // y:
                    //     textOptions.y -
                    //     (xOffset + i * textOptions.lineHeight) * sin45 -
                    //     ((n - lines / 2) * height) / (lines - 3),

                    // Centered line by line
                    x: textOptions.x + xOffset * cos45,
                    y:
                        textOptions.y -
                        (xOffset + 2 * i * textOptions.lineHeight) * sin45 -
                        ((n - lines / 2) * height) / (lines - 3),
                })
            }
        }
    }

    pdfDoc.setTitle(pdfDoc.getTitle() || 'Dossier PDF avec watermark')
    pdfDoc.setAuthor(pdfDoc.getAuthor() || 'Byrds Consulting')
    pdfDoc.setSubject(pdfDoc.getSubject() || 'Dossier')
    pdfDoc.setKeywords([...(pdfDoc.getKeywords() ?? []), 'dossier', 'pdf', 'watermark'])
    pdfDoc.setProducer('Dossier PDF (https://dossierpdf.fr)')
    pdfDoc.setCreator(pdfDoc.getCreator() || 'Dossier PDF (https://dossierpdf.fr)')
    try {
        pdfDoc.setCreationDate(pdfDoc.getCreationDate() || new Date())
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        pdfDoc.setCreationDate(new Date())
    }
    pdfDoc.setModificationDate(new Date())

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
}

export function downloadBlob(fileName: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    // Give the browser time to start the download before releasing the blob.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
