import { getQuoteShareLinks } from "../utils/quoteSharing";
import Icon from "./Icon";

export default function QuoteShareActions({ quote, customer, publicUrl, showHelp = false }) {
  if (quote.status === "DRAFT" || !quote.public_token) return null;

  const links = getQuoteShareLinks(quote, customer, publicUrl);

  return (
    <div className="quote-share">
      <div className="quote-share-actions" role="group" aria-label={`Condividi il preventivo ${quote.title}`}>
        <a className="sq-button sq-button-secondary" href={links.email} aria-label={`Condividi ${quote.title} via email`} title={customer?.email ? `Prepara un’email per ${customer.email}` : "Prepara un’email e scegli il destinatario"}><Icon name="mail" size={17} />Email</a>
        <a className="sq-button sq-button-secondary quote-share-whatsapp" href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Condividi ${quote.title} via WhatsApp`} title={links.hasWhatsappRecipient ? `Apri WhatsApp per ${customer.phone}` : "Apri WhatsApp e scegli il destinatario"}><Icon name="whatsapp" size={17} />WhatsApp</a>
      </div>
      {showHelp && <p className="quote-share-help">Rivedi il messaggio e conferma l’invio nell’app scelta.{!links.hasWhatsappRecipient && " Per aprire la chat del cliente, salva il suo numero con prefisso internazionale (es. +39); altrimenti scegli il destinatario in WhatsApp."}</p>}
    </div>
  );
}
