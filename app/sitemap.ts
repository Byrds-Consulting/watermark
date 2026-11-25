import type { MetadataRoute } from 'next'
import { PAGES, SITE_URL } from '@/lib/site'

// Google ignores `changefreq` and `priority`, and trusts `lastmod` only when it reflects real changes.
export default function sitemap(): MetadataRoute.Sitemap {
    return PAGES.map(({ path, lastModified }) => ({
        url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
        lastModified,
    }))
}
