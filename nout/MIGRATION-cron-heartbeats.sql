-- ─── Table des « battements de cœur » des crons (santé du système) ───────────────────────────
-- But : prouver que chaque tâche automatique (suivi Chronopost, suivi UBN, auto-annulation,
-- versements) tourne RÉELLEMENT. Chaque cron y écrit sa dernière exécution + un résumé.
-- L'admin lit cette table pour afficher « dernière fois il y a X min » et repérer un cron mort.
--
-- À PASSER dans Supabase → SQL Editor → Run. Sans risque : création simple, aucune donnée touchée.

create table if not exists public.cron_heartbeats (
  job         text primary key,            -- nom du cron (ex. 'chronopost-tracking')
  last_run_at timestamptz not null default now(),
  last_summary text,                       -- dernier résumé ('… 3 vérifiée(s), 1 livrée(s)…')
  runs        bigint not null default 0    -- compteur d'exécutions (cumul)
);

-- Écriture réservée au serveur (service key). RLS activée + AUCUNE policy publique
-- → personne ne peut lire/écrire depuis le navigateur ; seules les fonctions serveur (service
-- role, qui contourne la RLS) y touchent. L'admin lit via la fonction admin-orders-diagnostic.
alter table public.cron_heartbeats enable row level security;

-- Fonction d'upsert appelée par les crons (SECURITY DEFINER → écrit même sans policy).
create or replace function public.record_cron_heartbeat(p_job text, p_summary text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cron_heartbeats (job, last_run_at, last_summary, runs)
  values (p_job, now(), p_summary, 1)
  on conflict (job) do update
    set last_run_at = now(),
        last_summary = excluded.last_summary,
        runs = public.cron_heartbeats.runs + 1;
end;
$$;
