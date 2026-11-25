'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { createWatermarkOverlay, type WatermarkStyle } from '@/lib/pdf'
import { getPageSizes, loadPdf, renderPage, type PageSize } from '@/lib/render'

const SAMPLE_URL = '/sample.pdf'

/**
 * Preview of a PDF with its watermark, rendered by the same code as the export (lib/render.ts).
 * Without `file`, shows the sample document, with the watermark too: visitors can try the settings
 * before importing anything.
 */
export default function PDFViewer({
    file,
    password,
    watermarkText,
    watermarkStyle,
}: {
    file?: Uint8Array
    password?: string
    watermarkText?: string
    watermarkStyle: WatermarkStyle
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(0)
    const [doc, setDoc] = useState<{ pdf: PDFDocumentProxy; sizes: PageSize[] } | null>(null)
    // The source that failed to render, so that the error disappears with the next file.
    const [failedSource, setFailedSource] = useState<Uint8Array | string | null>(null)
    const source = file ?? SAMPLE_URL
    const error = failedSource === source
    // The loaded document whose first page is on screen (one object per load, so that reloading the
    // same source, e.g. the sample, shows the loading state again).
    const [renderedDoc, setRenderedDoc] = useState<object | null>(null)

    useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return
        setWidth(container.offsetWidth)
        // Follow window resizes and phone rotations.
        const observer = new ResizeObserver(() => setWidth(container.offsetWidth))
        observer.observe(container)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        let cancelled = false
        // Never show the pages of the previous file while the new one loads.
        containerRef.current?.replaceChildren()
        const task = loadPdf(source, { password })
        task.promise
            .then(async (pdf) => {
                const sizes = await getPageSizes(pdf)
                if (!cancelled) setDoc({ pdf, sizes })
            })
            .catch(() => {
                if (cancelled) return
                containerRef.current?.replaceChildren()
                setFailedSource(source)
            })
        return () => {
            cancelled = true
            setDoc(null)
            task.destroy()
        }
    }, [source, password])

    useEffect(() => {
        const container = containerRef.current
        if (!doc || !container || width === 0) return
        let cancelled = false
        let overlayTask: ReturnType<typeof loadPdf> | undefined
        ;(async () => {
            let overlay = null
            if (watermarkText !== undefined) {
                const overlayBytes = await createWatermarkOverlay(doc.sizes, watermarkText, watermarkStyle)
                if (cancelled) return
                // Assigned before awaiting, so that the cleanup destroys it (and its worker port).
                overlayTask = loadPdf(overlayBytes)
                overlay = await overlayTask.promise
            }
            if (cancelled) return
            const scale = (width * (window.devicePixelRatio || 1)) / Math.max(...doc.sizes.map((s) => s.width))
            for (let pageNumber = 1; pageNumber <= doc.pdf.numPages; pageNumber++) {
                const canvas = await renderPage(
                    await doc.pdf.getPage(pageNumber),
                    overlay ? await overlay.getPage(pageNumber) : null,
                    scale,
                )
                if (cancelled) return
                canvas.className = 'my-4 w-full h-auto rounded-(--radius) shadow-md'
                canvas.setAttribute('aria-hidden', 'true')
                // Replace page by page: the previous rendering stays visible until the new one is ready.
                const previous = container.children[pageNumber - 1]
                if (previous) container.replaceChild(canvas, previous)
                else container.appendChild(canvas)
                if (pageNumber === 1) setRenderedDoc(doc)
            }
            while (container.children.length > doc.pdf.numPages) container.lastChild!.remove()
        })().catch(() => {
            if (cancelled) return
            container.replaceChildren()
            setFailedSource(source)
        })
        return () => {
            cancelled = true
            overlayTask?.destroy()
        }
    }, [doc, source, watermarkText, watermarkStyle, width])

    const loading = !error && (doc === null || renderedDoc !== doc)

    return (
        <div className="PDFViewer w-full select-none pointer-events-none">
            {error ? <p className="text-sm text-center opacity-60">Aperçu indisponible pour ce fichier.</p> : null}
            {loading ? <p className="text-sm text-center opacity-60">Chargement de l’aperçu…</p> : null}
            <div ref={containerRef} />
        </div>
    )
}
