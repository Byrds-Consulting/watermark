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

export async function test_modifyPdf(existingPdfBytes: ArrayBuffer, text: string) {
    //   const url = 'https://pdf-lib.js.org/assets/with_update_sections.pdf'
    //   const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer())

    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pages = pdfDoc.getPages()
    // const firstPage = pages[0]
    for (const page of pages) {
        const { width, height } = page.getSize()
        const textMaxLength = text.split('\n').reduce((res, str) => Math.max(res, str.length), 0)
        // const centeredText = text
        //     .split('\n')
        //     .map((str) => {
        //         console.log(
        //             str,
        //             str.length,
        //             textMaxWidth,
        //             Math.round(Math.abs(str.length - textMaxWidth) / 2),
        //         )
        //         const whiteSpaces = Array(Math.round(Math.abs(str.length - textMaxWidth) / 2))
        //         return `${whiteSpaces.join(' ')}${str}${whiteSpaces.join(' ')}`
        //     })
        //     .join('\n')

        const size = (1.3 * (2 * width)) / textMaxLength
        const multiText = layoutMultilineText(text, {
            alignment: TextAlignment.Center,
            font: helveticaFont,
            fontSize: size,
            bounds: { x: 0, y: 0, width: 10000, height: 10000 },
        })
        const multilineWidth = multiText.lines.reduce((res, str) => Math.max(res, str.width), 0)

        const textOptions: PDFPageDrawTextOptions & {
            x: number
            y: number
            size: number
            lineHeight: number
        } = {
            x: (width - (multilineWidth + size) * cos45) / 2,
            y: height / 2,
            size,
            font: helveticaFont,
            lineHeight: size,
            color: rgb(0.95, 0.1, 0.1),
            opacity: 0.5,
            wordBreaks: [' '],
            rotate: degrees(-45),
        }
        const lines = 5
        for (const n of Array(lines).keys()) {
            for (let i = 0; i < multiText.lines.length; i++) {
                const xOffset = (multilineWidth - multiText.lines[i].width) / 2
                page.drawText(`${multiText.lines[i].text}`, {
                    ...textOptions,
                    x: textOptions.x + (xOffset - i * textOptions.lineHeight) * cos45,
                    y:
                        textOptions.y -
                        (xOffset + i * textOptions.lineHeight) * sin45 -
                        ((n - lines / 2) * height) / (lines - 3),
                })
            }
        }
    }

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
}

export function test_downloadByteArray(
    reportName: string,
    byte: Uint8Array,
    mimeType = 'application/pdf',
) {
    const blob = new Blob([byte], { type: mimeType })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    const fileName = reportName
    link.download = fileName
    link.click()
}
