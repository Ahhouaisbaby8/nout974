import { useState } from 'react'
import { computeProtectionFee, computeBuyerTotal, DELIVERY_OPTIONS } from '../../utils/shipping'
import { formatPrice } from '../../utils/formatters'
import { stockImg } from './proData'

// ─── NOUT Pro : écrans internes d'une boutique (fiche produit, pages légales, commande)
// Permettent de PARCOURIR la boutique dans l'aperçu, comme sur un vrai site.
// Aucun calcul d'argent maison : tout passe par utils/shipping (protection, total, port).
// Rien n'est envoyé nulle part — ce sont des écrans de démonstration.

const money = (n) => formatPrice(Math.round(n * 100) / 100)

// `wide` : rendu ordinateur. Le contenu est borné et centré — sans ça, la photo
// d'un produit s'étirait sur toute la largeur de l'écran (effet « zoom » énorme).
function Chrome({ shop, accent, dark, titleFam, onBack, backLabel = '← Boutique', wide = false, max = 'max-w-[1180px]', children }) {
  const line = dark ? 'border-white/10' : 'border-gray-100'
  const inner = wide ? `${max} mx-auto w-full` : ''
  return (
    <>
      <div className="text-center text-[9.5px] font-bold uppercase tracking-wider py-1.5 px-3 text-white" style={{ background: accent }}>
        Votre argent est protégé jusqu'à réception
      </div>
      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${line} ${inner} ${wide ? 'px-8 py-5' : ''}`}>
        <span className="text-[16px] font-bold truncate" style={{ fontFamily: titleFam }}>{shop.name}</span>
      </div>
      <div className={`px-5 pt-3 ${inner} ${wide ? 'px-8 pt-5' : ''}`}>
        <button type="button" onClick={onBack}
                className={`text-[12px] font-bold ${dark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-nout-texte'}`}>
          {backLabel}
        </button>
      </div>
      <div className={inner}>{children}</div>
    </>
  )
}

// ── Fiche produit ──
export function ProductView({ shop, listing, index, accent, dark, titleFam, contact, wide = false, onBack, onBuy, onSay }) {
  const imgs = (listing.images || []).filter(Boolean)
  const [main, setMain] = useState(imgs[0] || stockImg(shop.sector, index))
  const line = dark ? 'border-white/10' : 'border-gray-100'
  const hasPrice = !contact && Number(listing.price) > 0
  const rating = (4.5 + ((index * 7) % 5) / 10).toFixed(1).replace('.', ',')

  return (
    <Chrome shop={shop} accent={accent} dark={dark} titleFam={titleFam} onBack={onBack} wide={wide}>
      {/* ordinateur : photo à gauche (bornée), informations à droite — standard e-commerce */}
      <div className={wide ? 'flex gap-10 px-8 pt-4 items-start' : ''}>
      <div className={wide ? 'w-[46%] max-w-[520px] flex-shrink-0' : 'px-5 pt-3'}>
        <div className="rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4 / 5' }}>
          <img src={main} alt={listing.title} className="w-full h-full object-cover" />
        </div>
        {imgs.length > 1 && (
          <div className="flex gap-2 mt-2">
            {imgs.slice(0, 8).map((im, k) => (
              <button key={k} type="button" onClick={() => setMain(im)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 ${main === im ? '' : 'border-transparent opacity-60'}`}
                      style={main === im ? { borderColor: accent } : {}}>
                <img src={im} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={wide ? 'flex-1 min-w-0 pb-2' : 'px-5 pt-4 pb-2'}>
        <h1 className="text-[21px] font-bold leading-tight" style={{ fontFamily: titleFam }}>{listing.title}</h1>
        <p className="text-[10.5px] text-amber-600/90 font-medium mt-1">★ {rating} · {6 + (index * 13) % 38} avis</p>

        {hasPrice ? (
          <>
            <p className="text-[22px] font-extrabold mt-2 tabular-nums">{money(computeBuyerTotal(listing.price, 'hand'))}</p>
            <p className={`text-[11.5px] mt-0.5 ${dark ? 'text-white/50' : 'text-gray-400'}`}>
              dont {money(computeProtectionFee(listing.price))} de protection acheteur NOUT · + livraison dès 4 € (gratuite en main propre)
            </p>
            <button type="button" onClick={onBuy}
                    className="w-full mt-3 py-3 rounded-xl text-[14px] font-bold text-white" style={{ background: accent }}>
              Acheter — paiement protégé
            </button>
            <button type="button" onClick={() => onSay("Démo — l'acheteur propose son prix au vendeur")}
                    className={`w-full mt-2 py-2.5 rounded-xl text-[13px] font-bold border ${dark ? 'border-white/25' : 'border-gray-200'}`}>
              Faire une offre
            </button>
          </>
        ) : (
          <>
            <p className="text-[18px] font-extrabold mt-2" style={{ color: accent }}>Sur devis</p>
            <button type="button" onClick={() => onSay('Démo — demande de devis via la messagerie NOUT')}
                    className="w-full mt-3 py-3 rounded-xl text-[14px] font-bold text-white" style={{ background: accent }}>
              Demander un devis
            </button>
          </>
        )}

        <p className={`text-[11.5px] mt-3 ${dark ? 'text-white/60' : 'text-gray-500'}`}>
          {contact ? 'Intervention sur devis, sans engagement.' : 'Livraison : point relais 974 dès 4 € · remise en main propre gratuite'}
        </p>
        <p className={`text-[12.5px] leading-relaxed mt-2 ${dark ? 'text-white/70' : 'text-gray-500'}`}>
          Préparé par {shop.name} depuis La Réunion. {contact ? 'Devis répondu sous 24 h.' : 'Envoi soigné, emballage renforcé.'}
        </p>
        <p className={`text-[12px] mt-3 pt-3 border-t ${line} ${dark ? 'text-white/60' : 'text-gray-500'}`}>
          Vendu par <b>{shop.name}</b> · ★ 4,9 · Vendeur vérifié NOUT
        </p>
      </div>
      </div>
    </Chrome>
  )
}

// ── Récapitulatif de commande (bouton légal « commande avec obligation de paiement ») ──
export function CheckoutView({ shop, listing, index, accent, dark, titleFam, wide = false, onBack, onSay }) {
  const opts = DELIVERY_OPTIONS.filter((o) => ['hand', 'ubn_relay', 'chrono_relay', 'ubn_home'].includes(o.id))
  const [ship, setShip] = useState(opts[0])
  const [accepte, setAccepte] = useState(false)
  const line = dark ? 'border-white/10' : 'border-gray-100'
  const total = computeBuyerTotal(listing.price, ship.id)
  const img = (listing.images || [])[0] || stockImg(shop.sector, index)

  return (
    <Chrome shop={shop} accent={accent} dark={dark} titleFam={titleFam} onBack={onBack}
            backLabel="← Retour au produit" wide={wide} max="max-w-[680px]">
      <div className={wide ? 'px-8 py-6' : 'px-5 py-4'}>
        <h1 className="text-[19px] font-bold mb-3" style={{ fontFamily: titleFam }}>Récapitulatif de commande</h1>

        <div className={`flex items-center justify-between gap-3 py-3 border-t ${line}`}>
          <span className="flex items-center gap-2.5 min-w-0">
            <img src={img} alt="" className="w-10 h-12 object-cover rounded-md flex-shrink-0" />
            <span className="text-[12.5px] truncate">{listing.title}</span>
          </span>
          <b className="text-[12.5px] tabular-nums">{money(listing.price)}</b>
        </div>
        <div className={`flex items-center justify-between py-3 border-t ${line} text-[12.5px]`}>
          <span>Protection acheteur NOUT</span>
          <b className="tabular-nums">{money(computeProtectionFee(listing.price))}</b>
        </div>

        <div className={`py-3 border-t ${line}`}>
          <p className="text-[12.5px] mb-2">Livraison</p>
          <div className="flex flex-col gap-1.5">
            {opts.map((o) => (
              <button key={o.id} type="button" onClick={() => setShip(o)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[12px] border ${
                        ship.id === o.id ? '' : (dark ? 'border-white/15' : 'border-gray-200')}`}
                      style={ship.id === o.id ? { borderColor: accent } : {}}>
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.delay && <span className={`block text-[10.5px] ${dark ? 'text-white/45' : 'text-gray-400'}`}>{o.delay}</span>}
                </span>
                <b className="flex-shrink-0 tabular-nums">{o.fee > 0 ? money(o.fee) : 'Gratuit'}</b>
              </button>
            ))}
          </div>
        </div>

        <div className={`flex items-center justify-between py-3 border-t ${line}`}>
          <span className="text-[13px] font-extrabold">Total TTC</span>
          <b className="text-[17px] font-extrabold tabular-nums">{money(total)}</b>
        </div>

        <label className="flex items-start gap-2 text-[11.5px] leading-relaxed my-2 cursor-pointer">
          <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-0.5" />
          <span>J'ai lu et j'accepte les CGV de {shop.name} et les conditions de la protection acheteur NOUT.</span>
        </label>

        <button type="button" disabled={!accepte}
                onClick={() => onSay('Démo — paiement sécurisé NOUT (3-D Secure). L\'argent reste sous séquestre jusqu\'à réception.')}
                className="w-full py-3 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-40"
                style={{ background: accent }}>
          Payer {money(total)} — commande avec obligation de paiement
        </button>
        <p className={`text-[11px] mt-2 ${dark ? 'text-white/45' : 'text-gray-400'}`}>
          Vous recevrez une confirmation par e-mail reprenant votre commande et les CGV.
        </p>
      </div>
    </Chrome>
  )
}

// ── Pages légales (générées par NOUT à partir des informations vérifiées du vendeur) ──
const LEGAL_PAGES = ['CGV', 'Livraison & retours', 'Mentions légales', 'Confidentialité', 'Contact']

export function LegalView({ shop, page, accent, dark, titleFam, contact, wide = false, onBack, onOpen, onSay }) {
  const line = dark ? 'border-white/10' : 'border-gray-100'
  const soft = dark ? 'text-white/70' : 'text-gray-500'
  const H = ({ children }) => <h2 className="text-[13px] font-bold mt-4 mb-1">{children}</h2>
  const P = ({ children }) => <p className={`text-[12.5px] leading-relaxed ${soft}`}>{children}</p>

  return (
    <Chrome shop={shop} accent={accent} dark={dark} titleFam={titleFam} onBack={onBack} wide={wide} max="max-w-[760px]">
      <div className={wide ? 'px-8 py-6' : 'px-5 py-4'}>
        <h1 className="text-[19px] font-bold" style={{ fontFamily: titleFam }}>{page}</h1>
        <p className={`text-[11px] mt-1 ${dark ? 'text-white/40' : 'text-gray-400'}`}>
          Les champs entre [crochets] sont remplis automatiquement par NOUT à partir des informations vérifiées du vendeur.
        </p>

        {page === 'CGV' && (<>
          <H>1. Commande et prix</H>
          <P>Les prix sont affichés en euros TTC, protection acheteur comprise. Les frais de livraison sont indiqués avant la validation. La commande devient définitive après le récapitulatif et la validation du bouton « commande avec obligation de paiement ».</P>
          <H>2. Paiement protégé (séquestre NOUT)</H>
          <P>Le paiement est encaissé par NOUT, mandataire d'encaissement du vendeur, et conservé en sécurité. Le vendeur n'est payé qu'après la remise (code à 6 chiffres) ou la livraison confirmée. En cas de non-réception, de non-remise sous 7 jours en main propre, ou de non-conformité signalée dans les 48 heures suivant la livraison, l'acheteur est remboursé selon la protection acheteur NOUT.</P>
          <H>3. Livraison</H>
          <P>Point relais partout à La Réunion dès 4 € (UBN) ou 8,52 € (Chronopost), domicile dès 6 €, remise en main propre gratuite. Expédition sous [délai vendeur — 2 jours ouvrés par défaut]. Livraison au plus tard 30 jours après la commande ; à défaut, l'acheteur peut résoudre la vente et être remboursé intégralement (art. L. 216-6 C. conso).</P>
          <H>4. Droit de rétractation</H>
          <P>14 jours après réception, sans justification, en écrivant au vendeur ([e-mail] ou messagerie NOUT), par exemple via le formulaire type de rétractation [lien]. Retour sous 14 jours, frais de retour à votre charge (dès 4 €). Remboursement du prix et des frais de livraison standard sous 14 jours, dès réception du produit ou preuve d'expédition. Le produit peut être essayé comme en magasin ; seule une utilisation au-delà peut donner lieu à une décote. Exceptions légales (art. L. 221-28) : biens personnalisés, denrées périssables, produits d'hygiène descellés.</P>
          <H>5. Garanties légales</H>
          <P>Le vendeur répond de la garantie légale de conformité et de la garantie des vices cachés.</P>
          <div className={`border rounded-lg p-2.5 mt-2 text-[12px] ${dark ? 'border-white/20 text-white/60' : 'border-gray-200 text-gray-500'}`}>
            [Encadré légal officiel sur les garanties (art. D. 211-2 C. conso) — inséré automatiquement par NOUT, version neuf ou occasion selon le produit.]
          </div>
          <P>Vendeur : [dénomination sociale], SIRET [n°], [adresse complète] — identité vérifiée par NOUT.</P>
          <H>6. Litiges et médiation</H>
          <P>En cas de litige, l'équipe NOUT intervient d'abord (protection acheteur). Conformément aux art. L. 616-1 et R. 616-1 C. conso, le vendeur a désigné : [nom du médiateur de la consommation] — [adresse] — [site de saisine]. Saisine gratuite après réclamation écrite restée infructueuse. Plateforme européenne de règlement en ligne des litiges : ec.europa.eu/consumers/odr.</P>
        </>)}

        {page === 'Livraison & retours' && (<>
          <H>Livraison</H>
          <P>Point relais partout à La Réunion dès 4 € (UBN, 2 à 4 j ouvrés) ou 8,52 € (Chronopost, 1 à 2 j ouvrés), domicile dès 6 €, ou remise en main propre gratuite avec code de confirmation. Expédition sous [délai vendeur — 2 jours ouvrés par défaut], suivi en ligne.</P>
          <H>Comment vous êtes protégé</H>
          <P>1. À la livraison : votre paiement reste sous séquestre NOUT jusqu'à la réception, puis 48 heures pour signaler un problème. En main propre, si la remise n'a pas lieu sous 7 jours, vous êtes remboursé automatiquement.</P>
          <P>2. Après : vous disposez de 14 jours pour changer d'avis — remboursement par le vendeur via NOUT après retour.</P>
          <H>Retours (14 jours)</H>
          <P>Écrivez au vendeur ([e-mail] ou messagerie NOUT), renvoyez le produit sous 14 jours (frais de retour à votre charge, dès 4 €). Remboursement du prix et des frais de livraison standard sous 14 jours, dès réception ou preuve d'envoi.</P>
          <H>Produit non conforme</H>
          <P>Signalez-le dans les 48 heures suivant la livraison : votre paiement est encore sous séquestre. Au-delà, vos droits restent entiers — garantie légale de conformité (2 ans) et vices cachés. La protection acheteur s'ajoute à vos droits légaux, elle ne les remplace jamais.</P>
        </>)}

        {page === 'Mentions légales' && (<>
          <H>Éditeur de la boutique</H>
          <P>[Dénomination sociale], [forme juridique] au capital de [X] €, SIRET [n°], RCS [Saint-Denis / Saint-Pierre de La Réunion], siège : [adresse], [974xx Ville]. TVA intracommunautaire : [FRxx…] ou « TVA non applicable, art. 293 B du CGI ». Contact : [e-mail] · [téléphone]. Directeur de la publication : [prénom nom].</P>
          <H>Plateforme et paiements</H>
          <P>Le contrat de vente est conclu entre l'acheteur et {shop.name}. NOUT ([raison sociale], SIRET [n°], [adresse]) agit comme opérateur de plateforme et mandataire d'encaissement pour le compte du vendeur. Paiements traités via Stripe Payments Europe Ltd (DSP2, 3-D Secure).</P>
          <H>Hébergement</H>
          <P>[Hébergeur], [adresse] — boutique propulsée par NOUT (nout.re).</P>
        </>)}

        {page === 'Confidentialité' && (<>
          <H>Responsables de traitement</H>
          <P>{shop.name} (vendeur) et NOUT (plateforme), en responsabilité conjointe pour le fonctionnement de la boutique.</P>
          <H>Données et finalités</H>
          <P>Compte et commande (nom, coordonnées, adresse de livraison) : exécution du contrat. Paiement : traité par Stripe, jamais stocké par la boutique. Messagerie : relation client. Mesure d'audience : statistiques anonymisées.</P>
          <H>Durées et destinataires</H>
          <P>Données de commande conservées [10 ans] (obligations comptables). Sous-traitants : Stripe (paiement), transporteurs (livraison), [hébergeur].</P>
          <H>Vos droits</H>
          <P>Accès, rectification, effacement, opposition, portabilité : [e-mail du vendeur] ou via votre espace NOUT. Réclamation possible auprès de la CNIL (cnil.fr).</P>
        </>)}

        {page === 'Contact' && (<>
          <P>Une question sur un produit ou une commande ? Écrivez au vendeur — réponse sous [24 h] ouvrées via la messagerie sécurisée NOUT.</P>
          <div className="mt-3 flex flex-col gap-2">
            <input placeholder="Votre nom"
                   className={`w-full rounded-lg px-3 py-2.5 text-[13px] bg-transparent border ${dark ? 'border-white/25 text-white' : 'border-gray-200'}`} />
            <textarea placeholder="Votre message…" rows={4}
                      className={`w-full rounded-lg px-3 py-2.5 text-[13px] bg-transparent border resize-none ${dark ? 'border-white/25 text-white' : 'border-gray-200'}`} />
            <button type="button" onClick={() => onSay('Démo — message transmis au vendeur via la messagerie NOUT')}
                    className="w-full py-2.5 rounded-lg text-[13px] font-bold text-white" style={{ background: accent }}>
              Envoyer au vendeur
            </button>
          </div>
          <p className={`text-[11px] mt-2 ${dark ? 'text-white/45' : 'text-gray-400'}`}>
            Vous pouvez aussi nous joindre : [e-mail pro] · [téléphone] · [adresse postale].
          </p>
        </>)}

        {/* navigation entre pages légales */}
        <div className={`flex gap-3 flex-wrap text-[11px] mt-6 pt-3 border-t ${line} ${dark ? 'text-white/45' : 'text-gray-400'}`}>
          {LEGAL_PAGES.filter((p) => p !== page && !(contact && p === 'Livraison & retours')).map((p) => (
            <button key={p} type="button" onClick={() => onOpen(p)} className="hover:underline">{p}</button>
          ))}
        </div>
      </div>
    </Chrome>
  )
}
