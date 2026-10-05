import { useEffect, useRef } from "react";

import Icon from "./Icon";
import "./CustomerFormDialog.css";

export default function CustomerFormDialog({
  open,
  form,
  error,
  busy,
  saving,
  onChange,
  onSubmit,
  onCancel,
  onClose,
  title = "Nuovo cliente",
  description = "Inserisci i dati di contatto del cliente.",
  submitLabel = "Crea cliente",
  idPrefix = "customer",
}) {
  const dialogRef = useRef(null);
  const nameRef = useRef(null);
  const submitting = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) {
      dialog.showModal();
      nameRef.current.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function cancel() {
    if (!busy && !submitting.current) onCancel();
  }

  async function submit(event) {
    event.preventDefault();
    if (!open || busy || submitting.current) return;
    submitting.current = true;
    try {
      await onSubmit(event);
    } finally {
      submitting.current = false;
    }
  }

  return (
    <dialog ref={dialogRef} className="customer-dialog" aria-labelledby={`${idPrefix}-form-heading`} aria-describedby={`${idPrefix}-form-description`} onClose={onClose} onCancel={(event) => { event.preventDefault(); cancel(); }}>
      <div className="customer-dialog-heading">
        <div><span className="customer-dialog-eyebrow">ANAGRAFICA CLIENTI</span><h2 id={`${idPrefix}-form-heading`}>{title}</h2><p id={`${idPrefix}-form-description`}>{description}</p></div>
        <button type="button" className="sq-icon-button" onClick={cancel} disabled={busy} aria-label="Chiudi modulo cliente"><Icon name="close" /></button>
      </div>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="customer-form-fields"><legend className="sq-visually-hidden">Dati del cliente</legend>
          <label className="customer-field-full" htmlFor={`${idPrefix}-name`}>Nome e cognome <span>*</span><input ref={nameRef} id={`${idPrefix}-name`} name="name" value={form.name} onChange={onChange} maxLength={150} autoComplete="name" placeholder="Es. Mario Rossi" required /></label>
          <label className="customer-field-full" htmlFor={`${idPrefix}-company`}>Azienda<input id={`${idPrefix}-company`} name="company" value={form.company} onChange={onChange} maxLength={150} autoComplete="organization" placeholder="Ragione sociale (facoltativa)" /></label>
          <label htmlFor={`${idPrefix}-email`}>Email<input id={`${idPrefix}-email`} name="email" type="email" value={form.email} onChange={onChange} maxLength={254} autoComplete="email" placeholder="nome@azienda.it" /></label>
          <label htmlFor={`${idPrefix}-phone`}>Telefono<input id={`${idPrefix}-phone`} name="phone" type="tel" value={form.phone} onChange={onChange} maxLength={50} autoComplete="tel" placeholder="+39 000 000 0000" /></label>
          <label className="customer-field-full" htmlFor={`${idPrefix}-address`}>Indirizzo<textarea id={`${idPrefix}-address`} name="address" value={form.address} onChange={onChange} autoComplete="street-address" rows={2} placeholder="Via, numero civico, città" /></label>
        </fieldset>
        {error && <p className="customer-dialog-error" role="alert">{error}</p>}
        <div className="customer-dialog-actions">
          <button className="sq-button sq-button-secondary" type="button" onClick={cancel} disabled={busy}>Annulla</button>
          <button className="sq-button sq-button-primary" type="submit" disabled={busy}><Icon name="check" size={18} />{saving ? "Salvataggio…" : submitLabel}</button>
        </div>
      </form>
    </dialog>
  );
}
