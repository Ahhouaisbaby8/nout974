import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Politique de confidentialité & RGPD" lastUpdate="juin 2026">

      <Section title="1. Responsable du traitement">
        <P>Le responsable du traitement des données personnelles est :</P>
        <Ul items={[
          'Nom : Megarisse Amandine (NOUT)',
          'Email : contact@nout.re',
          'Adresse : Saint-Denis, La Réunion (974)',
        ]} />
        <P>Conformément au Règlement Général sur la Protection des Données (RGPD – UE 2016/679) et à la loi Informatique et Libertés, NOUT s'engage à protéger vos données personnelles.</P>
      </Section>

      <Section title="2. Données collectées">
        <P>Lors de l'utilisation de NOUT, les données suivantes peuvent être collectées :</P>
        <Ul items={[
          'Données d\'identification : nom d\'utilisateur, adresse e-mail',
          'Données de profil : photo, ville, biographie, numéro de téléphone (optionnel)',
          'Données de navigation : adresse IP, type de navigateur, pages visitées',
          'Données de transaction : historique des achats et ventes, montants',
          'Données de communication : messages échangés entre utilisateurs',
          'Données bancaires : gérées exclusivement par notre prestataire de paiement certifié PCI-DSS (NOUT n\'y accède pas)',
        ]} />
      </Section>

      <Section title="3. Finalités du traitement">
        <P>Vos données sont utilisées pour :</P>
        <Ul items={[
          'Créer et gérer votre compte utilisateur',
          'Permettre la publication et la consultation d\'annonces',
          'Traiter les paiements et gérer les transactions',
          'Assurer la sécurité de la plateforme et lutter contre la fraude',
          'Vous envoyer des notifications liées à votre activité sur NOUT',
          'Respecter nos obligations légales et fiscales',
        ]} />
      </Section>

      <Section title="4. Base légale">
        <Ul items={[
          'Exécution du contrat (CGU/CGV acceptées à l\'inscription)',
          'Intérêt légitime (sécurité de la plateforme, prévention de la fraude)',
          'Obligation légale (conservation comptable, lutte contre le blanchiment)',
          'Consentement (cookies non essentiels)',
        ]} />
      </Section>

      <Section title="5. Durée de conservation">
        <Ul items={[
          'Données de compte : durée de la relation + 3 ans après clôture',
          'Données de transaction : 10 ans (obligation comptable)',
          'Messages : 3 ans après l\'échange',
          'Données de navigation : 13 mois maximum',
        ]} />
      </Section>

      <Section title="6. Partage des données">
        <P>NOUT ne vend ni ne loue vos données personnelles à des tiers. Les données peuvent être partagées avec :</P>
        <Ul items={[
          'Prestataire de paiement certifié PCI-DSS — pour le traitement sécurisé des paiements',
          'Supabase — pour le stockage sécurisé des données (serveurs en Europe)',
          'Netlify — pour l\'hébergement du site',
          'Autorités compétentes — sur demande légale',
        ]} />
      </Section>

      <Section title="7. Vos droits">
        <P>Conformément au RGPD, vous disposez des droits suivants :</P>
        <Ul items={[
          'Droit d\'accès — obtenir une copie de vos données',
          'Droit de rectification — corriger des données inexactes',
          'Droit à l\'effacement — supprimer vos données ("droit à l\'oubli")',
          'Droit à la portabilité — recevoir vos données dans un format lisible',
          'Droit d\'opposition — refuser certains traitements',
          'Droit à la limitation — restreindre le traitement de vos données',
        ]} />
        <P>Pour exercer vos droits, contactez : <strong>contact@nout.re</strong>. Délai de réponse : 1 mois maximum.</P>
        <P>Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong> (www.cnil.fr).</P>
      </Section>

      <Section title="8. Sécurité">
        <P>NOUT met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement HTTPS, authentification sécurisée, contrôle d'accès par rôles (RLS Supabase), hébergement sécurisé.</P>
      </Section>

      <Section title="9. Transferts hors UE">
        <P>Certains prestataires (dont notre hébergeur et notre prestataire de paiement) sont basés aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou le Privacy Shield.</P>
      </Section>

    </LegalLayout>
  )
}
