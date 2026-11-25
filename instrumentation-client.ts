// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: 'https://cf7ec7737801f3cbaa0aa33dea8c40fa@o4508247932010496.ingest.de.sentry.io/4508247933517904',

    // Route browser requests to Sentry through the Next.js server (answered by
    // `serveTunnelIntegration` in sentry.server.config.ts) to circumvent ad-blockers.
    tunnel: true,

    // Session Replay is loaded once the page is idle (see below): rrweb weighs ~150 KB gzipped.

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
})

// Replay comes from Sentry's CDN after the page has loaded, to keep it out of the initial bundle.
// An ad-blocker may block it: errors are still reported, without a replay.
function loadReplay() {
    Sentry.lazyLoadIntegration('replayIntegration')
        .then((replayIntegration) => Sentry.addIntegration(replayIntegration()))
        .catch(() => {})
}
const whenIdle = (callback: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(callback, { timeout: 5000 }) : setTimeout(callback, 2000)
if (document.readyState === 'complete') whenIdle(loadReplay)
else window.addEventListener('load', () => whenIdle(loadReplay), { once: true })

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
