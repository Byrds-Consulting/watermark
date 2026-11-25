import { PageShell, Prose } from '@/components/site/PageShell'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({
    title: 'Mentions légales',
    description: 'Éditeur, responsable de publication et hébergeur du site dossierpdf.fr.',
    path: '/mentions-legales',
})

export default function MentionsLegales() {
    return (
        <PageShell breadcrumb={{ name: 'Mentions légales', path: '/mentions-legales' }}>
            <Prose className="pt-10 pb-16 sm:pt-14">
                <h1 className="mb-8 font-display text-4xl font-bold tracking-tight">
                    Mentions légales
                </h1>

                <h2>Éditeur</h2>
                <p>
                    Le site dossierpdf.fr est édité par Byrds Consulting, société par actions
                    simplifiée (SAS) au capital de 1 000 €, immatriculée au RCS de Nanterre sous le numéro 982 951 915.
                </p>
                <ul>
                    <li>Siège social : 88 rue Armand Silvestre, 92400 Courbevoie, France</li>
                    <li>SIRET : 982 951 915 00023</li>
                    <li>TVA intracommunautaire : FR79 982 951 915</li>
                    <li>
                        Contact :{' '}
                        <a href="mailto:contact@byrds.consulting">contact@byrds.consulting</a>
                    </li>
                </ul>

                <h2>Responsable de publication</h2>
                <p>Théo Lubert, président de Byrds Consulting.</p>

                <h2>Hébergement</h2>
                <p>Le site est hébergé par OVH SAS, 2 rue Kellermann, 59100 Roubaix, France.</p>

                <h2>Propriété intellectuelle</h2>
                <p>
                    Les textes, éléments graphiques et développements propres au site sont protégés.
                    Toute reproduction substantielle nécessite une autorisation préalable. Les
                    documents que vous traitez avec l’outil restent les vôtres : ils ne sont ni
                    transmis ni conservés par le site.
                </p>

                <h2>Limitation de responsabilité</h2>
                <p>
                    L’outil est fourni gratuitement et en l’état. Vérifiez le document produit avant
                    de l’envoyer. Le filigrane rend une copie plus difficile à réutiliser, il ne
                    garantit pas qu’elle ne le sera jamais.
                </p>

                <p className="text-sm text-muted-foreground">
                    Dernière mise à jour : novembre 2026.
                </p>
            </Prose>
        </PageShell>
    )
}
