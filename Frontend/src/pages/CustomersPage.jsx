import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../api";
import AuthenticatedLayout from "../components/AuthenticatedLayout";
import DeleteConfirmationDialog from "../components/DeleteConfirmationDialog";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import "./CustomersPage.css";

const EMPTY_CUSTOMER = { name: "", company: "", email: "", phone: "", address: "" };
const STATUS_LABELS = { ACCEPTED: "Accettato", VIEWED: "Visualizzato", SENT: "Inviato", DRAFT: "Bozza", REJECTED: "Rifiutato" };
const ACTIVE_STATUSES = ["DRAFT", "SENT", "VIEWED"];
const PAGE_SIZE = 8;
const currency = (amount, decimals = 2) => Number(amount).toLocaleString("it-IT", {
  style: "currency", currency: "EUR", useGrouping: "always", minimumFractionDigits: decimals, maximumFractionDigits: decimals,
});
const initials = (name) => name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

function MetricCard({ label, value, detail, icon, tone = "primary", positive = false }) {
  return (
    <article className={`customer-metric customer-metric-${tone}`}>
      <div>
        <h2>{label}</h2>
        <strong className="customer-metric-value">{value}</strong>
        <p className={positive ? "customer-positive" : ""}>{detail}</p>
      </div>
      <span className="customer-metric-icon"><Icon name={icon} size={28} /></span>
    </article>
  );
}

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [error, setError] = useState("");
  const [quotesError, setQuotesError] = useState("");
  const [form, setForm] = useState({ ...EMPTY_CUSTOMER });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const dialogRef = useRef(null);
  const isEditing = editingId !== null;
  const busy = saving || deletingId !== null;
  const quotesAvailable = !quotesLoading && !quotesError;

  useEffect(() => {
    let active = true;
    async function loadCustomers() {
      try {
        const data = await apiRequest("/customers/", { token });
        if (active) setCustomers(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    async function loadQuotes() {
      try {
        const data = await apiRequest("/quotes/", { token });
        if (active) setQuotes(data);
      } catch (err) {
        if (active) setQuotesError(err.message);
      } finally {
        if (active) setQuotesLoading(false);
      }
    }
    loadCustomers();
    loadQuotes();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (formOpen && !dialog.open) dialog.showModal();
    if (!formOpen && dialog.open) dialog.close();
  }, [formOpen]);

  const customerQuotes = new Map();
  for (const quote of quotes) {
    const items = customerQuotes.get(quote.customer) || [];
    items.push(quote);
    customerQuotes.set(quote.customer, items);
  }
  const activeQuotes = quotes.filter((quote) => ACTIVE_STATUSES.includes(quote.status));
  const acceptedQuotes = quotes.filter((quote) => quote.status === "ACCEPTED");
  const concludedQuotes = quotes.filter((quote) => ["ACCEPTED", "REJECTED"].includes(quote.status));
  const acceptedTotal = acceptedQuotes.reduce((total, quote) => total + Number(quote.total), 0);
  const now = new Date();
  const newCustomers = customers.filter((customer) => {
    const created = new Date(customer.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const query = search.trim().toLocaleLowerCase("it");
  const filteredCustomers = customers.filter((customer) => {
    const relatedQuotes = customerQuotes.get(customer.id) || [];
    const matchesSearch = [customer.name, customer.company, customer.email, customer.phone, customer.address]
      .some((value) => (value || "").toLocaleLowerCase("it").includes(query));
    const matchesType = filter === "all" ||
      (filter === "active" && relatedQuotes.some((quote) => ACTIVE_STATUSES.includes(quote.status))) ||
      (filter === "companies" && Boolean(customer.company?.trim())) ||
      (filter === "private" && !customer.company?.trim());
    return matchesSearch && matchesType && (!statusFilter || relatedQuotes.some((quote) => quote.status === statusFilter));
  }).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "it");
    if (sort === "total") {
      const total = (id) => (customerQuotes.get(id) || []).filter((quote) => quote.status === "ACCEPTED")
        .reduce((sum, quote) => sum + Number(quote.total), 0);
      return total(b.id) - total(a.id);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleEdit(customer) {
    setEditingId(customer.id);
    setForm({ name: customer.name, company: customer.company, email: customer.email, phone: customer.phone, address: customer.address });
    setFormError("");
    setFormOpen(true);
  }

  function handleCancelEdit() {
    setFormOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_CUSTOMER });
    setFormError("");
  }

  function handleNewCustomer() {
    handleCancelEdit();
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    setSaving(true);
    try {
      const customer = await apiRequest(isEditing ? `/customers/${editingId}/` : "/customers/", {
        method: isEditing ? "PATCH" : "POST", token, body: form,
      });
      setCustomers((current) => isEditing
        ? current.map((item) => item.id === customer.id ? customer : item)
        : [customer, ...current]);
      setNotice(isEditing ? "Cliente aggiornato." : "Cliente creato.");
      if (!isEditing) {
        updateSearch("");
        setFilter("all");
        setStatusFilter("");
        setSort("recent");
      }
      handleCancelEdit();
    } catch (err) {
      setFormError(err.data?.name?.[0] || err.data?.company?.[0] || err.data?.email?.[0] ||
        err.data?.phone?.[0] || err.data?.address?.[0] || err.data?.non_field_errors?.[0] || err.message);
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(customer) {
    if (busy) return;
    setDeleteError("");
    setDeleteTarget(customer);
  }

  function cancelDelete() {
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function handleDelete() {
    if (busy || !deleteTarget) return;
    const customer = deleteTarget;
    setDeleteError("");
    setDeletingId(customer.id);
    try {
      await apiRequest(`/customers/${customer.id}/`, { method: "DELETE", token });
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      setQuotes((current) => current.filter((quote) => quote.customer !== customer.id));
      setNotice("Cliente eliminato.");
      if (editingId === customer.id) handleCancelEdit();
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const metricPlaceholder = quotesLoading ? "…" : "—";
  return (
    <AuthenticatedLayout variant="customers" search={search} onSearch={updateSearch}>
      <div className="customer-heading">
        <div>
          <nav className="customer-breadcrumb" aria-label="Percorso"><span>SmartQuote</span><Icon name="chevron" size={14} /><span aria-current="page">Clienti</span></nav>
          <h1>Anagrafica clienti</h1>
          <p>Gestisci l’elenco clienti, consulta i preventivi associati e monitora il fatturato generato.</p>
        </div>
        <div className="customer-heading-actions">
          <button className={`sq-button sq-button-secondary ${filtersOpen ? "is-active" : ""}`} type="button" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="customer-advanced-filters"><Icon name="filters" />Filtri{statusFilter && <span className="customer-filter-dot" />}</button>
          <button className="sq-button sq-button-primary" type="button" onClick={handleNewCustomer} disabled={busy || loading || Boolean(error)}><Icon name="userPlus" size={22} />Nuovo cliente</button>
        </div>
      </div>

      <section className="customer-metrics" aria-label="Riepilogo clienti e preventivi">
        <MetricCard label="Clienti totali" value={loading ? "…" : error ? "—" : customers.length} icon="users" positive detail={loading || error ? "Anagrafica clienti" : <><Icon name="trend" size={14} />{newCustomers} nuovi questo mese</>} />
        <MetricCard label="Preventivi attivi" value={quotesAvailable ? activeQuotes.length : metricPlaceholder} icon="quote" detail={quotesAvailable ? `Valore stimato: ${currency(activeQuotes.reduce((sum, quote) => sum + Number(quote.total), 0))}` : "Dati preventivi non disponibili"} />
        <MetricCard label="Tasso accettazione" value={quotesAvailable ? `${(concludedQuotes.length ? acceptedQuotes.length / concludedQuotes.length * 100 : 0).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : metricPlaceholder} icon="check" tone="teal" detail={quotesAvailable ? `${acceptedQuotes.length} su ${concludedQuotes.length} conclusi` : "Dati preventivi non disponibili"} />
        <MetricCard label="Volume transato" value={quotesAvailable ? currency(acceptedTotal, Number.isInteger(acceptedTotal) ? 0 : 2) : metricPlaceholder} icon="money" tone="violet" detail={quotesAvailable ? "Preventivi accettati" : "Dati preventivi non disponibili"} />
      </section>

      {quotesError && <p className="customer-alert" role="alert">Impossibile caricare i riepiloghi dei preventivi: {quotesError}</p>}
      {notice && <div className="customer-notice" role="status">{notice}<button className="sq-icon-button" type="button" aria-label="Chiudi messaggio" onClick={() => setNotice("")}><Icon name="close" size={16} /></button></div>}

      <section className="customer-directory" aria-label="Elenco clienti" aria-busy={loading}>
        <div className="customer-toolbar">
          <label className="sq-search customer-search"><Icon name="search" size={21} /><input type="search" aria-label="Cerca per nome, azienda, email o telefono" placeholder="Cerca per nome, azienda, email o telefono…" value={search} onChange={(event) => updateSearch(event.target.value)} /></label>
          <div className="customer-quick-filters" role="group" aria-label="Filtra clienti">
            {[{ id: "all", label: "Tutti" }, { id: "active", label: "Con preventivi attivi" }, { id: "companies", label: "Aziende" }, { id: "private", label: "Privati" }].map((item) => (
              <button key={item.id} type="button" className={`customer-filter ${filter === item.id ? "is-selected" : ""}`} aria-pressed={filter === item.id} disabled={item.id === "active" && !quotesAvailable} onClick={() => { setFilter(item.id); setPage(1); }}>{item.label}{item.id === "all" && <span>{customers.length}</span>}</button>
            ))}
          </div>
        </div>
        <div className="customer-advanced-filters" id="customer-advanced-filters" hidden={!filtersOpen}>
          <label>Stato preventivo<select value={statusFilter} disabled={!quotesAvailable} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">Tutti gli stati</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Ordina per<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="recent">Più recenti</option><option value="name">Nome (A–Z)</option><option value="total" disabled={!quotesAvailable}>Totale generato</option></select></label>
          <button type="button" className="customer-reset" onClick={() => { updateSearch(""); setFilter("all"); setStatusFilter(""); setSort("recent"); }}>Reimposta filtri</button>
        </div>

        {loading ? <div className="customer-empty" role="status"><span className="customer-spinner" />Caricamento clienti…</div> : error ? <div className="customer-empty customer-alert" role="alert">{error}</div> : (
          <>
            <div className="customer-table-scroll" tabIndex={0} role="region" aria-label="Tabella clienti">
              <table className="customer-table">
                <thead><tr>
                  <th scope="col">Cliente &amp;<br />denominazione</th><th scope="col">Tipologia</th><th scope="col">Contatti</th><th scope="col">Località / Indirizzo</th><th scope="col" className="customer-status-cell">Stato preventivi</th><th scope="col" className="customer-total-cell">Totale<br />generato</th><th scope="col"><span className="sq-visually-hidden">Azioni</span></th>
                </tr></thead>
                <tbody>
                  {visibleCustomers.map((customer, index) => {
                    const relatedQuotes = customerQuotes.get(customer.id) || [];
                    const total = relatedQuotes.filter((quote) => quote.status === "ACCEPTED").reduce((sum, quote) => sum + Number(quote.total), 0);
                    const statuses = Object.entries(STATUS_LABELS).map(([status, label]) => ({ status, label, count: relatedQuotes.filter((quote) => quote.status === status).length })).filter((item) => item.count > 0);
                    const company = Boolean(customer.company?.trim());
                    return (
                      <tr key={customer.id}>
                        <td><div className="customer-identity"><span className={`customer-avatar customer-avatar-${index % 3}`}>{initials(customer.name)}</span><div><strong>{customer.name}</strong><span>{customer.company || "Cliente privato"}</span></div></div></td>
                        <td><span className={`customer-type ${company ? "customer-type-company" : ""}`}><Icon name={company ? "store" : "user"} size={14} />{company ? "Azienda" : "Privato"}</span></td>
                        <td><div className="customer-contacts"><span><Icon name="mail" size={16} />{customer.email ? <a href={`mailto:${customer.email}`}>{customer.email}</a> : <span className="customer-muted">Email non specificata</span>}</span><span><Icon name="phone" size={16} />{customer.phone ? <a href={`tel:${customer.phone.replace(/[^+\d]/g, "")}`}>{customer.phone}</a> : <span className="customer-muted">Telefono non specificato</span>}</span></div></td>
                        <td><div className={`customer-address ${customer.address ? "" : "customer-muted"}`}><Icon name="pin" size={17} /><span>{customer.address || "Non specificato"}</span></div></td>
                        <td className="customer-status-cell">
                          {quotesAvailable ? <><div className="customer-statuses">{statuses.length ? statuses.map(({ status, label, count }) => <span key={status} className={`customer-status customer-status-${status.toLowerCase()}`}>{status === "VIEWED" ? <Icon name="eye" size={15} /> : <span className="customer-status-dot" />}{count > 1 ? `${count} ` : ""}{label}</span>) : <span className="customer-muted">Nessun preventivo</span>}</div>{relatedQuotes.length > 0 && <span className="customer-quote-count">{relatedQuotes.length} {relatedQuotes.length === 1 ? "preventivo" : "preventivi totali"}</span>}</> : <span className="customer-muted">{quotesLoading ? "Caricamento…" : "Non disponibile"}</span>}
                        </td>
                        <td className="customer-total-cell"><strong>{quotesAvailable ? currency(total) : "—"}</strong></td>
                        <td className="customer-row-actions"><button type="button" className="sq-icon-button" disabled={busy} onClick={() => handleEdit(customer)} aria-label={`Modifica ${customer.name}`} title="Modifica cliente"><Icon name="edit" size={17} /></button><button type="button" className="sq-icon-button customer-delete" disabled={busy} onClick={() => requestDelete(customer)} aria-label={`Elimina ${customer.name}`} title={deletingId === customer.id ? "Eliminazione…" : "Elimina cliente"}><Icon name="trash" size={17} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredCustomers.length === 0 && <div className="customer-empty"><span className="customer-empty-icon"><Icon name={customers.length ? "search" : "users"} size={30} /></span><strong>{customers.length ? "Nessun cliente trovato" : "La tua anagrafica parte da qui"}</strong><p>{customers.length ? "Prova a cambiare la ricerca o i filtri selezionati." : "Aggiungi il primo cliente per iniziare a creare preventivi."}</p><button className="sq-button sq-button-primary" type="button" onClick={customers.length ? () => { updateSearch(""); setFilter("all"); setStatusFilter(""); } : handleNewCustomer}>{customers.length ? "Reimposta ricerca" : "Nuovo cliente"}</button></div>}
            <footer className="customer-table-footer">
              <p aria-live="polite">Mostrati <strong>{visibleCustomers.length}</strong> di <strong>{filteredCustomers.length}</strong> clienti<span className="customer-footer-source"><span>•</span> Dati aggiornati al caricamento</span></p>
              <nav className="customer-pagination" aria-label="Paginazione clienti"><button type="button" className="sq-icon-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Pagina precedente"><Icon name="chevron" size={16} className="customer-previous" /></button><span aria-current="page" aria-label={`Pagina ${currentPage} di ${totalPages}`}>{currentPage}</span><button type="button" className="sq-icon-button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Pagina successiva"><Icon name="chevron" size={16} /></button></nav>
            </footer>
          </>
        )}
      </section>

      <dialog ref={dialogRef} className="customer-dialog" aria-labelledby="customer-form-heading" onCancel={(event) => { event.preventDefault(); if (!busy) handleCancelEdit(); }}>
        <div className="customer-dialog-heading"><div><span className="customer-dialog-eyebrow">ANAGRAFICA CLIENTI</span><h2 id="customer-form-heading">{isEditing ? "Modifica cliente" : "Nuovo cliente"}</h2><p>Inserisci i dati di contatto del cliente.</p></div><button type="button" className="sq-icon-button" onClick={handleCancelEdit} disabled={busy} aria-label="Chiudi modulo cliente"><Icon name="close" /></button></div>
        <form onSubmit={handleSubmit}>
          <fieldset disabled={busy} className="customer-form-fields"><legend className="sq-visually-hidden">Dati del cliente</legend>
            <label className="customer-field-full" htmlFor="customer-name">Nome e cognome <span>*</span><input id="customer-name" name="name" value={form.name} onChange={handleChange} maxLength={150} autoComplete="name" placeholder="Es. Mario Rossi" required /></label>
            <label className="customer-field-full" htmlFor="customer-company">Azienda<input id="customer-company" name="company" value={form.company} onChange={handleChange} maxLength={150} autoComplete="organization" placeholder="Ragione sociale (facoltativa)" /></label>
            <label htmlFor="customer-email">Email<input id="customer-email" name="email" type="email" value={form.email} onChange={handleChange} maxLength={254} autoComplete="email" placeholder="nome@azienda.it" /></label>
            <label htmlFor="customer-phone">Telefono<input id="customer-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} maxLength={50} autoComplete="tel" placeholder="+39 000 000 0000" /></label>
            <label className="customer-field-full" htmlFor="customer-address">Indirizzo<textarea id="customer-address" name="address" value={form.address} onChange={handleChange} autoComplete="street-address" rows={2} placeholder="Via, numero civico, città" /></label>
          </fieldset>
          {formError && <p className="customer-alert" role="alert">{formError}</p>}
          <div className="customer-dialog-actions"><button className="sq-button sq-button-secondary" type="button" onClick={handleCancelEdit} disabled={busy}>Annulla</button><button className="sq-button sq-button-primary" type="submit" disabled={busy}><Icon name="check" size={18} />{saving ? "Salvataggio…" : isEditing ? "Salva modifiche" : "Crea cliente"}</button></div>
        </form>
      </dialog>

      <DeleteConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Eliminare il cliente?"
        warning="Verranno eliminati anche tutti i suoi preventivi e i relativi link pubblici non saranno più disponibili. L’eliminazione è definitiva."
        confirmLabel="Elimina cliente"
        busy={deletingId !== null}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
      >
        Stai per eliminare il cliente <strong>«{deleteTarget?.name}»</strong>.
      </DeleteConfirmationDialog>
    </AuthenticatedLayout>
  );
}
