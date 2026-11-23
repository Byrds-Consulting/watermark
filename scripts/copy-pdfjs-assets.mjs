// Copies the pdf.js runtime assets (decoders, CMaps, standard fonts, ICC profiles) into
// public/pdfjs/ so they are served from our own origin, version-matched with the installed
// pdf.js. Run before `next dev` / `next build` (see package.json).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const pdfjsDir = path.dirname(require.resolve('pdfjs-dist/package.json'))
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'pdfjs')

fs.rmSync(target, { recursive: true, force: true })
for (const dir of ['wasm', 'cmaps', 'standard_fonts', 'iccs']) {
    fs.cpSync(path.join(pdfjsDir, dir), path.join(target, dir), { recursive: true })
}
console.log(`Copied pdf.js ${require('pdfjs-dist/package.json').version} assets to ${target}`)
