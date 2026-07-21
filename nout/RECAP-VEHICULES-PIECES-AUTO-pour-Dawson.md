# 🚗 Récap pour Dawson — Véhicules, pièces auto & mode « mise en relation »

> Décision produit prise avec Amandine (21/07). **Rien n'est codé** — ce document cadre le besoin avant que tu mettes ça en place côté paiement (c'est ta partie). Le mode « mise en relation » n'existe pas encore dans NOUT et touche le cœur du flux paiement.

---

## 1. Le besoin

Amandine veut vendre sur NOUT, en plus de l'existant :
- **Pièces & accessoires auto** (jantes, sièges, pneus, pièces détachées…)
- **Véhicules entiers** (voitures qui roulent, motos…)
- **Meubles** (⚠️ déjà codé par toi, en stash — voir §4)

## 2. Décision : deux régimes de paiement distincts

| Type | Paiement | Livraison |
|------|----------|-----------|
| **Pièces & accessoires auto** | Paiement NOUT normal (escrow actuel) | Main propre, ou colis si petit/léger |
| **Véhicules entiers** | ❌ **HORS NOUT — mise en relation seule** | Main propre uniquement |
| **Meubles** | Main propre (pas de transporteur) | Main propre |

### Pourquoi les véhicules NE passent PAS par le paiement NOUT
Raisonnement fait avec Amandine, elle a tranché « hors NOUT » en connaissance de cause :
- **Frais Stripe démesurés** : sur une voiture à 60 000 € → ~900 € de frais Stripe sur une seule transaction ; commission NOUT 10% = 6 000 € (absurde).
- **Risque juridique** : séquestrer le prix d'une voiture = activité d'intermédiaire de paiement régulée (DSP2 / agrément ACPR). Litige vice caché sur 60 000 € → NOUT arbitre et juridiquement responsable. Blanchiment / KYC renforcé / TRACFIN sur gros montants.
- **Stripe gèle** facilement les grosses transactions inhabituelles sur un compte récent (fonds bloqués des semaines).
- **Pas d'Alma / pas de paiement fractionné** en place → de toute façon inadapté.
- C'est ce que font **tous** les acteurs auto (Leboncoin, LaCentrale…) : mise en relation, jamais de séquestre du prix.

## 3. Ce qu'il faut créer : le mode « mise en relation » (n'existe pas encore)

Aujourd'hui toute annonce NOUT a un paiement en ligne (bouton Acheter → checkout → escrow). Il faut un **2e mode d'annonce** :

- **Annonce « mise en relation »** : PAS de bouton « Acheter », PAS de checkout, PAS d'escrow.
  - Bouton **« Contacter le vendeur »** (messagerie existante) à la place.
  - Le paiement + la remise se font **en direct** entre les deux personnes, hors NOUT.
  - Mention claire sur la fiche : *« Paiement et remise en main propre, en direct avec le vendeur. »*
- Ce mode s'active **automatiquement** pour la catégorie **Véhicules** (et éventuellement au choix du vendeur pour d'autres gros objets plus tard).

### Points d'attention côté code (à toi de voir)
- Le flux `create-checkout-session` / `stripe-webhook` / escrow ne doit **jamais** être déclenché pour une annonce « mise en relation ».
- La fiche produit (`ListingDetail`) doit masquer le bloc paiement/livraison et afficher « Contacter le vendeur ».
- Champ à ajouter côté `listings` ? (ex. `sale_mode` = 'escrow' | 'contact') → à décider par toi, ça touche la table.
- Voir si on garde une trace (annonce vendue) sans transaction NOUT.

## 4. ⚠️ Catégories : qui fait quoi (éviter les doublons)

- **Meubles** : NE PAS recréer côté Amandine — ta rubrique « Maison & meubles » est en STASH chez toi (règle déjà connue). Amandine ne la touche pas.
- **Pièces & accessoires auto** : peut être ajoutée côté Amandine sans risque (paiement normal, ne touche pas le flux). À confirmer entre vous qui l'ajoute pour éviter un conflit sur `categories.js`.
- **Véhicules** : à créer **avec** le mode « mise en relation » → donc c'est lié à ton chantier paiement. À faire côté Dawson de préférence.

## 5. Rappel des règles projet (inchangées)
- Tout ce qui touche l'ARGENT : diff + revue + OK explicite avant push.
- Code escrow 6 chiffres = MAIN PROPRE uniquement ; livraison = suivi transporteur + 48h. Ne pas mélanger.
- On ne SUPPRIME jamais une commande → 'cancelled'. Le client ne modifie jamais `status`.
- `git pull` avant / `git push` après.

---

## 6. Question ouverte pour toi (Dawson)
1. OK pour le mode « mise en relation » (annonce sans paiement, contact vendeur) ? Ou tu vois une autre approche ?
2. Comment tu veux le modéliser en base (`sale_mode` sur listings, ou table à part) ?
3. Qui ajoute la catégorie « Pièces & accessoires auto » (toi ou Amandine) pour éviter le conflit sur `categories.js` avec ton stash Maison ?
