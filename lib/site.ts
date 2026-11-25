import type { Metadata } from 'next'

export const SITE_URL = 'https://dossierpdf.fr'
export const SITE_NAME = 'Dossier PDF'
export const OG_IMAGE = {
    url: `${SITE_URL}/img/og.png`,
    width: 1200,
    height: 630,
    alt: 'Dossier PDF : filigrane sur vos justificatifs',
}

export const PUBLISHER = {
    '@type': 'Organization',
    name: 'Byrds Consulting',
    url: 'https://byrds.consulting',
} as const

/** The pages of the site, for the sitemap. `lastModified`: when their content last changed. */
export const PAGES = [
    { path: '/', lastModified: '2026-11-25' },
    { path: '/filigrane-dossier-location', lastModified: '2026-11-25' },
    { path: '/filigrane-carte-identite', lastModified: '2026-11-25' },
    { path: '/filigrane-image', lastModified: '2026-11-25' },
    { path: '/proteger-ses-justificatifs', lastModified: '2026-11-25' },
    { path: '/mentions-legales', lastModified: '2026-11-25' },
    { path: '/confidentialite', lastModified: '2026-11-25' },
] as const

/**
 * Metadata of a page. Next.js replaces (does not merge) the layout's `openGraph` and `twitter`
 * objects, so every page sets them in full here.
 */
export function pageMetadata({
    title,
    description,
    path,
    absoluteTitle = false,
    type = 'website',
}: {
    title: string
    description: string
    path: string
    /** The title already names the site: skip the ` | Dossier PDF` template. */
    absoluteTitle?: boolean
    type?: 'website' | 'article'
}): Metadata {
    return {
        title: absoluteTitle ? { absolute: title } : title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type,
            locale: 'fr_FR',
            url: path,
            siteName: SITE_NAME,
            title,
            description,
            images: [OG_IMAGE],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [OG_IMAGE.url],
            creator: '@theolubert',
        },
    }
}
