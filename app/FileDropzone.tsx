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
        <div className="w-full max-w-md mx-auto">
            <div
                className={cn(
                    'border-[1px] border-dashed border-black/50 rounded-lg p-8 text-center cursor-pointer hover:border-[#3CDC1E] bg-white/15 hover:bg-white/20 transition-colors',
                    {
                        'bg-white/20': dragOver,
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
                    accept="*/*"
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                    <ArrowUpTrayIcon className="mx-auto mb-4 h-8 w-8" />
                    <p className="mt-2 text-sm">
                        Drag and drop votre fichier, ou sélectionnez un file
                    </p>
                </label>
            </div>
        </div>
    )
}
