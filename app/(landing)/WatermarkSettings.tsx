'use client'

import { useId } from 'react'
import { AdjustmentsHorizontalIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import {
    DEFAULT_WATERMARK_STYLE,
    MULTI_COLOR,
    MULTI_COLOR_PALETTE,
    WATERMARK_LIMITS,
    type WatermarkStyle,
} from '@/lib/pdf'
import { cn } from '@/lib/utils'

const multiSwatch = `conic-gradient(${MULTI_COLOR_PALETTE.map(
    (color, i) =>
        `${color} ${(i * 100) / MULTI_COLOR_PALETTE.length}% ${((i + 1) * 100) / MULTI_COLOR_PALETTE.length}%`,
).join(', ')})`

const COLORS = [
    { name: 'Multicolore', value: MULTI_COLOR, swatch: multiSwatch },
    { name: 'Vert', value: '#146b0a' },
    { name: 'Rouge', value: '#d92d20' },
    { name: 'Bleu', value: '#1d4ed8' },
    { name: 'Gris', value: '#4b5563' },
    { name: 'Noir', value: '#111111' },
]

const percent = (value: number) => `${Math.round(value * 100)} %`

function isDefault(style: WatermarkStyle) {
    return (Object.keys(DEFAULT_WATERMARK_STYLE) as (keyof WatermarkStyle)[]).every(
        (key) => style[key] === DEFAULT_WATERMARK_STYLE[key],
    )
}

function Slider({
    label,
    value,
    display,
    min,
    max,
    step,
    disabled,
    onChange,
}: {
    label: string
    value: number
    display: string
    min: number
    max: number
    step: number
    disabled?: boolean
    onChange: (value: number) => void
}) {
    const id = useId()
    return (
        <div className={cn('flex flex-col gap-1.5', disabled && 'opacity-50')}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <label htmlFor={id} className="font-medium">
                    {label}
                </label>
                <span className="text-muted-foreground tabular-nums">{display}</span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(Number(event.target.value))}
                className="h-6 w-full cursor-pointer accent-brand disabled:cursor-not-allowed"
            />
        </div>
    )
}

/** Appearance of the watermark: color, opacity, angle, size, waves, spacing and tiling. */
export function WatermarkSettings({
    style,
    onChange,
}: {
    style: WatermarkStyle
    onChange: (style: WatermarkStyle) => void
}) {
    const set = <K extends keyof WatermarkStyle>(key: K, value: WatermarkStyle[K]) => onChange({ ...style, [key]: value })
    const isPreset = COLORS.some((color) => color.value === style.color)
    const repeatId = useId()

    return (
        <details className="group rounded-xl border">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <AdjustmentsHorizontalIcon aria-hidden className="size-5 text-brand" />
                Personnaliser le filigrane
                <ChevronDownIcon aria-hidden className="ml-auto size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-4 border-t px-4 pt-4 pb-4">
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-sm font-medium">Couleur</legend>
                    <div className="flex flex-wrap items-center gap-2">
                        {COLORS.map((color) => (
                            <label
                                key={color.value}
                                title={color.name}
                                className="relative flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-transparent has-checked:border-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
                            >
                                <input
                                    type="radio"
                                    name="watermark-color"
                                    value={color.value}
                                    checked={style.color === color.value}
                                    onChange={() => set('color', color.value)}
                                    className="sr-only"
                                />
                                <span className="sr-only">{color.name}</span>
                                <span aria-hidden className="size-7 rounded-full" style={{ background: 'swatch' in color ? color.swatch : color.value }} />
                                {style.color === color.value ? (
                                    <CheckIcon aria-hidden className="absolute size-4 text-white" />
                                ) : null}
                            </label>
                        ))}
                        <label
                            title="Autre couleur"
                            className={cn(
                                'relative flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-transparent has-focus-visible:ring-2 has-focus-visible:ring-ring',
                                !isPreset && 'border-foreground',
                            )}
                        >
                            <span className="sr-only">Autre couleur</span>
                            <span
                                aria-hidden
                                className="size-7 rounded-full"
                                style={{
                                    background: isPreset
                                        ? 'conic-gradient(#d92d20, #f59e0b, #146b0a, #1d4ed8, #7c3aed, #d92d20)'
                                        : style.color,
                                }}
                            />
                            <input
                                type="color"
                                value={style.color === MULTI_COLOR ? MULTI_COLOR_PALETTE[0] : style.color}
                                onChange={(event) => set('color', event.target.value)}
                                className="absolute inset-0 size-full cursor-pointer opacity-0"
                            />
                        </label>
                    </div>
                </fieldset>
                <Slider
                    label="Opacité"
                    value={style.opacity}
                    display={percent(style.opacity)}
                    {...WATERMARK_LIMITS.opacity}
                    step={0.05}
                    onChange={(value) => set('opacity', value)}
                />
                <Slider
                    label="Angle"
                    value={style.angle}
                    display={`${style.angle}°`}
                    {...WATERMARK_LIMITS.angle}
                    step={5}
                    onChange={(value) => set('angle', value)}
                />
                <Slider
                    label="Taille du texte"
                    value={style.size}
                    display={percent(style.size)}
                    {...WATERMARK_LIMITS.size}
                    step={0.1}
                    onChange={(value) => set('size', value)}
                />
                <Slider
                    label="Vagues"
                    value={style.wave}
                    display={style.wave ? percent(style.wave) : 'Aucune'}
                    {...WATERMARK_LIMITS.wave}
                    step={0.1}
                    onChange={(value) => set('wave', value)}
                />
                <div className="flex items-center gap-2.5 text-sm">
                    <input
                        id={repeatId}
                        type="checkbox"
                        checked={style.repeat}
                        onChange={(event) => set('repeat', event.target.checked)}
                        className="size-4 cursor-pointer accent-brand"
                    />
                    <label htmlFor={repeatId} className="cursor-pointer font-medium">
                        Répéter sur toute la page
                    </label>
                </div>
                <Slider
                    label="Espacement"
                    value={style.spacing}
                    display={percent(style.spacing)}
                    {...WATERMARK_LIMITS.spacing}
                    step={0.1}
                    disabled={!style.repeat}
                    onChange={(value) => set('spacing', value)}
                />
                {isDefault(style) ? null : (
                    <button
                        type="button"
                        onClick={() => onChange(DEFAULT_WATERMARK_STYLE)}
                        className="self-start text-sm font-medium text-brand hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                        Revenir aux réglages par défaut
                    </button>
                )}
            </div>
        </details>
    )
}
