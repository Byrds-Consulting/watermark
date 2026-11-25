import Link from 'next/link'
import { JsonLd } from '@/components/site/JsonLd'
import { PageShell, Prose } from '@/components/site/PageShell'
import { OG_IMAGE, pageMetadata, PUBLISHER, SITE_URL } from '@/lib/site'

const path = '/proteger-ses-justificatifs'
const title = 'Protéger ses justificatifs contre l’usurpation d’identité'
const description =
    'Pièces à ne jamais envoyer, filigrane, fausses annonces, canal d’envoi et démarches en cas de fraude : les bons réflexes avant de transmettre un dossier.'
const published = '2026-11-25'
const modified = '2026-11-25'

export const metadata = pageMetadata({
    title,
    absoluteTitle: true,
    description,
    path,
    type: 'article',
})

export default function Guide() {
    return (
        <PageShell breadcrumb={{ name: 'Protéger ses justificatifs', path }}>
            <Prose className="pt-10 pb-16 sm:pt-14">
                <article>
                    <header className="mb-10">
                        <h1 className="mb-4 font-display text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
                            {title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Par Byrds Consulting · mis à jour le{' '}
                            <time dateTime={modified}>25 novembre 2026</time>
                        </p>
                    </header>

                    <p>
                        Combien de copies de votre carte d’identité circulent en ce moment ? Une
                        chez l’agence qui a refusé votre dossier l’an dernier, une dans la boîte
                        mail d’un propriétaire, une autre sur le drive d’un employeur. Vous ne
                        contrôlez plus aucune d’elles. Vous pouvez en revanche limiter ce que
                        chacune peut coûter si elle tombe entre de mauvaises mains.
                    </p>

                    <h2>Ce qu’un fraudeur peut faire avec vos documents</h2>
                    <p>
                        Une copie de pièce d’identité, associée à un justificatif de domicile et à
                        des bulletins de salaire, permet d’ouvrir un compte en ligne, de souscrire
                        un crédit à la consommation, une ligne téléphonique ou un contrat d’énergie,
                        et même de louer un logement sous votre nom. Les victimes l’apprennent
                        souvent tard, par un courrier de recouvrement ou un refus de prêt
                        inexpliqué, et passent ensuite des mois à prouver qu’elles n’ont rien signé.
                    </p>
                    <p>
                        Le dossier de location est la cible idéale. Il réunit en un seul envoi
                        l’identité, l’adresse, l’employeur et les revenus d’une personne, et on
                        l’envoie à des inconnus.
                    </p>

                    <h2>N’envoyer que les pièces exigées</h2>
                    <p>
                        Premier réflexe, qui ne coûte rien : ne pas envoyer ce qu’on ne vous a pas
                        le droit de demander. Pour une location, le décret n° 2015-1437 du 5
                        novembre 2015 fixe la liste des pièces exigibles, et l’article 22-2 de la
                        loi du 6 juillet 1989 interdit notamment de réclamer un relevé de compte
                        bancaire, la carte Vitale, une photo d’identité en plus de la pièce
                        d’identité ou un extrait de casier judiciaire. Un interlocuteur qui insiste
                        pour obtenir ces documents vous donne une bonne raison de vous méfier.
                    </p>
                    <p>
                        Ailleurs, la règle est la même. Demandez à quoi sert chaque pièce avant de
                        la transmettre, et masquez ce qui n’est pas nécessaire, comme le numéro de
                        sécurité sociale sur un bulletin de salaire quand seul le montant compte.
                    </p>

                    <h2>Marquer chaque copie avec un filigrane</h2>
                    <p>
                        Un filigrane inscrit sur chaque page le destinataire, l’usage et la date. La
                        copie reste lisible pour celui qui doit la vérifier, mais elle ne peut plus
                        servir telle quelle pour une autre démarche. Service-public.fr recommande
                        d’ailleurs ce réflexe pour toute copie de pièce d’identité.
                    </p>
                    <p>
                        Le filigrane doit couvrir toute la page, en diagonale et répété, pour
                        qu’aucune zone ne puisse être recadrée proprement. Il doit aussi faire
                        partie de l’image : une annotation ajoutée dans un lecteur PDF se supprime
                        en deux clics. L’outil de <Link href="/">Dossier PDF</Link> aplatit chaque
                        page pour cette raison, et il fonctionne sans envoyer vos fichiers sur un
                        serveur. Il a des pages dédiées au{' '}
                        <Link href="/filigrane-dossier-location">dossier de location</Link> et à la{' '}
                        <Link href="/filigrane-carte-identite">carte d’identité</Link>.
                    </p>

                    <h2>Repérer une fausse annonce de location</h2>
                    <p>
                        Les fausses annonces servent à deux choses : encaisser un dépôt de garantie
                        pour un logement qui n’existe pas, ou collecter des dossiers complets. Les
                        signaux d’alerte se ressemblent d’une arnaque à l’autre :
                    </p>
                    <ul>
                        <li>un loyer nettement inférieur aux prix du quartier ;</li>
                        <li>un propriétaire à l’étranger, qui ne peut pas faire visiter ;</li>
                        <li>une demande de dossier complet avant toute visite ;</li>
                        <li>
                            un paiement réclamé avant la signature du bail, par virement ou mandat
                            cash ;
                        </li>
                        <li>
                            des échanges qui quittent vite le site d’annonces pour une messagerie.
                        </li>
                    </ul>
                    <p>
                        Un vrai bailleur fait visiter. Tant que vous n’avez pas vu le logement et
                        rencontré la personne ou l’agence, n’envoyez rien.
                    </p>

                    <h2>Choisir un canal d’envoi sûr</h2>
                    <p>
                        Un mail reste stocké des années dans deux boîtes, souvent davantage s’il est
                        transféré. Préférez la plateforme de l’agence ou un service conçu pour ça,
                        comme DossierFacile, le service public de constitution de dossiers de
                        location. Si vous passez par un lien de partage, limitez sa durée de
                        validité et supprimez les fichiers une fois le dossier traité. Évitez les
                        messageries grand public pour les pièces d’identité.
                    </p>

                    <h2>Que faire si vos documents ont été utilisés à votre insu</h2>
                    <p>
                        Agissez vite, et gardez une trace de chaque démarche. Déposez plainte au
                        commissariat ou à la gendarmerie pour usurpation d’identité, avec tous les
                        éléments dont vous disposez : courriers reçus, contrats inconnus, échanges
                        avec le faux bailleur. Prévenez votre banque et les organismes concernés en
                        joignant la copie de la plainte.
                    </p>
                    <p>
                        Vous pouvez ensuite consulter gratuitement le fichier des incidents de
                        remboursement des crédits aux particuliers (FICP) auprès de la Banque de
                        France : un incident enregistré à votre nom peut révéler un crédit souscrit
                        puis laissé impayé par un fraudeur. Le site cybermalveillance.gouv.fr
                        oriente aussi les victimes vers les bons interlocuteurs selon leur
                        situation.
                    </p>

                    <h2>Par où commencer aujourd’hui</h2>
                    <p>
                        Prenez le dernier dossier que vous avez préparé. Retirez les pièces qu’on ne
                        pouvait pas vous demander, puis <Link href="/">ajoutez un filigrane</Link>{' '}
                        au nom du prochain destinataire avant de l’envoyer. Cinq minutes suffisent,
                        et la prochaine copie qui circulera portera son usage écrit dessus.
                    </p>
                </article>
            </Prose>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: title,
                    description,
                    inLanguage: 'fr',
                    datePublished: published,
                    dateModified: modified,
                    mainEntityOfPage: `${SITE_URL}${path}`,
                    image: OG_IMAGE.url,
                    author: PUBLISHER,
                    publisher: PUBLISHER,
                }}
            />
        </PageShell>
    )
}
