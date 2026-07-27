# 💡 Idées pour ENRICHIR NOUT — APRÈS le lancement officiel

> ⚠️ **Rien de tout ça ne se fait avant le lancement.** Priorité actuelle : valider le circuit paiement/livraison de bout en bout (test Evin), PUIS lancer, PUIS remplir le catalogue + marketing. Ces idées viennent **ensuite**, quand NOUT tourne et a du volume/des revenus.
> Ordre de priorité = celui de la liste.

---

## 1. ⭐ Recherche sauvegardée + alerte (RÉTENTION — la meilleure carte, coût 0 €)
**Idée** : l'utilisateur enregistre une recherche (ex. « Nike taille M à moins de 30€ à St-Denis ») et reçoit une **alerte** dès qu'un nouvel article correspond.

**Pourquoi c'est fort** : c'est LE levier qui transforme un visiteur en habitué. Vinted en a fait un pilier. Ça fait **revenir** les gens sans qu'on paie quoi que ce soit (contrairement au parrainage). Parfait pour NOUT sans trésorerie.

**Comment on le ferait (grandes lignes, à valider avec Dawson car ça touche la base + les crons) :**
- Table `saved_searches` (user_id, critères de filtre en JSON, date).
- Bouton « 🔔 Créer une alerte » sur la page /recherche (réutilise les filtres déjà en place).
- Un cron (comme les autres) qui, à chaque nouvelle annonce publiée (ou 1×/jour), regarde quelles recherches sauvegardées correspondent → envoie une notif/email « un nouvel article correspond à ta recherche ».
- Canaux déjà en place : notifications in-app (cloche) + email (Resend) + push. Rien de nouveau à installer.
- ⚠️ Bien doser la fréquence pour ne pas spammer (max 1 mail/jour par recherche).

---

## 2. Parrainage AVEC récompense (à activer QUAND NOUT a des revenus)
**Idée** : « invite un ami, gagnez tous les deux ».
**Statut** : une version SANS récompense monétaire est déjà codée par Dawson (en stash) — suivi des filleuls, anti-fraude, zéro prime.
**Pourquoi PLUS TARD** : une récompense = de l'argent offert = une dette. Tant que NOUT n'a pas de revenu stable ni de trésorerie, on ne peut pas se le permettre (+ risque de faux comptes). À rouvrir quand les commissions rentrent et qu'on sait combien on peut offrir. Décision d'Amandine, juste.

---

## 3. Offres / négociation (« faire une offre »)
**Idée** : l'acheteur propose un prix, le vendeur accepte/refuse/contre-propose (comme Vinted).
**Pourquoi ça colle à NOUT** : à La Réunion on aime négocier. Augmente les ventes conclues.
**Statut** : il existe peut-être déjà une brique `respond-offer` dans les fonctions Netlify → à vérifier si c'est branché ou à finir.

---

## 4. Bundles / lots (« achète plusieurs articles d'un vendeur »)
**Idée** : regrouper plusieurs articles d'un même vendeur en une commande → économie sur le port.
**Pourquoi** : augmente le panier moyen, mutualise la livraison (bon pour le vendeur ET l'acheteur).

---

## 5. Preuve sociale (rassurer / donner envie)
- Compteur de ventes par vendeur (« 12 ventes »).
- Badge « vendeur fiable » (délais respectés, bons avis).
- « X personnes regardent cet article » / « ajouté aux favoris X fois ».
- Mise en avant des avis existants.

---

## ❌ À NE PAS faire (pièges classiques des articles marketplace)
- Programme de fidélité / points / gamification → trop tôt, complexifie pour rien avant le volume.
- Multi-pays / sortir du 974 → la force de NOUT c'est justement le focus péi. Ne pas diluer.
- Agent IA autonome qui gère le site → risqué (surtout côté argent), cher, inutile à ce stade. Un système d'ALERTES (déjà ajouté : admin-health-check) suffit largement.

---

## 📌 Rappel de la bonne séquence
1. **Valider le paiement de bout en bout** (test Evin) ← ON EST ICI
2. **Lancer officiellement** (une fois le circuit prouvé)
3. **Remplir le catalogue** (vendeurs fondateurs, mise à la main) + **marketing** (les vidéos déjà prêtes)
4. **PUIS** enrichir avec les idées ci-dessus (recherche sauvegardée en 1er)
