# Suivi session — 11 août 2026
## NOUT Pro : migration boutiques passée + exploration maquettes Espace pro

**Porteur :** Amandine. Co-fondateur : Dawson (a développé tout le module NOUT Pro sur son PC). Branche `master`, dernier commit `d49bbda`.

---

## 1. Contexte : NOUT Pro poussé par Dawson
Dawson a développé **NOUT Pro** (18 commits « feat(pro) », de `3c5af3c` à `37e4573`) : constructeur de boutique (21 templates), éditeur « Personnaliser », vitrine publique `nout.re/<slug>`, page Tarifs, Espace pro, Mes clients, blocs libres. **Déjà poussé sur `origin/master` et déployé sur nout.re.**

⚠️ **Désync PC** : le master local d'Amandine était en retard de 17 commits (resté à `8821eba`). Résolu par `git pull` → synchro à `37e4573`. Leçon : toujours `git pull` avant de reprendre (2 PC).

## 2. Migration boutiques — PASSÉE EN PROD ✅
Fichier `nout/POUR-AMANDINE-NOUT-PRO.md` (mode d'emploi de Dawson) + migration `nout/frontend/supabase/migrations/20260806_shops.sql`. Amandine l'a passée dans Supabase SQL Editor. Vérif OK :
- table `shops` créée (1)
- colonnes `listings.shop_id` + `listings.shop_rayon` (2)
- `profiles.shop_quota` défaut 2 (2)

**Règles portées par la BASE (pas contournables via l'API)** : publier exige un SIRET (14 chiffres) ; 2 boutiques max par compte (`check_shop_quota` trigger). Pour relever : `update profiles set shop_quota = 5 where id = '<id>';`. RLS : lecture publique des boutiques publiées, écriture = propriétaire.

Test réussi : Amandine a créé la boutique **« santéalimentaire »** (slug `santealimentaire`, thème Douce, santé & beauté). Confirmée en base (`owner_id` = 5cef8255-…, `is_active` false = brouillon). Le SIRET n'est demandé QU'À la publication (créer/enregistrer un brouillon = libre, sans SIRET). Pour tester la publication : SIRET de NOUT (dans les réglages du site).

## 3. FIX déployé — accès Espace pro manquant (`d49bbda`)
Amandine ne trouvait pas ses boutiques : le lien « NOUT Pro » du menu pointait vers `/boutique-templates` (les exemples), et RIEN ne menait à `/espace-pro` (ses boutiques à elle). Ajout :
- Menu profil desktop (`Header.jsx`) : entrée **« Espace pro »** (icône Store) après « Espace Vendeur ».
- Menu mobile (`MobileMenu.jsx`) : **« Mon espace pro »** pour les connectés.

⏭️ Note : `/espace-pro` affichait « 0 boutique » alors que la boutique existe en base → probablement compte différent au moment du test OU cache. À vérifier après déploiement (non re-testé).

## 4. Exploration MAQUETTES Espace pro (LOCAL, rien d'officiel)
Amandine veut retravailler l'Espace pro en **plus PRO**, en gardant la charte NOUT, sans rien pousser d'officiel. Série d'artifacts construits (démonstration visuelle only, pas de vrai code intégré) :
- **Direction retenue** : « clair & aéré » façon Stripe/Linear — séparation par la PROFONDEUR (ombres douces + hairlines), pas par blocs de couleur. Turquoise NOUT réservé aux accents. Beaucoup d'air.
- **Plateforme navigable complète** (dernier artifact, `6d6e7357`) : parcours vendeur + client relié, cliquable :
  - Vendeur : Tableau de bord (avec **Centre de lancement** = checklist onboarding 4 étapes + barre progression) → Personnaliser (éditeur live : nom/accroche/couleur/police/bandeau) → Produits (tableau catalogue) → Commandes (statut colis façon NOUT : en route/livrée/à remettre) → Mon argent (solde + retrait + historique) → Ma vitrine.
  - Client : Vitrine → Fiche produit → **Panier** → **Paiement sécurisé** (choix transporteur UBN/Chronopost) → **Confirmation**.
- Charte : Montserrat, pas d'emojis UI (icônes lucide inline), turquoise `#0E7FAB`/`#00C4B4`, bleu nuit, couleurs sémantiques (vert/ambre).

**⏭️ Reste à explorer si Amandine veut (PAS fait, en attente)** : éditeur de produit (photos/prix/stock), Mes clients + Avis + Messagerie, statistiques détaillées, rayons/catégories, codes promo, **version mobile** (974 = très mobile). Une maquette ne peut PAS enregistrer/encaisser/emailer pour de vrai — c'est le vrai code de Dawson.

**Décision Amandine (11/08)** : « pour l'instant fait rien mais enregistre MD » → on documente, on ne code rien de plus. La maquette reste une exploration de direction à montrer/décider avec Dawson.

---

## ⏭️ Reprise / à faire
- Vérifier que `/espace-pro` affiche bien la boutique « santéalimentaire » (après déploiement du fix menu).
- Décider avec Dawson quoi retenir de la vision maquette (le Centre de lancement + le style clair/aéré sont les plus forts).
- Reste des sessions précédentes : délais/messages remboursement par transporteur (UBN 7j/Chronopost 14j — validé, pas codé), audit RLS Supabase, SEO avant lancement, CGV phrase délai.
