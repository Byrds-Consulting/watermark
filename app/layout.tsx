import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import Providers from '@/app/providers'
import dynamic from 'next/dynamic'

const fontSans = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fontDisplay = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-space-grotesk' })

// Applies the saved theme, or the system one (mode `system`), before the first paint (no flash of the wrong theme).
// Kept in sync with components/theme/ThemeToggle.tsx.
// Storage can be blocked (privacy settings): the system theme still applies then.
const themeScript = `(function(){var m=null;try{m=localStorage.getItem('theme')}catch(e){}if(m!=='light'&&m!=='dark')m='system';var t=m==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;var r=document.documentElement;r.dataset.themeMode=m;r.classList.toggle('dark',t==='dark')})()`

const CrispChat = dynamic(() => import('@/components/crisp/CrispChat'))
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        // The script changes the class of <html> before React hydrates it.
        <html lang="fr" className={`${fontSans.variable} ${fontDisplay.variable}`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="font-sans antialiased">
                <Providers>{children}</Providers>
                <CrispChat lang="fr" />
            </body>
        </html>
    )
}

export const viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#fbfcfa' },
        { media: '(prefers-color-scheme: dark)', color: '#0b0f0a' },
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
        icon: [
            {
                media: '(prefers-color-scheme: light)',
                url: '/img/icon.png',
                href: '/img/icon.png',
            },
            {
                media: '(prefers-color-scheme: dark)',
                url: '/img/icon-dark.png',
                href: '/img/icon-dark.png',
            },
            // Same shield as the header; its colors follow the system theme. PNGs above for Safari.
            { url: '/img/icon.svg', type: 'image/svg+xml' },
        ],
    },
}
