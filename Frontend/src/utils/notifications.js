export function notificationMessage(notification) {
  if (notification.status === "REMINDER") {
    return notification.can_remind
      ? `${notification.customer_name} non ha ancora risposto a «${notification.quote_title}». Vuoi sollecitare?`
      : `Promemoria per «${notification.quote_title}»: ${notification.quote ? "il cliente ha già risposto." : "il preventivo è stato eliminato."}`;
  }
  return `${notification.customer_name} ha ${notification.status === "ACCEPTED" ? "accettato" : "rifiutato"} «${notification.quote_title}».`;
}

export function notificationTitle(notification) {
  if (notification.status === "REMINDER") return notification.can_remind ? "Vuoi sollecitare?" : "Promemoria concluso";
  return `Preventivo ${notification.status === "ACCEPTED" ? "accettato" : "rifiutato"}`;
}

export function notificationQuotePath(notification) {
  if (!notification.quote) return null;
  return `/quotes?quote=${notification.quote}${notification.can_remind ? "&remind=1" : ""}`;
}
