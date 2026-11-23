'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'theme'
type Theme = 'light' | 'dark'
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

// The choice made on this page, kept even when it cannot be saved (blocked storage).
let chosenTheme: Theme | null = null

function savedTheme(): Theme | null {
    if (chosenTheme) return chosenTheme
    try {
        const theme = localStorage.getItem(STORAGE_KEY)
        return theme === 'light' || theme === 'dark' ? theme : null
    } catch {
        return null
    }
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark')
}

// The `dark` class on <html> is the source of truth: the inline script of app/layout.tsx sets it
// before the first paint, and this component changes it.
function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
}
const isDarkSnapshot = () => document.documentElement.classList.contains('dark')

export function ThemeToggle({ className }: { className?: string }) {
    // On the server, and while hydrating, the theme is unknown: both icons are rendered and CSS
    // shows the right one, so the button never flashes the wrong icon.
    const isDark = useSyncExternalStore(subscribe, isDarkSnapshot, () => null)

    // Follow the system theme until the visitor picks one.
    useEffect(() => {
        const media = systemDark()
        const onChange = () => {
            if (savedTheme() === null) applyTheme(media.matches ? 'dark' : 'light')
        }
        onChange()
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [])

    const toggle = useCallback(() => {
        const next: Theme = isDarkSnapshot() ? 'light' : 'dark'
        chosenTheme = next
        applyTheme(next)
        try {
            localStorage.setItem(STORAGE_KEY, next)
        } catch {
            // Private browsing: the choice lasts until the page is reloaded.
        }
    }, [])

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={isDark === null ? 'Changer de thème' : isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title={isDark === null ? undefined : isDark ? 'Mode clair' : 'Mode sombre'}
            className={cn(
                'inline-flex size-11 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
        >
            <MoonIcon aria-hidden className="size-5 dark:hidden" />
            <SunIcon aria-hidden className="hidden size-5 dark:block" />
        </button>
    )
}
