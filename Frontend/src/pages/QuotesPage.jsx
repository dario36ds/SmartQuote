import { useEffect, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../api";
import AuthenticatedLayout from "../components/AuthenticatedLayout";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  VIEWED: "Visualizzato",
  ACCEPTED: "Accettato",
  REJECTED: "Rifiutato",
};

export default function QuotesPage() {
  const { token } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState("");
  const [customerId, setCustomerId] = useState("");
  const filteredQuotes = customerId
    ? quotes.filter((quote) => String(quote.customer) === customerId)
    : quotes;

  useEffect(() => {
    let active = true;

    async function loadQuotes() {
      try {
        const data = await apiRequest("/quotes/", { token });

        if (active) {
          setQuotes(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadQuotes();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      try {
        const data = await apiRequest("/customers/", { token });

        if (active) {
          setCustomers(data);
        }
      } catch (err) {
        if (active) {
          setCustomersError(err.message);
        }
      } finally {
        if (active) {
          setCustomersLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthenticatedLayout>
      <h2>Preventivi</h2>

      <section aria-labelledby="quote-filter-heading">
        <h3 id="quote-filter-heading">Filtra per cliente</h3>

        {customersLoading && <p>Caricamento clienti...</p>}
        {!customersLoading && customersError && (
          <p role="alert">Impossibile caricare i clienti: {customersError}</p>
        )}

        {!customersLoading && !customersError && customers.length === 0 && (
          <p>
            Non hai ancora clienti.{" "}
            <Link to="/customers">Vai ai clienti</Link>
          </p>
        )}

        {!customersLoading && !customersError && customers.length > 0 && (
          <div>
            <label htmlFor="quote-customer">Cliente</label>
            <select
              id="quote-customer"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Tutti i clienti</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.company ? ` — ${customer.company}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {loading && <p>Caricamento preventivi...</p>}

      {!loading && error && <p role="alert">{error}</p>}

      {!loading && !error && filteredQuotes.length === 0 && (
        <p>
          {customerId
            ? "Nessun preventivo per il cliente selezionato."
            : "Non hai ancora preventivi."}
        </p>
      )}

      {!loading && !error && filteredQuotes.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Titolo</th>
              <th scope="col">Stato</th>
              <th scope="col">Totale</th>
              <th scope="col">Tempo di consegna</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.title}</td>
                <td>{STATUS_LABELS[quote.status] || quote.status}</td>
                <td>
                  {Number(quote.total).toLocaleString("it-IT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td>{quote.delivery_time || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AuthenticatedLayout>
  );
}
