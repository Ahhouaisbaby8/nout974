# 📋 NOTE POUR DAWSON — 7 juillet 2026 (zone paiement = ta zone)

_Deux sujets remontés par Amandine côté checkout/escrow. À traiter par toi (paiement)._

---

## 🐛 SUJET 1 — Bug « Cet article est déjà en cours d'achat » (faux positif)

### Ce qui s'est passé (Amandine)
Elle avait ouvert la page d'achat d'un article, puis le vendeur a **modifié le prix**, donc elle a
**fermé la fenêtre sans payer**. En revenant acheter, elle est bloquée par le message rouge
**« Cet article est déjà en cours d'achat »** — alors qu'elle n'achète rien (achat abandonné).

### Cause (create-checkout-session.js:158-170)
```js
// Vérification anti double-paiement — ignore les commandes pending > 1h (paiement abandonné)
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id')
  .eq('listing_id', listingId)
  .not('status', 'in', '("cancelled","refunded")')
  .or(`status.neq.pending,created_at.gte.${oneHourAgo}`)   // ← pending < 1h bloque
  .maybeSingle()
if (existingOrder) {
  return { statusCode: 400, ... 'Cet article est déjà en cours d\'achat.' }
}
```
Un **pending abandonné de moins d'1h** bloque un nouvel achat du même article. C'est la protection
anti-double-paiement, mais elle a un effet de bord : abandonner un achat = bloqué 1h.

### Correctif choisi par Amandine : annuler le pending à la FERMETURE de la fenêtre d'achat
→ Quand l'acheteur ferme/quitte le checkout sans payer, marquer sa commande pending en `cancelled`
(elle sort alors du filtre `.not('status','in','("cancelled","refunded")')` → ré-achat immédiat possible).
Pistes : endpoint « cancel-pending-order » appelé au `beforeunload`/bouton retour, OU un TTL plus court +
un nettoyage. À toi de choisir l'implémentation la plus propre (c'est ton flux checkout/Stripe).
NB : ne pas casser la vraie protection anti-double-paiement pour les pending RÉCENTS d'un paiement en cours.

---

## ⚠️ SUJET 2 — Test escrow en cours (paiement SANS validation du code)

### Ce qu'Amandine a fait
Quelqu'un a **payé** un article en **remise en main propre**, et elle **n'a volontairement PAS validé
le code à 6 chiffres**, pour observer ce qui arrive à l'argent au bout d'une semaine.

### ⚠️ Ce qui VA réellement se passer (auto-refund.js:207,222) — à vérifier avec elle
Attention : dans ce cas, **l'argent ne va PAS au vendeur, l'ACHETEUR est REMBOURSÉ**. La logique :
- commande `paid` en main propre + code escrow **non validé** dans les **7 jours**
  → `auto-refund.js` passe la commande en `refunded`, remet l'article en vente, **rembourse l'acheteur**.
  Message : « La remise en main propre n'a pas été confirmée dans les 7 jours. »
- Le vendeur n'est payé QUE si le code est validé (`confirm-escrow.js`). Sans code = pas de versement.

C'est le comportement voulu (le code = preuve de remise ; sans preuve, on protège l'acheteur). MAIS :
- **À surveiller** : confirmer que le cron `auto-refund` tourne bien et rembourse effectivement à J+7
  (Amandine ne sait pas comment auto-refund est déclenché aujourd'hui — cf. sujet crons du récap précédent).
- **Si tu voulais tester le VERSEMENT au vendeur**, il faut au contraire VALIDER le code (confirm-escrow).
  Le test actuel (code non validé) teste le REMBOURSEMENT auto, pas le versement.
- Si dans 7 jours l'acheteur n'est PAS remboursé → il y a un vrai souci (cron non déclenché ?) → à creuser.

---

_TL;DR : (1) fixer le faux « déjà en cours d'achat » en annulant le pending à la fermeture du checkout.
(2) Le test « payé sans code validé » → aboutira à un REMBOURSEMENT acheteur à J+7 (pas un versement
vendeur) ; vérifier que le cron auto-refund le fait bien._
