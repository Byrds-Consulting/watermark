import { pdfjs } from 'react-pdf'

// Bundle the worker instead of loading it from a third-party CDN: the files never leave the browser.
// The legacy build (see `turbopack.resolveAlias` in next.config.ts) polyfills the very recent JS APIs
// that the modern pdf.js build requires (Map#getOrInsertComputed, Promise.try, …).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
).toString()

// Runtime assets copied to public/pdfjs/ by scripts/copy-pdfjs-assets.mjs. Without them pdf.js
// cannot decode JPEG 2000 / JBIG2 / CCITT images (common in scans), CJK text or non-embedded fonts.
export const pdfjsOptions = {
    wasmUrl: '/pdfjs/wasm/',
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    iccUrl: '/pdfjs/iccs/',
}

export { pdfjs }
