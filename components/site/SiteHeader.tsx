import Link from 'next/link'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function SiteHeader() {
    return (
        <header className="flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-bold">
                <ShieldCheckIcon aria-hidden className="size-6 text-brand" />
                Dossier PDF sécurisé
            </Link>
            <ThemeToggle />
        </header>
    )
}
