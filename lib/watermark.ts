// Watermark settings and helpers without pdf-lib, so the page can import them without loading it
// (lib/pdf.ts draws the watermark and is loaded on demand).

/** Longest watermark accepted, in lines (the UI explains it, the overlay truncates defensively). */
export const MAX_WATERMARK_LINES = 10

/** How the watermark is drawn. Every field is bounded by WATERMARK_LIMITS. */
export type WatermarkStyle = {
    /** `#rrggbb`, or MULTI_COLOR to alternate the MULTI_COLOR_PALETTE tones from one copy to the next. */
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
    /** Wave amplitude: 0 draws straight text, 1 the strongest undulation. */
    wave: number
}

export const WATERMARK_LIMITS = {
    opacity: { min: 0.1, max: 0.9 },
    angle: { min: -90, max: 90 },
    size: { min: 0.5, max: 2 },
    spacing: { min: 0.5, max: 3 },
    wave: { min: 0, max: 1 },
} as const

/** `color` value that alternates several tones instead of a single color. */
export const MULTI_COLOR = 'multi'

/** Greyish tones of the multicolor watermark: distinct from each other, discreet over the text. */
export const MULTI_COLOR_PALETTE = ['#8c6a6a', '#62788f', '#6e8572', '#7f7491', '#8a7f62']

/** Greyish multicolor, gently waving, transparent and spaced out: reads as a mark without hiding the document. */
export const DEFAULT_WATERMARK_STYLE: WatermarkStyle = {
    color: MULTI_COLOR,
    opacity: 0.25,
    angle: 30,
    size: 0.8,
    spacing: 1.5,
    repeat: true,
    wave: 0.3,
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
