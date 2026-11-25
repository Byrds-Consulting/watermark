'use client'

import React, { useEffect, useRef, useState } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { loadPdf, renderPage } from '@/lib/render'
import { cn } from '@/lib/utils'

/** A file of the dossier in the preview. `locked`: password-protected, its pages cannot be read yet. */
export type PreviewItem = { name: string; bytes?: Uint8Array; password?: string; locked: boolean }

type Thumbnail = { url: string; pages: number }

// Width of the rendered first page, in CSS pixels (the device pixel ratio is applied on top).
const THUMBNAIL_WIDTH = 48
// One rendering per file (keyed by its bytes, released with them), one file at a time: the
// thumbnails never slow down the main preview much.
const cache = new WeakMap<Uint8Array, Promise<Thumbnail>>()
let queue: Promise<unknown> = Promise.resolve()

function getThumbnail(bytes: Uint8Array, password?: string): Promise<Thumbnail> {
    let thumbnail = cache.get(bytes)
    if (!thumbnail) {
        thumbnail = queue.then(async () => {
            const task = loadPdf(bytes, { password })
            try {
                const pdf = await task.promise
                const page = await pdf.getPage(1)
                const scale =
                    (THUMBNAIL_WIDTH * 2 * (window.devicePixelRatio || 1)) /
                    page.getViewport({ scale: 1 }).width
                const canvas = await renderPage(page, null, scale)
                const url = canvas.toDataURL('image/jpeg', 0.8)
                canvas.width = canvas.height = 0
                return { url, pages: pdf.numPages }
            } finally {
                await task.destroy()
            }
        })
        // A failure is not cached: the file may render on a later attempt.
        thumbnail.catch(() => cache.delete(bytes))
        queue = thumbnail.catch(() => {})
        cache.set(bytes, thumbnail)
    }
    return thumbnail
}

function useThumbnail(item: PreviewItem) {
    const [result, setResult] = useState<{ bytes: Uint8Array; thumbnail: Thumbnail } | null>(null)
    const { bytes, password } = item
    useEffect(() => {
        if (!bytes) return
        let cancelled = false
        getThumbnail(bytes, password)
            .then((thumbnail) => {
                if (!cancelled) setResult({ bytes, thumbnail })
            })
            .catch(() => {}) // the main preview reports the failure
        return () => {
            cancelled = true
        }
    }, [bytes, password])
    return result && result.bytes === bytes ? result.thumbnail : null
}

/**
 * The files of the dossier as numbered thumbnails above the preview, to choose the one shown. The
 * password-protected ones stand out: hatched, with a padlock.
 */
export default function FileThumbnails({
    items,
    selected,
    onSelect,
}: {
    items: PreviewItem[]
    selected: string
    onSelect: (name: string) => void
}) {
    const listRef = useRef<HTMLDivElement>(null)
    const selectedIndex = Math.max(
        0,
        items.findIndex((item) => item.name === selected),
    )
    const current = items[selectedIndex]

    // Keep the selected thumbnail visible, e.g. after the arrow keys.
    useEffect(() => {
        const button = listRef.current?.children[selectedIndex] as HTMLElement | undefined
        button?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [selectedIndex])

    const onKeyDown = (event: React.KeyboardEvent) => {
        const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
        if (!step) return
        event.preventDefault()
        const next = items[(selectedIndex + step + items.length) % items.length]
        onSelect(next.name)
        const index = items.indexOf(next)
        ;(listRef.current?.children[index] as HTMLElement | undefined)?.focus()
    }

    return (
        <div className="border-b">
            <div
                ref={listRef}
                role="group"
                aria-label="Fichiers du dossier"
                onKeyDown={onKeyDown}
                className="flex gap-2 overflow-x-auto px-4 pt-3 pb-4 sm:px-6"
            >
                {items.map((item, idx) => (
                    <ThumbnailButton
                        key={item.name}
                        item={item}
                        number={idx + 1}
                        isSelected={idx === selectedIndex}
                        onClick={() => onSelect(item.name)}
                    />
                ))}
            </div>
            <CurrentFile item={current} />
        </div>
    )
}

function ThumbnailButton({
    item,
    number,
    isSelected,
    onClick,
}: {
    item: PreviewItem
    number: number
    isSelected: boolean
    onClick: () => void
}) {
    const thumbnail = useThumbnail(item)
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={isSelected ? 'true' : undefined}
            aria-label={item.locked ? `${item.name} (protégé par mot de passe)` : item.name}
            title={item.name}
            className={cn(
                'relative w-13 shrink-0 cursor-pointer rounded-lg border-2 border-transparent p-1 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                isSelected ? 'border-brand bg-card' : 'hover:bg-card/60',
            )}
        >
            <span
                className={cn(
                    'relative block aspect-[210/297] overflow-hidden rounded-sm shadow-sm',
                    item.locked ? 'bg-warning-surface' : 'bg-white',
                )}
                style={
                    item.locked
                        ? {
                              backgroundImage:
                                  'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--warning) 16%, transparent) 0 4px, transparent 4px 8px)',
                          }
                        : undefined
                }
            >
                {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a local data URL
                    <img src={thumbnail.url} alt="" className="size-full object-contain" />
                ) : null}
                {item.locked ? (
                    <span className="absolute inset-0 grid place-items-center">
                        <span className="grid size-6 place-items-center rounded-full bg-card text-warning shadow">
                            <LockClosedIcon aria-hidden className="size-3.5" strokeWidth={2} />
                        </span>
                    </span>
                ) : null}
            </span>
            <span
                aria-hidden
                className={cn(
                    'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full border px-1.5 text-[10px] leading-4 tabular-nums',
                    isSelected
                        ? 'border-brand bg-brand text-card'
                        : item.locked
                          ? 'border-warning/40 bg-warning-surface text-warning'
                          : 'bg-card text-muted-foreground',
                )}
            >
                {number}
            </span>
        </button>
    )
}

function CurrentFile({ item }: { item: PreviewItem }) {
    const thumbnail = useThumbnail(item)
    return (
        <p
            className="flex items-baseline justify-between gap-3 px-5 pb-2 text-xs sm:px-8"
            aria-live="polite"
        >
            <span className="truncate font-semibold">{item.name}</span>
            {item.locked ? (
                <span className="inline-flex shrink-0 items-center gap-1 font-medium text-warning">
                    <LockClosedIcon aria-hidden className="size-3.5" />
                    Protégé
                </span>
            ) : thumbnail ? (
                <span className="shrink-0 text-muted-foreground">
                    {thumbnail.pages} {thumbnail.pages > 1 ? 'pages' : 'page'}
                </span>
            ) : null}
        </p>
    )
}
