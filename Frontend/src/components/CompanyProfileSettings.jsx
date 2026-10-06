import { useEffect, useState } from "react";

import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import Skeleton from "./Skeleton";
import ValidatedInput from "./ValidatedInput";

const fields = [
  { name: "name", label: "Nome dell’attività", maxLength: 150, autoComplete: "organization", placeholder: "Es. Studio Rossi" },
  { name: "vat_number", label: "Partita IVA", maxLength: 32, autoComplete: "off", placeholder: "Es. IT12345678901" },
  { name: "address", label: "Indirizzo", maxLength: 500, autoComplete: "street-address", placeholder: "Via, numero civico, CAP e città", wide: true },
  { name: "phone", label: "Telefono aziendale", type: "tel", maxLength: 30, autoComplete: "tel", placeholder: "Es. +39 333 1234567" },
  { name: "website", label: "Sito web", type: "url", maxLength: 200, autoComplete: "url", placeholder: "https://www.example.com", pattern: "https?://.+" },
];

export default function CompanyProfileSettings({ busy = false, onSavingChange }) {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const changed = profile && fields.some(({ name }) => form[name].trim() !== profile[name]);

  useEffect(() => {
    let active = true;
    apiRequest("/auth/company-profile/", { token }).then((data) => {
      if (active) { setProfile(data); setForm(data); setLoadError(""); }
    }).catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [token, attempt]);

  async function save(event) {
    event.preventDefault();
    if (saving || busy || !profile || !changed) return;
    setSaving(true);
    onSavingChange(true);
    setFeedback(null);
    try {
      const body = Object.fromEntries(fields.map(({ name }) => [name, form[name].trim()]));
      const data = await apiRequest("/auth/company-profile/", { method: "PATCH", token, body });
      setProfile(data);
      setForm(data);
      setFeedback({ success: true, message: "Profilo aziendale aggiornato correttamente." });
    } catch (error) {
      const messages = Object.entries(error.data || {}).flatMap(([name, values]) => {
        const label = fields.find((field) => field.name === name)?.label;
        return [values].flat().filter((value) => typeof value === "string").map((value) => label ? `${label}: ${value}` : value);
      });
      setFeedback({ success: false, message: messages.join(" ") || error.message });
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  return <section className="settings-card settings-company-card" aria-labelledby="settings-company-heading">
    <div className="settings-card-heading">
      <span className="settings-section-icon"><Icon name="store" size={24} /></span>
      <div><h2 id="settings-company-heading">Profilo aziendale</h2><p>Gestisci i dati con cui presenti la tua attività ai clienti.</p></div>
    </div>
    {loadError ? <>
      <p className="settings-feedback settings-error" role="alert">Impossibile caricare il profilo aziendale: {loadError}</p>
      <button type="button" className="sq-button sq-button-secondary" disabled={busy} onClick={() => { setLoadError(""); setProfile(null); setForm(null); setAttempt((value) => value + 1); }}><Icon name="refresh" />Riprova</button>
    </> : !profile ? <div role="status"><span className="sq-visually-hidden">Caricamento profilo aziendale…</span><Skeleton height={120} /></div> : <form onSubmit={save} aria-busy={saving}>
      <fieldset disabled={saving || busy}>
        <legend className="sq-visually-hidden">Modifica profilo aziendale</legend>
        <div className="settings-company-fields">
          {fields.map(({ name, label, wide, ...input }) => <div key={name} className={`settings-field${wide ? " settings-field-wide" : ""}`}>
            <label htmlFor={`settings-company-${name}`}>{label}</label>
            <ValidatedInput {...input} id={`settings-company-${name}`} name={name} value={form[name]} onChange={(event) => { setForm((current) => ({ ...current, [name]: event.target.value })); setFeedback(null); }} />
          </div>)}
        </div>
        <p className="settings-hint">Tutti i campi sono facoltativi. Per il sito web inserisci un indirizzo completo con https:// o http://.</p>
        {feedback && <p className={`settings-feedback ${feedback.success ? "settings-success" : "settings-error"}`} role={feedback.success ? "status" : "alert"}>{feedback.message}</p>}
        <div className="settings-company-actions">
          <button type="submit" className="sq-button sq-button-primary" disabled={!changed}><Icon name="save" />{saving ? "Salvataggio…" : "Salva profilo aziendale"}</button>
          {changed && <button type="button" className="sq-button sq-button-secondary" onClick={() => { setForm(profile); setFeedback(null); }}>Annulla modifiche</button>}
        </div>
      </fieldset>
    </form>}
  </section>;
}
