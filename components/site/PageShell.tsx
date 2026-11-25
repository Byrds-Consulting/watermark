import Link from 'next/link'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { breadcrumbJsonLd, JsonLd } from '@/components/site/JsonLd'
import { SITE_URL } from '@/lib/site'

export type Crumb = { name: string; path: string }

/** Header, main content and footer of every page. `breadcrumb`: the current page, below the home page. */
export function PageShell({
    breadcrumb,
    children,
}: {
    breadcrumb?: Crumb
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col items-center">
            <SiteHeader />
            {breadcrumb ? (
                <nav
                    aria-label="Fil d’Ariane"
                    className="w-full max-w-6xl px-4 text-sm text-muted-foreground sm:px-6"
                >
                    <ol className="flex flex-wrap items-center gap-1.5">
                        <li>
                            <Link href="/" className="hover:text-brand hover:underline">
                                Accueil
                            </Link>
                        </li>
                        <li aria-hidden>›</li>
                        <li aria-current="page">{breadcrumb.name}</li>
                    </ol>
                    <JsonLd
                        data={breadcrumbJsonLd([
                            { name: 'Accueil', url: SITE_URL },
                            { name: breadcrumb.name, url: `${SITE_URL}${breadcrumb.path}` },
                        ])}
                    />
                </nav>
            ) : null}
            <main className="flex w-full flex-col items-center">{children}</main>
            <SiteFooter />
        </div>
    )
}

/** Long-form text (guides, legal pages), styled by `.prose-content` in app/globals.css. */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`prose-content w-full max-w-3xl px-4 sm:px-6 ${className ?? ''}`}>
            {children}
        </div>
    )
}
