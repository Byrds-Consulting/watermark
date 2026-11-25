import { PageShell, Prose } from '@/components/site/PageShell'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({
    title: 'Politique de confidentialité',
    description:
        'Vos documents sont traités dans votre navigateur et ne sont jamais envoyés. Mesure d’audience, suivi des erreurs et chat : ce que le site collecte, et pourquoi.',
    path: '/confidentialite',
})

export default function Confidentialite() {
    return (
        <PageShell breadcrumb={{ name: 'Confidentialité', path: '/confidentialite' }}>
            <Prose className="pt-10 pb-16 sm:pt-14">
                <h1 className="mb-8 font-display text-4xl font-bold tracking-tight">
                    Politique de confidentialité
                </h1>

                <h2>Vos documents</h2>
                <p>
                    Les fichiers que vous déposez sont lus, filigranés et regroupés dans votre
                    navigateur. Ils ne sont envoyés à aucun serveur, ni le nôtre ni celui d’un
                    prestataire, et disparaissent quand vous fermez l’onglet. Le texte du filigrane
                    reste lui aussi sur votre appareil.
                </p>

                <h2>Mesure d’audience</h2>
                <p>
                    Le site utilise Plausible, hébergé sur nos propres serveurs, pour compter les
                    visites et quelques actions (import et téléchargement d’un dossier). Plausible
                    ne dépose pas de cookie et ne conserve que des statistiques agrégées, sans
                    adresse IP ni profil individuel.
                </p>

                <h2>Suivi des erreurs</h2>
                <p>
                    Pour corriger les bugs, le site envoie des rapports d’erreur techniques à Sentry
                    (Functional Software Inc.), dans sa région de l’Union européenne. Une partie des
                    visites est enregistrée sous forme de rejeu de session : les textes sont
                    masqués, les images bloquées, et la zone d’aperçu de vos documents est exclue de
                    l’enregistrement. Le contenu de vos fichiers n’est jamais transmis.
                </p>

                <h2>Chat</h2>
                <p>
                    Si vous utilisez le chat, les messages et les informations que vous y donnez
                    sont traités par Crisp (Crisp IM SAS, France) pour que nous puissions vous
                    répondre. Crisp utilise un cookie pour retrouver votre conversation. N’envoyez
                    pas de justificatif par le chat.
                </p>

                <h2>Stockage local</h2>
                <p>
                    Le thème choisi (clair, sombre ou celui du système) est mémorisé dans le
                    stockage local de votre navigateur. Il n’est pas transmis.
                </p>

                <h2>Durée de conservation et droits</h2>
                <p>
                    Les échanges par chat ou par e-mail sont conservés le temps nécessaire au suivi
                    de votre demande. Vous pouvez demander l’accès, la rectification ou l’effacement
                    de vos données, ou vous opposer à leur traitement, en écrivant à{' '}
                    <a href="mailto:contact@byrds.consulting">contact@byrds.consulting</a>. Vous
                    pouvez aussi adresser une réclamation à la CNIL.
                </p>

                <p className="text-sm text-muted-foreground">
                    Dernière mise à jour : novembre 2026.
                </p>
            </Prose>
        </PageShell>
    )
}
