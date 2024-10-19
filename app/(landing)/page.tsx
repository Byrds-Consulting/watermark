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
    title: 'Byrds Consulting',
    description: 'Welcome to Byrds Consulting',
    alternates: {
        canonical: `/`,
        languages: { 'x-default': '/' },
    },
}
