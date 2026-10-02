import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { apiRequest } from "../api";

const STATUS_LABELS = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  VIEWED: "Visualizzato",
  ACCEPTED: "Accettato",
  REJECTED: "Rifiutato",
};

function formatAmount(value) {
  return Number(value).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PublicQuotePage() {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  const loading = result?.token !== token;
  const quote = loading ? null : result.quote;

  useEffect(() => {
    let active = true;

    async function loadQuote() {
      try {
        const data = await apiRequest(`/quotes/public/${token}/`);

        if (active) {
          setResult({ token, quote: data, error: "" });
        }
      } catch (err) {
        if (active) {
          setResult({ token, quote: null, error: err.message });
        }
      }
    }

    loadQuote();

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main>
      <h1>SmartQuote</h1>

      {loading && <p>Caricamento preventivo...</p>}
      {!loading && result.error && <p role="alert">{result.error}</p>}

      {quote && (
        <article>
          <h2>{quote.title}</h2>
          <p>Cliente: {quote.customer_name}</p>
          {quote.company_name && <p>Azienda: {quote.company_name}</p>}
          <p>Stato: {STATUS_LABELS[quote.status] || quote.status}</p>

          <p style={{ whiteSpace: "pre-wrap" }}>
            {quote.description || "Nessuna descrizione."}
          </p>

          <table>
            <caption>Servizi</caption>
            <thead>
              <tr>
                <th scope="col">Servizio</th>
                <th scope="col">Quantità</th>
                <th scope="col">Prezzo unitario</th>
                <th scope="col">Totale voce</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>
                    {Number(item.quantity).toLocaleString("it-IT", {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>{formatAmount(item.unit_price)}</td>
                  <td>{formatAmount(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p>Totale: <strong>{formatAmount(quote.total)}</strong></p>
          <p>Tempo di consegna: {quote.delivery_time || "Non specificato"}</p>
        </article>
      )}
    </main>
  );
}
