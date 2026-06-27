# Session 27 juin 2026 — Système d'abonnement (follow) + palmiers fondateur + analyse Kazakaz/UBN

## Contexte de reprise
- "Bug" de la session précédente = en fait Claude Code qui ne répondait plus (pas un bug du projet NOUT). Résolu.
- Reprise du projet NOUT.

## 1. Analyse concurrentielle Kazakaz + décision UBN

### Modèle économique Kazakaz décortiqué
- Frais de protection acheteur ~14% (ex pull 5€ → 0,70€), pourcentage CACHÉ (montré qu'au checkout).
- Abonnements : KazaKaz+ 2,99€/mois (−10% frais), Ultimate 9,99€/mois (−30% frais) + à la carte 1,99€/10 annonces.
- Livraison "dès 4€" = UBN point relais 4,00€ TTC (vérifié sur ubn-speed.re).
- Sur petits articles ils gagnent ~0,30€ net → quasi à perte. Compensé par abonnements + volume + UBN.

### Comparatif chiffré NOUT vs Kazakaz (calculs Node vérifiés)
- **Main propre (NOUT 0€ port)** : NOUT écrase sur TOUS les prix. Pull 5€ = 6,60€ chez NOUT (gagne 1,25€) vs 9,70€ Kazakaz (gagne 0,30€).
- **Colis** : NOUT plus cher (~5-6€) car Chronopost 8,52€ vs UBN 4€. Non corrigeable sans volume.

### ⚠️ DÉCISION UBN — FAIT CLÉ
- **UBN = 200€/mois d'abonnement fixe + ~4€/colis** (confirmé Amandine). Pas "4€ tout court".
- Seuil de rentabilité UBN vs Chronopost à l'acte = ~44 colis/mois. En dessous, UBN fait PERDRE.
- **Décision : rester Chronopost à l'acte au lancement, basculer UBN quand ~45-50 colis/mois.** Compenser par la main propre gratuite martelée.

### 🤝 Partenariat UBN ACTÉ
- UBN a rappelé, OK pour collaborer. **Les 200€ = uniquement si UBN installe l'API à notre place. On installe nous-mêmes → on évite les 200€.** Besoin : doc API + accès + compte pro.
- UBN refuse le volet contenu vidéo (pas intéressés) MAIS OK collaboration logistique. Ne PAS re-pousser la vidéo.
- C'est UBN qui revient sous 24h avec les éléments.
- **Message récap WhatsApp rédigé** (ton pro détendu, signé Dawson BOYER), mentionne Oracle Production + Presty au passage. Inclut : partenariat, tarification (4€→Express, 30kg), question meubles, intérêt contrat d'engagement futur.

### Identité porteur
- Signe **Dawson BOYER**. Sociétés : **Oracle Production** (audiovisuel, réfs France Travail/CIREST) + **Presty** (plateforme services entreprises).

## 2. Design fondateur — palmiers

- **Bannière profil** : palmier silhouette sombre bien cadré (bas droite), "974" filigrane RETIRÉ. Garde dégradé hero-sunset + particules + anneau doré.
- **En-tête conversation** : palmier était coupé (viewBox mal écrasé) → refait bien cadré, cohérent avec la bannière.
- Validé visuellement via captures Playwright sur le vrai site local.

## 3. Système d'abonnement (follow) — DÉPLOYÉ

### Fichiers
- `supabase/migrations/20260627_follows.sql` : table follows + RLS. ✅ exécuté par Amandine.
- `services/follow.js` : followUser (+notif), unfollowUser, isFollowing, getFollowCounts.
- `pages/Profile.jsx` : bouton S'abonner/Abonné (optimiste+rollback, connecté seulement), 4 mini-stats (Abonnés/Abonnements/Annonces/Note), notif au bon pseudo.

### Comportement
- Bouton turquoise → gris quand abonné. Non connecté → /connexion.
- Notif push "X s'est abonné" (prod uniquement).

### Relecture — 2 incohérences corrigées
1. Notif utilisait le pseudo du profil visité au lieu du mien → `myProfile?.username`.
2. useEffect dep `user` (objet) → `user?.id` (stable).

## Commits poussés sur master → nout.re
- `f0ec2ce` — feat: système follow + palmiers fondateur
- `c7f1576` — fix: corrections relecture follow

## Reste à faire
- **Test prod réel** du follow par Amandine (nout.re, 2 comptes).
- Intégration API UBN quand UBN envoie doc + accès.
- Comptes professionnels (gros sujet à cadrer).
- Fiche produit 2 colonnes, système de LOT.
- Optionnel : identité vérifiée (KYC), feed vendeurs suivis.
