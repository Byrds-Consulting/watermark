'use client'

import { useEffect } from 'react'

/** The chat (SDK and Crisp's script) is loaded once the page is idle, after what matters for display. */
const CrispChat = ({ lang }: { lang: string }) => {
    useEffect(() => {
        let cancelled = false
        const load = () =>
            import('crisp-sdk-web').then(({ Crisp }) => {
                if (cancelled) return
                Crisp.configure('8235d9c3-9f78-4ba5-bffb-b161f023ab4b', {
                    locale: lang,
                })
            })
        const id =
            'requestIdleCallback' in window
                ? requestIdleCallback(load, { timeout: 5000 })
                : (setTimeout(load, 3000) as unknown as number)
        return () => {
            cancelled = true
            if ('cancelIdleCallback' in window) cancelIdleCallback(id)
            else clearTimeout(id)
        }
    }, [lang])

    return null
}

export default CrispChat
