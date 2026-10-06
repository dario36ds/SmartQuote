import { getQuoteShareLinks } from "../utils/quoteSharing";
import Icon from "./Icon";

export default function QuoteShareActions({ quote, customer, publicUrl, showHelp = false }) {
  if (quote.status === "DRAFT" || !quote.public_token) return null;

  const links = getQuoteShareLinks(quote, customer, publicUrl);

  return (
    <div className="quote-share">
      <div className="quote-share-actions" role="group" aria-label={`Condividi il preventivo ${quote.title}`}>
        {links.email ? (
          <a className="sq-button sq-button-secondary" href={links.email} aria-label={`Condividi ${quote.title} via email a ${links.emailRecipient}`} title={`Prepara un’email per ${links.emailRecipient}`}><Icon name="mail" size={17} />Email</a>
        ) : (
          <button type="button" className="sq-button sq-button-secondary" disabled title="Aggiungi l’email nell’anagrafica del cliente"><Icon name="mail" size={17} />Email mancante</button>
        )}
        {links.whatsapp ? (
          <a className="sq-button sq-button-secondary quote-share-whatsapp" href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Condividi ${quote.title} via WhatsApp a ${links.whatsappRecipient}`} title={`Apri WhatsApp per ${links.whatsappRecipient}`}><Icon name="whatsapp" size={17} />WhatsApp</a>
        ) : (
          <button type="button" className="sq-button sq-button-secondary quote-share-whatsapp" disabled title="Aggiungi un numero valido nell’anagrafica del cliente"><Icon name="whatsapp" size={17} />{customer?.phone?.trim() ? "Numero non valido" : "Telefono mancante"}</button>
        )}
      </div>
      {showHelp && <p className="quote-share-help">Destinatario e messaggio sono già compilati con i dati del cliente. Rivedi il messaggio e conferma l’invio nell’app scelta. Per i numeri senza prefisso usiamo +39.{!links.email && " Aggiungi l’email nell’anagrafica del cliente per inviare via email."}{!links.hasWhatsappRecipient && " Aggiungi un numero valido nell’anagrafica del cliente per inviare via WhatsApp; per i numeri esteri specifica il prefisso internazionale."}</p>}
    </div>
  );
}
