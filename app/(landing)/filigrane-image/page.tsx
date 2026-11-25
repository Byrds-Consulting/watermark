import Link from 'next/link'
import { Highlight, ToolPage } from '@/app/(landing)/ToolPage'
import { pageMetadata } from '@/lib/site'

const path = '/filigrane-image'
const description =
    'Ajoutez un filigrane sur vos images JPEG et PNG : photos de documents, scans, captures d’écran. Converties en PDF, gratuitement et sans envoi de vos fichiers.'

export const metadata = pageMetadata({
    title: 'Ajouter un filigrane sur une image JPEG ou PNG',
    description,
    path,
})

const faq = [
    {
        question: 'Puis-je récupérer une image plutôt qu’un PDF ?',
        answer: 'Non, le résultat est toujours un PDF, avec une page par image. C’est le format que demandent la plupart des agences, administrations et plateformes, et il réunit facilement plusieurs pièces.',
    },
    {
        question: 'Quels formats d’image sont acceptés ?',
        answer: 'JPEG et PNG. Les photos HEIC d’un iPhone doivent d’abord être converties en JPEG : réglez l’appareil photo sur « Le plus compatible » ou exportez la photo en JPEG depuis l’application Photos.',
    },
    {
        question: 'La qualité de mon image est-elle conservée ?',
        answer: 'La page garde les dimensions de l’image et une définition suffisante pour lire et imprimer le document. L’image est recompressée en JPEG avec le filigrane, son poids peut donc changer.',
    },
    {
        question: 'Puis-je filigraner plusieurs images d’un coup ?',
        answer: 'Oui, jusqu’à 200 fichiers par importation. Déposez-les ensemble ou dans un ZIP : vous récupérez un ZIP avec un PDF filigrané par image.',
    },
    {
        question: 'Mes photos sont-elles envoyées sur un serveur ?',
        answer: 'Non. La conversion en PDF et l’ajout du filigrane ont lieu dans votre navigateur. Vos images ne quittent pas votre appareil.',
    },
]

export default function FiligraneImage() {
    return (
        <ToolPage
            path={path}
            name="Filigrane sur une image JPEG ou PNG"
            description={description}
            breadcrumb={{ name: 'Image JPEG ou PNG', path }}
            title={
                <>
                    Ajoutez un filigrane sur une <Highlight>image JPEG ou PNG</Highlight>
                </>
            }
            intro="Photo d’un bulletin de salaire, scan d’un justificatif, capture d’écran d’une attestation : déposez vos images, elles ressortent en PDF avec le filigrane sur chaque page. Rien n’est envoyé sur Internet."
            defaultWatermark={'Copie réservée à un usage unique\nle {date}'}
            faq={faq}
        >
            <h2>Des justificatifs souvent envoyés en photo</h2>
            <p>
                Beaucoup de justificatifs n’existent que sous forme de photo : le bulletin de
                salaire papier pris sur la table de la cuisine, la quittance scannée avec une
                application, la capture d’écran d’une attestation téléchargée sur un espace client.
                Ces images circulent par mail ou par messagerie sans aucune protection. Elles
                contiennent pourtant les mêmes informations qu’un PDF officiel, et se réutilisent
                aussi facilement.
            </p>

            <h2>Comment l’image est convertie</h2>
            <p>
                Chaque image devient une page de PDF à ses dimensions exactes. L’outil lit
                l’orientation enregistrée par le téléphone, si bien qu’une photo prise à la
                verticale ne ressort pas couchée. Le filigrane est ensuite dessiné dans les pixels
                de la page, puis le tout est enregistré comme une image : la mention ne peut pas
                être sélectionnée et supprimée comme un calque.
            </p>
            <p>
                Le résultat est un PDF. Un seul fichier déposé donne un seul PDF. Plusieurs fichiers
                donnent une archive ZIP, qui conserve les noms d’origine.
            </p>

            <h2>Mélanger images et PDF dans un même dossier</h2>
            <p>
                Vous pouvez déposer en même temps des photos et des PDF, ou un ZIP qui contient les
                deux. Tout reçoit le même filigrane, ce qui est pratique pour un{' '}
                <Link href="/filigrane-dossier-location">dossier de location</Link> où se côtoient
                un avis d’imposition en PDF et des bulletins de salaire photographiés.
            </p>

            <h2>Réussir la photo d’un document</h2>
            <p>
                Une photo nette évite qu’on vous redemande la pièce. Posez le document à plat, près
                d’une fenêtre, et photographiez-le d’au-dessus pour que les lignes restent droites.
                Recadrez sur le document avant de le déposer : les bords de la table ou le clavier
                n’ont rien à faire dans un justificatif. Pour une{' '}
                <Link href="/filigrane-carte-identite">carte d’identité</Link>, photographiez chaque
                face séparément.
            </p>
        </ToolPage>
    )
}
