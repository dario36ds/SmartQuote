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
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const busy = saving || deletingId !== null;
  const isEditing = editingId !== null;
  const filteredQuotes = customerId
    ? quotes.filter((quote) => String(quote.customer) === customerId)
    : quotes;
  const previewTotal = items.reduce((total, item) => {
    const lineTotal = Number(item.quantity) * Number(item.unit_price);
    return total + (Number.isFinite(lineTotal) ? lineTotal : 0);
  }, 0);

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
    setFormSuccess("");
  }

  function handleItemChange(itemKey, event) {
    const { name, value } = event.target;
    setItems((current) => current.map((item) =>
      item.key === itemKey ? { ...item, [name]: value } : item
    ));
    setFormSuccess("");
  }

  function handleAddItem() {
    const item = createEmptyItem();
    setItems((current) => [...current, item]);
    setFormSuccess("");
  }

  function handleRemoveItem(itemKey) {
    if (busy) {
      return;
    }

    setItems((current) => current.length > 1
      ? current.filter((item) => item.key !== itemKey)
      : current
    );
    setFormError("");
    setFormSuccess("");
  }

  function resetForm() {
    setEditingId(null);
    setQuoteForm({ customer: "", title: "", delivery_time: "" });
    setItems([createEmptyItem()]);
    setFormError("");
    setFormSuccess("");
  }

  function handleEdit(quote) {
    if (busy) {
      return;
    }

    setEditingId(quote.id);
    setQuoteForm({
      customer: String(quote.customer),
      title: quote.title,
      delivery_time: quote.delivery_time,
    });
    setItems(quote.items.length > 0
      ? quote.items.map((item) => ({
          key: crypto.randomUUID(),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      : [createEmptyItem()]
    );
    setFormError("");
    setFormSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy || loading || error) {
      return;
    }

    setSaving(true);
    setFormError("");
    setFormSuccess("");

    try {
      const quote = await apiRequest(isEditing ? `/quotes/${editingId}/` : "/quotes/", {
        method: isEditing ? "PATCH" : "POST",
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

      setQuotes((current) => isEditing
        ? current.map((item) => item.id === quote.id ? quote : item)
        : [quote, ...current]
      );
      resetForm();
      setFormSuccess(isEditing ? "Preventivo aggiornato." : "Preventivo creato.");
    } catch (err) {
      const itemErrors = Array.isArray(err.data?.items) ? err.data.items : [];
      const itemError = itemErrors.find((item) =>
        item?.description?.[0] || item?.quantity?.[0] || item?.unit_price?.[0]
      );

      setFormError(
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

  async function handleDelete(quote) {
    if (busy) {
      return;
    }

    if (!window.confirm(`Vuoi eliminare il preventivo "${quote.title}"?`)) {
      return;
    }

    setDeleteError("");
    setDeletingId(quote.id);

    try {
      await apiRequest(`/quotes/${quote.id}/`, {
        method: "DELETE",
        token,
      });

      setQuotes((current) => current.filter((item) => item.id !== quote.id));

      if (editingId === quote.id) {
        resetForm();
      }
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
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
          onSubmit={handleSubmit}
        >
          <h3 id="new-quote-heading">
            {isEditing ? "Modifica preventivo" : "Nuovo preventivo"}
          </h3>

          <fieldset disabled={busy || loading || Boolean(error)}>
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

              <button
                type="button"
                disabled={items.length === 1}
                onClick={() => handleRemoveItem(item.key)}
                aria-label={`Rimuovi voce ${index + 1}`}
              >
                Rimuovi voce
              </button>
            </fieldset>
          ))}

          <button type="button" onClick={handleAddItem}>
            Aggiungi voce
          </button>

          <p aria-live="polite">
            Totale provvisorio:{" "}
            <strong>
              {previewTotal.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </p>

          <button type="submit">
            {saving ? "Salvataggio..." : isEditing ? "Salva modifiche" : "Crea preventivo"}
          </button>

          {isEditing && (
            <button type="button" onClick={resetForm}>
              Annulla
            </button>
          )}
          </fieldset>

          {formError && <p role="alert">{formError}</p>}
          {formSuccess && <p role="status">{formSuccess}</p>}
        </form>
      )}

      {loading && <p>Caricamento preventivi...</p>}

      {!loading && error && <p role="alert">{error}</p>}
      {deleteError && <p role="alert">{deleteError}</p>}

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
              <th scope="col">Voci</th>
              <th scope="col">Stato</th>
              <th scope="col">Totale</th>
              <th scope="col">Tempo di consegna</th>
              <th scope="col">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.title}</td>
                <td>
                  {quote.items.length === 0 ? (
                    <p>Nessuna voce.</p>
                  ) : (
                    <ul>
                      {quote.items.map((item) => (
                        <li key={item.id}>
                          <strong>{item.description}</strong>
                          <p>
                            Quantità: {Number(item.quantity).toLocaleString("it-IT", {
                              maximumFractionDigits: 2,
                            })}
                            <br />
                            Prezzo unitario: {Number(item.unit_price).toLocaleString("it-IT", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            <br />
                            Totale voce: {Number(item.total).toLocaleString("it-IT", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>{STATUS_LABELS[quote.status] || quote.status}</td>
                <td>
                  {Number(quote.total).toLocaleString("it-IT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td>{quote.delivery_time || "—"}</td>
                <td>
                  <button
                    type="button"
                    disabled={busy || customersLoading || Boolean(customersError) || customers.length === 0}
                    onClick={() => handleEdit(quote)}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(quote)}
                  >
                    {deletingId === quote.id ? "Eliminazione..." : "Elimina"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AuthenticatedLayout>
  );
}
