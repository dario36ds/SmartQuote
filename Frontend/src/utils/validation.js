const EMAIL_MESSAGE = "Inserisci un indirizzo email valido, ad esempio nome@azienda.it.";
const PHONE_MESSAGE = "Inserisci un telefono con 7–15 cifre. Puoi usare il prefisso + o 00, spazi, trattini, punti e parentesi.";

export function validatePhone(value) {
  const phone = value.trim();
  if (!phone) return "";
  if (phone.length > 50 || !/^\+?[0-9 ().-]+$/.test(phone)) return PHONE_MESSAGE;
  let depth = 0;
  for (const character of phone) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (depth < 0 || depth > 1) return PHONE_MESSAGE;
  }
  if (depth) return PHONE_MESSAGE;
  const normalized = phone.replace(/[ ().-]/g, "");
  const international = normalized.startsWith("+") || normalized.startsWith("00");
  const digits = normalized.startsWith("+") ? normalized.slice(1) : international ? normalized.slice(2) : normalized;
  return /^[0-9]{7,15}$/.test(digits) && (!international || !digits.startsWith("0")) ? "" : PHONE_MESSAGE;
}

export function validateInput(value, { type = "text", required, maxLength, min, max, step, name } = {}) {
  const text = String(value ?? "").trim();
  if (!text) return required ? "Compila questo campo." : "";
  if (maxLength && String(value).length > maxLength) return `Usa al massimo ${maxLength} caratteri.`;
  if (type === "email") {
    const [local = ""] = text.split("@");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return EMAIL_MESSAGE;
  }
  if (type === "tel") return validatePhone(text);
  if (name === "username" && !/^[\p{L}\p{N}_@.+-]+$/u.test(text)) return "Usa solo lettere, numeri e i caratteri @ . + - _.";
  if (type === "number") {
    const number = Number(text);
    if (!Number.isFinite(number)) return "Inserisci un numero valido.";
    if (min !== undefined && number < Number(min)) return `Il valore minimo è ${min}.`;
    if (max !== undefined && number > Number(max)) return `Il valore massimo è ${max}.`;
    if (step && step !== "any") {
      const increments = (number - Number(min ?? 0)) / Number(step);
      const tolerance = Math.max(0.00000001, Math.abs(increments) * Number.EPSILON * 4);
      if (Math.abs(increments - Math.round(increments)) > tolerance) return `Usa incrementi di ${step}.`;
    }
  }
  return "";
}
