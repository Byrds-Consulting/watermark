'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import { CheckIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A password-protected PDF of the dossier. `unlocked`: added to the dossier, `unlockedBy` names the
 * file whose password opened it when it was another one. `unreadable`: the password is right, but
 * the PDF cannot be rendered anyway (corrupt, XFA form…).
 */
export type LockedFile = {
    name: string
    status: 'locked' | 'unlocked' | 'unreadable'
    unlockedBy?: string
}

/** Outcome for the file whose password was typed. */
export type UnlockResult = 'readable' | 'password' | 'unreadable'

type RowError = 'incorrect' | 'failed'

/**
 * Lists the password-protected PDFs of the dossier, each with its password field. A row turns green
 * once its file is unlocked. Closing it keeps the remaining files locked, ready for later.
 */
export function PasswordDialog({
    open,
    files,
    onUnlock,
    onClose,
}: {
    open: boolean
    files: LockedFile[]
    /** Tries `password` on `name`, and on the other locked files when `tryOthers`. */
    onUnlock: (name: string, password: string, tryOthers: boolean) => Promise<UnlockResult>
    onClose: () => void
}) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const titleId = useId()
    // Same password for several files is common (bank statements, payslips): try it on all of them.
    const [tryOthers, setTryOthers] = useState(true)

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (open && !dialog.open) dialog.showModal()
        else if (!open && dialog.open) dialog.close()
    }, [open])

    const remaining = files.filter((file) => file.status === 'locked').length
    const unlocked = files.filter((file) => file.status === 'unlocked').length
    const firstLocked = files.find((file) => file.status === 'locked')?.name

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            // Escape, or the close buttons: the remaining files stay available for later.
            onClose={onClose}
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border bg-card p-5 text-card-foreground shadow-2xl backdrop:bg-black/50 sm:p-6"
        >
            {open ? (
                <>
                    <h2 id={titleId} className="font-display text-lg font-bold">
                        {files.length > 1 ? `${files.length} PDF protégés` : 'PDF protégé'} par mot de passe
                    </h2>
                    <p className="mt-1 mb-4 text-sm text-muted-foreground">
                        {files.length > 1
                            ? 'Saisissez leur mot de passe pour les ajouter au dossier.'
                            : 'Saisissez son mot de passe pour l’ajouter au dossier.'}{' '}
                        Il reste dans votre navigateur, et les fichiers exportés ne seront plus protégés.
                    </p>
                    {/* sentry-block: file names may be personal, never record them in Session Replay. */}
                    <ul className="sentry-block flex flex-col gap-2">
                        {files.map((file) => (
                            <PasswordRow
                                key={file.name}
                                file={file}
                                autoFocus={file.name === firstLocked}
                                onUnlock={(password) => onUnlock(file.name, password, tryOthers)}
                            />
                        ))}
                    </ul>
                    {files.length > 1 && remaining > 0 ? (
                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                            <input
                                type="checkbox"
                                checked={tryOthers}
                                onChange={(event) => setTryOthers(event.target.checked)}
                                className="size-4 accent-brand"
                            />
                            Essayer chaque mot de passe sur tous les fichiers
                        </label>
                    ) : null}
                    <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                        {remaining > 0 ? (
                            <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>
                                Ignorer pour l’instant
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            className="rounded-xl font-semibold"
                            disabled={remaining > 0}
                            onClick={onClose}
                        >
                            Continuer{remaining > 0 ? ` (${unlocked}/${files.length})` : ''}
                        </Button>
                    </div>
                </>
            ) : null}
        </dialog>
    )
}

function PasswordRow({
    file,
    autoFocus,
    onUnlock,
}: {
    file: LockedFile
    autoFocus: boolean
    onUnlock: (password: string) => Promise<UnlockResult>
}) {
    const [password, setPassword] = useState('')
    const [visible, setVisible] = useState(false)
    const [checking, setChecking] = useState(false)
    const [error, setError] = useState<RowError | null>(null)
    const inputId = useId()
    const errorId = useId()

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!password || checking) return
        setChecking(true)
        setError(null)
        try {
            const result = await onUnlock(password)
            if (result === 'password') setError('incorrect')
        } catch {
            setError('failed')
        } finally {
            setChecking(false)
        }
    }

    const done = file.status === 'unlocked'
    const unreadable = file.status === 'unreadable'
    const meta = done
        ? file.unlockedBy
            ? 'Déverrouillé avec le même mot de passe'
            : 'Déverrouillé'
        : unreadable
          ? 'Mot de passe correct, mais ce PDF est illisible'
          : error === 'incorrect'
            ? 'Mot de passe incorrect'
            : error === 'failed'
              ? 'La vérification a échoué, réessayez'
              : null

    return (
        <li
            className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3 transition-colors', {
                'border-brand/30 bg-inset': done,
                'border-destructive/40': unreadable || error,
            })}
        >
            <span
                aria-hidden
                className={cn('grid size-7 shrink-0 place-items-center rounded-full transition-colors', {
                    'bg-primary text-primary-foreground': done,
                    'bg-destructive/10 text-destructive': !done && (unreadable || error),
                    'bg-muted text-muted-foreground': !done && !unreadable && !error,
                })}
            >
                {done ? (
                    <CheckIcon className="size-4 stroke-[2.5]" />
                ) : unreadable || error ? (
                    <ExclamationCircleIcon className="size-4" />
                ) : (
                    <LockClosedIcon className="size-4" />
                )}
            </span>
            <div className="min-w-0 flex-1 basis-40">
                <label htmlFor={inputId} className="block truncate text-sm font-semibold" title={file.name}>
                    {file.name}
                </label>
                {meta ? (
                    <p
                        id={errorId}
                        role={done ? 'status' : 'alert'}
                        className={cn('text-xs', done ? 'text-brand' : 'text-destructive')}
                    >
                        {meta}
                    </p>
                ) : null}
            </div>
            {file.status === 'locked' ? (
                <form onSubmit={submit} className="flex w-full gap-2 sm:w-auto">
                    <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
                        <input
                            id={inputId}
                            type={visible ? 'text' : 'password'}
                            autoComplete="off"
                            autoFocus={autoFocus}
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value)
                                setError(null)
                            }}
                            aria-invalid={error === 'incorrect'}
                            aria-describedby={meta ? errorId : undefined}
                            placeholder="Mot de passe"
                            className={cn(
                                'h-9 w-full rounded-lg border border-control-border bg-background pr-9 pl-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30',
                                { 'border-destructive': error === 'incorrect' },
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setVisible((value) => !value)}
                            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            className="absolute inset-y-0 right-0 grid w-9 place-items-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                        </button>
                    </div>
                    <Button type="submit" size="sm" className="rounded-lg font-semibold" disabled={!password || checking}>
                        {checking ? 'Vérification…' : 'Déverrouiller'}
                    </Button>
                </form>
            ) : null}
        </li>
    )
}
