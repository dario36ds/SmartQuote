// Only address a specific WhatsApp contact when the country code is explicit.
function whatsappNumber(phone = "") {
  const normalized = phone.trim().replace(/[\s().-]/g, "");
  if (!normalized.startsWith("+") && !normalized.startsWith("00")) return "";
  const digits = normalized.replace(/^(\+|00)/, "");
  return /^[1-9]\d{6,14}$/.test(digits) ? digits : "";
}

export function getQuoteShareLinks(quote, customer, publicUrl) {
  const total = Number(quote.total).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  const message = [
    customer?.name ? `Buongiorno ${customer.name},` : "Buongiorno,",
    `ti invio il preventivo «${quote.title}», per un totale di ${total}.`,
    "Puoi consultare tutti i dettagli e accettare o rifiutare la proposta qui:",
    publicUrl,
    "Resto a disposizione per qualsiasi domanda.",
  ].join("\n\n");
  const number = whatsappNumber(customer?.phone);
  const email = encodeURIComponent(customer?.email?.trim() || "");

  return {
    email: `mailto:${email}?subject=${encodeURIComponent(`Preventivo: ${quote.title}`)}&body=${encodeURIComponent(message)}`,
    whatsapp: `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    hasWhatsappRecipient: Boolean(number),
  };
}
