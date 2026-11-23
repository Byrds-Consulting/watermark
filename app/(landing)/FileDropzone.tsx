'use client'

import React, { useCallback, useState } from 'react'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export function FileDropzone({ onFile, className }: { onFile: (files: File[]) => void; className?: string }) {
    const [dragOver, setDragOver] = useState(false)

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setDragOver(true)
    }, [])

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        setDragOver(false)
    }, [])

    const handleDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            setDragOver(false)
            const files = Array.from(event.dataTransfer.files)
            onFile(files)
        },
        [onFile],
    )

    const handleFileInput = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || [])
            // Allow selecting the same file again (e.g. after editing it).
            event.target.value = ''
            onFile(files)
        },
        [onFile],
    )

    return (
        <div
            className={cn(
                'relative flex rounded-2xl border-[1.5px] border-dashed border-control-border bg-inset text-center transition-colors hover:border-brand',
                { 'border-brand bg-highlight/40 dark:bg-muted': dragOver },
                className,
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                id="fileInput"
                multiple
                className="sr-only peer"
                onChange={handleFileInput}
                accept="image/jpeg,image/png,application/pdf,application/zip"
            />
            <label
                htmlFor="fileInput"
                className="flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl p-6 peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
            >
                <ArrowUpTrayIcon aria-hidden className="size-8 text-brand" />
                <span className="text-base font-semibold">Déposez vos pièces justificatives</span>
                <span className="text-sm text-muted-foreground">
                    PDF, ZIP, JPEG ou PNG — plusieurs fichiers acceptés
                </span>
            </label>
        </div>
    )
}
