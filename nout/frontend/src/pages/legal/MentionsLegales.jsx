import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales" lastUpdate="juin 2026">

      <Section title="1. Éditeur du site">
        <P>Le site NOUT (accessible à l'adresse nout974.re) est édité par :</P>
        <Ul items={[
          'Nom : Megarisse Amandine',
          'Statut : Auto-entrepreneur',
          'SIRET : [À compléter]',
          'Adresse : Saint-Denis, La Réunion (974)',
          'Email : contact@nout974.re',
        ]} />
      </Section>

      <Section title="2. Directeur de la publication">
        <P>Megarisse Amandine — contact@nout974.re</P>
      </Section>

      <Section title="3. Hébergement">
        <P>Le site est hébergé par :</P>
        <Ul items={[
          'Société : Netlify, Inc.',
          'Adresse : 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis',
          'Site web : www.netlify.com',
        ]} />
        <P>La base de données est gérée par Supabase (supabase.com), conforme au RGPD.</P>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <P>L'ensemble des éléments constituant le site NOUT (logo, design, textes, code) est la propriété exclusive de l'éditeur. Toute reproduction, représentation ou diffusion, en tout ou partie, sans autorisation expresse écrite est interdite.</P>
        <P>Les annonces publiées par les utilisateurs restent leur propriété. En publiant sur NOUT, l'utilisateur accorde à NOUT une licence non exclusive d'affichage du contenu sur la plateforme.</P>
      </Section>

      <Section title="5. Responsabilité">
        <P>NOUT est une plateforme de mise en relation entre particuliers. NOUT n'est pas partie aux transactions entre acheteurs et vendeurs et ne peut être tenu responsable des litiges survenant entre utilisateurs.</P>
        <P>NOUT s'efforce d'assurer la disponibilité du service mais ne peut garantir une accessibilité permanente et ininterrompue.</P>
      </Section>

      <Section title="6. Droit applicable">
        <P>Le présent site est soumis au droit français. En cas de litige, les tribunaux compétents sont ceux du ressort de Saint-Denis de La Réunion.</P>
      </Section>

    </LegalLayout>
  )
}
