'use client'

import '@ungap/with-resolvers'

import * as zip from '@zip.js/zip.js'
import { captureException } from '@sentry/nextjs'

import { useForm } from 'react-hook-form'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlausible } from 'next-plausible'

import { FileDropzone } from '@/app/(landing)/FileDropzone'
import { PreviewBoundary } from '@/app/(landing)/PreviewBoundary'
import { downloadBlob, getUnsupportedWatermarkChars, MAX_WATERMARK_LINES } from '@/lib/pdf'
import { isLimitError, processFiles, uniqueNames, type SourceFile } from '@/lib/files'
import dynamic from 'next/dynamic'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@uidotdev/usehooks'

const intl = new Intl.DateTimeFormat('fr-FR')

const PDFViewer = dynamic(() => import('./PDFViewer'), {
    ssr: false,
})

/** The uploaded dossier. `id` changes on every upload, so stale async results can be detected. */
type Dossier = { id: number; archiveName: string | null; files: SourceFile[] }
/** Something that belongs to one dossier only, and must disappear when another one is uploaded. */
type ForDossier<T> = { dossierId: number; value: T }

function formatList(names: string[]) {
    return names.map((name) => `« ${name} »`).join(', ')
}

export const App = () => {
    const [dossier, setDossier] = useState<Dossier | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)
    // pdf.js could not start (e.g. network glitch): only a page reload recovers.
    const [needsReload, setNeedsReload] = useState(false)
    const [downloadError, setDownloadError] = useState<ForDossier<string> | null>(null)
    // Files whose export failed, excluded from the next download attempts of the same dossier.
    const [excluded, setExcluded] = useState<ForDossier<string[]> | null>(null)
    const [unsupportedChars, setUnsupportedChars] = useState<string[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const uploadId = useRef(0)
    const { register, handleSubmit, watch } = useForm<{ watermark: string }>()
    const watermarkTextValue = watch('watermark') ?? ''
    const watermarkText = useDebounce<string>(watermarkTextValue, 200)
    const plausible = usePlausible()

    const excludedNames = useMemo(
        () => (dossier && excluded?.dossierId === dossier.id ? excluded.value : []),
        [dossier, excluded],
    )
    const exportableFiles = useMemo(
        () => (dossier ? dossier.files.filter((file) => !excludedNames.includes(file.name)) : []),
        [dossier, excludedNames],
    )
    const watermarkLineCount = watermarkText.trim().split(/\r\n?|\n/).length
    const hasWatermark =
        watermarkText.trim().length > 0 &&
        unsupportedChars.length === 0 &&
        watermarkLineCount <= MAX_WATERMARK_LINES
    const isReady =
        exportableFiles.length > 0 &&
        hasWatermark &&
        watermarkText === watermarkTextValue &&
        !isUploading &&
        !isDownloading

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return
            plausible('File upload')
            const id = ++uploadId.current
            setIsUploading(true)
            setUploadError(null)
            try {
                const { files, rejected, archives } = await processFiles(acceptedFiles)
                // Keep only the PDFs that pdf.js (the preview and export renderer) can open.
                const { isReadablePdf } = await import('@/lib/render')
                setNeedsReload(false)
                const readable: SourceFile[] = []
                const unreadable: string[] = []
                for (const file of files) {
                    if (await isReadablePdf(file.bytes)) readable.push(file)
                    else unreadable.push(file.name)
                }
                if (id !== uploadId.current) return // a newer upload superseded this one
                const names = uniqueNames(readable.map((file) => file.name))
                // A single selected archive is downloaded back as an archive, under its name.
                const archiveName =
                    acceptedFiles.length === 1 && archives.length === 1
                        ? archives[0].replace(/(\.zip)?$/i, '.zip')
                        : null
                // Replace the previous dossier even when nothing usable was found: never keep
                // offering a download of files the user meant to replace.
                setDossier({ id, archiveName, files: readable.map((file, idx) => ({ ...file, name: names[idx] })) })
                const errors: string[] = []
                if (readable.length === 0) errors.push('Aucun fichier PDF, JPEG ou PNG exploitable n’a été trouvé.')
                if (rejected.length > 0) errors.push(`Fichiers ignorés (format non supporté ou illisible) : ${formatList(rejected)}`)
                if (unreadable.length > 0)
                    errors.push(`PDF ignorés (protégés par mot de passe, formulaires XFA ou endommagés) : ${formatList(unreadable)}`)
                setUploadError(errors.length > 0 ? errors.join(' ') : null)
            } catch (error) {
                if (id !== uploadId.current) return
                setDossier(null)
                if (error instanceof Error && error.name === 'PdfWorkerStartError') {
                    setNeedsReload(true)
                    setUploadError('Le lecteur PDF n’a pas pu être chargé (connexion interrompue ?).')
                    return
                }
                setUploadError(
                    isLimitError(error)
                        ? `${error.message} : importez moins de fichiers à la fois.`
                        : 'Impossible de lire ces fichiers.',
                )
                if (!isLimitError(error)) captureException(error)
                plausible('File upload error')
            } finally {
                if (id === uploadId.current) setIsUploading(false)
            }
        },
        [plausible],
    )

    useEffect(() => {
        let cancelled = false
        getUnsupportedWatermarkChars(watermarkText).then((chars) => {
            if (!cancelled) setUnsupportedChars(chars)
        })
        return () => {
            cancelled = true
        }
    }, [watermarkText])

    const downloadPDF = useCallback(async () => {
        if (!isReady || !dossier) return
        // Export exactly this generation, whatever the user does while it runs.
        const { id: dossierId, archiveName } = dossier
        const text = watermarkText
        const files = exportableFiles
        const asZip = archiveName !== null || dossier.files.length > 1
        plausible('File download')
        setIsDownloading(true)
        setDownloadError(null)
        try {
            const { flattenPdf } = await import('@/lib/flatten')
            const exported: SourceFile[] = []
            const failures: string[] = []
            for (const file of files) {
                try {
                    exported.push({ name: file.name, bytes: await flattenPdf(file.bytes, text) })
                } catch (error) {
                    captureException(error)
                    failures.push(file.name)
                }
            }
            if (failures.length > 0) {
                // Never download an incomplete dossier silently: exclude the files and let the user retry.
                plausible('File download error')
                setExcluded((previous) => ({
                    dossierId,
                    value: [...(previous?.dossierId === dossierId ? previous.value : []), ...failures],
                }))
                setDownloadError({
                    dossierId,
                    value:
                        `Impossible de convertir ${formatList(failures)}.` +
                        (exported.length > 0 ? ' Cliquez à nouveau sur « Télécharger » pour obtenir le reste.' : ''),
                })
                return
            }
            if (asZip) {
                const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'))
                for (const file of exported) {
                    await zipWriter.add(file.name, new zip.Uint8ArrayReader(file.bytes))
                }
                // Local date (toISOString() is UTC: the day before in the evening in France).
                const now = new Date()
                const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
                    .map((n) => String(n).padStart(2, '0'))
                    .join('-')
                downloadBlob(archiveName || `dossier_${today}.zip`, await zipWriter.close())
            } else {
                const [file] = exported
                downloadBlob(
                    file.name.split('/').pop()!,
                    new Blob([file.bytes as BlobPart], { type: 'application/pdf' }),
                )
            }
        } catch (error) {
            captureException(error)
            plausible('File download error')
            setDownloadError({
                dossierId,
                value: 'La création du dossier a échoué. Réessayez ou importez moins de fichiers.',
            })
        } finally {
            setIsDownloading(false)
        }
    }, [isReady, dossier, watermarkText, exportableFiles, plausible])

    // Preview the first file that will be exported, with the watermark as currently typed.
    const previewFile = exportableFiles[0]
    const currentDownloadError =
        dossier && downloadError?.dossierId === dossier.id ? downloadError.value : null

    return (
        <section className="grid w-full max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 md:grid-cols-2">
            <form
                className="flex min-w-0 flex-col gap-5 rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgb(15_26_12/0.04),0_16px_40px_rgb(15_26_12/0.06)] sm:p-7 dark:shadow-none"
                onSubmit={handleSubmit(downloadPDF)}
            >
                <FileDropzone onFile={onDrop} className="grow" />
                {dossier && dossier.files.length > 0 ? (
                    <p className="-mt-2 text-center text-sm wrap-anywhere text-muted-foreground" aria-live="polite">
                        {dossier.archiveName ?? 'Dossier'} · {exportableFiles.length}{' '}
                        {exportableFiles.length > 1 ? 'fichiers' : 'fichier'}
                    </p>
                ) : null}
                <div className="flex flex-col gap-2">
                    <label htmlFor="watermark" className="text-sm font-semibold">
                        Mention à apposer
                    </label>
                    <textarea
                        id="watermark"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-control-border bg-background px-4 py-3 text-[15px] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Saisissez le texte du filigrane"
                        {...register('watermark', {
                            value: `Valide uniquement pour dossier de location\nle ${intl.format(new Date())}`,
                        })}
                    ></textarea>
                </div>
                <div className="space-y-2 text-center text-sm wrap-anywhere text-destructive empty:hidden" role="alert">
                    {watermarkText.trim().length === 0 ? <p>Saisissez le texte du filigrane.</p> : null}
                    {watermarkLineCount > MAX_WATERMARK_LINES ? (
                        <p>Le filigrane est limité à {MAX_WATERMARK_LINES} lignes.</p>
                    ) : null}
                    {unsupportedChars.length > 0 ? (
                        <p>Caractères non pris en charge dans le filigrane : {unsupportedChars.join(' ')}</p>
                    ) : null}
                    {uploadError ? <p>{uploadError}</p> : null}
                    {needsReload ? (
                        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                            Recharger la page
                        </Button>
                    ) : null}
                    {excludedNames.length > 0 ? (
                        <p>Fichiers retirés du dossier (conversion impossible) : {formatList(excludedNames)}</p>
                    ) : null}
                    {currentDownloadError ? <p>{currentDownloadError}</p> : null}
                </div>
                <Button
                    disabled={!isReady}
                    type="submit"
                    className="h-auto min-h-13 rounded-xl py-3 text-base font-semibold whitespace-normal"
                >
                    <ArrowDownTrayIcon aria-hidden className="mr-2 size-5 shrink-0" />
                    {isDownloading
                        ? 'Préparation du dossier…'
                        : isUploading
                          ? 'Lecture des fichiers…'
                          : 'Télécharger le dossier protégé'}
                </Button>
            </form>
            {/* Focusable so that keyboard users can scroll through the pages. */}
            <div
                role="region"
                aria-label="Aperçu"
                tabIndex={0}
                className="focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring max-h-[80vh] min-w-0 overflow-y-auto rounded-3xl border bg-muted px-5 py-3 sm:px-8 md:max-h-[720px] dark:bg-card"
            >
                {/* sentry-block: never record the user's documents in Session Replay. */}
                <div className="sentry-block">
                    <PreviewBoundary>
                        <PDFViewer file={previewFile?.bytes} watermarkText={previewFile ? watermarkText : undefined} />
                    </PreviewBoundary>
                </div>
            </div>
        </section>
    )
}
