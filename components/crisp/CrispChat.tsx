'use client'

import { useEffect } from 'react'
import { Crisp } from 'crisp-sdk-web'

const CrispChat = ({ lang }: { lang: string }) => {
    useEffect(() => {
        Crisp.configure('8235d9c3-9f78-4ba5-bffb-b161f023ab4b', {
            locale: lang,
        })
    })

    return null
}

export default CrispChat
