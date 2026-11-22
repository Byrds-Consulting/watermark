'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import { pdfjsOptions } from '@/lib/pdfjs'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './PDFViewer.css'


export default function PDFViewer({
    file,
    fileId,
    pagesToDisplay,
}: {
    fileId: string | number
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
                className={`pdf_${fileId}`}
                // react-pdf >= 10 suspends by default; keep the loading/error props behaviour.
                suspense={false}
                options={pdfjsOptions}
                file={
                    file ??
                    // 'https://raw.githubusercontent.com/wojtekmaj/react-pdf/5bcddeb2255712c4f261104f0d62d51005039e25/sample/next-app/public/sample.pdf' ??
                    'sample.pdf'
                }
                onLoadSuccess={(e) => {
                    setNumPages(e.numPages)
                }}
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
