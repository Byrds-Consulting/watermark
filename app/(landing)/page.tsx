import type { Metadata } from 'next'
import { App } from '@/app/(landing)/App'
import Background from './Background'

export default function Home() {
    return (
        <Background>
            <App />
        </Background>
    )
}

export const metadata: Metadata = {
    title: 'Mon dossier PDF sécurisé',
    description: 'Ajouter un texte en filigrane sur votre dossier PDF',
    alternates: {
        canonical: `/`,
        languages: { 'x-default': '/' },
    },
}
