import LegalLayout, { Section, P, Ul } from '../../components/legal/LegalLayout'

export default function Cookies() {
  return (
    <LegalLayout title="Politique de gestion des cookies" lastUpdate="juin 2026">

      <Section title="1. Qu'est-ce qu'un cookie ?">
        <P>Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web. Il permet au site de mémoriser des informations sur votre visite, comme votre langue préférée ou vos préférences de connexion.</P>
      </Section>

      <Section title="2. Les cookies utilisés par NOUT">
        <P><strong>Cookies strictement nécessaires</strong> — Ces cookies sont indispensables au fonctionnement du site. Ils ne peuvent pas être désactivés.</P>
        <Ul items={[
          'Session d\'authentification (Supabase) — maintient votre connexion',
          'Préférences cookies (nout_cookie_consent) — mémorise votre choix',
          'Message de bienvenue (nout_welcome_seen) — évite de le réafficher',
        ]} />

        <P className="mt-3"><strong>Cookies de performance (analytiques)</strong> — Ces cookies nous aident à comprendre comment vous utilisez le site afin de l'améliorer. Ils nécessitent votre consentement.</P>
        <Ul items={[
          'Aucun outil d\'analytics tiers n\'est actuellement actif sur NOUT',
        ]} />

        <P className="mt-3"><strong>Cookies tiers</strong></P>
        <Ul items={[
          'Stripe — lors d\'un paiement, Stripe dépose ses propres cookies pour sécuriser la transaction. Consultez la politique de Stripe sur stripe.com',
        ]} />
      </Section>

      <Section title="3. Durée de conservation">
        <Ul items={[
          'Cookies de session : supprimés à la fermeture du navigateur',
          'Cookies de préférence : 12 mois maximum',
        ]} />
      </Section>

      <Section title="4. Gérer vos préférences">
        <P>Vous pouvez à tout moment modifier vos choix concernant les cookies via la bannière cookies présente en bas de chaque page.</P>
        <P>Vous pouvez également configurer votre navigateur pour refuser les cookies. Attention : certaines fonctionnalités du site peuvent ne plus fonctionner correctement.</P>
        <Ul items={[
          'Chrome : Paramètres → Confidentialité → Cookies',
          'Firefox : Options → Vie privée → Cookies',
          'Safari : Préférences → Confidentialité',
          'Edge : Paramètres → Confidentialité → Cookies',
        ]} />
      </Section>

      <Section title="5. Contact">
        <P>Pour toute question relative aux cookies ou à la vie privée : <strong>contact@nout974.re</strong></P>
      </Section>

    </LegalLayout>
  )
}
