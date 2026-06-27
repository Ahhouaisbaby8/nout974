// Lieux publics conseillés pour la remise en main propre — sécurité des échanges NOUT.
// Principe : privilégier des lieux passants, éclairés, avec du monde (parkings de centres
// commerciaux, gares routières, parvis de mairie, etc.). Jamais à domicile.
// Organisés par zone du 974 pour coller à la géographie de l'île.

export const SAFE_ZONES = [
  {
    zone: 'Nord',
    lieux: [
      'Parking du Centre commercial Sainte-Marie (Duparc)',
      'Gare routière de Saint-Denis (Océan)',
      'Parvis de la Mairie de Saint-Denis',
      'Parking Run Market / Score Sainte-Clotilde',
    ],
  },
  {
    zone: 'Ouest',
    lieux: [
      'Centre commercial Sacré-Cœur (Le Port)',
      'Parking E.Leclerc Saint-Paul (Savanna)',
      'Front de mer de Saint-Gilles-les-Bains',
      'Centre commercial Grand Large (Saint-Leu)',
    ],
  },
  {
    zone: 'Sud',
    lieux: [
      'Centre commercial Canabady (Saint-Pierre)',
      'Parking Run Market Le Tampon',
      'Gare routière de Saint-Pierre',
      'Centre commercial E.Leclerc Saint-Joseph',
    ],
  },
  {
    zone: 'Est',
    lieux: [
      'Centre commercial Carrefour Saint-Benoît',
      'Parvis de la Mairie de Saint-André',
      'Parking Score Bras-Panon',
      'Centre-ville de Saint-Benoît (place)',
    ],
  },
]

// Conseils de sécurité affichés avec la remise en main propre.
export const SAFE_TIPS = [
  'Choisis un lieu public et passant (jamais à ton domicile).',
  'Privilégie la journée, dans un endroit éclairé et fréquenté.',
  'Vérifie l\'article avant de valider le code de remise.',
  'Le paiement reste protégé : le vendeur n\'est payé qu\'après ta confirmation.',
]
