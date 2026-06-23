# Étude UX/Visuelle NOUT — 24 juin 2026

Étude de marché design/UX (Vinted, Depop, Wallapop, Vestiaire, Grailed) pour refonte visuelle NOUT.
**Priorité Amandine : le VISUEL et la SIMPLICITÉ d'usage avant tout** (ce qui fait rester les gens).

## Modèle de référence pour NOUT
Structure de **Vinted** (carte produit, bottom nav, formulaire page unique) + discipline visuelle **Grailed/Vestiaire** (monochrome, whitespace, typo, ratios stricts) + **1 seule couleur d'accent** façon Wallapop. Garder **Montserrat**.

## TOP 8 améliorations (impact/effort) — les 5 premières sont FACILES et transforment tout
1. **Ratio image 4:5 strict + grille cohérente** (`aspect-[4/5]`, `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`) — levier n°1 du "pro". FACILE
2. **Carte produit type Vinted** : marque (gras) / titre / taille·état / prix (gras) / cœur favori en overlay. FACILE
3. **Palette monochrome + 1 accent + whitespace généreux + Montserrat discipliné** (échelle text-xs→3xl seulement). FACILE
4. **Bottom nav mobile, bouton Vendre central proéminent** (rond accent surélevé). FACILE/MOYEN
5. **Skeletons + animation favori (scale pop) + fade images au chargement**. FACILE
6. **Fiche produit 2 colonnes** (galerie sticky / infos+CTA) + CTA sticky mobile + prix proéminent. MOYEN
7. **Formulaire page unique** : photos d'abord réordonnables + chips taille/état/couleur + marque en recherche. MOYEN
8. **Lightbox photo plein écran + zoom + carrousel swipe mobile**. MOYEN

## Règle d'or design
chips > dropdowns > champs texte libres. Ratios d'image cohérents = facteur n°1 du "pro". UNE couleur d'accent, le reste monochrome. Whitespace généreux. Skeletons au lieu de spinners. Zéro emoji (icônes lucide).

## Ce qui fait AMATEUR (à éliminer)
Ratios d'image mélangés, cartes de hauteurs inégales, trop de couleurs, espacements irréguliers, spinners plein écran, polices incohérentes, dropdowns géants, pas d'états vides/chargement/erreur.

## État NOUT au 24 juin (déjà fait cette session)
- Catégorie/État en chips (ChoiceChips.jsx) ✅
- Titre suggéré auto + phrases-types description ✅
- Menu profil + Espace Vendeur sans emoji (lucide) ✅
- Tunnel livraison Chronopost (main propre/relais 6,49€/domicile 8,90€, zéro perte) ✅
- Note vendeur sur fiche ✅
- Popups prix + protection acheteur sur carte ✅
