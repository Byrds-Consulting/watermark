import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    // Pin the workspace root: a lockfile in a parent directory would otherwise be picked up
    // and nest the standalone server under .next/standalone/<path>/server.js.
    outputFileTracingRoot: __dirname,
    turbopack: {
        root: __dirname,
        // Use the legacy pdf.js build: the modern one requires JS APIs that only the latest browsers ship.
        resolveAlias: {
            'pdfjs-dist': 'pdfjs-dist/legacy/build/pdf.mjs',
            'pdfjs-dist/web/pdf_viewer.mjs': 'pdfjs-dist/legacy/web/pdf_viewer.mjs',
        },
    },
}

export default withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/

    org: 'byrds-consulting',
    project: 'javascript-nextjs',

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
        enabled: true,
    },

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    bundleSizeOptimizations: {
        excludeDebugStatements: true,
    },

    // Delete source maps after uploading them to Sentry (also keeps them out of the client bundle)
    sourcemaps: {
        deleteSourcemapsAfterUpload: true,
    },
})
