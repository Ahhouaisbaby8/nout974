// ─── Génération d'étiquette Chronopost (shippingMultiParcelV4) ────────────────────
// Crée la lettre de transport (étiquette PDF base64) après paiement confirmé.
// Gère les 2 modes : 'relais' (Chrono Relais DOM 4P) et 'express' (Chrono Express 17).
// Retourne le numéro de suivi (skybillNumber) + le PDF encodé en base64.
//
// SÉCURITÉ : appelée UNIQUEMENT côté serveur (JWT vendeur + statut commande vérifiés
// avant, dans l'appelant). Les identifiants Chronopost restent en env Netlify.
//
// Règles étiquette Relais (emails Chronopost) : idRelais + coordonnées du point relais
// en recipient* + nom du retirant en recipientName2 + recipientPhone + recipientEmail.
// Règle internationale : content1 en anglais (article le plus cher/nombreux).

const {
  soapCall, buildTags, credentials, isChronopostConfigured,
  xmlFirst, ChronopostError,
} = require('./_chronopost-client')

// Construit le bloc <shipperValue> (l'expéditeur = le VENDEUR sur une marketplace :
// c'est lui qui dépose le colis, et c'est chez lui que revient un colis non livré).
function shipperTags(shipper) {
  return `<shipperValue>${buildTags({
    shipperAdress1:     shipper.adresse1,
    shipperAdress2:     shipper.adresse2 || '',
    shipperCity:        shipper.ville,
    shipperCivility:    shipper.civilite || 'M',
    shipperContactName: shipper.contact || shipper.nom,
    shipperCountry:     'RE',
    shipperCountryName: 'REUNION',
    shipperEmail:       shipper.email,
    shipperName:        shipper.nom,
    shipperPhone:       shipper.telephone,
    shipperPreAlert:    0,
    shipperZipCode:     shipper.codePostal,
    shipperType:        2, // 2 = particulier
  })}</shipperValue>`
}

// <customerValue> = le donneur d'ordre (NOUT, ou le vendeur). Ici on reprend le vendeur.
function customerTags(shipper) {
  return `<customerValue>${buildTags({
    customerAdress1:     shipper.adresse1,
    customerAdress2:     shipper.adresse2 || '',
    customerCity:        shipper.ville,
    customerCivility:    shipper.civilite || 'M',
    customerContactName: shipper.contact || shipper.nom,
    customerCountry:     'RE',
    customerCountryName: 'REUNION',
    customerEmail:       shipper.email,
    customerName:        shipper.nom,
    customerPhone:       shipper.telephone,
    customerPreAlert:    0,
    customerZipCode:     shipper.codePostal,
    printAsSender:       'N',
  })}</customerValue>`
}

// <recipientValue> — en mode relais, ce sont les coordonnées DU POINT RELAIS,
// et le nom du retirant (l'acheteur) va dans recipientName2 (règle Chronopost).
function recipientTags(mode, recipient, relais) {
  if (mode === 'relais') {
    return `<recipientValue>${buildTags({
      recipientName:        relais.nom,                 // raison sociale du point relais
      recipientName2:       recipient.nom,              // personne habilitée à retirer
      recipientAdress1:     relais.adresse1,
      recipientAdress2:     relais.adresse2 || '',
      recipientZipCode:     relais.codePostal,
      recipientCity:        relais.ville,
      recipientCountry:     'RE',
      recipientContactName: recipient.nom,
      recipientEmail:       recipient.email,
      recipientPhone:       recipient.telephone,        // portable obligatoire pour RELAIS
      recipientPreAlert:    0,
      recipientType:        2,
    })}</recipientValue>`
  }
  // Express domicile : livraison directe chez l'acheteur.
  return `<recipientValue>${buildTags({
    recipientName:        recipient.nom,
    recipientName2:       '',
    recipientAdress1:     recipient.adresse1,
    recipientAdress2:     recipient.adresse2 || '',
    recipientZipCode:     recipient.codePostal,
    recipientCity:        recipient.ville,
    recipientCountry:     'RE',
    recipientContactName: recipient.nom,
    recipientEmail:       recipient.email,
    recipientPhone:       recipient.telephone,
    recipientPreAlert:    0,
    recipientType:        2,
  })}</recipientValue>`
}

/**
 * Génère une étiquette Chronopost.
 * @param {'relais'|'express'} mode
 * @param {object} p  { shipper, recipient, relais?, refCommande, contenu, poids }
 * @returns {Promise<{trackingNumber, labelBase64, raw}>}
 */
async function createLabel(mode, p) {
  const c = credentials(mode)
  const { shipper, recipient, relais, refCommande, contenu, poids } = p

  const inner =
    `<headerValue>${buildTags({ accountNumber: c.account, idEmit: 'CHRFR', identWebPro: '', subAccount: '' })}</headerValue>` +
    shipperTags(shipper) +
    customerTags(shipper) +
    recipientTags(mode, recipient, relais) +
    `<refValue>${buildTags({
      recipientRef: refCommande,
      shipperRef:   refCommande,
      idRelais:     mode === 'relais' ? (relais?.id || '') : '',
    })}</refValue>` +
    `<skybillValue>${buildTags({
      bulkNumber:  1,
      codValue:    0,
      content1:    contenu || 'Second hand clothing', // anglais, requis à l'international
      evtCode:     'DC',
      insuredValue: 0,
      objectType:  'MAR',
      portValue:   0,
      productCode: c.productCode,   // 4P (relais) ou 17 (express)
      service:     c.service,       // 0
      shipDate:    '',              // vide = date courante
      shipHour:    '',
      skybillRank: 1,
      weight:      poids || 1,
      weightUnit:  'KGM',
      height:      10,
      length:      20,
      width:       15,
    })}</skybillValue>` +
    `<skybillParamsValue>${buildTags({
      duplicata:       'N',
      mode:            'PDF',   // étiquette A4 avec preuve de dépôt
      withReservation: 0,
    })}</skybillParamsValue>` +
    buildTags({
      password:       c.password,
      modeRetour:     2,   // pas d'envoi de mail auto par Chronopost
      numberOfParcel: 1,
      version:        '2.0',
      multiParcel:    'N',
    })

  const xml = await soapCall('shipping', 'shippingMultiParcelV4', inner)

  return {
    trackingNumber: xmlFirst(xml, 'skybillNumber'),
    labelBase64:    xmlFirst(xml, 'pdfEtiquette'),
    reservation:    xmlFirst(xml, 'reservationNumber'),
    raw:            xml,
    isTest:         c.isTest,
  }
}

module.exports = { createLabel }
