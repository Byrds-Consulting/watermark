'use client'

import React, { useCallback, useState } from 'react'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export function FileDropzone({ onFile }: { onFile: (files: File[]) => void }) {
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
            const files = Array.from(event.dataTransfer.files)
            onFile(files)
        },
        [onFile],
    )

    const handleFileInput = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || [])
            onFile(files)
        },
        [onFile],
    )

    return (
        <div className="w-full mx-auto">
            <div
                className={cn(
                    'border-[1px] border-dashed border-black/50 rounded-lg p-8 pb-0 text-center cursor-pointer hover:border-[#3CDC1E] bg-white/15 hover:bg-[#d7fbcc]/15 transition-colors',
                    {
                        'bg-[#d7fbcc]/15': dragOver,
                        'border-[#3CDC1E]': dragOver,
                    },
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    onChange={handleFileInput}
                    // accept="*/*"
                    // accept="image/jpeg,image/gif,image/png,application/pdf,image/x-eps"
                    accept="application/pdf"
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                    <ArrowUpTrayIcon className="mx-auto mb-4 h-8 w-8" />
                    <p className="mt-2 text-sm">Sélectionnez un fichier</p>
                </label>

                <p className="text-xs text-center opacity-50 py-4">
                    Seuls les PDFs sont supportés actuellement, les .zip, .jpeg et .png seront
                    bientôt ajoutés
                </p>
            </div>
        </div>
    )
}
