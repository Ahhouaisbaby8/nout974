import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function ReglementCatalogue() {
  return (
    <LegalLayout title="Règlement du catalogue" lastUpdate="juin 2026">

      <Section title="1. Présentation">
        <P>NOUT est une marketplace de seconde main dédiée à La Réunion (974) : mode, mais aussi électronique, livres et médias, loisirs et collections, accessoires pour animaux et créations locales. Pour garantir la qualité et la sécurité du catalogue, certains articles restent interdits (voir article 3).</P>
        <P>Toute annonce publiée sur NOUT doit respecter le présent règlement. Les annonces non conformes seront supprimées sans préavis.</P>
      </Section>

      <Section title="2. Catégories autorisées">

        <P>NOUT accepte la mode (vêtements femme, homme, enfant et mixte, chaussures, accessoires, sacs), la beauté et le bien-être, l'électronique, les livres et médias, les loisirs et collections, les accessoires pour animaux, et les créations de créateurs 974 (fait main, y compris gourmandises et épicerie artisanales — étiquetage et date de consommation à respecter). Les principales catégories :</P>

        <Section title="Vêtements femme, homme et enfant">
          <Ul items={[
            'Hauts : t-shirts, chemises, pulls, vestes, manteaux, robes...',
            'Bas : pantalons, jeans, jupes, shorts, leggings...',
            'Combinaisons, ensembles, tenues de sport',
            'Sous-vêtements neufs avec emballage d\'origine uniquement',
            'Maillots de bain neufs avec emballage d\'origine uniquement',
          ]} />
        </Section>

        <Section title="Chaussures">
          <Ul items={[
            'Chaussures de ville, sandales, baskets, bottines, bottes',
            'Chaussures de sport',
            'Chaussures pour enfants',
            'Tous types de chaussures en bon état, propres et désinfectées',
          ]} />
        </Section>

        <Section title="Accessoires">
          <Ul items={[
            'Bijoux (colliers, bracelets, bagues, boucles d\'oreilles)',
            'Ceintures, bretelles',
            'Foulards, écharpes, châles',
            'Chapeaux, casquettes, bonnets',
            'Lunettes de vue et de soleil',
            'Montres',
          ]} />
        </Section>

        <Section title="Sacs">
          <Ul items={[
            'Sacs à main, pochettes, sacs bandoulière',
            'Sacs à dos, sacs de sport',
            'Valises et bagagerie',
            'Sacs de plage et de voyage',
          ]} />
        </Section>

        <Section title="Beauté">
          <Ul items={[
            'Produits cosmétiques non ouverts avec emballage d\'origine (maquillage, soins visage, soins corps)',
            'Parfums et eaux de toilette non ouverts',
            'Soins capillaires non ouverts',
            'Accessoires beauté neufs : pinceaux, outils de maquillage, sèche-cheveux...',
          ]} />
        </Section>

      </Section>

      <Section title="3. Articles strictement interdits">
        <P>Les articles suivants sont formellement interdits sur NOUT, quelle que soit la catégorie :</P>
        <Ul items={[
          'Contrefaçons ou articles non authentiques (toutes marques)',
          'Lingerie usagée : slips, culottes, soutiens-gorge, collants portés',
          'Produits cosmétiques ouverts ou sans emballage d\'origine',
          'Médicaments, produits pharmaceutiques ou parapharmaceutiques',
          'Armes, objets dangereux ou illicites',
          'Animaux vivants ou produits issus d\'espèces protégées',
        ]} />
      </Section>

      <Section title="4. Règles pour les photos">
        <P>Les photos sont essentielles à la confiance entre acheteurs et vendeurs. Les règles suivantes s'appliquent :</P>
        <Ul items={[
          'Minimum 1 photo, maximum 5 photos par annonce',
          'Les photos doivent représenter l\'article réel (pas d\'image internet ou de catalogue)',
          'Les photos doivent être nettes et bien éclairées',
          'Les photos ne doivent pas contenir de filigranes, logos publicitaires ou coordonnées personnelles',
          'Pour les vêtements, une photo portée est fortement conseillée',
        ]} />
      </Section>

      <Section title="5. Règles pour les descriptions">
        <Ul items={[
          'Indiquer l\'état réel de l\'article (neuf avec étiquette, neuf sans étiquette, très bon état, bon état, état correct)',
          'Mentionner les défauts visibles (accroc, décoloration, tache légère...)',
          'Préciser la taille, la marque et le matériau si connus',
          'Ne pas inclure de coordonnées personnelles (téléphone, email, réseaux sociaux)',
          'Ne pas faire de publicité pour un autre site ou service',
        ]} />
      </Section>

      <Section title="6. Prix et tarification">
        <Ul items={[
          'Le prix doit être exprimé en euros (€)',
          'Le prix doit être cohérent avec l\'état et la valeur de l\'article',
          'Les prix manifestement excessifs ou abusifs pourront être signalés',
          'Le vendeur reçoit l\'intégralité de son prix. NOUT applique des frais de protection acheteur de 10 % + 0,25 € par transaction, à la charge de l\'acheteur (voir CGV)',
        ]} />
      </Section>

      <Section title="7. Modération">
        <P>Toutes les annonces soumises sur NOUT sont examinées par notre équipe avant publication. Une annonce peut être refusée ou supprimée si elle ne respecte pas le présent règlement.</P>
        <P>En cas de refus, le vendeur en est informé par notification. Il peut soumettre une nouvelle annonce corrigée.</P>
        <P>Pour toute question sur le catalogue, contactez-nous à <strong>contact@nout.re</strong>.</P>
      </Section>

    </LegalLayout>
  )
}
