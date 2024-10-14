import path from 'node:path'
import fs from 'node:fs'

const pdfjsDistPath = path.dirname(require.resolve('pdfjs-dist/package.json'))
const pdfWorkerPath = path.join(pdfjsDistPath, 'build', 'pdf.worker.min.mjs')
console.log('PDFjs-dist path:', pdfWorkerPath)

fs.cpSync(pdfWorkerPath, './public/pdf.worker.min.mjs', { recursive: true })
