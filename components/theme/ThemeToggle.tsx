'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'theme'
type Theme = 'light' | 'dark'
// `system` follows the operating system setting; it is the default and is not stored.
type Mode = Theme | 'system'
const NEXT_MODE: Record<Mode, Mode> = { system: 'light', light: 'dark', dark: 'system' }
const LABELS: Record<Mode, string> = { system: 'Thème du système', light: 'Mode clair', dark: 'Mode sombre' }

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

// The `data-theme-mode` attribute of <html> is the source of truth: the inline script of
// app/layout.tsx sets it (with the `dark` class) before the first paint, and this component changes it.
const root = () => document.documentElement
const modeSnapshot = (): Mode => {
    const mode = root().dataset.themeMode
    return mode === 'light' || mode === 'dark' ? mode : 'system'
}

function applyMode(mode: Mode) {
    const theme: Theme = mode === 'system' ? (systemDark().matches ? 'dark' : 'light') : mode
    root().dataset.themeMode = mode
    root().classList.toggle('dark', theme === 'dark')
}

function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange)
    observer.observe(root(), { attributes: true, attributeFilter: ['data-theme-mode'] })
    return () => observer.disconnect()
}

// Half light, half dark: the theme follows the system.
function SystemThemeIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden className={className}>
            <circle cx="12" cy="12" r="8.25" />
            <path d="M12 3.75a8.25 8.25 0 0 1 0 16.5Z" fill="currentColor" />
        </svg>
    )
}

export function ThemeToggle({ className }: { className?: string }) {
    // On the server, and while hydrating, the mode is unknown: all icons are rendered and CSS
    // shows the right one from `data-theme-mode`, so the button never flashes the wrong icon.
    const mode = useSyncExternalStore(subscribe, modeSnapshot, () => null)

    // In system mode, follow the operating system when it switches theme.
    useEffect(() => {
        const media = systemDark()
        const onChange = () => {
            if (modeSnapshot() === 'system') applyMode('system')
        }
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [])

    const cycle = useCallback(() => {
        const next = NEXT_MODE[modeSnapshot()]
        applyMode(next)
        try {
            if (next === 'system') localStorage.removeItem(STORAGE_KEY)
            else localStorage.setItem(STORAGE_KEY, next)
        } catch {
            // Private browsing: the choice lasts until the page is reloaded.
        }
    }, [])

    return (
        <button
            type="button"
            onClick={cycle}
            aria-label={
                mode === null ? 'Changer de thème' : `${LABELS[mode]}. Passer en ${LABELS[NEXT_MODE[mode]].toLowerCase()}`
            }
            title={mode === null ? undefined : LABELS[mode]}
            className={cn(
                'inline-flex size-11 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
        >
            <SystemThemeIcon className="size-5 [[data-theme-mode=dark]_&]:hidden [[data-theme-mode=light]_&]:hidden" />
            <SunIcon aria-hidden className="hidden size-5 [[data-theme-mode=light]_&]:block" />
            <MoonIcon aria-hidden className="hidden size-5 [[data-theme-mode=dark]_&]:block" />
        </button>
    )
}
