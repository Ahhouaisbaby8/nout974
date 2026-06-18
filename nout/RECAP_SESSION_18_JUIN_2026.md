# NOUT — Récap session 18 juin 2026

## ✅ Fait aujourd'hui

### Programme Membres Fondateurs (complet, en production)
- Design validé : badge anneau doré + chip "FONDATEUR", bannière coucher de soleil, compteur "50 places restantes" sous la barre de recherche (position B)
- Règles : 50 places, attribution sur 5 annonces actives + 1 transaction (achat ou vente), badge optionnel via interrupteur dans Settings, déclenchement filtré par LAUNCH_DATE
- Sécurité anti-triche : trigger protect_founder_fields (bloque l'auto-attribution client-side), assign_founder en SECURITY DEFINER avec pg_advisory_xact_lock (anti-doublon/anti-dépassement), REVOKE sur PUBLIC/anon/authenticated
- 2 migrations SQL appliquées dans Supabase : 20260618_founder_security.sql + 20260618_orders_status_fix.sql (corrige la contrainte CHECK orders.status qui n'acceptait pas 'completed'/'payout_pending')
- Variable FOUNDER_LAUNCH_DATE créée vide dans Netlify
- Commits poussés : b84ec5f, f9e972d, 3ff97c7, 00e0138

### Autres corrections en production
- Redirection /compte-active après confirmation email (commit bb1189f)
- Réorganisation sections Mentions légales (commit 15ce14c)
- Traduction FR de l'email de confirmation Supabase (template "Confirm signup", fait manuellement dans le dashboard)

## 📋 Reste à faire

### Cette semaine
- Vérifier le "double email" : confirmer si c'est un vrai bug ou juste des tests +test1/+test3 mélangés dans la même boîte Gmail
- Refaire un test d'inscription propre → confirmer email de confirmation en français
- Supprimer les comptes de test (+test1, +test3)
- Vérifier le taux de cotisation URSSAF/CGSS (ACRE non applicable en DOM, exonération auto à la place)
- Préparer l'appel Chronopost — mardi 23/06 après-midi

### Prochaines semaines
- DGFiP/SIE : espace pro impots.gouv.fr + questionnaire locaux (deadline ~mi-juillet)
- INPI : dépôt marque NOUT (~270€)

### Jour du lancement officiel (NE PAS OUBLIER)
- Activer FOUNDER_LAUNCH_DATE : variable Netlify + 2 lignes SQL dans Supabase (ALTER DATABASE postgres SET app.founder_launch_date = '...' ; SELECT pg_reload_conf();)
- Sinon le programme Fondateurs reste en veille

### En attente
- La Poste Pro (compte bloqué, SIRET à propager)
- Posts Facebook + LinkedIn pour la communication de lancement
