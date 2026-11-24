import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/** Longest watermark accepted, in lines (the UI explains it, the overlay truncates defensively). */
export const MAX_WATERMARK_LINES = 10

// Safety bound on the tiling: rows on each side of the centred copy, half the copies per row.
const MAX_TILE_STEPS = 50

/** How the watermark is drawn. Every field is bounded by WATERMARK_LIMITS. */
export type WatermarkStyle = {
    /** `#rrggbb`. */
    color: string
    /** 0 (invisible) to 1 (opaque). */
    opacity: number
    /** Degrees, counterclockwise: 0 is horizontal, positive values rise to the right. */
    angle: number
    /** Text size, relative to the automatic size (1). */
    size: number
    /** Space between the copies, relative to the default spacing (1). */
    spacing: number
    /** Tile copies over the whole page, or draw a single centred one. */
    repeat: boolean
}

export const WATERMARK_LIMITS = {
    opacity: { min: 0.1, max: 0.9 },
    angle: { min: -90, max: 90 },
    size: { min: 0.5, max: 2 },
    spacing: { min: 0.5, max: 3 },
} as const

/** Light green, transparent and spaced out: reads as a mark without hiding the document. */
export const DEFAULT_WATERMARK_STYLE: WatermarkStyle = {
    color: '#146b0a',
    opacity: 0.4,
    angle: 30,
    size: 1,
    spacing: 1.8,
    repeat: true,
}

