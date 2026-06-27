// Retire les emojis d'une chaîne — pour garder une image pro sur les annonces.
// Couvre les plages Unicode emoji courantes (symboles, pictogrammes, drapeaux,
// variations, ZWJ). Conserve les accents et la ponctuation française normale.
const EMOJI_REGEX = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}]/gu

export function stripEmoji(str) {
  if (!str) return str
  return str
    .replace(EMOJI_REGEX, '')
    .replace(/[ \t]{2,}/g, ' ')   // espaces multiples laissés par un emoji retiré
    .replace(/ +\n/g, '\n')        // espace en fin de ligne
    .trim()
}
