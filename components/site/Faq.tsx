import { JsonLd } from '@/components/site/JsonLd'

export type FaqItem = { question: string; answer: string }

/** Questions and answers, with their FAQPage structured data. Answers are plain text. */
export function Faq({
    items,
    title = 'Questions fréquentes',
}: {
    items: FaqItem[]
    title?: string
}) {
    return (
        <section aria-labelledby="faq" className="w-full max-w-3xl px-4 py-10 sm:px-6">
            <h2
                id="faq"
                className="mb-6 font-display text-2xl font-bold tracking-tight sm:text-3xl"
            >
                {title}
            </h2>
            <div className="divide-y rounded-2xl border bg-card">
                {items.map(({ question, answer }) => (
                    <details key={question} className="group px-5 py-4 sm:px-6">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                            <h3>{question}</h3>
                            <span
                                aria-hidden
                                className="mt-0.5 text-brand transition-transform group-open:rotate-45"
                            >
                                +
                            </span>
                        </summary>
                        <p className="mt-3 leading-relaxed text-muted-foreground">{answer}</p>
                    </details>
                ))}
            </div>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: items.map(({ question, answer }) => ({
                        '@type': 'Question',
                        name: question,
                        acceptedAnswer: { '@type': 'Answer', text: answer },
                    })),
                }}
            />
        </section>
    )
}
