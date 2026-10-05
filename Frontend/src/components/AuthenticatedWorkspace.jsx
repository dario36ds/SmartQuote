import { useState } from "react";
import { Link, NavLink } from "react-router";

import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import "./AuthenticatedWorkspace.css";

export default function AuthenticatedWorkspace({ children, variant, search, onSearch, onNewQuote }) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const username = user?.username || "Utente";
  const initials = username.split(/[\s._-]+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const searchLabel = variant === "dashboard" ? "Cerca preventivi e clienti" : variant === "quotes" ? "Cerca preventivi" : "Cerca clienti";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={`sq-workspace ${variant === "dashboard" ? "dashboard-workspace" : variant === "quotes" ? "quote-workspace" : "customer-workspace"}`}>
      <aside className="sq-sidebar">
        <Link to="/" className="sq-brand" aria-label="SmartQuote, dashboard">
          <span className="sq-brand-mark"><Icon name="quote" size={23} /></span>
          <span><strong>SmartQuote</strong><small>AI Billing &amp; Quoting</small></span>
        </Link>
        <div className="sq-assistant"><span className="sq-status-dot" />AI Assistant</div>
        <nav className="sq-navigation" aria-label="Navigazione principale">
          <NavLink to="/" end><Icon name="grid" size={25} />Dashboard</NavLink>
          <NavLink to="/quotes"><Icon name="document" size={25} />Preventivi</NavLink>
          <NavLink to="/customers"><Icon name="users" size={25} />Clienti</NavLink>
        </nav>
        <Link to="/quotes" className="sq-engine">
          <span><Icon name="sparkle" size={18} />Smart Engine</span>
          <p>Crea preventivi e genera descrizioni con l’assistente AI.</p>
        </Link>
      </aside>

      <div className="sq-workspace-body">
        <header className="sq-topbar">
          <label className="sq-search sq-global-search">
            <Icon name="search" size={24} />
            <input type="search" aria-label={searchLabel} placeholder={`${searchLabel}…`} value={search} onChange={(event) => onSearch(event.target.value)} />
          </label>
          <div className="sq-topbar-actions">
            {onNewQuote ? (
              <button type="button" className="sq-button sq-button-primary sq-new-quote" onClick={onNewQuote} aria-label="Nuovo preventivo"><Icon name="plus" /><span>Nuovo preventivo</span></button>
            ) : (
              <Link to="/quotes" className="sq-button sq-button-primary sq-new-quote" aria-label="Nuovo preventivo"><Icon name="plus" /><span>Nuovo preventivo</span></Link>
            )}
            <details className="sq-notifications">
              <summary className="sq-icon-button" aria-label="Notifiche"><Icon name="bell" size={25} /></summary>
              <div className="sq-notification-panel"><strong>Notifiche</strong><p>Le notifiche non sono ancora disponibili.</p></div>
            </details>
            <details className="sq-account">
              <summary aria-label={`Account di ${username}`}>
                <span className="sq-profile-avatar">{initials}</span>
                <span className="sq-profile-name"><strong>{username}</strong><small>Il tuo account</small></span>
              </summary>
              <div className="sq-account-panel">
                <span>{user?.email || username}</span>
                <button type="button" onClick={handleLogout} disabled={loggingOut}><Icon name="logout" size={18} />{loggingOut ? "Uscita…" : "Esci"}</button>
              </div>
            </details>
          </div>
        </header>
        <main className="sq-content">{children}</main>
      </div>
    </div>
  );
}
