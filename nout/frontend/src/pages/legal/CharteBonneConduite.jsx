import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function CharteBonneConduite() {
  return (
    <LegalLayout title="Charte de bonne conduite" lastUpdate="juin 2026">

      <Section title="1. Nos valeurs">
        <P>NOUT est une marketplace de seconde main dédiée à La Réunion (974). Notre communauté repose sur la confiance, le respect et la transparence entre acheteurs et vendeurs.</P>
        <P>En utilisant NOUT, vous vous engagez à respecter la présente charte et à contribuer à une expérience positive pour tous les membres de la communauté.</P>
      </Section>

      <Section title="2. Règles pour les vendeurs">
        <P>En tant que vendeur sur NOUT, vous vous engagez à :</P>
        <Ul items={[
          'Décrire vos articles avec honnêteté (état réel, défauts éventuels, mesures)',
          'Utiliser uniquement vos propres photos, représentant fidèlement l\'article',
          'Fixer un prix juste et cohérent avec l\'état de l\'article',
          'Remettre l\'article dans les délais convenus avec l\'acheteur',
          'Signaler toute impossibilité de vente dans les meilleurs délais',
          'N\'accepter que des paiements via la plateforme NOUT (jamais en dehors)',
        ]} />
      </Section>

      <Section title="3. Règles pour les acheteurs">
        <P>En tant qu'acheteur sur NOUT, vous vous engagez à :</P>
        <Ul items={[
          'Finaliser les achats que vous initiez',
          'Communiquer avec le vendeur de manière respectueuse',
          'Confirmer la remise en main propre en entrant le code escrow uniquement après réception de l\'article',
          'Signaler tout problème via les canaux officiels de la plateforme',
          'Ne pas tenter de contourner le système de paiement sécurisé',
        ]} />
      </Section>

      <Section title="4. Comportements interdits">
        <P>Les comportements suivants entraîneront la suspension immédiate du compte :</P>
        <Ul items={[
          'Harcèlement, insultes ou menaces envers un autre utilisateur',
          'Tentative d\'escroquerie ou de fraude (faux articles, faux paiements)',
          'Publication de fausses photos ou descriptions mensongères',
          'Contournement du système de paiement NOUT (transactions hors plateforme)',
          'Création de multiples comptes pour contourner une suspension',
          'Usurpation d\'identité ou vol de compte',
          'Collecte des coordonnées personnelles d\'autres utilisateurs',
        ]} />
      </Section>

      <Section title="5. Annonces interdites sur NOUT">
        <P>Certaines annonces sont strictement interdites sur NOUT, quelle que soit la catégorie :</P>
        <Ul items={[
          'Contrefaçons de marques de luxe ou de toute autre marque',
          'Lingerie usagée (slip, culotte, soutien-gorge, collants portés)',
          'Produits cosmétiques ouverts ou sans emballage d\'origine',
          'Articles volés ou dont l\'origine légale ne peut être justifiée',
          'Articles faisant l\'objet d\'un rappel de sécurité ou retirés du marché',
          'Médicaments, produits pharmaceutiques ou parapharmaceutiques',
          'Tout article illégal à la vente en France',
        ]} />
      </Section>

      <Section title="6. Signalement">
        <P>Vous pouvez signaler toute annonce ou comportement suspect directement depuis la plateforme (bouton "Signaler" sur chaque annonce ou profil). Notre équipe traite chaque signalement dans les 48 heures.</P>
        <P>Tout abus du système de signalement (signalements malveillants ou répétés sans fondement) est également sanctionné.</P>
      </Section>

      <Section title="7. Sanctions">
        <P>En cas de violation de la présente charte, NOUT se réserve le droit de :</P>
        <Ul items={[
          'Supprimer les annonces non conformes',
          'Émettre un avertissement formel',
          'Suspendre temporairement le compte (de 7 à 30 jours)',
          'Bannir définitivement le compte',
          'Signaler les comportements frauduleux aux autorités compétentes',
        ]} />
      </Section>

      <Section title="8. Respect de la communauté">
        <P>NOUT est une communauté réunionnaise. Nous encourageons la bienveillance, l'entraide et le respect entre membres. Chaque utilisateur contribue à l'ambiance générale de la plateforme.</P>
        <P>Pour toute question ou signalement, contactez-nous à <strong>contact@nout.re</strong>.</P>
      </Section>

    </LegalLayout>
  )
}
