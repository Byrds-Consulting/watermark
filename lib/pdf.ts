import {
    degrees,
    layoutMultilineText,
    PDFDocument,
    PDFPageDrawTextOptions,
    rgb,
    StandardFonts,
    TextAlignment,
} from 'pdf-lib'

const cos45 = 0.70710678119
const sin45 = 0.70710678119

async function loadPDF(existingPdfBytes: ArrayBuffer) {
    // try {
    return await PDFDocument.load(existingPdfBytes)
    // TODO: Handles errors gracefully (ex: alert if a pdf is password protected)
    // } catch (err) {
    //     console.error('Encrypted file')
    //     return await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true })
    // }
}

export async function test_modifyPdf(existingPdfBytes: ArrayBuffer, text = '') {
    while (text.length < 10) {
        text = ` ${text} `
    }
    //   const url = 'https://pdf-lib.js.org/assets/with_update_sections.pdf'
    //   const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())

    const pdfDoc = await loadPDF(new Uint8Array(existingPdfBytes).buffer)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pages = pdfDoc.getPages()
    for (const page of pages) {
        const { width, height } = page.getSize()
        const textMaxLength = text.split('\n').reduce((res, str) => Math.max(res, str.length), 0)

        const size = (1.1 * (2 * width)) / textMaxLength
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
            x: (width - (maxMultilineWidth + size) * cos45) / 2,
            y: height / 2,
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
            Math.ceil((optimalLines * page.getHeight()) / page.getWidth()),
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

export function test_downloadByteArray(
    reportName: string,
    data: BlobPart | Blob,
    mimeType = 'application/pdf',
) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    const fileName = reportName
    link.download = fileName
    link.click()
}
