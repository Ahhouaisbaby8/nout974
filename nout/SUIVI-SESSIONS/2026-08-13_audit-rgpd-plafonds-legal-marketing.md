# Suivi session — 13 août 2026
## Audit RGPD + plafonds prix + clause juridique + cohérence annonces + marketing

**Porteur :** Amandine. Branche `master`. Dernier commit `405d7d2`. Tout poussé. Approche de l'ouverture.

---

## 1. 🔒 AUDIT DONNÉES PERSONNELLES (RGPD) — CONFIRMÉ SÛR
Amandine inquiète : « rien ne peut fuiter ? Coordonnées bancaires / tél / adresse ». Résultat : **aucune fuite possible.**
- **IBAN / cartes** : chez STRIPE (KYC), jamais stockés en clair chez NOUT.
- **email / phone / iban / stripe_account_id** : migration `20260629_fix_profiles_leak.sql` ACTIVE en prod. Vérifié en base : `anon`/`authenticated` ont UPDATE/INSERT/REFERENCES sur ces colonnes **mais AUCUN SELECT** → personne ne peut LIRE les données perso des autres. ⚠️ Piège de requête : compter tous les privilege_type donne un faux « 12 » ; filtrer `privilege_type='SELECT'`. Fonctions sécurisées `get_my_account()` + `admin_accounts()` présentes.
- **Adresse livraison** : montrée au vendeur SEULEMENT après achat (pour le colis).
- **Messagerie** : filtre anti-coordonnées (tel/email bloqués avant achat).
- **Front** : ne lit email/phone/iban que pour SOI (AuthContext).
→ EN RÈGLE RGPD. Voir [[audit_pre_lancement]].

## 2. Plafonds prix (`d6a8861`, `ec9b227`)
- **Paiement en ligne plafonné 10 000 → 5 000 €** (Stripe bloque au-delà). Au-dessus : annonce « à titre informatif », pas d'achat en ligne, bouton « Contacter le vendeur » (mise en relation comme véhicules). Front (ListingDetail `isMiseEnRelation`) + serveur (create-checkout-session cap 5000) alignés.
- **Prix MAX annonce 50 000 → 500 000 €** (vitrine voitures haut de gamme, ex. Porsche). Aligné dans les 4 gardes : CreateListing, EditListing, listings.js (create+update).

## 3. Recadrage photo (`d6a8861`)
Une photo horizontale (voiture) ne rentrait pas entière dans le cadre carré. Fix `CropModal.jsx` : `restrictPosition={false}` + `minZoom=0.4` (slider descend sous 1 → on peut dézoomer pour tout faire tenir) + fond blanc rempli sous l'image (JPEG sans transparence) + garde anti-dimensions aberrantes.

## 4. Cohérence « annonces à titre informatif » (`a44b530`, `7b9ed67`)
- **Carte** : plus de « X € · protection incluse » sur une annonce > 5000€/véhicule (elle ne peut pas être achetée en ligne). Affiche « Mise en relation · sans paiement en ligne ».
- **Encart légal fiche** : sur ces annonces, plus la mention « couvert par Protection acheteurs » (fausse). Précise que paiement/remise se font en direct hors plateforme.

## 5. ⚖️ Clause juridique intermédiaire (`77c906c`)
Renforcé « NOUT = intermédiaire technique/financier, PAS vendeur » (CGV art.1 + CGU art.6) : NOUT n'est ni vendeur/acheteur/propriétaire, pas partie au contrat ; garanties légales (conformité L217-3, vices cachés art.1641) à la charge du VENDEUR ; statut hébergeur LCEN art.6 ; responsabilité limitée à l'intermédiation + paiement. Base standards marketplaces FR. **Relecture juriste recommandée à terme.**
- Amandine a demandé « ce que dit la loi, pas de reformulation marketing » sur l'encart légal fiche annonce → texte VÉRIFIÉ juridiquement EXACT (rétractation L221-18, conformité L217-4 ne s'appliquent pas entre particuliers ; vices cachés art.1641 s'applique). NE PAS le reformuler pour faire joli. La « contradiction » perçue = 2 protections DIFFÉRENTES (celle de la loi, absente entre particuliers ; celle de NOUT = paiement sécurisé, présente en supplément) — c'est l'argument de vente, pas une erreur.

## 6. Clarté « Comment ça marche » (`f8cf7b3`)
Étape acheteur « Tu confirmes la réception » mélangeait les 2 flux. Séparé : main propre = code 6 chiffres ; livraison = confirmation transporteur.

## 7. Membres fondateurs — REMIS puis RE-MASQUÉ
- `81d1176` : décompte fondateurs REMIS sur l'accueil (lit le vrai nombre en base via getFounderCount, « il reste X/50 » + barre + prérequis 5 annonces + 1 vente/achat) + avertissement prérequis badge « Créateur péi » dans Settings (fait main + 974 + pas de revente, sinon retrait).
- `405d7d2` : Amandine a demandé de RE-MASQUER le décompte de l'accueil. Système fondateurs (badges/numéros) reste actif ailleurs. Réversible (cf. 81d1176). **⚠️ L'avertissement prérequis créateur dans Settings, lui, RESTE.**

## 8. Question fonctionnelle en suspens (PAS codé)
Amandine : « comment gérer si le point relais ne scanne pas le retrait ? ». Réponse : NOUT ne perd jamais d'argent (colis at_relay = argent en séquestre). Il existe des boutons admin (Verser le vendeur / Rembourser). MANQUE : bouton acheteur « J'ai bien reçu » en livraison (confirm-receipt existe côté serveur mais pas de bouton en livraison, seulement main propre). Amandine hésite (peur qu'un acheteur mente) — je lui ai expliqué que « J'ai bien reçu » ne peut que PAYER le vendeur (jamais rembourser), donc zéro piège ; le vrai risque (mentir sur non-réception) passe par « Signaler un problème » = arbitrage admin. **Décision non prise, à reprendre.**

## 9. 📣 MARKETING (artifacts, local)
- **Texte de lancement personnel** d'Amandine peaufiné (« J'ai fait le premier pas. Maintenant, c'est à vous de m'aider à le faire vivre. » + créole « Met ali su NOUT pou donn ali un seconde vie » + clin d'œil ex). Gardé tel quel à sa demande.
- **Vidéo post-it** : concept post-it (situation) → décolle → chute NOUT. Maquette interactive + **25 idées en 5 thèmes** (rupture/fin de mois/objets qui dorment/famille-cadeaux/rivaux Vinted-FB). Créole péi.
- Voir aussi [[marketing_video_carrousels]].

## ⏭️ RESTE (rappels)
- Décision bouton acheteur « J'ai bien reçu » en livraison (§8).
- SEO (dernier domaine de l'audit total, priorité de fin).
- Bugs d'affichage mobile au fil des captures d'Amandine.
- Colis thomas UBN au relais : ne pas rembourser, attente retour transporteur ([[colis_thomas_relais_ubn]]).
- Relecture juriste des clauses (§5).
