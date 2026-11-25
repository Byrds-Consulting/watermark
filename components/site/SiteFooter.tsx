import Image from 'next/image'
import Link from 'next/link'

const usages = [
    { href: '/filigrane-dossier-location', label: 'Filigrane pour dossier de location' },
    { href: '/filigrane-carte-identite', label: 'Filigrane sur une carte d’identité' },
    { href: '/filigrane-image', label: 'Filigrane sur une image JPEG ou PNG' },
    { href: '/proteger-ses-justificatifs', label: 'Protéger ses justificatifs' },
]

const legal = [
    { href: '/mentions-legales', label: 'Mentions légales' },
    { href: '/confidentialite', label: 'Confidentialité' },
]

export function SiteFooter() {
    return (
        <footer className="mt-auto w-full max-w-6xl border-t px-4 py-8 text-sm text-muted-foreground sm:px-6">
            <div className="grid gap-8 sm:grid-cols-2">
                <nav aria-label="Usages">
                    <p className="mb-3 font-semibold text-foreground">Ajouter un filigrane</p>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/" className="hover:text-brand hover:underline">
                                Filigrane sur un PDF
                            </Link>
                        </li>
                        {usages.map(({ href, label }) => (
                            <li key={href}>
                                <Link href={href} className="hover:text-brand hover:underline">
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <nav aria-label="Informations">
                    <p className="mb-3 font-semibold text-foreground">Informations</p>
                    <ul className="space-y-2">
                        {legal.map(({ href, label }) => (
                            <li key={href}>
                                <Link href={href} className="hover:text-brand hover:underline">
                                    {label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <a
                                href="mailto:contact@byrds.consulting"
                                className="hover:text-brand hover:underline"
                            >
                                contact@byrds.consulting
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
            <p className="mt-8 text-center">
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
            </p>
        </footer>
    )
}
