'use client'

import * as zip from '@zip.js/zip.js'
import { fileTypeFromBuffer } from 'file-type'

import Image from 'next/image'
import { useForm } from 'react-hook-form'
import React, { useCallback, useEffect, useState } from 'react'
import { usePlausible } from 'next-plausible'

import { PDFDocument } from 'pdf-lib'
import { FileDropzone } from '@/app/(landing)/FileDropzone'
import { test_downloadByteArray, test_modifyPdf } from '@/lib/pdf'
import dynamic from 'next/dynamic'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'

const intl = new Intl.DateTimeFormat('fr-FR')

const PDFViewer = dynamic(() => import('./PDFViewer'), {
    ssr: false,
})

function pdfBufferToBase64(pdf: Uint8Array) {
    const data = pdf.buffer.slice(pdf.byteOffset, pdf.byteLength + pdf.byteOffset)
    const base64 = Buffer.from(data).toString('base64')
    return `data:application/pdf;base64,${base64}`
}

async function processFileBuffer(
    fileName: string,
    fileType: string,
    buffer: ArrayBuffer,
    watermarkText: string,
): Promise<[string[], Uint8Array[]]> {
    const fileNameArray: string[] = []
    const pdfArray: Uint8Array[] = []
    if (fileType === 'application/zip') {
        const blob = new Blob([new Uint8Array(buffer)], { type: fileType })
        const zipFileReader = new zip.BlobReader(blob)
        const zipReader = new zip.ZipReader(zipFileReader)
        for (const fileEntry of await zipReader.getEntries()) {
            if (!fileEntry) continue
            console.log('Zip file entry:', fileEntry.filename)
            const uintArrayWriter = new zip.Uint8ArrayWriter()
            const pdfFile = await fileEntry.getData?.(uintArrayWriter)
            if (pdfFile) {
                const typeInfo = await fileTypeFromBuffer(pdfFile)
                if (typeInfo) {
                    const [fileNames, pdfs] = await processFileBuffer(
                        fileEntry.filename,
                        typeInfo.mime,
                        pdfFile,
                        watermarkText,
                    )
                    fileNameArray.push(...fileNames)
                    pdfArray.push(...pdfs)
                } else {
                    console.log(`Unknown file type for "${fileEntry.filename}"`)
                }
            }
        }
        await zipReader.close()
    } else if (fileType === 'application/pdf') {
        const pdf = await test_modifyPdf(buffer, watermarkText)
        fileNameArray.push(fileName)
        pdfArray.push(pdf)
    } else {
        // TODO: should transform and rename .png|jpg|etc to .pdf
        console.log(`Unknown file type "${fileType}"`)
    }
    return [fileNameArray, pdfArray]
}

async function processAllFiles(
    files: File[],
    watermarkText: string,
): Promise<[string | null, string[], Uint8Array[]]> {
    const fileNameArray: string[] = []
    const fileArray: ArrayBuffer[] = []
    const pdfArray: Uint8Array[] = []
    for (const file of files) {
        console.log(file)
        const reader = new FileReader()
        reader.readAsArrayBuffer(file)
        const [fileNames, pdfs] = await new Promise<Awaited<ReturnType<typeof processFileBuffer>>>(
            (resolve) => {
                reader.onload = async (event) => {
                    const buffer = event.target?.result
                    if (buffer instanceof ArrayBuffer) {
                        return resolve(
                            processFileBuffer(file.name, file.type, buffer, watermarkText),
                        )
                    }
                    return resolve([[], []])
                }
            },
        )
        fileNameArray.push(...fileNames)
        pdfArray.push(...pdfs)
    }
    if (files.length > 0 && files[0].type === 'application/zip') {
        return [files[0].name, fileNameArray, pdfArray]
        // } else if (pdfArray.length > 1) {
        //     return [`dossier_${intl.format(new Date())}.zip`, fileNameArray, pdfArray]
    }
    return [null, fileNameArray, pdfArray]
}

