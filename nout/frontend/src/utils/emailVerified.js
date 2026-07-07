// Statut de vérification e-mail (validation DIFFÉRÉE — voir migration 20260707_email_verified.sql).
//
// Règles :
//  - Compte Google → vérifié d'office (Google fait foi), quelle que soit la colonne.
//  - Sinon → profiles.email_verified_at (exposée au propriétaire via get_my_account, fusionnée
//    dans le profile de l'AuthContext).
//  - FAIL-OPEN transitoire : tant que la migration n'est pas passée, la clé email_verified_at
//    n'existe pas dans le profil → on considère vérifié (aucun blocage à tort). Le vrai verrou
//    est de toute façon côté SQL (triggers) + serveur (checkout).
export const isEmailVerified = (user, profile) => {
  if (user?.app_metadata?.provider === 'google') return true
  if ((user?.app_metadata?.providers ?? []).includes('google')) return true
  if (!profile || !('email_verified_at' in profile)) return true   // migration pas encore passée
  return profile.email_verified_at != null
}
