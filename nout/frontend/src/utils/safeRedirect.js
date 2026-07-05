// Renvoie un chemin interne SÛR pour une redirection, sinon '/'. Un simple `startsWith('/')` laisse passer
// `//evil.com` (URL protocole-relative) ou `/\evil.com` (backslash normalisé en `//` par les navigateurs)
// → redirection cross-origin = phishing après login. On exige : commence par UN seul '/', et aucun
// backslash ni espace/retour de ligne (les navigateurs suppriment \n\r\t d'une URL → `/\n//evil` deviendrait
// `///evil`). Un ':' dans un chemin qui commence par '/' reste same-origin, donc autorisé (query strings).
export function safeInternalPath(value) {
  const v = String(value ?? '')
  if (!/^\/(?!\/)/.test(v)) return '/'
  if (/[\\\s]/.test(v)) return '/'
  return v
}
