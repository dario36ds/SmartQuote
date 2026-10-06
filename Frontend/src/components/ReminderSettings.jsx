import { useEffect, useState } from "react";

import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import Skeleton from "./Skeleton";
import ValidatedInput from "./ValidatedInput";

export default function ReminderSettings({ busy = false, onSavingChange }) {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState("7");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await apiRequest("/notifications/settings/", { token });
        if (active) {
          setPreferences(data);
          setEnabled(data.enabled);
          setDays(String(data.after_days));
          setLoadError("");
        }
      } catch (error) {
        if (active) setLoadError(error.message);
      }
    }
    load();
    return () => { active = false; };
  }, [token, attempt]);

  async function save(event) {
    event.preventDefault();
    if (saving || busy || !preferences) return;
    setSaving(true);
    onSavingChange(true);
    setFeedback(null);
    try {
      const data = await apiRequest("/notifications/settings/", {
        method: "PATCH", token,
        body: { enabled, after_days: enabled ? Number(days) : preferences.after_days },
      });
      setPreferences(data);
      setDays(String(data.after_days));
      setFeedback({ success: true, message: data.enabled ? `Promemoria attivi dopo ${data.after_days} ${data.after_days === 1 ? "giorno" : "giorni"} dall’invio.` : "Nuovi promemoria disattivati." });
    } catch (error) {
      setFeedback({ success: false, message: error.data?.after_days?.[0] || error.data?.enabled?.[0] || error.message });
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  return <section className="settings-card" aria-labelledby="settings-reminders-heading">
    <div className="settings-card-heading">
      <span className="settings-section-icon"><Icon name="bell" size={24} /></span>
      <div><h2 id="settings-reminders-heading">Promemoria preventivi</h2><p>Ricevi una notifica quando un cliente non ha ancora risposto.</p></div>
    </div>
    {loadError ? <>
      <p className="settings-feedback settings-error" role="alert">Impossibile caricare i promemoria: {loadError}</p>
      <button type="button" className="sq-button sq-button-secondary" disabled={busy} onClick={() => { setLoadError(""); setPreferences(null); setAttempt((current) => current + 1); }}>Riprova</button>
    </> : !preferences ? <div role="status"><span className="sq-visually-hidden">Caricamento impostazioni promemoria…</span><Skeleton height={50} /></div> : <form onSubmit={save} aria-busy={saving}>
      <fieldset disabled={saving || busy}>
        <legend className="sq-visually-hidden">Configura i promemoria</legend>
        <label className="settings-checkbox" htmlFor="settings-reminders-enabled"><input id="settings-reminders-enabled" type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); setFeedback(null); }} />Attiva i promemoria automatici</label>
        <div className="settings-field">
          <label htmlFor="settings-reminders-days">Ricordami dopo quanti giorni dall’invio</label>
          <ValidatedInput id="settings-reminders-days" name="after_days" type="number" inputMode="numeric" min="1" max="365" step="1" required={enabled} disabled={!enabled} value={days} onChange={(event) => { setDays(event.target.value); setFeedback(null); }} aria-describedby="settings-reminders-hint" />
        </div>
        <p id="settings-reminders-hint" className="settings-hint">Il periodo parte dalla data di invio e vale anche per i preventivi già inviati o visualizzati senza risposta. Ricevi un solo promemoria per preventivo. Disattivandoli, fermi quelli nuovi e mantieni lo storico.</p>
        {feedback && <p className={`settings-feedback ${feedback.success ? "settings-success" : "settings-error"}`} role={feedback.success ? "status" : "alert"}>{feedback.message}</p>}
        <button type="submit" className="sq-button sq-button-primary" disabled={enabled === preferences.enabled && (!enabled || Number(days) === preferences.after_days)}><Icon name="save" />{saving ? "Salvataggio…" : "Salva promemoria"}</button>
      </fieldset>
    </form>}
  </section>;
}
