import { useEffect, useState } from "react";

import { apiRequest } from "../api";
import AuthenticatedLayout from "../components/AuthenticatedLayout";
import { useAuth } from "../context/AuthContext";

const EMPTY_CUSTOMER = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
};

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...EMPTY_CUSTOMER });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const isEditing = editingId !== null;
  const busy = saving || deletingId !== null;

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
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      active = false;
    };
  }, [token]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleEdit(customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    });
    setFormError("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY_CUSTOMER });
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setFormError("");
    setSaving(true);

    try {
      const customer = await apiRequest(
        isEditing ? `/customers/${editingId}/` : "/customers/",
        {
          method: isEditing ? "PATCH" : "POST",
          token,
          body: form,
        }
      );

      setCustomers((current) =>
        isEditing
          ? current.map((item) => item.id === customer.id ? customer : item)
          : [customer, ...current]
      );
      setForm({ ...EMPTY_CUSTOMER });
      setEditingId(null);
    } catch (err) {
      setFormError(
        err.data?.name?.[0] ||
          err.data?.company?.[0] ||
          err.data?.email?.[0] ||
          err.data?.phone?.[0] ||
          err.data?.address?.[0] ||
          err.data?.non_field_errors?.[0] ||
          err.message
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    if (busy) {
      return;
    }

    const confirmed = window.confirm(
      `Vuoi eliminare il cliente "${customer.name}"? Verranno eliminati anche i suoi preventivi.`
    );

    if (!confirmed) {
      return;
    }

    setDeleteError("");
    setDeletingId(customer.id);

    try {
      await apiRequest(`/customers/${customer.id}/`, {
        method: "DELETE",
        token,
      });

      setCustomers((current) => current.filter((item) => item.id !== customer.id));

      if (editingId === customer.id) {
        handleCancelEdit();
      }
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AuthenticatedLayout>
      <h2>Clienti</h2>

      {loading && <p>Caricamento clienti...</p>}

      {!loading && error && <p role="alert">{error}</p>}
      {deleteError && <p role="alert">{deleteError}</p>}

      {!loading && !error && (
        <form onSubmit={handleSubmit}>
          <h3>{isEditing ? "Modifica cliente" : "Nuovo cliente"}</h3>

          <fieldset disabled={busy}>
            <legend>Dati del cliente</legend>

            <div>
              <label htmlFor="customer-name">Nome</label>
              <input
                id="customer-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength={150}
                required
              />
            </div>

            <div>
              <label htmlFor="customer-company">Azienda</label>
              <input
                id="customer-company"
                name="company"
                value={form.company}
                onChange={handleChange}
                maxLength={150}
              />
            </div>

            <div>
              <label htmlFor="customer-email">Email</label>
              <input
                id="customer-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                maxLength={254}
              />
            </div>

            <div>
              <label htmlFor="customer-phone">Telefono</label>
              <input
                id="customer-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                maxLength={50}
              />
            </div>

            <div>
              <label htmlFor="customer-address">Indirizzo</label>
              <textarea
                id="customer-address"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <button type="submit">
              {saving ? "Salvataggio..." : isEditing ? "Salva modifiche" : "Crea cliente"}
            </button>

            {isEditing && (
              <button type="button" onClick={handleCancelEdit}>
                Annulla
              </button>
            )}
          </fieldset>

          {formError && <p role="alert">{formError}</p>}
        </form>
      )}

      {!loading && !error && customers.length === 0 && (
        <p>Non hai ancora clienti.</p>
      )}

      {!loading && !error && customers.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Azienda</th>
              <th scope="col">Email</th>
              <th scope="col">Telefono</th>
              <th scope="col">Indirizzo</th>
              <th scope="col">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.company || "—"}</td>
                <td>{customer.email || "—"}</td>
                <td>{customer.phone || "—"}</td>
                <td>{customer.address || "—"}</td>
                <td>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleEdit(customer)}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(customer)}
                  >
                    {deletingId === customer.id ? "Eliminazione..." : "Elimina"}
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
