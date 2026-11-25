import { ArchiveBoxIcon, LockClosedIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { App } from '@/app/(landing)/App'
import { Faq, type FaqItem } from '@/components/site/Faq'
import { JsonLd } from '@/components/site/JsonLd'
import { PageShell, Prose, type Crumb } from '@/components/site/PageShell'
import { PUBLISHER, SITE_NAME, SITE_URL } from '@/lib/site'

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

const steps = [
    {
        title: 'Déposez vos fichiers',
        text: 'PDF, photos JPEG ou PNG, ou une archive ZIP qui contient tout le dossier. Les images deviennent des PDF.',
    },
    {
        title: 'Rédigez la mention',
        text: 'Le destinataire, l’usage et la date suffisent. Réglez la couleur, l’opacité, l’angle et la répétition, l’aperçu suit.',
    },
    {
        title: 'Téléchargez le dossier',
        text: 'Un PDF pour un seul fichier, un ZIP pour plusieurs. Chaque page porte le filigrane.',
    },
]

/**
 * A page built around the watermark tool: hero, tool, guarantees, steps, the page's own content and
 * its FAQ. `path` and `name` describe the page for its structured data.
 */
export function ToolPage({
    path,
    name,
    description,
    breadcrumb,
    title,
    intro,
    defaultWatermark,
    faq,
    children,
}: {
    path: string
    name: string
    description: string
    breadcrumb?: Crumb
    title: React.ReactNode
    intro: React.ReactNode
    /** `{date}` is replaced with today's date. */
    defaultWatermark: string
    faq: FaqItem[]
    children: React.ReactNode
}) {
    return (
        <PageShell breadcrumb={breadcrumb}>
            <section className="flex w-full max-w-3xl flex-col items-center gap-5 px-4 pt-10 pb-8 text-center sm:px-6 sm:pt-14">
                <span className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                    Gratuit · Sans inscription · 100 % dans le navigateur
                </span>
                <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
                    {title}
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {intro}
                </p>
            </section>

            <App defaultWatermark={defaultWatermark} />

            <section
                aria-label="Garanties"
                className="grid w-full max-w-6xl grid-cols-1 gap-4 px-4 py-14 sm:px-6 md:grid-cols-3"
            >
                {features.map(({ icon: Icon, title, text }) => (
                    <div
                        key={title}
                        className="flex flex-col gap-2.5 rounded-2xl border bg-card p-6"
                    >
                        <span className="flex size-10 items-center justify-center rounded-lg bg-highlight text-brand dark:bg-muted">
                            <Icon aria-hidden className="size-5" />
                        </span>
                        <h2 className="font-semibold">{title}</h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </div>
                ))}
            </section>

            <section aria-labelledby="how" className="w-full max-w-6xl px-4 sm:px-6">
                <h2
                    id="how"
                    className="mb-6 text-center font-display text-2xl font-bold tracking-tight sm:text-3xl"
                >
                    Comment ça marche
                </h2>
                <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {steps.map(({ title, text }, index) => (
                        <li key={title} className="flex gap-4 rounded-2xl border p-6">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">
                                {index + 1}
                            </span>
                            <div>
                                <h3 className="mb-1.5 font-semibold">{title}</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {text}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <Prose className="pt-4">{children}</Prose>

            <Faq items={faq} />

            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'WebApplication',
                    name,
                    url: `${SITE_URL}${path}`,
                    description,
                    applicationCategory: 'UtilitiesApplication',
                    operatingSystem: 'Tous (navigateur web récent)',
                    browserRequirements: 'JavaScript requis',
                    inLanguage: 'fr',
                    isAccessibleForFree: true,
                    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
                    featureList: [
                        'Filigrane sur des PDF, des images JPEG et PNG et des archives ZIP',
                        'Traitement local dans le navigateur, sans envoi des fichiers',
                        'Pages aplaties : le filigrane ne peut pas être supprimé comme un calque',
                        'Couleur, opacité, angle, taille et répétition du filigrane réglables',
                    ],
                    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
                    publisher: PUBLISHER,
                }}
            />
        </PageShell>
    )
}

/** Emphasized part of a page title. */
export function Highlight({ children }: { children: React.ReactNode }) {
    return (
        <span className="box-decoration-clone bg-linear-to-b from-transparent from-60% to-highlight to-60% text-brand">
            {children}
        </span>
    )
}
