# Analyse concurrentielle NOUT — 23 juin 2026

Synthèse de 4 analyses croisées : audit codebase NOUT + Kazakaz.re + Vinted + marché européen (Leboncoin, Wallapop, Vestiaire, Depop, Back Market).

**Décision Amandine : l'IA photo (génération auto de fiche) n'est PAS une priorité.** Écartée de la roadmap.

---

## 1. Ce que NOUT a DÉJÀ (vérifié dans le code)

Socle solide, au niveau ou au-dessus de Kazakaz :

- ✅ Auth email + Google OAuth
- ✅ Publication annonce (multi-photos, crop, compression, marque/taille/couleur/matière/état)
- ✅ Recherche 7 filtres (texte, catégorie, ville, état, marque, prix, tri) + pagination
- ✅ Escrow complet (code 6 chiffres, rate limiter 3 essais/1h, expiration J+7, remboursement auto)
- ✅ Paiement Stripe Connect LIVE (commission 5%+1€, gross-up)
- ✅ Messagerie temps réel (Supabase Realtime)
- ✅ Avis post-transaction (1-5 étoiles + commentaire)
- ✅ Favoris
- ✅ Notifications push VAPID (multi-appareils) + emails Resend
- ✅ Panel admin complet (modération, signalements, RGPD, finances, users)
- ✅ Documents légaux complets (CGU, CGV, RGPD, mentions + SIRET réel, charte, règlement catalogue)
- ✅ PWA installable + BottomNav mobile
- ✅ **Programme Membres Fondateurs (UNIQUE — ni Kazakaz ni Vinted ne l'ont)**
- ✅ Suivi livraison (numéro de suivi saisi par vendeur)

## 2. Kazakaz (concurrent direct 974)

État : 312 utilisateurs actifs, 420 annonces, PWA-only (pas d'app native). Positionnement "marché en ligne du PEI, livraison intégrée, 100% local".

**Ce qu'ils ont et qu'on n'a pas :**
| Feature | Priorité | Décision |
|---|---|---|
| Création annonce IA (photo→fiche 30s) | — | **ÉCARTÉE (choix Amandine)** |
| Recherche par image | Nice-to-have | Phase 2+ |
| Livraison intégrée (eux : UBN + Chronopost) | 🔴 Critique | NOUT = Chronopost SEUL (volume + réductions) |
| Estimation poids automatique | Important | Lié à livraison |
| Boost payant (abo Ultimate) | Important | À faire |
| Abonnements vendeur freemium (-10%/-30% frais) | Important | Modèle éco à décider |
| Chatbot support FR + créole | Important | Phase 2 |

**Faiblesses Kazakaz exploitables :** petite base utilisateurs, pas d'app native, commission cachée (opacité), pas de programme fondateurs.

## 3. Vinted (référence européenne) — quick wins applicables

| Feature | Effort | Impact |
|---|---|---|
| Bouton "Faire une offre" sur l'annonce (sans chat) | Moyen | Conversion ++ |
| "Articles similaires" en bas de chaque annonce | Faible | Anti-bounce ++ |
| Badge "Bonne Affaire" auto (prix < médiane) | Faible | Achat impulsif |
| Alerte baisse de prix sur favoris (push) | Faible | Rétention |
| Recherches sauvegardées + alertes push | Moyen | Rétention ++ (clé en marché à faible volume) |
| Follow vendeur + feed nouvelles annonces | Moyen | Habitude quotidienne |
| Stats vendeur publiques (taux/délai réponse) | Moyen | Confiance |
| Badge identité vérifiée (selfie/tél) | Moyen | Confiance ++ |
| Parrainage (bon d'achat 2 sens) | Moyen | **Acquisition #1 en local** |
| Wallet interne | Élevé | Ré-achat |

## 4. Marché européen — différenciateurs locaux

- **Géolocalisation par zone du 974** (Nord/Sud/Est/Ouest) — AUCUN concurrent national ne peut le faire. Différenciateur #1 de NOUT.
- **Grading article standardisé visuel** (Back Market) — réduit litiges remise en main propre.
- **Remise en main propre sécurisée par QR code** — Vinted ne le fait PAS, avance nette pour le local.
- **Impact CO2 par article** (Back Market) — partageable, gen Z, positionnement durable.
- **Badges locaux** : "Vendeur Réunionnais Vérifié", "Expédie en 24h".

---

## ROADMAP PRIORISÉE NOUT (sans IA photo)

### 🔴 VAGUE 1 — Conversion & rétention (quick wins, fort impact, faible effort)
1. **Articles similaires** en bas de chaque fiche annonce
2. **Bouton "Faire une offre"** direct sur l'annonce (offre chiffrée structurée)
3. **Badge "Bonne Affaire"** auto (prix sous médiane catégorie)
4. **Alerte baisse de prix** sur favoris (push)
5. **Recherches sauvegardées + alerte push** nouvelle annonce

### 🟠 VAGUE 2 — Croissance & confiance
6. **Parrainage** (bon d'achat pour les deux) — levier d'acquisition #1 en local
7. **Follow vendeur + feed** des nouvelles annonces
8. **Stats vendeur publiques** (taux + délai de réponse, déjà semi-calculé)
9. **Badge identité vérifiée** (téléphone confirmé, puis selfie)
10. **Géolocalisation par zone 974** (filtre Nord/Sud/Est/Ouest)

### 🟢 VAGUE 3 — Différenciation & monétisation
11. **Livraison intégrée Chronopost** (transporteur UNIQUE — volume groupé pour négocier réductions, étiquette + suivi). PAS UBN : on concentre tout sur Chronopost. Dossier déjà lancé (NOUT-Dossier-Chronopost.pdf).
12. **Remise en main propre sécurisée par QR code**
13. **Boost payant** annonce/boutique + analytics vendeur
14. **Wallet interne** NOUT
15. **Impact CO2 par article** + badges locaux

---

## Avantages NOUT à mettre en avant DÈS MAINTENANT (gratuit, marketing)
- **Membres Fondateurs** (eux ne l'ont pas)
- **Transparence totale des frais** (Kazakaz cache sa commission)
- **Communauté 100% réunionnaise + proximité par zone**
