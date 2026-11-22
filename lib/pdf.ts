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

/**
 * Builds a transparent PDF holding only the watermark, one page per size (the displayed size of the
 * document's pages, in points). It is rendered over each page by lib/render.ts, for the preview and
 * for the export alike.
 */
export async function createWatermarkOverlay(sizes: { width: number; height: number }[], text = '') {
    // Drop what the font cannot encode instead of throwing (the UI blocks the download meanwhile).
    const unsupported = new Set(await getUnsupportedWatermarkChars(text))
    text = Array.from(text.replace(/\r\n?/g, '\n'))
        .filter((char) => !unsupported.has(char))
        .join('')
    while (text.length < 10) {
        text = ` ${text} `
    }

    const pdfDoc = await PDFDocument.create()
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const textLines = text.split('\n')
    const textMaxLength = textLines.reduce((res, str) => Math.max(res, str.length), 0)
    // Width of the longest line at font size 1, measured with the actual glyphs.
    const textMaxWidth = textLines.reduce(
        (res, str) => Math.max(res, helveticaFont.widthOfTextAtSize(str, 1)),
        0,
    )

    for (const { width, height } of sizes) {
        const page = pdfDoc.addPage([width, height])
        const shortSide = Math.min(width, height)
        // Character-based size (the historical look), capped so that the longest line, drawn at 45°,
        // fits within the page in both directions (landscape pages, wide glyphs like "W").
        const size = Math.min(
            (1.1 * (2 * shortSide)) / textMaxLength,
            (0.95 * shortSide) / (Math.max(textMaxWidth, 0.01) * cos45),
        )
        const multiText = layoutMultilineText(text, {
            alignment: TextAlignment.Center,
            font: helveticaFont,
            fontSize: size,
            bounds: { x: 0, y: 0, width: 100000, height: 100000 },
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
            color: rgb(1, 0, 0),
            opacity: 0.25,
            wordBreaks: [' '],
            rotate: degrees(-45),
        }
        const optimalLines = 5
        const lines = Math.max(optimalLines, Math.ceil((optimalLines * height) / width))
        for (const n of Array(lines).keys()) {
            for (let i = 0; i < multiText.lines.length; i++) {
                // Centered line by line
                const xOffset = Math.abs(maxMultilineWidth - multiText.lines[i].width) / 2
                page.drawText(`${multiText.lines[i].text}`, {
                    ...textOptions,
                    x: textOptions.x + xOffset * cos45,
                    y:
                        textOptions.y -
                        (xOffset + 2 * i * textOptions.lineHeight) * sin45 -
                        ((n - lines / 2) * height) / (lines - 3),
                })
            }
        }
    }
    return await pdfDoc.save()
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
