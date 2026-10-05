import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { apiRequest } from "../api";
import AuthenticatedLayout from "../components/AuthenticatedLayout";
import CustomerFormDialog from "../components/CustomerFormDialog";
import DeleteConfirmationDialog from "../components/DeleteConfirmationDialog";
import Skeleton from "../components/Skeleton";
import { FormSkeleton, ListSkeleton, QuoteItemsSkeleton, QuoteSummarySkeleton, SkeletonLines } from "../components/LoadingSkeletons";
import Icon from "../components/Icon";
import QuoteShareActions from "../components/QuoteShareActions";
import { useAuth } from "../context/AuthContext";
import "./QuotesPage.css";

const STATUS_LABELS = {
  DRAFT: "Bozza",
  SENT: "Inviato",
  VIEWED: "Visualizzato",
  ACCEPTED: "Accettato",
  REJECTED: "Rifiutato",
};
const TONES = { professional: "Professionale", friendly: "Cordiale", concise: "Sintetico", commercial: "Commerciale" };
const PAGE_SIZE = 8;
const EMPTY_QUOTE = { customer: "", title: "", description: "", delivery_time: "" };
const EMPTY_CUSTOMER = { name: "", company: "", email: "", phone: "", address: "" };
const amount = (value) => Number(value).toLocaleString("it-IT", {
  style: "currency", currency: "EUR", useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const decimalNumber = (value) => {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
};
const lineTotal = (item) => {
  return decimalNumber(item.quantity) * decimalNumber(item.unit_price);
};
const publicUrl = (quote) => `${window.location.origin}/q/${quote.public_token}`;

function createEmptyItem() {
  return { key: crypto.randomUUID(), description: "", quantity: "1", unit_price: "" };
}

function StatusBadge({ status }) {
  return <span className={`quote-status quote-status-${status.toLowerCase()}`}><span />{STATUS_LABELS[status] || status}</span>;
}

function PanelHeading({ step, title, subtitle, children }) {
  return (
    <div className="quote-panel-heading">
      <div className="quote-panel-title"><span className="quote-step">{step}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>
      {children}
    </div>
  );
}

export default function QuotesPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedQuoteId = searchParams.get("quote");
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState("");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ ...EMPTY_CUSTOMER });
  const [customerFormError, setCustomerFormError] = useState("");
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerId, setCustomerId] = useState(() => searchParams.get("customer") || "");
  const [quoteForm, setQuoteForm] = useState({ ...EMPTY_QUOTE });
  const [items, setItems] = useState(() => [createEmptyItem()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [publishingId, setPublishingId] = useState(null);
  const [publishError, setPublishError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => STATUS_LABELS[searchParams.get("status")] ? searchParams.get("status") : "");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const formRef = useRef(null);
  const previewRef = useRef(null);
  const customerCreatedRef = useRef(false);
  const busy = saving || customerSaving || deletingId !== null || generating || publishingId !== null;
  const isEditing = editingId !== null;
  const savedQuote = quotes.find((quote) => quote.id === editingId);
  const isPublished = Boolean(savedQuote && savedQuote.status !== "DRAFT");
  const dataLoading = loading || customersLoading;
  const editorDisabled = busy || loading || Boolean(error) || customersLoading || Boolean(customersError);
  const hasUnsavedData = isEditing && (
    !savedQuote ||
    String(savedQuote.customer) !== quoteForm.customer ||
    savedQuote.title !== quoteForm.title ||
    savedQuote.delivery_time !== quoteForm.delivery_time ||
    savedQuote.items.length !== items.length ||
    items.some((item, index) =>
      item.description !== savedQuote.items[index].description ||
      decimalNumber(item.quantity) !== decimalNumber(savedQuote.items[index].quantity) ||
      Number(item.unit_price) !== Number(savedQuote.items[index].unit_price)
    )
  );
  const hasUnsavedChanges = hasUnsavedData || (isEditing && savedQuote?.description !== quoteForm.description);
  const previewTotal = items.reduce((total, item) => total + lineTotal(item), 0);
  const selectedCustomer = customers.find((customer) => String(customer.id) === quoteForm.customer);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const activeQuotes = quotes.filter((quote) => ["DRAFT", "SENT", "VIEWED"].includes(quote.status));
  const acceptedCount = quotes.filter((quote) => quote.status === "ACCEPTED").length;
  const concludedCount = quotes.filter((quote) => ["ACCEPTED", "REJECTED"].includes(quote.status)).length;
  const acceptanceRate = concludedCount ? Math.round(acceptedCount / concludedCount * 100) : 0;
  const query = search.trim().toLocaleLowerCase("it");
  const filteredQuotes = quotes.filter((quote) => {
    const customer = customerById.get(quote.customer);
    return (!customerId || String(quote.customer) === customerId) &&
      (!statusFilter || quote.status === statusFilter) &&
      [quote.title, quote.description, customer?.name, customer?.company, ...quote.items.map((item) => item.description)]
        .some((value) => (value || "").toLocaleLowerCase("it").includes(query));
  }).sort((a, b) => {
    if (sort === "total") return Number(b.total) - Number(a.total);
    if (sort === "title") return a.title.localeCompare(b.title, "it");
    return new Date(b.created_at) - new Date(a.created_at);
  });
  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleQuotes = filteredQuotes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    let active = true;
    async function loadQuotes() {
      try {
        const data = await apiRequest("/quotes/", { token });
        if (active) {
          setQuotes(data);
          const requestedQuote = data.find((quote) => String(quote.id) === requestedQuoteId);
          if (requestedQuote) {
            setEditingId(requestedQuote.id);
            setQuoteForm({ customer: String(requestedQuote.customer), title: requestedQuote.title, description: requestedQuote.description, delivery_time: requestedQuote.delivery_time });
            setItems(requestedQuote.items.length ? requestedQuote.items.map((item) => ({ key: crypto.randomUUID(), description: item.description, quantity: item.quantity, unit_price: item.unit_price })) : [createEmptyItem()]);
          }
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    async function loadCustomers() {
      try {
        const data = await apiRequest("/customers/", { token });
        if (active) setCustomers(data);
      } catch (err) {
        if (active) setCustomersError(err.message);
      } finally {
        if (active) setCustomersLoading(false);
      }
    }
    loadQuotes();
    loadCustomers();
    return () => { active = false; };
  }, [token, requestedQuoteId]);

  useEffect(() => {
    const dialog = previewRef.current;
    if (previewOpen && !dialog.open) dialog.showModal();
    if (!previewOpen && dialog.open) dialog.close();
  }, [previewOpen]);

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function handleQuoteChange(event) {
    const { name, value } = event.target;
    setQuoteForm((current) => ({ ...current, [name]: value }));
    setFormSuccess("");
  }

  function handleNewCustomer() {
    if (editorDisabled || isPublished) return;
    customerCreatedRef.current = false;
    setCustomerForm({ ...EMPTY_CUSTOMER });
    setCustomerFormError("");
    setEditorOpen(true);
    setCustomerFormOpen(true);
  }

  function handleCustomerChange(event) {
    const { name, value } = event.target;
    setCustomerForm((current) => ({ ...current, [name]: value }));
  }

  function cancelNewCustomer() {
    if (customerSaving) return;
    setCustomerFormOpen(false);
    setCustomerFormError("");
  }

  function handleCustomerDialogClose() {
    if (customerCreatedRef.current) {
      customerCreatedRef.current = false;
      document.getElementById("new-quote-customer")?.focus();
    }
  }

  async function handleCreateCustomer(event) {
    event.preventDefault();
    if (editorDisabled || isPublished) return;
    setCustomerFormError("");
    setCustomerSaving(true);
    try {
      const customer = await apiRequest("/customers/", { method: "POST", token, body: customerForm });
      setCustomers((current) => [customer, ...current]);
      setQuoteForm((current) => ({ ...current, customer: String(customer.id) }));
      setFormError("");
      setFormSuccess(`Cliente «${customer.name}» creato e selezionato. Puoi completare il preventivo.`);
      customerCreatedRef.current = true;
      setCustomerFormOpen(false);
    } catch (err) {
      setCustomerFormError(err.data?.name?.[0] || err.data?.company?.[0] || err.data?.email?.[0] ||
        err.data?.phone?.[0] || err.data?.address?.[0] || err.data?.non_field_errors?.[0] || err.message);
    } finally {
      setCustomerSaving(false);
    }
  }

  function handleItemChange(itemKey, event) {
    const { name, value } = event.target;
    setItems((current) => current.map((item) => item.key === itemKey ? { ...item, [name]: value } : item));
    setFormSuccess("");
  }

  function handleAddItem() {
    if (busy || isPublished) return;
    setItems((current) => [...current, createEmptyItem()]);
    setFormSuccess("");
  }

  function handleRemoveItem(itemKey) {
    if (busy || isPublished) return;
    setItems((current) => current.length > 1 ? current.filter((item) => item.key !== itemKey) : current);
    setFormError("");
    setFormSuccess("");
  }

  function resetForm() {
    setEditingId(null);
    setQuoteForm({ ...EMPTY_QUOTE });
    setItems([createEmptyItem()]);
    setFormError("");
    setFormSuccess("");
    setAiError("");
    setPublishError("");
  }

  function handleNewQuote() {
    if (busy) return;
    resetForm();
    setEditorOpen(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("new-quote-customer")?.focus({ preventScroll: true });
    });
  }

  function fillEditor(quote) {
    setEditingId(quote.id);
    setQuoteForm({ customer: String(quote.customer), title: quote.title, description: quote.description, delivery_time: quote.delivery_time });
    setItems(quote.items.length ? quote.items.map((item) => ({ key: crypto.randomUUID(), description: item.description, quantity: item.quantity, unit_price: item.unit_price })) : [createEmptyItem()]);
  }

  function handleEdit(quote) {
    if (editorDisabled || quote.status !== "DRAFT") return;
    fillEditor(quote);
    setEditorOpen(true);
    setFormError("");
    setFormSuccess("");
    setAiError("");
    setPublishError("");
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function handleGenerateText() {
    if (editorDisabled || isPublished || !formRef.current.reportValidity()) return;
    setGenerating(true);
    setAiError("");
    setFormSuccess("");
    try {
      const quote = !savedQuote || hasUnsavedChanges ? await saveQuote() : savedQuote;
      if (!quote) return;
      setFormSuccess("");
      const data = await apiRequest(`/quotes/${quote.id}/generate-text/`, { method: "POST", token, body: { tone } });
      setQuoteForm((current) => ({ ...current, description: data.generated_text }));
      setFormSuccess("Descrizione generata. Rivedi il testo e salva le modifiche.");
    } catch (err) {
      setAiError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function saveQuote() {
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      const quote = await apiRequest(isEditing ? `/quotes/${editingId}/` : "/quotes/", {
        method: isEditing ? "PATCH" : "POST", token,
        body: { ...quoteForm, customer: Number(quoteForm.customer), items: items.map(({ description, quantity, unit_price }) => ({ description, quantity: String(quantity).replace(",", "."), unit_price })) },
      });
      setQuotes((current) => isEditing ? current.map((item) => item.id === quote.id ? quote : item) : [quote, ...current]);
      fillEditor(quote);
      setFormSuccess(isEditing ? "Preventivo aggiornato." : "Bozza creata. Puoi generare il testo con AI o pubblicare il preventivo.");
      return quote;
    } catch (err) {
      const itemErrors = Array.isArray(err.data?.items) ? err.data.items : [];
      const itemError = itemErrors.find((item) => item?.description?.[0] || item?.quantity?.[0] || item?.unit_price?.[0]);
      setFormError(err.data?.customer?.[0] || err.data?.title?.[0] || err.data?.description?.[0] || err.data?.delivery_time?.[0] ||
        itemError?.description?.[0] || itemError?.quantity?.[0] || itemError?.unit_price?.[0] ||
        (typeof itemErrors[0] === "string" ? itemErrors[0] : "") || err.data?.non_field_errors?.[0] || err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (editorDisabled || isPublished) return;
    await saveQuote();
  }

  async function publishQuote(quote) {
    setPublishError("");
    setPublishingId(quote.id);
    try {
      const publishedQuote = await apiRequest(`/quotes/${quote.id}/publish/`, { method: "POST", token });
      setQuotes((current) => current.map((item) => item.id === publishedQuote.id ? publishedQuote : item));
      setFormSuccess("Preventivo pubblicato. Il link pubblico è pronto da condividere.");
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishingId(null);
    }
  }

  async function handlePublish(quote) {
    if (busy || quote.status !== "DRAFT" || (editingId === quote.id && hasUnsavedChanges)) return;
    await publishQuote(quote);
  }

  async function handleSaveAndPublish() {
    if (editorDisabled || (savedQuote && savedQuote.status !== "DRAFT") || !formRef.current.reportValidity()) return;
    const quote = !savedQuote || hasUnsavedChanges ? await saveQuote() : savedQuote;
    if (quote) await publishQuote(quote);
  }

  function requestDelete(quote) {
    if (busy) return;
    setDeleteError("");
    setDeleteTarget(quote);
  }

  function cancelDelete() {
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function handleDelete() {
    if (busy || !deleteTarget) return;
    const quote = deleteTarget;
    setDeleteError("");
    setDeletingId(quote.id);
    try {
      await apiRequest(`/quotes/${quote.id}/`, { method: "DELETE", token });
      setQuotes((current) => current.filter((item) => item.id !== quote.id));
      if (editingId === quote.id) resetForm();
      setDeleteTarget(null);
      setFormSuccess("Preventivo eliminato.");
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(message);
    } catch {
      setCopyNotice("Copia non disponibile. Seleziona il testo e copialo manualmente.");
    }
  }

  return (
    <AuthenticatedLayout variant="quotes" search={search} onSearch={updateSearch} onNewQuote={handleNewQuote}>
      <div className="quote-page-heading">
        <div><nav className="quote-breadcrumb" aria-label="Percorso"><span>SmartQuote</span><Icon name="chevron" size={14} /><span aria-current="page">Preventivi</span></nav><h1>Gestione preventivi</h1><p>Crea, gestisci e monitora le proposte commerciali con calcolo automatico degli importi e generazione testi AI.</p></div>
        <section className="quote-overview" aria-label="Riepilogo preventivi" aria-busy={loading}>
          <article><Icon name="quote" size={22} /><div><span>Preventivi attivi</span><strong>{loading ? <Skeleton width={115} height={22} /> : error ? "—" : `${activeQuotes.length} proposte`}</strong></div></article>
          <article><Icon name="money" size={22} /><div><span>Totale in pipeline</span><strong>{loading ? <Skeleton width={130} height={22} /> : error ? "—" : amount(activeQuotes.reduce((total, quote) => total + Number(quote.total), 0))}</strong></div></article>
        </section>
      </div>

      <section className="quote-toolbar" aria-label="Filtri preventivi">
        <div className="quote-toolbar-filters">
          <div className="quote-search-row"><label className="sq-search quote-search"><Icon name="search" size={19} /><input type="search" placeholder="Filtra per titolo, cliente o servizio…" aria-label="Cerca preventivi per titolo, cliente o servizio" value={search} onChange={(event) => updateSearch(event.target.value)} /></label><select id="quote-customer" aria-label="Filtra preventivi per cliente" value={customerId} disabled={customersLoading || Boolean(customersError)} onChange={(event) => { setCustomerId(event.target.value); setPage(1); }}><option value="">Tutti i clienti ({customers.length})</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.company ? ` — ${customer.company}` : ""}</option>)}</select></div>
          <div className="quote-status-filters" role="group" aria-label="Filtra per stato"><button type="button" aria-pressed={!statusFilter} className={!statusFilter ? "is-selected" : ""} onClick={() => { setStatusFilter(""); setPage(1); }}>Tutti</button>{Object.entries(STATUS_LABELS).map(([status, label]) => <button key={status} type="button" aria-pressed={statusFilter === status} className={statusFilter === status ? "is-selected" : ""} onClick={() => { setStatusFilter(status); setPage(1); }}>{label} ({quotes.filter((quote) => quote.status === status).length})</button>)}</div>
        </div>
        <div className="quote-toolbar-actions"><details className="quote-view-options"><summary className="sq-button sq-button-secondary"><Icon name="filters" size={18} />Opzioni vista</summary><div><label><input type="checkbox" checked={compactView} onChange={(event) => setCompactView(event.target.checked)} />Tabella compatta</label><button type="button" onClick={() => { updateSearch(""); setCustomerId(""); setStatusFilter(""); setSort("recent"); }}>Reimposta filtri</button></div></details><button type="button" className="sq-button sq-button-primary" onClick={() => setEditorOpen((value) => !value)} aria-expanded={editorOpen} aria-controls="quote-editor"><Icon name={editorOpen ? "collapse" : "expand"} size={20} />{editorOpen ? "Comprimi editor" : "Apri editor"}</button></div>
      </section>

      {loading && <p className="sq-loading-label" role="status">Caricamento preventivi…</p>}
      {customersLoading && <p className="sq-loading-label" role="status">Caricamento clienti…</p>}
      {error && <p className="quote-alert" role="alert">{error}</p>}
      {customersError && <p className="quote-alert" role="alert">Impossibile caricare i clienti: {customersError}</p>}
      {!customersLoading && !customersError && customers.length === 0 && <div className="quote-message"><span>Aggiungi il primo cliente direttamente qui per creare il preventivo.</span><button type="button" className="quote-new-customer" disabled={editorDisabled || isPublished} onClick={handleNewCustomer}><Icon name="plus" size={16} />Nuovo cliente</button></div>}
      {publishError && <p className="quote-alert" role="alert">{publishError}</p>}
      {formSuccess && <p className="quote-success" role="status">{formSuccess}</p>}
      {isPublished && <p className="quote-message" role="status">Questo preventivo è pubblicato e non può essere modificato. Puoi consultarlo oppure eliminarlo dall’elenco dopo conferma.</p>}
      {copyNotice && <div className="quote-success" role="status">{copyNotice}<button type="button" className="sq-icon-button" aria-label="Chiudi messaggio" onClick={() => setCopyNotice("")}><Icon name="close" size={16} /></button></div>}

      <form ref={formRef} id="quote-editor" className="quote-editor-grid" aria-labelledby="new-quote-heading" onSubmit={handleSubmit} hidden={!editorOpen}>
        <fieldset className="quote-editor-main" aria-busy={dataLoading} disabled={editorDisabled || isPublished}>
          <legend id="new-quote-heading" className="sq-visually-hidden">{isPublished ? "Consulta preventivo" : isEditing ? "Modifica preventivo" : "Nuovo preventivo"}</legend>
          <section className="quote-panel quote-general-panel">
            <PanelHeading step="1" title="Dati generali del preventivo" subtitle="Intestazione, cliente e tempistiche">{dataLoading ? <Skeleton width={70} height={24} /> : <StatusBadge status={savedQuote?.status || "DRAFT"} />}</PanelHeading>
            {dataLoading ? <FormSkeleton /> : <div className="quote-form-grid">
              <div className="quote-customer-field"><div className="quote-label-row"><label htmlFor="new-quote-customer">Cliente del preventivo *</label><button type="button" className="quote-new-customer" disabled={editorDisabled || isPublished} onClick={handleNewCustomer}><Icon name="plus" size={13} />Nuovo cliente</button></div><select id="new-quote-customer" name="customer" value={quoteForm.customer} onChange={handleQuoteChange} required><option value="">Seleziona un cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.company ? ` (${customer.company})` : ""}</option>)}</select></div>
              <label htmlFor="new-quote-title">Titolo del preventivo *<input id="new-quote-title" name="title" value={quoteForm.title} onChange={handleQuoteChange} maxLength={200} placeholder="Es. Manutenzione e riparazione" required /></label>
              <label htmlFor="new-quote-delivery">Tempo di consegna stimato<span className="quote-input-icon"><Icon name="calendar" size={18} /><input id="new-quote-delivery" name="delivery_time" value={quoteForm.delivery_time} onChange={handleQuoteChange} maxLength={150} placeholder="Es. 5 giorni lavorativi" /></span></label>
              <div className="quote-readonly-field"><span>Stato del preventivo</span><div><Icon name="check" size={18} />{STATUS_LABELS[savedQuote?.status || "DRAFT"]}{isEditing && <small>#{editingId}</small>}</div></div>
              <label className="quote-field-full" htmlFor="quote-description">Descrizione dell’intervento / Note per il cliente (facoltativo)<textarea id="quote-description" name="description" rows={3} value={quoteForm.description} onChange={handleQuoteChange} placeholder="Descrivi i servizi e le informazioni da includere nel preventivo pubblico…" /></label>
            </div>}
          </section>

          <section className="quote-panel quote-items-panel">
            <PanelHeading step="2" title="Voci di costo e servizi" subtitle="Dettaglio servizi, quantità e prezzi unitari">{dataLoading ? <Skeleton width={70} height={24} /> : <span className="quote-panel-tag"><Icon name="document" size={14} />{items.length} {items.length === 1 ? "voce" : "voci"}</span>}</PanelHeading>
            {dataLoading ? <QuoteItemsSkeleton /> : <>
              <div className="quote-items-head" aria-hidden="true"><span>Descrizione servizio / articolo</span><span>Quantità</span><span>Prezzo unit.</span><span>Totale voce</span><span /></div>
              <div className="quote-items">
                {items.map((item, index) => <div className="quote-item" key={item.key}>
                  <label className="quote-item-description" htmlFor={`item-description-${item.key}`}><span className="sq-visually-hidden">Servizio {index + 1}</span><input id={`item-description-${item.key}`} name="description" value={item.description} onChange={(event) => handleItemChange(item.key, event)} maxLength={255} placeholder="Descrizione servizio o articolo" required /><small>Voce {index + 1}</small></label>
                  <label htmlFor={`item-quantity-${item.key}`}><span className="sq-visually-hidden">Quantità voce {index + 1}</span><input
    id={`item-quantity-${item.key}`}
    name="quantity"
    type="number"
    inputMode="decimal"
    min="1"
    step="1"
    value={item.quantity}
    onChange={(event) => handleItemChange(item.key, event)}
    placeholder="1"
    required
  /></label>
                  <label className="quote-unit-price" htmlFor={`item-price-${item.key}`}><span className="sq-visually-hidden">Prezzo unitario voce {index + 1}</span><span aria-hidden="true">€</span><input id={`item-price-${item.key}`} name="unit_price" type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => handleItemChange(item.key, event)} placeholder="0,00" required /></label>
                  <output className="quote-item-total" aria-label={`Totale voce ${index + 1}`}>{amount(lineTotal(item))}</output>
                  <button type="button" className="quote-remove-item" disabled={items.length === 1} onClick={() => handleRemoveItem(item.key)} aria-label={`Rimuovi voce ${index + 1}`} title="Rimuovi voce"><Icon name="trash" size={18} /></button>
                </div>)}
              </div>
              <button type="button" className="quote-add-item" onClick={handleAddItem}><Icon name="plus" size={18} />Aggiungi nuova voce di spesa</button>
            </>}
          </section>

          <section className="quote-panel quote-ai-panel">
            <PanelHeading step={<Icon name="sparkle" size={20} />} title="Testo di presentazione generato da AI" subtitle="Una descrizione personalizzata per il tuo cliente" />
            <div className="quote-tone-options" role="group" aria-label="Tono del testo AI">{Object.entries(TONES).map(([value, label]) => <button key={value} type="button" aria-pressed={tone === value} className={tone === value ? "is-selected" : ""} onClick={() => setTone(value)}>{label}</button>)}</div>
            <div className="quote-ai-text" aria-busy={dataLoading || generating}><blockquote>{dataLoading || generating ? <SkeletonLines /> : quoteForm.description || "La descrizione del preventivo apparirà qui. Puoi scriverla nei dati generali oppure generarla con l’assistente AI."}</blockquote><button type="button" className="sq-icon-button" disabled={dataLoading || generating || !quoteForm.description} aria-label="Copia descrizione" title="Copia descrizione" onClick={() => copyText(quoteForm.description, "Descrizione copiata.")}><Icon name="copy" size={17} /></button></div>
            <div className="quote-ai-actions"><p>{isPublished ? "Il testo di un preventivo pubblicato non può essere rigenerato." : "Puoi generare o rigenerare il testo in qualsiasi momento. Salviamo prima i dati in bozza; poi rivedi il testo e salva le modifiche."}</p><button type="button" className="sq-button sq-button-primary" disabled={editorDisabled || isPublished} onClick={handleGenerateText}><Icon name={generating ? "refresh" : "sparkle"} size={18} />{generating ? saving ? "Salvataggio bozza…" : "Generazione…" : "Genera testo AI"}</button></div>
            {generating && <p className="sq-loading-label" role="status">Generazione del testo AI in corso…</p>}
            {aiError && <p className="quote-alert" role="alert">{aiError}</p>}
          </section>
        </fieldset>

        <aside className="quote-summary-column" aria-label="Riepilogo economico" aria-busy={dataLoading}>
          <section className="quote-panel quote-economic-summary">
            <div className="quote-summary-heading"><h2>Riepilogo economico</h2><span>{dataLoading ? <Skeleton width={50} height={14} /> : `${items.length} ${items.length === 1 ? "voce" : "voci"}`}</span></div>
            {dataLoading ? <QuoteSummarySkeleton /> : <>
              <dl><div><dt>Valore dei servizi</dt><dd>{amount(previewTotal)}</dd></div><div><dt>Quantità complessiva</dt><dd>{items.reduce(
    (total, item) => total + decimalNumber(item.quantity),
    0
  ).toLocaleString("it-IT", { maximumFractionDigits: 2 }).toLocaleString("it-IT", { maximumFractionDigits: 2 })}</dd></div><div><dt>Consegna stimata</dt><dd>{quoteForm.delivery_time || "Da definire"}</dd></div><div><dt>Stato</dt><dd className={`quote-summary-state quote-summary-state-${(savedQuote?.status || "DRAFT").toLowerCase()}`}>{STATUS_LABELS[savedQuote?.status || "DRAFT"]}</dd></div></dl>
              <div className="quote-grand-total" aria-live="polite"><span>Totale preventivo</span><div><strong>{amount(previewTotal)}</strong><Icon name="quote" size={25} /></div></div>
              <button type="button" className="sq-button sq-button-primary quote-publish-button" disabled={editorDisabled || Boolean(savedQuote && savedQuote.status !== "DRAFT")} onClick={handleSaveAndPublish}><Icon name="send" size={19} />{publishingId !== null ? "Pubblicazione…" : saving ? "Salvataggio…" : savedQuote && savedQuote.status !== "DRAFT" ? "Preventivo pubblicato" : "Genera link pubblico"}</button>
              <div className="quote-summary-actions"><button type="submit" className="sq-button sq-button-secondary" disabled={editorDisabled || isPublished}><Icon name="save" size={17} />{saving ? "Salvataggio…" : isEditing ? "Salva modifiche" : "Salva bozza"}</button><button type="button" className="sq-button sq-button-secondary" disabled={loading || Boolean(error)} onClick={() => setPreviewOpen(true)}><Icon name="eye" size={17} />Anteprima</button></div>
              {isEditing && <button type="button" className="quote-cancel-edit" disabled={busy} onClick={resetForm}>{isPublished ? "Nuova bozza" : "Annulla modifica / Nuova bozza"}</button>}
              {savedQuote?.status !== "DRAFT" && savedQuote?.public_token && <div className="quote-editor-public-link"><label htmlFor="editor-public-link">Link pubblico del preventivo</label><input id="editor-public-link" value={publicUrl(savedQuote)} readOnly onFocus={(event) => event.target.select()} /><button type="button" onClick={() => copyText(publicUrl(savedQuote), "Link pubblico copiato.")}><Icon name="copy" size={15} />Copia link</button></div>}
              {isPublished && <QuoteShareActions quote={savedQuote} customer={customerById.get(savedQuote.customer)} publicUrl={publicUrl(savedQuote)} showHelp />}
              <div className="quote-summary-notes"><p><Icon name="external" size={16} />Condividi il preventivo con il cliente tramite link pubblico.</p><p><Icon name="eye" size={16} />Segui lo stato di invio, visualizzazione e accettazione.</p></div>
              {formError && <p className="quote-alert" role="alert">{formError}</p>}
            </>}
          </section>
          <section className="quote-conversion-card"><div><h2>Andamento preventivi</h2><p>{loading ? <Skeleton width={170} height={14} /> : `${acceptedCount} accettati su ${concludedCount} conclusi`}</p></div>{loading ? <Skeleton width={70} height={70} className="sq-skeleton-circle" /> : <span className="quote-conversion-ring" style={{ "--quote-progress": `${acceptanceRate}%` }} aria-label={`Tasso di accettazione ${acceptanceRate}%`}>{acceptanceRate}%</span>}</section>
        </aside>
      </form>

      <section className="quote-history" aria-labelledby="quote-history-heading" aria-busy={loading}>
        <div className="quote-history-heading"><div><h2 id="quote-history-heading">Elenco preventivi emessi</h2><p>Storico preventivi, stati e link pubblici generati</p></div><label htmlFor="quote-sort">Ordinamento: <select id="quote-sort" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="recent">Più recenti ↓</option><option value="total">Importo maggiore ↓</option><option value="title">Titolo A–Z</option></select></label></div>
        <div className={`quote-history-card ${compactView ? "quote-history-compact" : ""}`}>
          {loading && <ListSkeleton label="Caricamento preventivi…" />}
          <div hidden={loading || Boolean(error)} className="quote-table-scroll" tabIndex={0} role="region" aria-label="Tabella preventivi"><table className="quote-table" role="table"><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Titolo &amp; commessa</th><th role="columnheader" scope="col">Dettaglio voci</th><th role="columnheader" scope="col">Stato</th><th role="columnheader" scope="col">Totale</th><th role="columnheader" scope="col">Consegna</th><th role="columnheader" scope="col">Link pubblico cliente</th><th role="columnheader" scope="col">Azioni</th></tr></thead><tbody role="rowgroup">
            {visibleQuotes.map((quote) => <tr role="row" key={quote.id} className={editingId === quote.id ? "quote-current-row" : ""}>
              <td role="cell"><div className="quote-table-title"><strong>{quote.title}</strong>{editingId === quote.id && <span>ATTUALE</span>}</div><small>{customersLoading ? <Skeleton width={140} height={12} /> : `Cliente: ${customerById.get(quote.customer)?.name || "Non disponibile"}`}</small></td>
              <td role="cell" data-label="Voci del preventivo"><ul className="quote-table-items">{quote.items.map((item) => <li key={item.id}><span>{item.description} <small>({Number(item.quantity).toLocaleString("it-IT")}×)</small></span><span>{amount(item.unit_price)}</span></li>)}</ul></td>
              <td role="cell" data-label="Stato"><StatusBadge status={quote.status} /></td><td role="cell" data-label="Totale" className="quote-table-amount"><strong>{amount(quote.total)}</strong></td><td role="cell" data-label="Consegna"><span className="quote-table-delivery"><Icon name="calendar" size={14} />{quote.delivery_time || "Non specificato"}</span></td>
              <td role="cell" data-label="Link e condivisione">{quote.status !== "DRAFT" && quote.public_token ? <><div className="quote-public-link"><input type="text" readOnly aria-label={`Link pubblico di ${quote.title}`} value={publicUrl(quote)} onFocus={(event) => event.target.select()} /><button type="button" aria-label={`Copia link di ${quote.title}`} title="Copia link" onClick={() => copyText(publicUrl(quote), "Link pubblico copiato.")}><Icon name="copy" size={15} /></button><a href={publicUrl(quote)} target="_blank" rel="noreferrer" aria-label={`Apri preventivo ${quote.title}`} title="Apri preventivo"><Icon name="external" size={15} /></a></div><QuoteShareActions quote={quote} customer={customerById.get(quote.customer)} publicUrl={publicUrl(quote)} /></> : <button type="button" className="quote-publish-link" disabled={busy || (editingId === quote.id && hasUnsavedChanges)} onClick={() => handlePublish(quote)}><Icon name="send" size={14} />{publishingId === quote.id ? "Pubblicazione…" : "Pubblica link"}</button>}</td>
              <td role="cell"><div className="quote-table-actions"><button type="button" className="sq-icon-button" disabled={editorDisabled || quote.status !== "DRAFT"} onClick={() => handleEdit(quote)} aria-label={`Modifica ${quote.title}`} title="Modifica preventivo"><Icon name="edit" size={17} /><span className="quote-action-label">Modifica</span></button><button type="button" className="sq-icon-button quote-delete" disabled={busy} onClick={() => requestDelete(quote)} aria-label={`Elimina ${quote.title}`} title={deletingId === quote.id ? "Eliminazione…" : "Elimina preventivo"}><Icon name="trash" size={17} /><span className="quote-action-label">Elimina</span></button></div></td>
            </tr>)}
          </tbody></table></div>
          {!loading && !error && filteredQuotes.length === 0 && <div className="quote-empty"><Icon name={search || customerId || statusFilter ? "search" : "quote"} size={36} /><h3>{quotes.length ? "Nessun preventivo trovato" : "Il tuo prossimo preventivo inizia qui"}</h3><p>{quotes.length ? "Modifica la ricerca o i filtri per vedere altri preventivi." : "Compila i dati e aggiungi i servizi per salvare la prima bozza."}</p></div>}
          {!loading && !error && <footer className="quote-table-footer"><p aria-live="polite">Mostrati <strong>{visibleQuotes.length}</strong> di <strong>{filteredQuotes.length}</strong> preventivi{search || customerId || statusFilter ? " filtrati" : " totali"}</p><nav className="quote-pagination" aria-label="Paginazione preventivi"><button className="sq-icon-button" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Pagina precedente"><Icon name="chevron" size={17} className="quote-previous" /></button><span aria-current="page" aria-label={`Pagina ${currentPage} di ${totalPages}`}>{currentPage}</span><button className="sq-icon-button" type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Pagina successiva"><Icon name="chevron" size={17} /></button></nav></footer>}
        </div>
      </section>

      <dialog ref={previewRef} className="quote-preview-dialog" aria-labelledby="quote-preview-heading" onCancel={(event) => { event.preventDefault(); setPreviewOpen(false); }}>
        <header><div><span>SMARTQUOTE · ANTEPRIMA</span><h2 id="quote-preview-heading">{quoteForm.title || "Nuovo preventivo"}</h2></div><button type="button" className="sq-icon-button" aria-label="Chiudi anteprima" onClick={() => setPreviewOpen(false)}><Icon name="close" /></button></header>
        <p className="quote-preview-customer">{selectedCustomer?.name || "Cliente da selezionare"}{selectedCustomer?.company && ` · ${selectedCustomer.company}`}</p><p className="quote-preview-description">{quoteForm.description || "Nessuna descrizione."}</p>
        <div className="quote-preview-table-scroll"><table><caption className="sq-visually-hidden">Servizi del preventivo</caption><thead><tr><th scope="col">Servizio</th><th scope="col">Quantità</th><th scope="col">Prezzo</th><th scope="col">Totale</th></tr></thead><tbody>{items.map((item) => <tr key={item.key}><td>{item.description || "Servizio da definire"}</td><td>{item.quantity || "—"}</td><td>{amount(item.unit_price || 0)}</td><td>{amount(lineTotal(item))}</td></tr>)}</tbody></table></div><p className="quote-preview-total">Totale preventivo <strong>{amount(previewTotal)}</strong></p><p className="quote-preview-delivery">Consegna: {quoteForm.delivery_time || "Da definire"}</p>
      </dialog>

      <CustomerFormDialog
        open={customerFormOpen}
        idPrefix="quote-customer"
        description="Crea il cliente: sarà subito selezionato nel preventivo."
        form={customerForm}
        error={customerFormError}
        busy={customerSaving}
        saving={customerSaving}
        onChange={handleCustomerChange}
        onSubmit={handleCreateCustomer}
        onCancel={cancelNewCustomer}
        onClose={handleCustomerDialogClose}
      />

      <DeleteConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Eliminare il preventivo?"
        warning={deleteTarget?.status === "DRAFT"
          ? "L’eliminazione è definitiva."
          : "L’eliminazione è definitiva e il link pubblico non sarà più disponibile."}
        confirmLabel="Elimina preventivo"
        busy={deletingId !== null}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
      >
        Stai per eliminare il preventivo <strong>«{deleteTarget?.title}»</strong>.
      </DeleteConfirmationDialog>
    </AuthenticatedLayout>
  );
}
