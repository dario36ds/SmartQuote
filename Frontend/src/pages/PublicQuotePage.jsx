import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { apiRequest } from "../api";
import { PublicQuoteSkeleton } from "../components/LoadingSkeletons";
import Icon from "../components/Icon";
import "./PublicQuotePage.css";

const money = (value) => Number(value).toLocaleString("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" });
const date = (value) => value ? new Date(value).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : null;

export default function PublicQuotePage() {
  const { token } = useParams();
  return <PublicQuote key={token} token={token} />;
}

function PublicQuote({ token }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [decision, setDecision] = useState(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const dialog = useRef(null);
  const canRespond = quote && ["SENT", "VIEWED"].includes(quote.status);
  const accepted = quote?.status === "ACCEPTED";
  const rejected = quote?.status === "REJECTED";

  useEffect(() => {
    let active = true;
    apiRequest(`/quotes/public/${token}/`).then((data) => {
      if (active) { setQuote(data); setError(""); }
    }).catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, attempt]);

  function askDecision(action) {
    setError("");
    setDecision(action);
    dialog.current.showModal();
  }

  async function submitDecision(event) {
    event.preventDefault();
    if (busy.current || !canRespond) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest(`/quotes/public/${token}/${decision}/`, { method: "POST" });
      setQuote(updated);
      dialog.current.close();
    } catch (err) {
      // Reconcile a response submitted in another tab, or a lost POST response.
      try {
        const latest = await apiRequest(`/quotes/public/${token}/`);
        setQuote(latest);
        if (["ACCEPTED", "REJECTED"].includes(latest.status)) {
          dialog.current.close();
          return;
        }
      } catch { /* Keep the current proposal available for another attempt. */ }
      setError(err.message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="public-quote-page">
      <header className="pq-header">
        <a className="pq-brand" href={`/q/${token}`} aria-label="SmartQuote, preventivo cliente">
          <span className="pq-brand-icon"><Icon name="quote" size={25} /></span>
          <span>SmartQuote<small>AI Billing &amp; Quoting</small></span>
        </a>
        <span className="pq-portal"><span /> Area cliente</span>
      </header>
      <main className="pq-main">
        {loading ? <PublicQuoteSkeleton /> : !quote ? (
          <section className="pq-state"><Icon name="document" size={36} /><h1>Preventivo non disponibile</h1><p role="alert">{error}</p><p>Verifica il link ricevuto oppure riprova.</p><button className="pq-primary" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}><Icon name="refresh" /> Riprova</button></section>
        ) : <>
          <div className="pq-heading">
            <div><p className="pq-eyebrow">LA TUA PROPOSTA PERSONALIZZATA</p><h1>{quote.title}</h1><p>Consulta i dettagli e comunica la tua decisione direttamente da questa pagina.</p></div>
            <span className={`pq-badge ${accepted ? "is-accepted" : rejected ? "is-rejected" : ""}`}><Icon name={accepted ? "check" : rejected ? "close" : "document"} size={17} />{accepted ? "Accettato" : rejected ? "Rifiutato" : canRespond ? "In attesa di risposta" : "Non disponibile"}</span>
          </div>
          {(accepted || rejected) && <section className={`pq-response ${rejected ? "is-rejected" : ""}`} role="status"><Icon name={accepted ? "check" : "close"} size={28} /><div><h2>{accepted ? "Hai accettato il preventivo" : "Hai rifiutato il preventivo"}</h2><p>La tua risposta è stata registrata{date(accepted ? quote.accepted_at : quote.rejected_at) ? ` il ${date(accepted ? quote.accepted_at : quote.rejected_at)}` : ""}. Puoi continuare a consultare i dettagli qui sotto.</p></div></section>}
          <div className="pq-layout">
            <div className="pq-details">
              <section className="pq-card">
                <h2><span className="pq-section-icon"><Icon name="user" /></span> Un preventivo pensato per te</h2>
                <div className="pq-info-grid"><div><span className="pq-label">PREPARATO PER</span><strong>{quote.customer_name}</strong>{quote.company_name && <p>{quote.company_name}</p>}</div><div><span className="pq-label">DATA DI INVIO</span><strong>{date(quote.sent_at) || "Non specificata"}</strong></div></div>
                <div className="pq-description"><h3>Presentazione della proposta</h3><p>{quote.description || "Tutti i servizi e gli importi della proposta sono riportati nel dettaglio qui sotto."}</p></div>
              </section>
              <section className="pq-card pq-services">
                <h2><span className="pq-section-icon"><Icon name="document" /></span> Dettaglio servizi e costi</h2><p className="pq-subtitle">Le voci incluse nel tuo preventivo.</p>
                {quote.items.length ? <div className="pq-table-wrap"><table><caption className="pq-sr-only">Servizi e importi del preventivo</caption><thead><tr><th scope="col">Servizio / Articolo</th><th scope="col">Quantità</th><th scope="col">Prezzo unit.</th><th scope="col">Totale</th></tr></thead><tbody>{quote.items.map((item, index) => <tr key={item.id}><td><span className="pq-item-number">{String(index + 1).padStart(2, "0")}</span><span>{item.description}</span></td><td>{Number(item.quantity).toLocaleString("it-IT", { maximumFractionDigits: 2 })}</td><td>{money(item.unit_price)}</td><td><strong>{money(item.total)}</strong></td></tr>)}</tbody></table></div> : <p className="pq-empty">Non sono presenti voci di dettaglio.</p>}
                <div className="pq-services-total"><span>Totale preventivo</span><strong>{money(quote.total)}</strong></div>
              </section>
              <section className="pq-delivery"><span className="pq-section-icon"><Icon name="calendar" size={24} /></span><div><h2>Tempi di consegna</h2><p>{quote.delivery_time || "Da concordare con il professionista."}</p></div></section>
            </div>
            <aside className="pq-sidebar"><section className="pq-card pq-summary"><h2>Riepilogo del preventivo</h2><p className="pq-subtitle">La tua proposta, in un colpo d’occhio.</p><dl><div><dt>Voci incluse</dt><dd>{quote.items.length}</dd></div><div><dt>Consegna</dt><dd>{quote.delivery_time || "Da concordare"}</dd></div></dl><div className="pq-total"><span>IMPORTO TOTALE</span><strong>{money(quote.total)}</strong><small>Totale delle voci del preventivo</small></div>
              {canRespond ? <div className="pq-actions"><h3>Come desideri procedere?</h3><p>Conferma la proposta oppure comunica che non intendi accettarla.</p><button className="pq-primary" onClick={() => askDecision("accept")}><Icon name="check" /> Accetta preventivo</button><button className="pq-secondary pq-reject" onClick={() => askDecision("reject")}><Icon name="close" /> Rifiuta preventivo</button><small>Ti chiederemo conferma prima di registrare la risposta.</small></div> : <p className="pq-recorded"><Icon name={accepted ? "check" : "document"} />{accepted || rejected ? "Risposta registrata" : "Questo preventivo non consente risposte."}</p>}
            </section><div className="pq-help"><Icon name="sparkle" /><p>Tutto a portata di link<small>Conserva questo link per consultare la proposta e la risposta registrata.</small></p></div></aside>
          </div>
          <footer className="pq-footer"><span>SmartQuote</span> Preventivi chiari, decisioni semplici.</footer>
        </>}
      </main>
      <dialog ref={dialog} className="pq-dialog" onCancel={(event) => { if (busy.current) event.preventDefault(); }} aria-labelledby="pq-confirm-title" aria-describedby="pq-confirm-description">
        <form onSubmit={submitDecision}><span className="pq-section-icon"><Icon name={decision === "accept" ? "check" : "close"} size={28} /></span><h2 id="pq-confirm-title">{decision === "accept" ? "Accettare il preventivo?" : "Rifiutare il preventivo?"}</h2><p id="pq-confirm-description">Stai per {decision === "accept" ? "accettare" : "rifiutare"} «{quote?.title}» per un totale di <strong>{money(quote?.total || 0)}</strong>. Dopo la conferma non potrai modificare la risposta da questa pagina.</p>{error && <p className="pq-error" role="alert">{error}</p>}<div className="pq-dialog-actions"><button type="button" className="pq-secondary" autoFocus disabled={saving} onClick={() => dialog.current.close()}>Annulla</button><button type="submit" className="pq-primary" disabled={saving}>{saving ? "Registrazione…" : decision === "accept" ? "Conferma accettazione" : "Conferma rifiuto"}</button></div></form>
      </dialog>
    </div>
  );
}
