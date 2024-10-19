import type { Metadata } from 'next'
import { Inter as FontSans } from 'next/font/google'
import './globals.css'
import Providers from '@/app/providers'

const fontSans = FontSans({ subsets: ['latin'], variable: '--font-sans' })

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="fr">
            <body className={`${fontSans.variable} antialiased`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}

export const viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#3CDC1E' },
        // { media: '(prefers-color-scheme: dark)', color: 'black' },
    ],
}

export const metadata: Metadata = {
    metadataBase: new URL('https://dossierpdf.fr'),
    keywords:
        'dossier, pdf, filigrane, local, navigateur, sécurisé, sécurité, immobilier, location, identité, vol',
    authors: [
        {
            name: 'Byrds Consulting',
            url: 'https://byrds.consulting',
        },
    ],
    creator: 'Byrds Consulting',
    openGraph: {
        locale: 'fr_FR',
        url: 'https://dossierpdf.fr',
        title: 'Dossier PDF',
        description: 'Ajouter un texte en filigrane sur votre dossier PDF',
        siteName: 'Dossier PDF',
        images: [
            {
                url: 'https://dossierpdf.fr/img/og.png',
                width: 1200,
                height: 630,
                alt: 'Dossier PDF',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Dossier PDF',
        description: 'Ajouter un texte en filigrane sur votre dossier PDF',
        images: ['https://dossierpdf.fr/img/og.png'],
        creator: '@theolubert',
    },
    icons: {
        icon: '/icon.png',
    },
}
