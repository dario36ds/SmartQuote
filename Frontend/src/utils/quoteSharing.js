import { validatePhone } from "./validation.js";

// Local numbers use Italy's country code; explicit international codes are kept.
function whatsappNumber(phone = "") {
  if (!phone.trim() || validatePhone(phone)) return "";
  const normalized = phone.trim().replace(/[\s().-]/g, "");
  const international = normalized.startsWith("+") || normalized.startsWith("00");
  const digits = international ? normalized.replace(/^(\+|00)/, "") : `39${normalized}`;
  return /^[1-9]\d{6,14}$/.test(digits) ? digits : "";
}

export function getQuoteShareLinks(quote, customer, publicUrl, { reminder = false } = {}) {
  const total = Number(quote.total).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  const message = [
    customer?.name ? `Buongiorno ${customer.name},` : "Buongiorno,",
    reminder
      ? `ti ricordo il preventivo «${quote.title}», per un totale di ${total}, sul quale sono in attesa di un tuo riscontro.`
      : `ti invio il preventivo «${quote.title}», per un totale di ${total}.`,
    "Puoi consultare tutti i dettagli e accettare o rifiutare la proposta qui:",
    publicUrl,
    "Resto a disposizione per qualsiasi domanda.",
  ].join("\n\n");
  const number = whatsappNumber(customer?.phone);
  const email = customer?.email?.trim() || "";
  const encodedEmail = encodeURIComponent(email).replace(/%40/g, "@");

  return {
    email: email ? `mailto:${encodedEmail}?subject=${encodeURIComponent(`${reminder ? "Promemoria preventivo" : "Preventivo"}: ${quote.title}`)}&body=${encodeURIComponent(message)}` : null,
    whatsapp: number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null,
    emailRecipient: email,
    whatsappRecipient: number ? `+${number}` : "",
    hasWhatsappRecipient: Boolean(number),
  };
}
