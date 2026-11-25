import Link from 'next/link'
import { Highlight, ToolPage } from '@/app/(landing)/ToolPage'
import { pageMetadata } from '@/lib/site'

const path = '/filigrane-dossier-location'
const description =
    'Ajoutez un filigrane sur chaque pièce de votre dossier de location : identité, bulletins de salaire, avis d’imposition. Gratuit, sans envoi de vos fichiers.'

export const metadata = pageMetadata({
    title: 'Filigrane pour dossier de location, gratuit',
    description,
    path,
})

const faq = [
    {
        question: 'Un propriétaire peut-il refuser un document avec un filigrane ?',
        answer: 'Aucun texte n’interdit au candidat de porter une mention sur les copies qu’il fournit, et la liste des pièces exigibles ne précise pas qu’elles doivent être vierges. Le bailleur peut demander à voir l’original pour vérifier une information : montrez-le, sans en laisser de copie.',
    },
    {
        question: 'Faut-il refaire le filigrane pour chaque candidature ?',
        answer: 'C’est préférable. Une mention qui nomme l’agence ou le propriétaire et l’adresse du logement rend la copie inutilisable pour une autre démarche, et vous indique d’où elle vient si elle réapparaît ailleurs.',
    },
    {
        question: 'Puis-je traiter tout mon dossier en une seule fois ?',
        answer: 'Oui. Déposez plusieurs fichiers ou un ZIP qui contient tout le dossier, y compris rangé en sous-dossiers : vous récupérez un ZIP avec la même organisation, chaque page portant le filigrane.',
    },
    {
        question: 'Le filigrane empêche-t-il l’agence de vérifier mes revenus ?',
        answer: 'Non, si l’opacité reste modérée. Avec le réglage par défaut (25 %), les montants et les noms restent lisibles à travers la mention. Vérifiez dans l’aperçu que les chiffres importants ne sont pas masqués.',
    },
    {
        question: 'Et si la plateforme de location me demande de déposer mes pièces en ligne ?',
        answer: 'Le filigrane s’applique de la même façon : nommez la plateforme et le logement visé dans la mention, puis déposez les fichiers filigranés à la place des originaux.',
    },
    {
        question: 'Mes justificatifs passent-ils par vos serveurs ?',
        answer: 'Non. Tout le traitement a lieu dans votre navigateur. Vos bulletins de salaire et votre avis d’imposition ne sont envoyés nulle part.',
    },
]

export default function DossierLocation() {
    return (
        <ToolPage
            path={path}
            name="Filigrane pour dossier de location"
            description={description}
            breadcrumb={{ name: 'Dossier de location', path }}
            title={
                <>
                    Mettez un filigrane sur votre <Highlight>dossier de location</Highlight>
                </>
            }
            intro="Pièce d’identité, bulletins de salaire, avis d’imposition, quittances : marquez chaque page au nom de l’agence et du logement avant de l’envoyer. Le traitement a lieu dans votre navigateur, rien n’est transmis."
            defaultWatermark={'Valide uniquement pour dossier de location\nle {date}'}
            faq={faq}
        >
            <h2>Un dossier de location contient tout ce qu’il faut pour usurper une identité</h2>
            <p>
                Pour louer, on transmet en une fois sa pièce d’identité, ses justificatifs de
                domicile, de revenus et d’activité. Réunis, ces documents suffisent à ouvrir un
                compte en ligne, à demander un crédit à la consommation ou à signer un bail
                ailleurs, sous votre nom. Le risque est plus fort en période de recherche intense,
                quand on envoie le même dossier à dix annonces, dont certaines publiées par de faux
                propriétaires qui ne cherchent qu’à collecter des pièces.
            </p>
            <p>
                Le filigrane limite les dégâts : une copie qui porte le nom de l’agence, l’adresse
                du logement et la date ne peut pas servir telle quelle pour une autre démarche.
            </p>

            <h2>Quelles pièces un propriétaire peut-il demander</h2>
            <p>
                La liste est fixée par le décret n° 2015-1437 du 5 novembre 2015. Le bailleur ou
                l’agence ne peut demander que des pièces de ces quatre catégories :
            </p>
            <ul>
                <li>une pièce d’identité en cours de validité, avec photo ;</li>
                <li>
                    un justificatif de domicile, comme les trois dernières quittances de loyer ou le
                    dernier avis de taxe foncière ;
                </li>
                <li>
                    un ou plusieurs justificatifs d’activité professionnelle : contrat de travail,
                    carte d’étudiant, extrait Kbis ;
                </li>
                <li>
                    un ou plusieurs justificatifs de ressources : derniers bulletins de salaire,
                    dernier avis d’imposition, attestation de bourse.
                </li>
            </ul>
            <p>
                L’article 22-2 de la loi du 6 juillet 1989 interdit au contraire de réclamer
                certains documents, entre autres une photo d’identité en plus de la pièce
                d’identité, la carte Vitale, un relevé de compte bancaire, une attestation de bonne
                tenue de compte ou un extrait de casier judiciaire. Si on vous les demande, vous
                pouvez refuser de les fournir.
            </p>

            <h2>Quelle mention écrire sur un dossier de location</h2>
            <p>
                La mention par défaut, « Valide uniquement pour dossier de location » suivie de la
                date, protège déjà mieux qu’une copie vierge. Elle devient dissuasive quand elle
                nomme le destinataire et le logement, parce qu’elle ne peut alors plus servir qu’à
                une seule candidature :
            </p>
            <blockquote>
                <p>
                    Dossier transmis à l’agence Martin
                    <br />
                    pour la location du 12 rue des Lilas, Lyon 3e
                    <br />
                    le 3 mars, aucun autre usage
                </p>
            </blockquote>
            <p>
                Gardez la mention courte. Trois lignes se lisent d’un coup d’œil, et le texte reste
                assez grand une fois répété sur la page.
            </p>

            <h2>Préparer son dossier en cinq minutes</h2>
            <ol>
                <li>
                    Rassemblez les pièces demandées dans un dossier de votre ordinateur, puis
                    compressez-le en ZIP.
                </li>
                <li>
                    Déposez le ZIP ci-dessus : chaque PDF, photo ou scan est pris en compte,
                    sous-dossiers compris.
                </li>
                <li>
                    Écrivez la mention, puis vérifiez dans l’aperçu que les montants restent
                    lisibles.
                </li>
                <li>Téléchargez le ZIP filigrané et envoyez-le à la place des originaux.</li>
            </ol>
            <p>
                Pour la pièce d’identité, la page dédiée à la{' '}
                <Link href="/filigrane-carte-identite">copie de carte d’identité</Link> donne
                quelques conseils de prise de vue. Notre guide pour{' '}
                <Link href="/proteger-ses-justificatifs">protéger ses justificatifs</Link> détaille
                aussi comment repérer une fausse annonce.
            </p>
        </ToolPage>
    )
}
