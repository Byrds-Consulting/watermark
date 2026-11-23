'use client'

import React from 'react'
import { captureException } from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

/**
 * Keeps a preview failure (e.g. its JavaScript chunk failing to load) inside the preview pane, so
 * the upload form and the download stay usable.
 */
export class PreviewBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    componentDidCatch(error: unknown) {
        captureException(error)
    }

    render() {
        if (!this.state.failed) return this.props.children
        return (
            <div className="space-y-4 text-center text-sm">
                <p className="opacity-60">L’aperçu n’a pas pu être chargé.</p>
                <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                    Recharger la page
                </Button>
            </div>
        )
    }
}
