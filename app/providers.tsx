'use client'

import PlausibleProvider from 'next-plausible'

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PlausibleProvider domain="dossierpdf.fr" customDomain="https://plausible.byrds.dev">
            {children}
        </PlausibleProvider>
    )
}
