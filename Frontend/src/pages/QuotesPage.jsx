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

function createEmptyItem() {
  return {
    key: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unit_price: "",
  };
}

export default function QuotesPage() {
  const { token } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [quoteForm, setQuoteForm] = useState({
    customer: "",
    title: "",
    delivery_time: "",
  });
  const [items, setItems] = useState(() => [createEmptyItem()]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);
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

  function handleQuoteChange(event) {
    const { name, value } = event.target;
    setQuoteForm((current) => ({ ...current, [name]: value }));
    setCreateSuccess(false);
  }

  function handleItemChange(itemKey, event) {
    const { name, value } = event.target;
    setItems((current) => current.map((item) =>
      item.key === itemKey ? { ...item, [name]: value } : item
    ));
    setCreateSuccess(false);
  }

  function handleAddItem() {
    const item = createEmptyItem();
    setItems((current) => [...current, item]);
    setCreateSuccess(false);
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (saving || loading || error) {
      return;
    }

    setSaving(true);
    setCreateError("");
    setCreateSuccess(false);

    try {
      const quote = await apiRequest("/quotes/", {
        method: "POST",
        token,
        body: {
          ...quoteForm,
          customer: Number(quoteForm.customer),
          items: items.map(({ description, quantity, unit_price }) => ({
            description,
            quantity,
            unit_price,
          })),
        },
      });

      setQuotes((current) => [quote, ...current]);
      setQuoteForm({ customer: "", title: "", delivery_time: "" });
      setItems([createEmptyItem()]);
      setCreateSuccess(true);
    } catch (err) {
      const itemErrors = Array.isArray(err.data?.items) ? err.data.items : [];
      const itemError = itemErrors.find((item) =>
        item?.description?.[0] || item?.quantity?.[0] || item?.unit_price?.[0]
      );

      setCreateError(
        err.data?.customer?.[0] ||
          err.data?.title?.[0] ||
          err.data?.delivery_time?.[0] ||
          itemError?.description?.[0] ||
          itemError?.quantity?.[0] ||
          itemError?.unit_price?.[0] ||
          (typeof itemErrors[0] === "string" ? itemErrors[0] : "") ||
          err.data?.non_field_errors?.[0] ||
          err.message
      );
    } finally {
      setSaving(false);
    }
  }

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

      {!customersLoading && !customersError && customers.length > 0 && (
        <form
          aria-labelledby="new-quote-heading"
          onSubmit={handleCreate}
        >
          <h3 id="new-quote-heading">Nuovo preventivo</h3>

          <fieldset disabled={saving || loading || Boolean(error)}>
            <legend>Dati del preventivo</legend>

          <div>
            <label htmlFor="new-quote-customer">Cliente del preventivo</label>
            <select
              id="new-quote-customer"
              name="customer"
              value={quoteForm.customer}
              onChange={handleQuoteChange}
              required
            >
              <option value="">Seleziona un cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.company ? ` — ${customer.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-quote-title">Titolo</label>
            <input
              id="new-quote-title"
              name="title"
              value={quoteForm.title}
              onChange={handleQuoteChange}
              maxLength={200}
              required
            />
          </div>

          <div>
            <label htmlFor="new-quote-delivery">Tempo di consegna (facoltativo)</label>
            <input
              id="new-quote-delivery"
              name="delivery_time"
              value={quoteForm.delivery_time}
              onChange={handleQuoteChange}
              maxLength={150}
            />
          </div>

          {items.map((item, index) => (
            <fieldset key={item.key}>
              <legend>Voce {index + 1}</legend>

              <div>
                <label htmlFor={`item-description-${item.key}`}>Servizio</label>
                <input
                  id={`item-description-${item.key}`}
                  name="description"
                  value={item.description}
                  onChange={(event) => handleItemChange(item.key, event)}
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label htmlFor={`item-quantity-${item.key}`}>Quantità</label>
                <input
                  id={`item-quantity-${item.key}`}
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(event) => handleItemChange(item.key, event)}
                  required
                />
              </div>

              <div>
                <label htmlFor={`item-price-${item.key}`}>Prezzo unitario</label>
                <input
                  id={`item-price-${item.key}`}
                  name="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(event) => handleItemChange(item.key, event)}
                  required
                />
              </div>
            </fieldset>
          ))}

          <button type="button" onClick={handleAddItem}>
            Aggiungi voce
          </button>

          <button type="submit">
            {saving ? "Salvataggio..." : "Crea preventivo"}
          </button>
          </fieldset>

          {createError && <p role="alert">{createError}</p>}
          {createSuccess && <p role="status">Preventivo creato.</p>}
        </form>
      )}

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
