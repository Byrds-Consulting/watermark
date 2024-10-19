'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './PDFViewer.css'

// pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', import.meta.url).toString()
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export default function PDFViewer({
    file,
    pagesToDisplay,
}: {
    file?: ArrayBuffer | string
    pagesToDisplay?: number
}) {
    const componentRef = useRef<HTMLDivElement>(null)
    const [numPages, setNumPages] = useState<number>(0)
    const [parentWidth, setParentWidth] = useState<number>(0)

    useLayoutEffect(() => {
        const currentRef = componentRef.current
        if (currentRef) {
            setParentWidth(currentRef.offsetWidth)
        }
    }, [componentRef])

    // if (!file) return 'Waiting'
    return (
        <div className="PDFViewer w-full" ref={componentRef}>
            <Document
                file={
                    file ??
                    // 'https://raw.githubusercontent.com/wojtekmaj/react-pdf/5bcddeb2255712c4f261104f0d62d51005039e25/sample/next-app/public/sample.pdf' ??
                    'sample.pdf'
                }
                // onLoadStart={(e) => console.log('Start', e)}
                onLoadSuccess={(e) => {
                    // console.log('Success', e)
                    // console.log('Success', e._pdfInfo.numPages)
                    setNumPages(e._pdfInfo.numPages)
                }}
                // onLoadError={(e) => console.log('Load error', e)}
                // onSourceError={(e) => console.log('Source error', e)}
            >
                {Array.from(
                    new Array(
                        pagesToDisplay ? Math.min(pagesToDisplay, numPages) : Math.max(1, numPages),
                    ),
                    (_el, index) => (
                        <Page
                            key={`page_${index + 1}`}
                            pageNumber={index + 1}
                            width={parentWidth}
                        />
                    ),
                )}
            </Document>
        </div>
    )
}