export const App = () => {
    const [originalFileName, setOriginalFileName] = useState<string | null>(null)
    const [pdfArray, setPDFArray] = useState<Array<[string, Uint8Array]>>([])
    const { register, handleSubmit, watch } = useForm()
    const watermarkText = watch('watermark')
    const plausible = usePlausible()

    const isReady = !!pdfArray[0]
    console.log('files:', pdfArray.map(([fileName]) => fileName).join('\n'))

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            plausible('File upload')
            const [originalFileName, fileNames, pdfs] = await processAllFiles(
                acceptedFiles,
                watermarkText,
            )
            if (pdfs.length > 0) {
                setOriginalFileName(originalFileName)
                setPDFArray(fileNames.map((fileName, idx) => [fileName, pdfs[idx]]))
                // setReady(true)
            }
        },
        [plausible, watermarkText],
    )

    useEffect(() => {
        ;(async () => {
            setPDFArray(
                await Promise.all(
                    pdfArray.map(async ([fileName, buffer]) => [
                        fileName,
                        await test_modifyPdf(buffer, watermarkText || 'Test'),
                    ]),
                ),
            )
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watermarkText])

    const downloadPDF = useCallback(async () => {
        plausible('File download')

        // PDF Creation
        async function pdfFromCanvas(allPages: NodeListOf<HTMLCanvasElement>) {
            const pdfDoc = await PDFDocument.create()
            for (const canvas of allPages) {
                const base64 = canvas.toDataURL('image/jpeg', 0.3)
                const page = pdfDoc.addPage([canvas.width, canvas.height])
                const image = await pdfDoc.embedJpg(base64)
                page.drawImage(image, {
                    x: 0,
                    y: 0, // 250
                    width: page.getWidth(),
                    height: page.getHeight(),
                })
            }
            return await pdfDoc.save()
        }

        if (originalFileName || pdfArray.length > 1) {
            const zipWriter = new zip.ZipWriter(new zip.BlobWriter('application/zip'))
            for (const [idx, [fileName]] of pdfArray.entries()) {
                const allPages = document.querySelectorAll<HTMLCanvasElement>(
                    `.pdf_${idx} .react-pdf__Page__canvas`,
                )
                console.warn(`[${idx}] Download:`, fileName, allPages.length)
                const pdfBytes = await pdfFromCanvas(allPages)
                await zipWriter.add(fileName, new zip.Uint8ArrayReader(pdfBytes))
            }
            const zipFileBlob = await zipWriter.close()
            test_downloadByteArray(
                originalFileName || `dossier_${intl.format(new Date())}.zip`,
                zipFileBlob,
            )
        } else if (pdfArray.length > 0) {
            const [fileName] = pdfArray[0]
            const allPages = document.querySelectorAll<HTMLCanvasElement>(
                '.pdf_0 .react-pdf__Page__canvas',
            )
            console.warn(`[0] Download:`, fileName, allPages.length)
            const pdfBytes = await pdfFromCanvas(allPages)
            test_downloadByteArray(fileName, pdfBytes)
        }
    }, [originalFileName, pdfArray, plausible])

    return (
        <div className="flex w-full gap-8 h-screen">
            <div className="grow p-8 sm:p-20 pt-16">
                <main className="flex flex-col gap-8 items-center w-full min-h-full">
                    <div className="flex flex-col gap-8 items-center max-w-lg">
                        <h1 className="text-4xl font-bold">
                            <Image
                                priority
                                aria-hidden
                                className="inline align-baseline mx-2 top-[1px] relative"
                                style={{ color: 'red' }}
                                src="img/watermark-logo.svg"
                                width={27}
                                height={27}
                                alt="Header image"
                            />
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
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-[#f6fff0] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed opacity-80 disabled:opacity-50 resize-none text-center"
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
                            <div className="flex justify-center">
                                {isReady ? (
                                    <Button
                                        // onClick={downloadPDF}
                                        disabled={!isReady}
                                        type="submit"
                                    >
                                        <ArrowDownTrayIcon className="mx-auto mr-2 h-6 w-6" />
                                        Télécharger le dossier
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
                <div className="mt-16 pr-8 w-[120%]">
                    {pdfArray.length > 0 ? (
                        pdfArray.map(([fileName, buffer], idx) =>
                            idx === 0 ? (
                                <PDFViewer
                                    key={idx}
                                    fileId={idx}
                                    file={pdfBufferToBase64(buffer)}
                                />
                            ) : (
                                <div key={idx} className="hidden">
                                    <PDFViewer
                                        key={idx}
                                        fileId={idx}
                                        file={pdfBufferToBase64(buffer)}
                                    />
                                </div>
                            ),
                        )
                    ) : (
                        <PDFViewer fileId={0} />
                    )}
                </div>
            </div>
        </div>
    )
}
