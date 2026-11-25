import Link from 'next/link'
import { Highlight, ToolPage } from '@/app/(landing)/ToolPage'
import { JsonLd } from '@/components/site/JsonLd'
import { pageMetadata, PUBLISHER, SITE_NAME, SITE_URL } from '@/lib/site'

const description =
    'Ajoutez un filigrane sur vos PDF, photos et justificatifs avant de les envoyer. Gratuit et sans inscription : vos fichiers ne quittent jamais votre ordinateur.'

export const metadata = pageMetadata({
    title: 'Ajouter un filigrane sur un PDF gratuitement | Dossier PDF',
    absoluteTitle: true,
    description,
    path: '/',
})

const faq = [
    {
        question: 'Mes fichiers sont-ils envoyés sur un serveur ?',
        answer: 'Non. La lecture des fichiers, l’ajout du filigrane et la création du ZIP ont lieu dans votre navigateur. Le site reçoit seulement des statistiques de visite anonymes et des rapports d’erreur techniques, jamais le contenu de vos documents.',
    },
    {
        question: 'Le service est-il vraiment gratuit ?',
        answer: 'Oui, sans inscription ni limite d’utilisation. Une seule importation peut contenir jusqu’à 200 fichiers et 500 Mo, pour que l’onglet ne manque pas de mémoire.',
    },
    {
        question: 'Quels formats de fichiers sont acceptés ?',
        answer: 'Les PDF, les images JPEG et PNG, et les archives ZIP qui en contiennent, y compris des dossiers rangés dans des sous-dossiers. Les images sont converties en PDF, dans le bon sens même si la photo a été prise téléphone tourné.',
    },
    {
        question: 'Le filigrane peut-il être retiré ?',
        answer: 'Pas comme une annotation ou un calque : chaque page est convertie en image avec la mention dessinée dans les mêmes pixels. Quelqu’un de déterminé pourrait retoucher l’image, comme n’importe quelle photo, mais un filigrane répété sur toute la page rend ce travail long et visible.',
    },
    {
        question: 'Le texte de mes PDF reste-t-il sélectionnable ?',
        answer: 'Non. Les pages deviennent des images en 144 points par pouce : elles restent nettes à l’écran comme à l’impression, mais on ne peut plus copier le texte ni remplir les champs d’un formulaire.',
    },
    {
        question: 'Quels caractères puis-je utiliser dans le filigrane ?',
        answer: 'Les lettres accentuées du français, les chiffres et la ponctuation courante, sur 10 lignes au maximum. Les emoji et les alphabets non latins ne sont pas pris en charge : le site signale les caractères concernés avant le téléchargement.',
    },
    {
        question: 'Que faire d’un PDF protégé par mot de passe ?',
        answer: 'Il est refusé, car le navigateur ne peut pas l’ouvrir sans le mot de passe. Ouvrez-le dans votre lecteur PDF, enregistrez une copie sans protection ou imprimez-le en PDF, puis déposez cette copie.',
    },
    {
        question: 'Faut-il installer un logiciel ?',
        answer: 'Non. Le site fonctionne dans un navigateur récent, sur ordinateur comme sur téléphone. Une fois la page chargée, le traitement ne dépend plus de votre connexion.',
    },
]

export default function Home() {
    return (
        <>
            <ToolPage
                path="/"
                name={SITE_NAME}
                description={description}
                title={
                    <>
                        Ajoutez un filigrane sur vos justificatifs{' '}
                        <Highlight>avant de les envoyer</Highlight>
                    </>
                }
                intro="Déposez vos PDF ou vos photos, écrivez à qui ils sont destinés et téléchargez un dossier dont chaque page porte la mention. Tout se passe dans votre navigateur : vos documents ne quittent jamais votre ordinateur."
                defaultWatermark={'Valide uniquement pour dossier de location\nle {date}'}
                faq={faq}
            >
                <h2>Pourquoi mettre un filigrane sur ses documents</h2>
                <p>
                    Une copie de pièce d’identité, trois bulletins de salaire et un avis
                    d’imposition : c’est ce que demande une agence pour louer un appartement, et
                    c’est aussi ce qu’il faut pour ouvrir un compte, souscrire un crédit ou une
                    ligne téléphonique au nom de quelqu’un d’autre. Une fois envoyés, vos
                    justificatifs vous échappent. Ils dorment dans une boîte mail, passent d’un
                    collaborateur à l’autre, et finissent parfois entre les mains d’un faux bailleur
                    qui collecte des dossiers.
                </p>
                <p>
                    Le filigrane ne cache rien. Le destinataire lit tout ce dont il a besoin. Mais
                    la copie porte désormais son usage, son destinataire et sa date, et elle ne vaut
                    plus grand-chose ailleurs : un organisme qui reçoit une pièce d’identité marquée
                    « pour la location du 12 rue des Lilas, agence Martin » a toutes les raisons de
                    s’en méfier.
                </p>

                <h2>Que faut-il écrire dans le filigrane</h2>
                <p>
                    Trois informations suffisent : le destinataire, l’usage et la date. Le
                    destinataire empêche de réutiliser la copie auprès d’un autre organisme. L’usage
                    limite ce qu’on peut en faire. La date montre qu’elle a été fournie pour une
                    démarche précise, à un moment précis. Par exemple :
                </p>
                <blockquote>
                    <p>
                        Document destiné exclusivement à l’agence Martin
                        <br />
                        pour la location du logement du 12 rue des Lilas
                        <br />
                        le 3 mars
                    </p>
                </blockquote>
                <p>
                    Préparez un dossier par destinataire plutôt qu’une version générique envoyée
                    partout. Ça prend une minute de plus. Si une copie circule, vous saurez aussi
                    d’où elle vient.
                </p>

                <h2>Un filigrane qui ne s’enlève pas en deux clics</h2>
                <p>
                    Beaucoup d’outils ajoutent le filigrane comme un calque ou une annotation posée
                    au-dessus de la page : un éditeur PDF le sélectionne et le supprime aussi
                    facilement qu’il a été ajouté. Ici, chaque page est redessinée avec la mention,
                    puis enregistrée comme une image. En contrepartie, le texte n’est plus
                    sélectionnable et un PDF très léger peut grossir un peu.
                </p>
                <p>
                    Pour que la mention se voie sans gêner la lecture du document, gardez une
                    opacité entre 30 et 50 % et laissez la répétition activée : une mention répétée
                    en diagonale couvre toute la page.
                </p>

                <h2>Les usages les plus courants</h2>
                <ul>
                    <li>
                        Le <Link href="/filigrane-dossier-location">dossier de location</Link>, qui
                        réunit à lui seul presque tous les documents sensibles d’un foyer.
                    </li>
                    <li>
                        La{' '}
                        <Link href="/filigrane-carte-identite">
                            copie de carte d’identité ou de passeport
                        </Link>
                        , la pièce la plus recherchée pour usurper une identité.
                    </li>
                    <li>
                        Les <Link href="/filigrane-image">photos et captures d’écran</Link> de
                        justificatifs, converties en PDF avec leur filigrane.
                    </li>
                </ul>
                <p>
                    Pour les autres précautions à prendre avant d’envoyer un dossier, lisez notre
                    guide pour{' '}
                    <Link href="/proteger-ses-justificatifs">
                        protéger ses justificatifs contre l’usurpation d’identité
                    </Link>
                    .
                </p>
            </ToolPage>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: SITE_NAME,
                    url: SITE_URL,
                    inLanguage: 'fr',
                    publisher: PUBLISHER,
                }}
            />
        </>
    )
}
