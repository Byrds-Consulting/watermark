import type { Metadata } from 'next'
import Image from 'next/image'
import { ArchiveBoxIcon, LockClosedIcon, ShieldCheckIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { App } from '@/app/(landing)/App'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const features = [
    {
        icon: LockClosedIcon,
        title: 'Rien n’est envoyé',
        text: 'Vos fichiers sont lus et modifiés dans votre navigateur, jamais sur nos serveurs.',
    },
    {
        icon: Squares2X2Icon,
        title: 'Filigrane intégré à la page',
        text: 'Chaque page est aplatie en image : la mention en fait partie et ne peut pas être retirée comme un calque.',
    },
    {
        icon: ArchiveBoxIcon,
        title: 'Tout le dossier d’un coup',
        text: 'Importez un ZIP ou plusieurs fichiers, récupérez un ZIP prêt à envoyer.',
    },
]

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col items-center">
            <header className="flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
                <span className="flex items-center gap-2.5 font-display text-lg font-bold">
                    <ShieldCheckIcon aria-hidden className="size-6 text-brand" />
                    Dossier PDF sécurisé
                </span>
                <div className="flex items-center gap-4">
                    <a href="https://byrds.consulting" className="hidden text-sm text-brand hover:underline sm:inline">
                        par Byrds Consulting
                    </a>
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex w-full flex-col items-center">
                <section className="flex w-full max-w-3xl flex-col items-center gap-5 px-4 pt-10 pb-8 text-center sm:px-6 sm:pt-14">
                    <span className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                        Gratuit · Sans inscription · 100 % dans le navigateur
                    </span>
                    <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
                        Envoyez vos justificatifs,{' '}
                        <span className="box-decoration-clone bg-linear-to-b from-transparent from-60% to-highlight to-60% text-brand">
                            marqués pour un seul usage
                        </span>
                    </h1>
                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                        Ajoutez une mention en filigrane sur chaque page. Le traitement a lieu dans votre
                        navigateur : vos documents ne quittent jamais votre ordinateur.
                    </p>
                </section>

                <App />

                <section
                    aria-label="Garanties"
                    className="grid w-full max-w-6xl grid-cols-1 gap-4 px-4 py-14 sm:px-6 md:grid-cols-3"
                >
                    {features.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="flex flex-col gap-2.5 rounded-2xl border bg-card p-6">
                            <span className="flex size-10 items-center justify-center rounded-lg bg-highlight text-brand dark:bg-muted">
                                <Icon aria-hidden className="size-5" />
                            </span>
                            <h2 className="font-semibold">{title}</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                        </div>
                    ))}
                </section>
            </main>

            <footer className="mt-auto w-full max-w-6xl border-t px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
                © {new Date().getFullYear()}{' '}
                <a href="https://byrds.consulting" className="text-brand hover:underline">
                    <Image
                        className="mx-1 inline align-middle"
                        aria-hidden
                        src="/img/byrds/logo.png"
                        alt=""
                        width={24}
                        height={24}
                    />
                    Byrds Consulting
                </a>
                . Tous droits réservés.
            </footer>
        </div>
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
