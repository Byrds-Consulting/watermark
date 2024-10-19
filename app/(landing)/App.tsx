'use client'

import Image from 'next/image'
import { useForm } from 'react-hook-form'
import React, { useCallback, useEffect, useState } from 'react'

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

export const App = () => {
    const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
    const [finalPDF, setFinalPDF] = useState<Uint8Array | null>(null)
    const [isReady, setReady] = useState<boolean>(false)
    const { register, handleSubmit, watch } = useForm()

    const watermarkText = watch('watermark')

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            const file = acceptedFiles[0]
            if (file) {
                const reader = new FileReader()
                reader.onload = async (event) => {
                    const buffer = event.target?.result
                    if (buffer instanceof ArrayBuffer) {
                        setBuffer(buffer)
                        // setFileName(file.name)

                        // const watermarkText =  'Valide uniquement pour dossier de location\nle 01/01/2024'
                        const pdf = await test_modifyPdf(buffer, watermarkText)
                        setFinalPDF(pdf)
                        setReady(true)
                    }
                }
                reader.readAsArrayBuffer(file)
            }
        },
        [watermarkText],
    )

    useEffect(() => {
        ;(async () => {
            if (!buffer) return
            const pdf = await test_modifyPdf(buffer, watermarkText || 'Test')
            setFinalPDF(pdf)
        })()
    }, [buffer, watermarkText])

    const downloadPDF = useCallback(async () => {
        const allPages = document.querySelectorAll<HTMLCanvasElement>('.react-pdf__Page__canvas')
        if (allPages.length <= 0) return

        // PDF Creation
        const pdfDoc = await PDFDocument.create()
        for (const canvas of allPages) {
            const base64 = canvas.toDataURL('image/jpeg', 0.3)
            const page = pdfDoc.addPage()
            const image = await pdfDoc.embedJpg(base64)
            page.drawImage(image, {
                x: 0,
                y: 0, // 250
                width: page.getWidth(),
                height: page.getHeight(),
            })
        }
        const pdfBytes = await pdfDoc.save()
        test_downloadByteArray('pdflib-created.pdf', pdfBytes)
    }, [])

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
                    {finalPDF ? (
                        <PDFViewer file={pdfBufferToBase64(finalPDF)} />
                    ) : buffer ? (
                        <div className="opacity-10">
                            <PDFViewer file={buffer} />
                        </div>
                    ) : (
                        <PDFViewer />
                    )}
                </div>
            </div>
        </div>
    )
}
