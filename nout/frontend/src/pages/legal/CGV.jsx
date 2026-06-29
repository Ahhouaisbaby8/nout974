import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function CGV() {
  return (
    <LegalLayout title="Conditions Générales de Vente" lastUpdate="juin 2026">

      <Section title="1. Objet">
        <P>Les présentes Conditions Générales de Vente (CGV) s'appliquent à toutes les transactions réalisées via la plateforme NOUT entre utilisateurs particuliers (acheteur et vendeur).</P>
        <P>NOUT agit en tant qu'intermédiaire technique et financier. La vente est conclue directement entre le vendeur et l'acheteur.</P>
      </Section>

      <Section title="2. Prix et frais de protection acheteur">
        <P>Les prix sont fixés librement par les vendeurs en euros (€), toutes charges comprises. Le vendeur perçoit l'intégralité du prix qu'il a fixé. NOUT applique des <strong>frais de protection acheteur de 10 % + 0,25 €</strong> par transaction, à la charge de l'acheteur, ajoutés au prix affiché. L'acheteur paie donc le prix du vendeur, augmenté de ces frais de protection et, le cas échéant, des frais de port s'il opte pour une livraison.</P>
        <P>Ces frais de protection couvrent le traitement du paiement, la sécurisation (séquestre) des transactions et le maintien de la plateforme.</P>
      </Section>

      <Section title="3. Paiement">
        <P>Les paiements sont sécurisés et gérés par un prestataire de paiement agréé, certifié PCI-DSS. NOUT ne stocke aucune donnée bancaire.</P>
        <P>Les moyens de paiement acceptés sont : carte bancaire (Visa, Mastercard, American Express).</P>
        <P>Le vendeur reçoit l'intégralité du prix de la vente directement sur son compte bancaire, dans les délais habituels de virement (les frais de protection acheteur sont payés par l'acheteur, en sus du prix).</P>
      </Section>

      <Section title="4. Remise de l'article">
        <P>Les modalités de remise sont définies entre l'acheteur et le vendeur :</P>
        <Ul items={[
          'Remise en main propre — le mode le plus courant à La Réunion',
          'Point relais — selon accord entre les parties',
          'Livraison à domicile — selon accord entre les parties',
        ]} />
        <P>NOUT décline toute responsabilité en cas de litige concernant la remise de l'article.</P>
      </Section>

      <Section title="5. Droit de rétractation">
        <P>Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation de 14 jours ne s'applique pas aux ventes entre particuliers.</P>
        <P>Toute vente conclue sur NOUT est donc définitive sauf accord contraire entre les parties ou défaut de conformité avéré.</P>
      </Section>

      <Section title="6. Garanties et vices cachés">
        <P>Les articles vendus sur NOUT sont des biens d'occasion. Le vendeur est tenu de décrire honnêtement l'état de l'article.</P>
        <P>En cas de vice caché ou de non-conformité grave par rapport à la description, l'acheteur peut signaler le litige à NOUT via le système de signalement. NOUT s'efforcera de faciliter la résolution à l'amiable.</P>
      </Section>

      <Section title="7. Litiges">
        <P>En cas de litige entre acheteur et vendeur, NOUT met à disposition un système de médiation accessible depuis l'espace personnel. Si aucun accord amiable n'est trouvé, les parties peuvent saisir les juridictions compétentes de Saint-Denis de La Réunion.</P>
        <P>Pour tout litige de consommation non résolu, vous pouvez avoir recours au médiateur de la consommation.</P>
      </Section>

      <Section title="8. Droit applicable">
        <P>Les présentes CGV sont soumises au droit français.</P>
      </Section>

    </LegalLayout>
  )
}
