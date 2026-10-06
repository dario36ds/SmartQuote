import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";

import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import { SkeletonLines } from "./LoadingSkeletons";
import { notificationMessage, notificationQuotePath, notificationTitle } from "../utils/notifications";
import "./NotificationBell.css";

const notificationDate = (value) => new Date(value).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function NotificationBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const id = useId();
  const panelRef = useRef(null);
  const reloadRef = useRef(null);
  const activeRef = useRef(false);
  const mutationRef = useRef(false);
  const versionRef = useRef(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(null);
  const [toast, setToast] = useState(null);
  const data = result?.token === token ? result.data : null;
  const notifications = data?.results || [];
  const unreadCount = data?.unread_count || 0;
  const loading = !data && !error;

  useEffect(() => {
    let active = true;
    let fetching = false;
    let knownIds = null;
    activeRef.current = true;

    async function load() {
      if (!active || fetching || mutationRef.current) return;
      fetching = true;
      const version = ++versionRef.current;
      try {
        const response = await apiRequest("/notifications/", { token });
        if (!active || version !== versionRef.current) return;
        const received = response.results || [];
        const added = knownIds ? received.filter((notification) => !notification.read_at && !knownIds.has(notification.id)) : [];
        knownIds = new Set(received.map((notification) => notification.id));
        setResult({ token, data: response });
        setError("");
        if (added.length) setToast({ token, message: added.length === 1 ? notificationMessage(added[0]) : `${added.length} nuove notifiche sui preventivi.` });
      } catch (err) {
        if (active && version === versionRef.current) setError(`Impossibile caricare le notifiche: ${err.message}`);
      } finally {
        fetching = false;
      }
    }

    function refreshWhenVisible() {
      if (!document.hidden) load();
    }

    function closeOutside(event) {
      const panel = panelRef.current;
      if (panel && !panel.contains(event.target)) panel.open = false;
    }

    function closeOnEscape(event) {
      if (event.key === "Escape" && panelRef.current?.open) {
        panelRef.current.open = false;
        panelRef.current.querySelector("summary").focus();
      }
    }

    reloadRef.current = load;
    load();
    const interval = setInterval(refreshWhenVisible, 30000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      active = false;
      activeRef.current = false;
      reloadRef.current = null;
      clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [token]);

  async function markRead(notification = null) {
    if (mutationRef.current) return;
    mutationRef.current = true;
    versionRef.current += 1;
    setMarking(notification?.id || "all");
    setError("");
    let updated = false;
    try {
      const response = await apiRequest(notification ? `/notifications/${notification.id}/read/` : "/notifications/read-all/", { method: "POST", token });
      if (!activeRef.current) return;
      updated = true;
      setResult((current) => current?.token === token ? {
        token,
        data: {
          ...current.data,
          results: current.data.results.map((item) => notification ? item.id === notification.id ? response : item : { ...item, read_at: item.read_at || new Date().toISOString() }),
          unread_count: notification ? Math.max(0, current.data.unread_count - (notification.read_at ? 0 : 1)) : 0,
        },
      } : current);
      const quotePath = notification ? notificationQuotePath(response) : null;
      if (quotePath) {
        panelRef.current.open = false;
        navigate(quotePath);
      }
    } catch (err) {
      if (activeRef.current) setError(`Impossibile aggiornare le notifiche: ${err.message}`);
    } finally {
      mutationRef.current = false;
      if (activeRef.current) {
        setMarking(null);
        if (updated) reloadRef.current?.();
      }
    }
  }

  return <>
    <details ref={panelRef} className="sq-notifications" onToggle={(event) => { if (event.currentTarget.open) reloadRef.current?.(); }}>
      <summary className="sq-icon-button" aria-label={unreadCount ? `Notifiche: ${unreadCount} non lette` : "Notifiche"}>
        <Icon name="bell" size={25} />
        {unreadCount > 0 && <span className="sq-notification-count" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </summary>
      <section className="sq-notification-panel" aria-labelledby={`${id}-heading`}>
        <header><h2 id={`${id}-heading`}>Notifiche</h2><button type="button" className="sq-icon-button" aria-label="Aggiorna notifiche" onClick={() => reloadRef.current?.()} disabled={loading || marking !== null}><Icon name="refresh" size={19} /></button></header>
        {error && <p className="sq-notification-error" role="alert">{error}</p>}
        <div className="sq-notification-list" aria-busy={loading}>
          {loading ? <div className="sq-notification-empty" role="status"><span className="sq-visually-hidden">Caricamento notifiche…</span><SkeletonLines /></div> : notifications.length ? notifications.map((notification) => <button key={notification.id} type="button" className={`sq-notification-item ${!notification.read_at ? "is-unread" : ""}`} disabled={marking !== null} onClick={() => markRead(notification)} aria-label={`${notificationMessage(notification)} ${notification.quote ? "Apri preventivo" : "Preventivo eliminato"}${!notification.read_at ? ", non letta" : ""}`}>
            <span className={`sq-notification-symbol sq-notification-symbol-${notification.status.toLowerCase()}`}><Icon name={notification.status === "REMINDER" ? "bell" : notification.status === "ACCEPTED" ? "check" : "close"} size={22} /></span>
            <span className="sq-notification-text"><strong>{notificationTitle(notification)}</strong><span>{notificationMessage(notification)}</span><time dateTime={notification.created_at}>{notificationDate(notification.created_at)}</time>{notification.can_remind && <small>Apri e prepara il sollecito</small>}{!notification.quote && <small>Preventivo eliminato</small>}</span>
            {!notification.read_at && <span className="sq-notification-dot" aria-hidden="true" />}
          </button>) : !error && <p className="sq-notification-empty">Nessuna notifica. Le risposte dei clienti e i promemoria per sollecitare appariranno qui.</p>}
        </div>
        {notifications.length > 0 && <footer>{notifications.length === 50 && <small>Ultime 50 notifiche</small>}<button type="button" disabled={!unreadCount || marking !== null} onClick={() => markRead()}>{marking === "all" ? "Aggiornamento…" : "Segna tutte come lette"}</button></footer>}
      </section>
    </details>
    {toast?.token === token && createPortal(<div className="sq-notification-toast" role="status"><Icon name="bell" size={23} /><p>{toast.message}</p><button type="button" className="sq-icon-button" aria-label="Chiudi avviso di notifica" onClick={() => setToast(null)}><Icon name="close" size={19} /></button></div>, document.body)}
  </>;
}
