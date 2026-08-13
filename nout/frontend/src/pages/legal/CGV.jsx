import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function CGV() {
  return (
    <LegalLayout title="Conditions Générales de Vente" lastUpdate="juin 2026">

      <Section title="1. Objet et statut de NOUT">
        <P>Les présentes Conditions Générales de Vente (CGV) s'appliquent à toutes les transactions réalisées via la plateforme NOUT entre utilisateurs (acheteur et vendeur).</P>
        <P><strong>NOUT est une plateforme de mise en relation qui agit exclusivement en qualité d'intermédiaire technique et financier.</strong> NOUT n'est ni vendeur, ni acheteur, ni propriétaire, ni détenteur des articles proposés à la vente. Les annonces sont créées et publiées par les utilisateurs sous leur seule responsabilité.</P>
        <P><strong>Le contrat de vente est conclu directement et exclusivement entre le vendeur et l'acheteur.</strong> NOUT n'est en aucun cas partie à ce contrat. NOUT ne fait que fournir un service technique (hébergement des annonces, mise en relation) et financier (paiement sécurisé, séquestre des fonds).</P>
        <P>En conséquence, la <strong>garantie légale de conformité</strong> (articles L217-3 et suivants du Code de la consommation) et la <strong>garantie des vices cachés</strong> (articles 1641 et suivants du Code civil), ainsi que toute obligation relative à la description, la qualité, la conformité, la légalité et la remise de l'article, incombent <strong>exclusivement au vendeur</strong>. NOUT ne fournit aucune de ces garanties sur les articles.</P>
        <P>Conformément à l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), NOUT agit en qualité d'hébergeur des contenus publiés par les utilisateurs et n'est pas soumis à une obligation générale de surveillance de ces contenus. NOUT retire promptement tout contenu manifestement illicite qui lui est signalé.</P>
        <P>La responsabilité de NOUT se limite à la bonne fourniture de ses services d'intermédiation et de paiement. NOUT met à disposition un service de médiation (article 7) et les garanties liées au paiement sécurisé (séquestre, protection acheteur), sans que cela ne fasse de NOUT une partie au contrat de vente.</P>
      </Section>

      <Section title="2. Prix et frais de protection acheteur">
        <P>Les prix sont fixés librement par les vendeurs en euros (€), toutes charges comprises. Le vendeur perçoit l'intégralité du prix qu'il a fixé. NOUT applique des <strong>frais de protection acheteur de 10 % + 0,25 €</strong> par transaction, à la charge de l'acheteur, ajoutés au prix affiché. L'acheteur paie donc le prix du vendeur, augmenté de ces frais de protection et, le cas échéant, des frais de port s'il opte pour une livraison.</P>
        <P>Ces frais de protection couvrent le traitement du paiement, la sécurisation (séquestre) des transactions et le maintien de la plateforme.</P>
      </Section>

      <Section title="3. Paiement">
        <P>Les paiements sont sécurisés et gérés par un prestataire de paiement agréé, certifié PCI-DSS. NOUT ne stocke aucune donnée bancaire.</P>
        <P>Les moyens de paiement acceptés sont : carte bancaire (Visa, Mastercard, American Express).</P>
        <P>Le vendeur perçoit l'intégralité du prix de la vente qu'il a fixé (les frais de protection acheteur sont payés par l'acheteur, en sus du prix). Une fois la transaction confirmée, ces fonds sont crédités sur son porte-monnaie NOUT (« Mon argent ») ; il les vire ensuite sur son compte bancaire quand il le souhaite, après vérification de son identité auprès de notre prestataire de paiement (voir article 4).</P>
      </Section>

      <Section title="4. Remise de l'article">
        <P>L'acheteur choisit son mode de remise au moment du paiement :</P>
        <Ul items={[
          'Remise en main propre — le mode le plus courant à La Réunion',
          'Livraison en point relais (via notre transporteur partenaire)',
          'Livraison à domicile (via notre transporteur partenaire)',
        ]} />

        <P><strong>Remise en main propre.</strong> Après paiement, l'acheteur reçoit un code de confirmation à 6 chiffres. Il le communique au vendeur <strong>uniquement au moment où il reçoit l'article en main propre</strong>. La saisie de ce code par le vendeur confirme la bonne remise et déclenche le versement des fonds au vendeur. L'acheteur ne doit jamais communiquer ce code avant d'avoir l'article entre les mains.</P>

        <P><strong>Livraison (point relais ou domicile).</strong> Aucun code n'est utilisé : la remise est constatée par le suivi du transporteur. Une fois la livraison confirmée par le transporteur, l'acheteur dispose d'un délai de <strong>48 heures</strong> pour signaler un éventuel problème depuis son espace personnel (« Signaler un problème »). Passé ce délai sans signalement, la vente est réputée conforme et le versement au vendeur est déclenché. Pour un retrait en point relais, l'acheteur doit récupérer son colis dans le délai d'instance fixé par le transporteur (généralement 7 jours) ; à défaut, le colis est retourné à l'expéditeur.</P>

        <P><strong>Défaut d'expédition.</strong> Si le vendeur n'expédie pas l'article dans un délai de <strong>7 jours</strong> après le paiement, la commande est automatiquement annulée et l'acheteur est intégralement remboursé du prix de l'article et des frais de livraison.</P>

        <P><strong>Colis non pris en charge par le transporteur.</strong> Lorsqu'un bordereau d'expédition a été généré mais que le transporteur n'a enregistré aucune prise en charge du colis dans un délai de <strong>14 jours</strong>, la commande est considérée comme non honorée : elle est automatiquement annulée et l'acheteur est intégralement remboursé du prix de l'article et des frais de livraison. Un colis effectivement pris en charge, en cours d'acheminement ou mis à disposition en point relais n'est pas concerné par cette annulation.</P>

        <P><strong>Délais de versement.</strong> Une fois le versement déclenché, les fonds sont crédités sur le porte-monnaie du vendeur puis virés sur son compte bancaire selon les délais de notre prestataire de paiement (généralement quelques jours ouvrés).</P>

        <P>NOUT décline toute responsabilité en cas de litige concernant la remise de l'article, mais met à disposition un service de médiation (voir article 7).</P>
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

      <Section title="8. Remboursements, contestations de paiement et responsabilité financière">
        <P>NOUT agit en qualité d'intermédiaire technique et financier. <strong>Le coût d'un remboursement, d'une contestation de paiement (« chargeback ») ou de toute pénalité associée est supporté par la partie à l'origine du problème — jamais par NOUT.</strong></P>
        <P>Lorsqu'un remboursement résulte d'un manquement du <strong>vendeur</strong> (article non remis, non conforme à la description, contrefait, ou comportement frauduleux), le vendeur en supporte le coût intégral. NOUT est autorisé à récupérer ces sommes (montant remboursé et frais éventuels) en les déduisant du solde du vendeur, de ses versements à venir, ou par tout autre moyen de recouvrement.</P>
        <P>Les <strong>frais de protection acheteur</strong> rémunèrent la sécurisation de la transaction (paiement sécurisé, séquestre des fonds, service de remboursement). À ce titre, ils <strong>restent acquis à NOUT et ne sont pas remboursés en cas de remboursement, quel qu'en soit le motif</strong>. L'acheteur est remboursé du prix de l'article et, le cas échéant, des frais de livraison non engagés.</P>
        <P>Le vendeur s'engage à garantir et indemniser NOUT de toute somme (remboursement, frais de litige, amende) mise à la charge de NOUT par le prestataire de paiement en raison d'une transaction qui lui est imputable. En créant une annonce, le vendeur accepte cette clause.</P>
      </Section>

      <Section title="9. Droit applicable">
        <P>Les présentes CGV sont soumises au droit français.</P>
      </Section>

    </LegalLayout>
  )
}
