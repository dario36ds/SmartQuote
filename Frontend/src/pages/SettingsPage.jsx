import { useState } from "react";

import AuthenticatedLayout from "../components/AuthenticatedLayout";
import Icon from "../components/Icon";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import "./SettingsPage.css";

function errorMessage(error) {
  const messages = Object.values(error.data || {}).flat().filter((value) => typeof value === "string");
  return messages.length ? messages.join(" ") : error.message;
}

export default function SettingsPage() {
  const { user, changeEmail, changePassword } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(null);
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setEmailFeedback(null);
    setSaving("email");
    try {
      const updated = await changeEmail(email.trim(), emailPassword);
      setEmail(updated.email);
      setEmailPassword("");
      setEmailFeedback({ success: true, message: "Email aggiornata correttamente." });
    } catch (error) {
      setEmailFeedback({ success: false, message: errorMessage(error) });
    } finally {
      setSaving(null);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ success: false, message: "Le password non coincidono." });
      return;
    }
    setSaving("password");
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({ success: true, message: "Password aggiornata correttamente. La tua sessione è stata rinnovata." });
    } catch (error) {
      setPasswordFeedback({ success: false, message: errorMessage(error) });
    } finally {
      setSaving(null);
    }
  }

  return (
    <AuthenticatedLayout variant="settings">
      <div className="settings-page">
        <div className="settings-heading">
          <h1>Impostazioni</h1>
          <p>Gestisci l’email e la password del tuo account.</p>
        </div>

        <div className="settings-account-summary">
          <span className="settings-section-icon"><Icon name="user" size={24} /></span>
          <div><strong>{user?.username}</strong><p>{user?.email || "Nessuna email impostata"}</p></div>
        </div>

        <div className="settings-grid">
          <section className="settings-card" aria-labelledby="settings-email-heading">
            <div className="settings-card-heading">
              <span className="settings-section-icon"><Icon name="mail" size={24} /></span>
              <div><h2 id="settings-email-heading">Indirizzo email</h2><p>Aggiorna l’email associata al tuo account.</p></div>
            </div>
            <form onSubmit={handleEmailSubmit}>
              <fieldset disabled={Boolean(saving)}>
                <legend className="sq-visually-hidden">Modifica email</legend>
                <div className="settings-field">
                  <label htmlFor="settings-email">Email</label>
                  <input id="settings-email" name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setEmailFeedback(null); }} required />
                </div>
                <div className="settings-field">
                  <label htmlFor="settings-email-password">Password attuale</label>
                  <PasswordInput id="settings-email-password" name="current_password" autoComplete="current-password" value={emailPassword} onChange={(event) => { setEmailPassword(event.target.value); setEmailFeedback(null); }} required />
                </div>
                <p className="settings-hint">Per accedere continuerai a usare il tuo username.</p>
                {emailFeedback && <Feedback feedback={emailFeedback} />}
                <button type="submit" className="sq-button sq-button-primary" disabled={email.trim() === (user?.email || "")}><Icon name="save" />{saving === "email" ? "Salvataggio…" : "Salva email"}</button>
              </fieldset>
            </form>
          </section>

          <section className="settings-card" aria-labelledby="settings-password-heading">
            <div className="settings-card-heading">
              <span className="settings-section-icon"><Icon name="lock" size={24} /></span>
              <div><h2 id="settings-password-heading">Password</h2><p>Scegli una nuova password per proteggere il tuo account.</p></div>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <fieldset disabled={Boolean(saving)}>
                <legend className="sq-visually-hidden">Modifica password</legend>
                <input className="sq-visually-hidden" name="username" autoComplete="username" value={user?.username || ""} readOnly tabIndex={-1} aria-hidden="true" />
                <div className="settings-field">
                  <label htmlFor="settings-current-password">Password attuale</label>
                  <PasswordInput id="settings-current-password" name="current_password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordFeedback(null); }} required />
                </div>
                <div className="settings-field">
                  <label htmlFor="settings-new-password">Nuova password</label>
                  <PasswordInput id="settings-new-password" name="new_password" autoComplete="new-password" minLength={8} aria-describedby="settings-password-hint" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordFeedback(null); }} required />
                </div>
                <div className="settings-field">
                  <label htmlFor="settings-confirm-password">Conferma nuova password</label>
                  <PasswordInput id="settings-confirm-password" name="confirm_password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordFeedback(null); }} required />
                </div>
                <p id="settings-password-hint" className="settings-hint">Usa almeno 8 caratteri. Evita password comuni, solo numeriche o simili ai dati del tuo account.</p>
                {passwordFeedback && <Feedback feedback={passwordFeedback} />}
                <button type="submit" className="sq-button sq-button-primary"><Icon name="save" />{saving === "password" ? "Salvataggio…" : "Salva password"}</button>
              </fieldset>
            </form>
          </section>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

function Feedback({ feedback }) {
  return <p className={`settings-feedback ${feedback.success ? "settings-success" : "settings-error"}`} role={feedback.success ? "status" : "alert"}>{feedback.message}</p>;
}
