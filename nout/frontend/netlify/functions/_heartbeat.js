// ─── Heartbeat des crons (santé du système) ──────────────────────────────────────────────────
// Chaque cron appelle recordHeartbeat(supabase, 'nom-du-cron', résumé) à la fin de son exécution.
// Écrit la dernière exécution dans public.cron_heartbeats (service key → contourne la RLS).
// Best-effort ABSOLU : ne jette jamais (un souci de heartbeat ne doit pas casser un cron qui, lui,
// a bien tourné). Si la table n'existe pas encore (migration pas passée), on ignore silencieusement.

async function recordHeartbeat(supabase, job, summary) {
  try {
    await supabase
      .from('cron_heartbeats')
      .upsert(
        { job, last_run_at: new Date().toISOString(), last_summary: (summary ?? '').slice(0, 300) },
        { onConflict: 'job' },
      )
  } catch (e) {
    console.error(`[heartbeat] ${job} :`, e?.message)
  }
}

module.exports = { recordHeartbeat }
