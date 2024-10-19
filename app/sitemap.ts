import { MetadataRoute } from 'next'

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never
type SitemapWithDefaultsElem =
    | string
    | (Pick<ArrayElement<MetadataRoute.Sitemap>, 'url'> &
          Partial<Omit<ArrayElement<MetadataRoute.Sitemap>, 'url'>>)

function sitemapWithDefaults(
    sitemap: SitemapWithDefaultsElem[],
    defaults: Omit<ArrayElement<MetadataRoute.Sitemap>, 'url'>,
) {
    return sitemap.map((s) => ({
        ...defaults,
        ...(typeof s === 'string' ? { url: s } : s),
    }))
}

export default function sitemap(): MetadataRoute.Sitemap {
    return sitemapWithDefaults(
        [
            {
                url: `https://dossierpdf.fr`,
            },
        ],
        {
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    )
}
