import Link from 'next/link'
import { Highlight, ToolPage } from '@/app/(landing)/ToolPage'
import { pageMetadata } from '@/lib/site'

const path = '/filigrane-carte-identite'
const description =
    'Ajoutez un filigrane sur la copie de votre carte d’identité, de votre passeport ou de votre titre de séjour. Gratuit, sans envoi : la photo reste sur votre appareil.'

export const metadata = pageMetadata({
    title: 'Filigrane sur une copie de carte d’identité',
    description,
    path,
})

const faq = [
    {
        question: 'Une copie de carte d’identité avec un filigrane reste-t-elle valable ?',
        answer: 'Oui pour la plupart des démarches : la photo, le nom et le numéro restent lisibles. Certains organismes, comme une banque à l’ouverture d’un compte, vérifient l’identité avec leur propre procédure et peuvent refuser une copie marquée. Dans ce cas, nommez l’organisme dans la mention plutôt que d’envoyer une copie vierge.',
    },
    {
        question: 'Comment filigraner le recto et le verso ?',
        answer: 'Photographiez ou scannez les deux faces, puis déposez les deux fichiers en même temps. Chaque image devient un PDF filigrané, et vous récupérez les deux dans un ZIP.',
    },
    {
        question: 'Ça marche aussi pour un passeport ou un titre de séjour ?',
        answer: 'Oui. L’outil traite n’importe quelle image JPEG ou PNG et n’importe quel PDF, quel que soit le document qu’ils représentent.',
    },
    {
        question: 'Ma photo est-elle envoyée sur Internet ?',
        answer: 'Non. L’image est lue, convertie et filigranée dans votre navigateur. Elle ne quitte pas votre ordinateur ou votre téléphone.',
    },
    {
        question: 'Le filigrane peut-il masquer ma photo ou mon numéro ?',
        answer: 'Il passe par-dessus, en transparence. Avec une opacité autour de 40 %, tout reste lisible. Si un caractère important tombe sous le texte, réduisez la taille ou modifiez l’angle et vérifiez dans l’aperçu.',
    },
]

export default function CarteIdentite() {
    return (
        <ToolPage
            path={path}
            name="Filigrane sur une copie de carte d’identité"
            description={description}
            breadcrumb={{ name: 'Carte d’identité', path }}
            title={
                <>
                    Ajoutez un filigrane sur la copie de votre{' '}
                    <Highlight>carte d’identité</Highlight>
                </>
            }
            intro="Carte d’identité, passeport, titre de séjour ou permis de conduire : déposez la photo ou le scan, indiquez à qui il est destiné, et récupérez une copie marquée. Votre pièce ne quitte pas votre appareil."
            defaultWatermark={'Copie réservée à un usage unique\nle {date}'}
            faq={faq}
        >
            <h2>Pourquoi filigraner une copie de pièce d’identité</h2>
            <p>
                La copie d’une pièce d’identité est souvent le point de départ d’une usurpation.
                Avec elle et un justificatif de domicile, un fraudeur peut ouvrir un compte en
                ligne, souscrire un abonnement ou demander un crédit en votre nom. Vous ne
                l’apprenez souvent que des mois plus tard, par une relance de paiement ou un refus
                de prêt. Service-public.fr conseille d’ailleurs d’apposer un filigrane sur toute
                copie de pièce d’identité que vous transmettez.
            </p>
            <p>
                La mention indique à qui la copie a été remise, pour quoi et quand. Un organisme qui
                la recevrait d’un tiers voit immédiatement qu’elle ne lui était pas destinée.
            </p>

            <h2>Photographier sa pièce avant de la filigraner</h2>
            <p>
                Un filigrane posé sur une photo floue ou pleine de reflets rend le document
                illisible, et le destinataire vous redemandera une copie. Quelques précautions
                évitent cet aller-retour :
            </p>
            <ul>
                <li>
                    posez la carte sur un fond uni et sombre, à la lumière du jour, sans flash ;
                </li>
                <li>
                    cadrez la carte entière, bords compris, en tenant le téléphone bien parallèle ;
                </li>
                <li>photographiez le recto et le verso séparément, en deux fichiers ;</li>
                <li>
                    préférez un scan à 300 ppp si vous avez un scanner : le texte sera plus net.
                </li>
            </ul>
            <p>
                Inutile de redresser la photo : si elle a été prise téléphone tourné, l’outil lit
                son orientation et la remet à l’endroit dans le PDF.
            </p>

            <h2>Ce qu’il faut écrire sur une copie de pièce d’identité</h2>
            <p>
                Nommez le destinataire et la démarche, puis ajoutez la date. Par exemple, « Copie
                remise à la mairie de Nantes pour l’inscription scolaire, le 3 mars ». Évitez les
                formules vagues comme « copie » ou « document confidentiel » : elles n’indiquent ni
                le destinataire ni l’usage, et la copie reste réutilisable partout.
            </p>

            <h2>Ce que le filigrane ne protège pas</h2>
            <p>
                Le filigrane rend la copie difficile à réutiliser, mais vos informations restent
                lisibles : nom, date de naissance, numéro du document. Avant d’envoyer une pièce
                d’identité, demandez-vous si elle est vraiment exigée. Pour louer un logement, par
                exemple, la{' '}
                <Link href="/filigrane-dossier-location">liste des pièces exigibles</Link> est fixée
                par décret, et le bailleur ne peut pas réclamer davantage. Le{' '}
                <Link href="/proteger-ses-justificatifs">
                    guide pour protéger ses justificatifs
                </Link>{' '}
                détaille les autres réflexes à prendre.
            </p>
        </ToolPage>
    )
}
