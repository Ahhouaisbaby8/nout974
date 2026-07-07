-- ================================================================
-- NOUT — FILTRE ANTI-COORDONNÉES dans la messagerie (7 juillet 2026)
-- À exécuter dans Supabase > SQL Editor. Idempotente (rejouable).
--
-- OBJECTIF : empêcher l'échange de téléphone / e-mail entre deux membres
-- TANT QU'AUCUN ACHAT n'existe entre eux (anti-contournement : conclure la
-- vente hors NOUT = pas de protection acheteur, pas de commission).
-- Après un achat payé entre les deux, l'échange est débloqué (légitime :
-- organiser la remise en main propre).
--
-- POURQUOI EN BASE : l'envoi de message part DIRECTEMENT du navigateur vers
-- Supabase (services/messages.js, INSERT client sous RLS) — un filtre côté
-- app serait contournable en 30 secondes via la console. Le trigger est le
-- vrai verrou ; l'app se contente d'afficher un message pédagogique.
--
-- ON NE BLOQUE PAS LES ADRESSES POSTALES : indétectables proprement
-- (« trouvé au magasin de Saint-Denis » = innocent) → trop de faux positifs.
-- Le téléphone est LE canal de fuite ; sans numéro, pas de rendez-vous hors site.
-- ================================================================

-- Le schéma private existe déjà (is_blocked_with) — au cas où :
CREATE SCHEMA IF NOT EXISTS private;

-- Un achat réel existe-t-il entre ces deux membres (peu importe le sens) ?
-- Statuts « argent engagé » uniquement : pending (paiement non abouti) et
-- cancelled/refunded/chargeback n'ouvrent PAS le droit d'échanger des coordonnées.
-- SECURITY DEFINER : le trigger doit voir les commandes quelle que soit la RLS.
CREATE OR REPLACE FUNCTION private.has_paid_order_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE status IN ('paid', 'shipped', 'delivered', 'completed', 'payout_pending', 'disputed')
      AND ((buyer_id = a AND seller_id = b) OR (buyer_id = b AND seller_id = a))
  )
$$;

-- Trigger : refuse un message contenant un téléphone (FR/974, avec ou sans
-- séparateurs) ou un e-mail, si aucun achat n'existe entre les deux membres.
-- Les écritures service_role (carte « Achat effectué » du webhook, admin) et
-- SQL direct ne sont JAMAIS filtrées (même garde de rôle que
-- protect_sensitive_profile_fields).
CREATE OR REPLACE FUNCTION public.filter_message_contact_info()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  jwt_claims  TEXT;
  jwt_role    TEXT;
  has_contact BOOLEAN;
BEGIN
  jwt_claims := nullif(current_setting('request.jwt.claims', true), '');
  jwt_role   := CASE WHEN jwt_claims IS NOT NULL
                     THEN jwt_claims::jsonb->>'role'
                     ELSE NULL
                END;

  -- Seuls les appels client (anon / authenticated) sont filtrés.
  IF jwt_role IS NULL OR jwt_role NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  has_contact :=
       NEW.content ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'          -- e-mail
    OR NEW.content ~* '(^|[^0-9])0[1-9]([ .\-]?[0-9]){8}'              -- 10 chiffres FR (0692…, 0262…, 06…),
                                                                       -- séparateurs espace/point/tiret tolérés
    OR NEW.content ~* '(\+|00)(33|262)([ .\-]?[0-9]){9}';              -- format international +262 / +33

  IF has_contact AND NOT private.has_paid_order_between(NEW.sender_id, NEW.receiver_id) THEN
    -- Marqueur stable : l'app le détecte et affiche le message pédagogique complet.
    RAISE EXCEPTION 'NOUT_CONTACT_BLOCK';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_filter_message_contact ON public.messages;
CREATE TRIGGER trg_filter_message_contact
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.filter_message_contact_info();
