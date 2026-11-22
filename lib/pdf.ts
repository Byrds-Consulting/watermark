import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/** Longest watermark accepted, in lines (the UI explains it, the overlay truncates defensively). */
export const MAX_WATERMARK_LINES = 10

// Tiling steps on each side of the centred copy, in each direction.
const MAX_TILE_STEPS = 20

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
    return [
        ...new Set(
            Array.from(text).filter((char) => char !== '\n' && !charset.has(char.codePointAt(0)!)),
        ),
    ]
}

/**
 * Builds a transparent PDF holding only the watermark, one page per size (the displayed size of the
 * document's pages, in points). It is rendered over each page by lib/render.ts, for the preview and
 * for the export alike.
 */
export async function createWatermarkOverlay(
    sizes: { width: number; height: number }[],
    text = '',
) {
    // Drop what the font cannot encode instead of throwing (the UI blocks the download meanwhile),
    // and the blank lines/spaces around the text, which would only push it off the page.
    const unsupported = new Set(await getUnsupportedWatermarkChars(text))
    const lines = Array.from(text.replace(/\r\n?/g, '\n'))
        .filter((char) => !unsupported.has(char))
        .join('')
        .split('\n')
        .map((line) => line.trim())
    while (lines.length > 1 && !lines[0]) lines.shift()
    // Defensive bound, the UI refuses longer texts (see MAX_WATERMARK_LINES).
    lines.splice(MAX_WATERMARK_LINES)
    while (lines.length > 1 && !lines[lines.length - 1]) lines.pop()

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    // Short texts are drawn as if they had 10 characters, so they do not become huge.
    const maxChars = Math.max(10, ...lines.map((line) => line.length))
    // Width of a line at font size 1 as drawn: drawText emits plain glyph advances, without the
    // kerning that widthOfTextAtSize() applies to whole strings.
    const advance1 = (line: string) =>
        Array.from(line).reduce((sum, char) => sum + font.widthOfTextAtSize(char, 1), 0)
    const lineWidths1 = lines.map(advance1)
    const maxWidth1 = Math.max(0.01, ...lineWidths1)

    // Along the text (45° down-right) and perpendicular to it (the text's "up").
    const along = { x: cos45, y: -sin45 }
    const up = { x: sin45, y: cos45 }

    for (const { width, height } of sizes) {
        const page = pdfDoc.addPage([width, height])
        const shortSide = Math.min(width, height)
        // Historical character-based size, capped so that the whole block (longest line × all
        // lines), rotated by 45°, fits within the page: its projection on each axis is
        // (blockWidth + blockHeight) · cos45.
        const size = Math.min(
            (1.1 * (2 * shortSide)) / maxChars,
            (0.95 * shortSide) / ((maxWidth1 + lines.length) * cos45),
        )
        const blockHeight = lines.length * size
        // Copies are tiled (staggered rows) along both directions, starting from one centred on the
        // page, which is therefore always complete, until the whole page is covered.
        const rowSpacing = Math.max(blockHeight + 0.6 * size, 0.2 * Math.max(width, height) * cos45)
        const columnSpacing = maxWidth1 * size + 1.5 * size
        const halfDiagonal = Math.hypot(width, height) / 2
        // Bounded, so that degenerate page sizes (e.g. 1440 × 1 pt) cannot generate millions of
        // copies; normal pages need far fewer steps (A4: 6 rows, 2 columns on each side).
        const rows = Math.min(MAX_TILE_STEPS, Math.ceil(halfDiagonal / rowSpacing) + 1)
        const columns = Math.min(MAX_TILE_STEPS, Math.ceil(halfDiagonal / columnSpacing) + 1)
        // A copy whose bounding circle does not reach the page rectangle is not drawn.
        const blockRadius = Math.hypot(maxWidth1 * size, blockHeight) / 2
        for (let k = -rows; k <= rows; k++) {
            for (let j = -columns; j <= columns; j++) {
                const shift = (j + (Math.abs(k) % 2) / 2) * columnSpacing
                const centerX = width / 2 + k * rowSpacing * up.x + shift * along.x
                const centerY = height / 2 + k * rowSpacing * up.y + shift * along.y
                const outsideX = Math.max(Math.abs(centerX - width / 2) - width / 2, 0)
                const outsideY = Math.max(Math.abs(centerY - height / 2) - height / 2, 0)
                if (Math.hypot(outsideX, outsideY) > blockRadius) continue
                lines.forEach((line, i) => {
                    if (!line) return // blank lines only take room
                    const lineWidth = lineWidths1[i] * size
                    // Baseline of line i, from the top of the block (descent ignored, ~0.2 em).
                    const offsetUp = blockHeight / 2 - (i + 1) * size + 0.2 * size
                    page.drawText(line, {
                        x: centerX - (lineWidth / 2) * along.x + offsetUp * up.x,
                        y: centerY - (lineWidth / 2) * along.y + offsetUp * up.y,
                        size,
                        font,
                        color: rgb(1, 0, 0),
                        opacity: 0.25,
                        rotate: degrees(-45),
                    })
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