const clamp = (value: number, { min, max }: { min: number; max: number }, fallback: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

/** The style with every field within bounds (defensive: it comes from the UI). */
function normalizeStyle(style: Partial<WatermarkStyle>): WatermarkStyle {
    const d = DEFAULT_WATERMARK_STYLE
    return {
        color: typeof style.color === 'string' && /^#[0-9a-f]{6}$/i.test(style.color) ? style.color : d.color,
        opacity: clamp(style.opacity ?? d.opacity, WATERMARK_LIMITS.opacity, d.opacity),
        angle: clamp(style.angle ?? d.angle, WATERMARK_LIMITS.angle, d.angle),
        size: clamp(style.size ?? d.size, WATERMARK_LIMITS.size, d.size),
        spacing: clamp(style.spacing ?? d.spacing, WATERMARK_LIMITS.spacing, d.spacing),
        repeat: style.repeat ?? d.repeat,
    }
}

function hexToRgb(hex: string) {
    const n = parseInt(hex.slice(1), 16)
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/**
 * Parameters t for which `base + t·dir` lies within the rectangle (Liang–Barsky clipping),
 * or null when the line misses it.
 */
function clipLine(
    base: { x: number; y: number },
    dir: { x: number; y: number },
    rect: { minX: number; maxX: number; minY: number; maxY: number },
) {
    let tMin = -Infinity
    let tMax = Infinity
    for (const [p, d, min, max] of [
        [base.x, dir.x, rect.minX, rect.maxX],
        [base.y, dir.y, rect.minY, rect.maxY],
    ]) {
        if (Math.abs(d) < 1e-9) {
            if (p < min || p > max) return null
            continue
        }
        const t1 = (min - p) / d
        const t2 = (max - p) / d
        tMin = Math.max(tMin, Math.min(t1, t2))
        tMax = Math.min(tMax, Math.max(t1, t2))
    }
    return tMin <= tMax ? { tMin, tMax } : null
}

let charsetPromise: Promise<Set<number>> | undefined
/** Code points that the watermark font (Helvetica Bold, WinAnsi encoding) can draw. */
function getWatermarkCharset() {
    charsetPromise ??= (async () => {
        const font = await (await PDFDocument.create()).embedFont(StandardFonts.HelveticaBold)
        return new Set(font.getCharacterSet())
    })()
    return charsetPromise
}

/** Line breaks unified, tabs (often pasted) turned into spaces like the previous renderer did. */
function normalizeWatermarkText(text: string) {
    return text.replace(/\r\n?/g, '\n').replace(/\t/g, ' ')
}

/** Characters of `text` that cannot be drawn in the watermark (emoji, most non-Latin scripts, …). */
export async function getUnsupportedWatermarkChars(text: string) {
    const charset = await getWatermarkCharset()
    return [
        ...new Set(
            Array.from(normalizeWatermarkText(text)).filter(
                (char) => char !== '\n' && !charset.has(char.codePointAt(0)!),
            ),
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
    styleInput: Partial<WatermarkStyle> = DEFAULT_WATERMARK_STYLE,
) {
    const style = normalizeStyle(styleInput)
    // Drop what the font cannot encode instead of throwing (the UI blocks the download meanwhile),
    // and the blank lines/spaces around the text, which would only push it off the page.
    const unsupported = new Set(await getUnsupportedWatermarkChars(text))
    const lines = Array.from(normalizeWatermarkText(text))
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

    const radians = (style.angle * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    // Along the text and perpendicular to it (the text's "up"), in PDF coordinates (y up).
    const along = { x: cos, y: sin }
    const up = { x: -sin, y: cos }
    const color = hexToRgb(style.color)

    for (const { width, height } of sizes) {
        const page = pdfDoc.addPage([width, height])
        const shortSide = Math.min(width, height)
        // Character-based size, scaled by the style, and capped so that the whole block (longest
        // line × all lines), rotated, fits within the page: on each axis its extent is the
        // projection of the block's width and height.
        const size = Math.min(
            ((1.1 * (2 * shortSide)) / maxChars) * style.size,
            (0.95 * width) / (maxWidth1 * Math.abs(cos) + lines.length * Math.abs(sin)),
            (0.95 * height) / (maxWidth1 * Math.abs(sin) + lines.length * Math.abs(cos)),
        )
        const blockHeight = lines.length * size
        // Copies are tiled (staggered rows) along both directions, starting from one centred on the
        // page, which is therefore always complete, until the whole page is covered.
        // Density from the page's geometric mean size, so that long narrow pages are covered evenly.
        const rowSpacing =
            Math.max(blockHeight + 0.6 * size, 0.14 * Math.sqrt(width * height)) * style.spacing
        const columnSpacing = maxWidth1 * size + 1.5 * size * style.spacing
        const halfDiagonal = Math.hypot(width, height) / 2
        // Bounded for degenerate page sizes (e.g. 14400 × 0.01 pt); A4 needs ~7 rows on each side.
        const rows = style.repeat ? Math.min(MAX_TILE_STEPS, Math.ceil(halfDiagonal / rowSpacing) + 1) : 0
        // A copy whose bounding circle does not reach the page rectangle is not drawn.
        const blockRadius = Math.hypot(maxWidth1 * size, blockHeight) / 2
        const area = { minX: -blockRadius, maxX: width + blockRadius, minY: -blockRadius, maxY: height + blockRadius }
        for (let k = -rows; k <= rows; k++) {
            // Row k is the line through `base` along the text direction: keep the part of it that
            // crosses the page rectangle widened by blockRadius (parameter t along `along`).
            const base = { x: width / 2 + k * rowSpacing * up.x, y: height / 2 + k * rowSpacing * up.y }
            const span = clipLine(base, along, area)
            if (!span) continue
            const stagger = (Math.abs(k) % 2) / 2
            const firstColumn = style.repeat ? Math.ceil(span.tMin / columnSpacing - stagger) : 0
            const lastColumn = style.repeat
                ? Math.min(Math.floor(span.tMax / columnSpacing - stagger), firstColumn + 2 * MAX_TILE_STEPS)
                : 0
            for (let j = firstColumn; j <= lastColumn; j++) {
                const shift = (j + stagger) * columnSpacing
                const centerX = base.x + shift * along.x
                const centerY = base.y + shift * along.y
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
                        color,
                        opacity: style.opacity,
                        rotate: degrees(style.angle),
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
