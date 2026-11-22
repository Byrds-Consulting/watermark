'use client'

import '@ungap/with-resolvers'

import * as zip from '@zip.js/zip.js'
import { captureException } from '@sentry/nextjs'

import Image from 'next/image'
import { useForm } from 'react-hook-form'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlausible } from 'next-plausible'

import { FileDropzone } from '@/app/(landing)/FileDropzone'
import { downloadBlob, getUnsupportedWatermarkChars } from '@/lib/pdf'
import { isLimitError, processFiles, uniqueNames, type SourceFile } from '@/lib/files'
import dynamic from 'next/dynamic'
import { ArrowDownCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
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
    const hasWatermark = watermarkText.trim().length > 0 && unsupportedChars.length === 0
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
        <div className="flex w-full gap-8 h-screen">
            <div className="grow p-8 sm:p-20 pt-16">
                <main className="flex flex-col gap-8 items-center w-full min-h-full">
                    <div className="flex flex-col gap-8 items-center max-w-lg">
                        <h1 className="text-4xl font-bold">
                            {/* <Image
                                priority
                                aria-hidden
                                className="inline align-baseline mx-2 top-px relative"
                                style={{ color: 'red' }}
                                src="img/watermark-logo.svg"
                                width={27}
                                height={27}
                                alt="Header image"
                            /> */}
                            <DocumentTextIcon className="inline align-baseline mx-2 top-[2px] relative w-[30px]" />
                            Dossier PDF sécurisé
                        </h1>
                        <div className="space-y-4 text-center">
                            <p>Ajoutez un texte en filigrane sur les pièces de votre dossier.</p>
                            <p>
                                Fonctionne à <b>100% dans votre navigateur</b>. Votre dossier reste
                                privé, et n&apos;est jamais transféré vers nos serveurs.
                            </p>
                        </div>
                        {/* <ol className="list-inside list-decimal text-md text-center sm:text-left">
                            <li className="mb-2">
                                <span className="mr-2" />
                                Sélectionnez votre PDF
                            </li>
                            <li className="mb-2">
                                <span className="mr-2" />
                                Entrez votre texte
                            </li>
                            <li>
                                <span className="mr-2" />
                                Téléchargez votre dossier
                            </li>
                        </ol> */}

                        <FileDropzone onFile={onDrop} />
                        <form className="w-full space-y-8" onSubmit={handleSubmit(downloadPDF)}>
                            <textarea
                                aria-label="Texte du filigrane"
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-[#f6fff0] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed opacity-80 disabled:opacity-50 resize-none text-center"
                                placeholder="Éditez votre filigram"
                                // placeholder={`Valide uniquement pour dossier de location&#10;le ${intl.format(
                                //     new Date(),
                                // )}`}
                                // disabled={!isReady}
                                {...register('watermark', {
                                    value: `Valide uniquement pour dossier de location\nle ${intl.format(
                                        new Date(),
                                    )}`,
                                })}
                            ></textarea>
                            <div className="space-y-2 text-center text-sm text-red-700" role="alert">
                                {watermarkText.trim().length === 0 ? <p>Saisissez le texte du filigrane.</p> : null}
                                {unsupportedChars.length > 0 ? (
                                    <p>Caractères non pris en charge dans le filigrane : {unsupportedChars.join(' ')}</p>
                                ) : null}
                                {uploadError ? <p>{uploadError}</p> : null}
                                {excludedNames.length > 0 ? (
                                    <p>Fichiers retirés du dossier (conversion impossible) : {formatList(excludedNames)}</p>
                                ) : null}
                                {currentDownloadError ? <p>{currentDownloadError}</p> : null}
                            </div>
                            <div className="flex justify-center">
                                {dossier && dossier.files.length > 0 ? (
                                    <Button disabled={!isReady} type="submit">
                                        <ArrowDownCircleIcon className="mx-auto mr-2 h-6 w-6" />
                                        {isDownloading
                                            ? 'Préparation du dossier…'
                                            : isUploading
                                              ? 'Lecture des fichiers…'
                                              : 'Télécharger le dossier'}
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                </main>
                <footer className="flex py-8 flex-wrap items-center justify-center">
                    <p>
                        © {new Date().getFullYear()}{' '}
                        <a href="https://byrds.consulting" className="text-[#3CDC1E]">
                            <Image
                                className="inline align-middle mx-1"
                                aria-hidden
                                src="/img/byrds/logo.png"
                                alt="Globe icon"
                                width={32}
                                height={32}
                            />
                            Byrds Consulting
                        </a>{' '}
                        . Tous droits réservés.
                    </p>
                </footer>
            </div>
            <div className="basis-2/5 w-full overflow-y-auto overflow-x-hidden max-h-full">
                {/* sentry-block: never record the user's documents in Session Replay. */}
                <div className="mt-16 pr-8 w-[120%] sentry-block">
                    <PDFViewer file={previewFile?.bytes} watermarkText={previewFile ? watermarkText : undefined} />
                </div>
            </div>
        </div>
    )
}
