'use client'

import '@ungap/with-resolvers'

import { captureException } from '@sentry/nextjs'

import { useForm } from 'react-hook-form'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlausible } from 'next-plausible'

import { FileDropzone } from '@/app/(landing)/FileDropzone'
import { PreviewBoundary } from '@/app/(landing)/PreviewBoundary'
import {
    DEFAULT_WATERMARK_STYLE,
    downloadBlob,
    MAX_WATERMARK_LINES,
    type WatermarkStyle,
} from '@/lib/watermark'
import { WatermarkSettings } from '@/app/(landing)/WatermarkSettings'
import type { SourceFile } from '@/lib/files'
import type { PreviewItem } from '@/app/(landing)/FileThumbnails'
import dynamic from 'next/dynamic'
import { ArrowDownTrayIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { PasswordDialog, type LockedFile, type UnlockResult } from '@/app/(landing)/PasswordDialog'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@uidotdev/usehooks'

const intl = new Intl.DateTimeFormat('fr-FR')

const PDFViewer = dynamic(() => import('./PDFViewer'), {
    ssr: false,
})
const FileThumbnails = dynamic(() => import('./FileThumbnails'), {
    ssr: false,
})

/**
 * The uploaded dossier. `id` changes on every upload, so stale async results can be detected.
 * `files`: the PDFs to export. `locked`: the password-protected PDFs and whether they were unlocked
 * (then also in `files`, with their password); `lockedBytes` keeps their content until then.
 * `order`: the names of all of them in upload order, which unlocked files keep.
 */
type Dossier = {
    id: number
    order: string[]
    archiveName: string | null
    files: SourceFile[]
    locked: LockedFile[]
    lockedBytes: Map<string, Uint8Array>
}
/** Something that belongs to one dossier only, and must disappear when another one is uploaded. */
type ForDossier<T> = { dossierId: number; value: T }

function formatList(names: string[]) {
    return names.map((name) => `« ${name} »`).join(', ')
}

/** `{date}` in the default watermark is replaced with today's date. */
export const App = ({ defaultWatermark }: { defaultWatermark: string }) => {
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
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    // The file chosen in the thumbnails above the preview.
    const [selectedName, setSelectedName] = useState<ForDossier<string> | null>(null)
    const previewScrollRef = useRef<HTMLDivElement>(null)
    const uploadId = useRef(0)
    // Default value known from the first render (server included): no "empty watermark" error flashes in.
    const { register, handleSubmit, watch } = useForm<{ watermark: string }>({
        defaultValues: { watermark: defaultWatermark.replace('{date}', intl.format(new Date())) },
    })
    const watermarkTextValue = watch('watermark') ?? ''
    const watermarkText = useDebounce<string>(watermarkTextValue, 200)
    const [watermarkStyle, setWatermarkStyle] = useState<WatermarkStyle>(DEFAULT_WATERMARK_STYLE)
    // Sliders fire on every step: redraw the preview once they settle.
    const previewStyle = useDebounce<WatermarkStyle>(watermarkStyle, 150)
    const plausible = usePlausible()

    const excludedNames = useMemo(
        () => (dossier && excluded?.dossierId === dossier.id ? excluded.value : []),
        [dossier, excluded],
    )
    const exportableFiles = useMemo(
        () =>
            dossier
                ? dossier.files
                      .filter((file) => !excludedNames.includes(file.name))
                      .sort((a, b) => dossier.order.indexOf(a.name) - dossier.order.indexOf(b.name))
                : [],
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
            setIsPasswordDialogOpen(false)
            // Loaded on demand: pdf-lib, zip.js and file-type stay out of the initial bundle.
            let filesModule: typeof import('@/lib/files') | undefined
            try {
                filesModule = await import('@/lib/files')
                const { processFiles, uniqueNames } = filesModule
                const { files, rejected, archives } = await processFiles(acceptedFiles)
                // Keep only the PDFs that pdf.js (the preview and export renderer) can open.
                const { checkPdf } = await import('@/lib/render')
                setNeedsReload(false)
                // In upload order, the protected files included: they may join the dossier later.
                const usable: { file: SourceFile; locked: boolean }[] = []
                const unreadable: string[] = []
                for (const file of files) {
                    const status = await checkPdf(file.bytes)
                    if (status === 'unreadable') unreadable.push(file.name)
                    else usable.push({ file, locked: status === 'password' })
                }
                if (id !== uploadId.current) return // a newer upload superseded this one
                const names = uniqueNames(usable.map(({ file }) => file.name))
                const named = usable.map(({ file, locked }, idx) => ({
                    file: { ...file, name: names[idx] },
                    locked,
                }))
                const readable = named.filter(({ locked }) => !locked).map(({ file }) => file)
                const protectedFiles = named.filter(({ locked }) => locked).map(({ file }) => file)
                // A single selected archive is downloaded back as an archive, under its name.
                const archiveName =
                    acceptedFiles.length === 1 && archives.length === 1
                        ? archives[0].replace(/(\.zip)?$/i, '.zip')
                        : null
                // Replace the previous dossier even when nothing usable was found: never keep
                // offering a download of files the user meant to replace.
                setDossier({
                    id,
                    archiveName,
                    order: names,
                    files: readable,
                    locked: protectedFiles.map(({ name }) => ({ name, status: 'locked' })),
                    lockedBytes: new Map(protectedFiles.map(({ name, bytes }) => [name, bytes])),
                })
                setIsPasswordDialogOpen(protectedFiles.length > 0)
                const errors: string[] = []
                if (readable.length === 0 && protectedFiles.length === 0)
                    errors.push('Aucun fichier PDF, JPEG ou PNG exploitable n’a été trouvé.')
                if (rejected.length > 0)
                    errors.push(
                        `Fichiers ignorés (format non supporté ou illisible) : ${formatList(rejected)}`,
                    )
                if (unreadable.length > 0)
                    errors.push(
                        `PDF ignorés (formulaires XFA ou endommagés) : ${formatList(unreadable)}`,
                    )
                setUploadError(errors.length > 0 ? errors.join(' ') : null)
            } catch (error) {
                if (id !== uploadId.current) return
                setDossier(null)
                if (error instanceof Error && error.name === 'PdfWorkerStartError') {
                    setNeedsReload(true)
                    setUploadError(
                        'Le lecteur PDF n’a pas pu être chargé (connexion interrompue ?).',
                    )
                    return
                }
                const isLimit = filesModule?.isLimitError(error) ?? false
                setUploadError(
                    isLimit
                        ? `${(error as Error).message} : importez moins de fichiers à la fois.`
                        : 'Impossible de lire ces fichiers.',
                )
                if (!isLimit) captureException(error)
                plausible('File upload error')
            } finally {
                if (id === uploadId.current) setIsUploading(false)
            }
        },
        [plausible],
    )

    /** Tries `password` on the locked file `name` (and on the other locked ones when `tryOthers`). */
    const unlockFile = useCallback(
        async (name: string, password: string, tryOthers: boolean): Promise<UnlockResult> => {
            if (!dossier) return 'password'
            const { id, locked, lockedBytes } = dossier
            const { checkPdf } = await import('@/lib/render')
            const targets = [
                name,
                ...(tryOthers
                    ? locked
                          .filter((f) => f.status === 'locked' && f.name !== name)
                          .map((f) => f.name)
                    : []),
            ]
            const results = new Map<string, UnlockResult>()
            for (const target of targets) {
                const bytes = lockedBytes.get(target)
                if (bytes) results.set(target, await checkPdf(bytes, password))
            }
            setDossier((current) => {
                // A newer upload replaced the dossier, or another attempt already unlocked these files.
                if (!current || current.id !== id) return current
                const opened = current.locked.filter(
                    (file) => file.status === 'locked' && results.get(file.name) === 'readable',
                )
                return {
                    ...current,
                    files: [
                        ...current.files,
                        ...opened.map((file) => ({
                            name: file.name,
                            bytes: lockedBytes.get(file.name)!,
                            password,
                        })),
                    ],
                    locked: current.locked.map((file) => {
                        const result = file.status === 'locked' ? results.get(file.name) : undefined
                        if (result === 'readable')
                            return {
                                ...file,
                                status: 'unlocked',
                                unlockedBy: file.name === name ? undefined : name,
                            }
                        // Only for the typed file: the password of another file proves nothing here.
                        if (result === 'unreadable' && file.name === name)
                            return { ...file, status: 'unreadable' }
                        return file
                    }),
                }
            })
            return results.get(name) ?? 'password'
        },
        [dossier],
    )

    useEffect(() => {
        let cancelled = false
        import('@/lib/pdf')
            .then(({ getUnsupportedWatermarkChars }) => getUnsupportedWatermarkChars(watermarkText))
            .then((chars) => {
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
        const style = watermarkStyle
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
                    exported.push({
                        name: file.name,
                        bytes: await flattenPdf(file.bytes, text, style, file.password),
                    })
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
                    value: [
                        ...(previous?.dossierId === dossierId ? previous.value : []),
                        ...failures,
                    ],
                }))
                setDownloadError({
                    dossierId,
                    value:
                        `Impossible de convertir ${formatList(failures)}.` +
                        (exported.length > 0
                            ? ' Cliquez à nouveau sur « Télécharger » pour obtenir le reste.'
                            : ''),
                })
                return
            }
            if (asZip) {
                const zip = await import('@zip.js/zip.js')
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
    }, [isReady, dossier, watermarkText, watermarkStyle, exportableFiles, plausible])

    // The files that can be previewed, in upload order: the ones that will be exported, and the
    // locked ones (shown as a locked page).
    const previewItems = useMemo<PreviewItem[]>(() => {
        if (!dossier) return []
        return dossier.order.flatMap((name): PreviewItem[] => {
            const file = exportableFiles.find((f) => f.name === name)
            if (file) return [{ name, bytes: file.bytes, password: file.password, locked: false }]
            const isLocked = dossier.locked.some((f) => f.name === name && f.status === 'locked')
            return isLocked ? [{ name, locked: true }] : []
        })
    }, [dossier, exportableFiles])
    // The chosen file, or the first one (also when the chosen one left the dossier).
    const previewName =
        (dossier &&
            selectedName?.dossierId === dossier.id &&
            previewItems.find((item) => item.name === selectedName.value)?.name) ||
        previewItems[0]?.name
    const previewFile = exportableFiles.find((file) => file.name === previewName)
    const previewLocked = previewName !== undefined && !previewFile

    // Show another file from its first page.
    useEffect(() => {
        previewScrollRef.current?.scrollTo({ top: 0 })
    }, [previewName])
    const lockedCount = dossier
        ? dossier.locked.filter((file) => file.status === 'locked').length
        : 0
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
                    <p
                        className="-mt-2 text-center text-sm wrap-anywhere text-muted-foreground"
                        aria-live="polite"
                    >
                        {dossier.archiveName ?? 'Dossier'} · {exportableFiles.length}{' '}
                        {exportableFiles.length > 1 ? 'fichiers' : 'fichier'}
                    </p>
                ) : null}
                {lockedCount > 0 ? (
                    <button
                        type="button"
                        onClick={() => setIsPasswordDialogOpen(true)}
                        className="-mt-3 inline-flex items-center justify-center gap-1.5 self-center rounded-md px-2 py-1 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <LockClosedIcon aria-hidden className="size-4" />
                        {lockedCount > 1
                            ? `${lockedCount} PDF protégés par mot de passe : les déverrouiller`
                            : '1 PDF protégé par mot de passe : le déverrouiller'}
                    </button>
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
                        {...register('watermark')}
                    ></textarea>
                </div>
                <WatermarkSettings style={watermarkStyle} onChange={setWatermarkStyle} />
                <div
                    className="space-y-2 text-center text-sm wrap-anywhere text-destructive empty:hidden"
                    role="alert"
                >
                    {watermarkText.trim().length === 0 ? (
                        <p>Saisissez le texte du filigrane.</p>
                    ) : null}
                    {watermarkLineCount > MAX_WATERMARK_LINES ? (
                        <p>Le filigrane est limité à {MAX_WATERMARK_LINES} lignes.</p>
                    ) : null}
                    {unsupportedChars.length > 0 ? (
                        <p>
                            Caractères non pris en charge dans le filigrane :{' '}
                            {unsupportedChars.join(' ')}
                        </p>
                    ) : null}
                    {uploadError ? <p>{uploadError}</p> : null}
                    {needsReload ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.location.reload()}
                        >
                            Recharger la page
                        </Button>
                    ) : null}
                    {excludedNames.length > 0 ? (
                        <p>
                            Fichiers retirés du dossier (conversion impossible) :{' '}
                            {formatList(excludedNames)}
                        </p>
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
            <div className="flex max-h-[80vh] min-w-0 flex-col overflow-hidden rounded-3xl border bg-muted md:max-h-[720px] dark:bg-card">
                {dossier && previewName && previewItems.length > 1 ? (
                    // sentry-block: file names and pages may be personal, never record them.
                    <div className="sentry-block shrink-0">
                        <FileThumbnails
                            items={previewItems}
                            selected={previewName}
                            onSelect={(name) =>
                                setSelectedName({ dossierId: dossier.id, value: name })
                            }
                        />
                    </div>
                ) : null}
                {/* Focusable so that keyboard users can scroll through the pages. */}
                <div
                    ref={previewScrollRef}
                    role="region"
                    aria-label="Aperçu"
                    tabIndex={0}
                    className="min-h-0 grow overflow-y-auto px-5 py-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-8"
                >
                    {/* sentry-block: never record the user's documents in Session Replay. */}
                    <div className="sentry-block">
                        <PreviewBoundary>
                            {previewLocked ? (
                                // Its size is unknown until it is opened: an A4 page.
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordDialogOpen(true)}
                                    aria-label={`${previewName} : protégé par mot de passe, saisir le mot de passe`}
                                    className="group my-4 grid aspect-[210/297] w-full cursor-pointer place-items-center rounded-(--radius) bg-white shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <LockClosedIcon
                                        aria-hidden
                                        className="size-12 text-neutral-400 transition-colors group-hover:text-neutral-600"
                                    />
                                </button>
                            ) : (
                                <PDFViewer
                                    file={previewFile?.bytes}
                                    password={previewFile?.password}
                                    watermarkText={watermarkText}
                                    watermarkStyle={previewStyle}
                                />
                            )}
                        </PreviewBoundary>
                    </div>
                </div>
            </div>
            {dossier && dossier.locked.length > 0 ? (
                <PasswordDialog
                    key={dossier.id}
                    open={isPasswordDialogOpen}
                    files={dossier.locked}
                    onUnlock={unlockFile}
                    onClose={() => setIsPasswordDialogOpen(false)}
                />
            ) : null}
        </section>
    )
}
