import { Link } from 'react-router-dom'
import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function CGU() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation" lastUpdate="juin 2026">

      <Section title="1. Objet">
        <P>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme NOUT, marketplace de vente d'articles de seconde main exclusivement dédiée à La Réunion (974).</P>
        <P>En créant un compte ou en utilisant le service, l'utilisateur accepte sans réserve les présentes CGU.</P>
      </Section>

      <Section title="2. Accès au service">
        <P>NOUT est accessible à toute personne physique majeure résidant à La Réunion. La création d'un compte est gratuite et requiert une adresse e-mail valide ou une connexion via Google.</P>
        <P>L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte.</P>
      </Section>

      <Section title="3. Publication d'annonces">
        <P>Tout utilisateur inscrit peut publier des annonces de vente d'articles de seconde main. Les annonces doivent respecter les règles suivantes :</P>
        <Ul items={[
          'L\'article doit appartenir légalement au vendeur',
          'Les photos doivent correspondre à l\'article réel',
          'Le prix doit être exprimé en euros (€)',
          'La description doit être honnête et complète',
          'L\'article doit être légal à la vente en France',
        ]} />
      </Section>

      <Section title="4. Contenus interdits">
        <P>Il est strictement interdit de publier des annonces portant sur :</P>
        <Ul items={[
          'Des armes, munitions ou objets dangereux',
          'Des substances illicites ou médicaments sans prescription',
          'Des contenus à caractère pornographique, raciste ou haineux',
          'Des articles contrefaits ou volés',
          'Des animaux vivants',
          'Tout contenu violant les droits de tiers',
        ]} />
        <P>NOUT se réserve le droit de supprimer tout contenu non conforme et de suspendre le compte concerné.</P>
      </Section>

      <Section title="5. Comportements interdits">
        <Ul items={[
          'Usurper l\'identité d\'une autre personne',
          'Publier des informations fausses ou trompeuses',
          'Harceler ou menacer d\'autres utilisateurs',
          'Tenter de contourner les systèmes de paiement de la plateforme',
          'Utiliser des robots ou scripts automatisés',
        ]} />
      </Section>

      <Section title="6. Responsabilités">
        <P>NOUT est une plateforme de mise en relation. NOUT ne garantit pas la qualité, la conformité ou la légalité des articles vendus. Les transactions sont conclues directement entre acheteur et vendeur.</P>
        <P>Chaque utilisateur est seul responsable du contenu qu'il publie et des transactions qu'il effectue.</P>
      </Section>

      <Section title="7. Suspension et résiliation">
        <P>NOUT peut suspendre ou supprimer un compte sans préavis en cas de violation des présentes CGU, de comportement frauduleux ou de signalement avéré.</P>
        <P>L'utilisateur peut supprimer son compte à tout moment depuis ses paramètres ou en contactant contact@nout.re.</P>
      </Section>

      <Section title="8. Modification des CGU">
        <P>NOUT se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications importantes par email. La poursuite de l'utilisation du service vaut acceptation des nouvelles CGU.</P>
      </Section>

      <Section title="9. Droit applicable">
        <P>Les présentes CGU sont soumises au droit français. Tout litige relève de la compétence des tribunaux de Saint-Denis de La Réunion.</P>
      </Section>

      <Section title="10. Documents complémentaires">
        <P>L'utilisation de NOUT est également soumise aux documents suivants :</P>
        <Ul items={[
          <><Link to="/legal/charte-bonne-conduite" className="text-nout-turquoise hover:underline font-medium">Charte de bonne conduite</Link> — règles de comportement entre acheteurs et vendeurs, comportements sanctionnés</>,
          <><Link to="/legal/reglement-catalogue" className="text-nout-turquoise hover:underline font-medium">Règlement du catalogue</Link> — catégories autorisées, articles interdits, règles de publication</>,
        ]} />
      </Section>

    </LegalLayout>
  )
}
