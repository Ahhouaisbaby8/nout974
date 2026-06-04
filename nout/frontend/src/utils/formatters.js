export const formatPrice = (price) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)

export const formatDate = (dateStr) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr))

export const formatRelativeDate = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return "À l'instant"
  if (mins < 60)  return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7)   return `Il y a ${days}j`
  return formatDate(dateStr)
}

export const truncate = (str, n = 80) =>
  str.length > n ? str.slice(0, n) + '…' : str
