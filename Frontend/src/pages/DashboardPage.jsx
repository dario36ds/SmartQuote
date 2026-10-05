import { useEffect, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../api";
import AuthenticatedLayout from "../components/AuthenticatedLayout";
import Skeleton from "../components/Skeleton";
import { ChartSkeleton, ListSkeleton, StatusSkeleton } from "../components/LoadingSkeletons";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { buildDashboardData, DASHBOARD_STATUSES, money } from "../utils/dashboard";
import "./DashboardPage.css";

function Metric({ label, value, detail, icon, tone = "primary", loading = false }) {
  return <article className={`dash-metric dash-metric-${tone}`}><div><h2>{label}</h2><strong>{loading ? <Skeleton width={150} height={36} /> : value}</strong><p>{loading ? <Skeleton width={180} height={14} /> : detail}</p></div><span className="dash-metric-icon"><Icon name={icon} size={26} /></span></article>;
}

function Empty({ icon = "document", children }) {
  return <div className="dash-empty"><Icon name={icon} size={28} /><p>{children}</p></div>;
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [result, setResult] = useState(null);
  const [reload, setReload] = useState(0);
  const [monthCount, setMonthCount] = useState(6);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const loading = !result || result.token !== token;
  const quotes = loading ? [] : result.quotes || [];
  const customers = loading ? [] : result.customers || [];
  const quotesError = loading ? "" : result.quotesError;
  const customersError = loading ? "" : result.customersError;
  const now = result?.loadedAt || new Date();
  const data = buildDashboardData(quotes, customers, monthCount, now);
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const query = search.trim().toLocaleLowerCase("it");
  const matches = (...values) => values.some((value) => (value || "").toLocaleLowerCase("it").includes(query));
  const recentQuotes = data.periodQuotes.filter((quote) => (!statusFilter || quote.status === statusFilter) && matches(quote.title, customerById.get(quote.customer)?.name, customerById.get(quote.customer)?.company))
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  const topCustomers = data.ranking.filter((customer) => matches(customer.name, customer.company)).slice(0, 4);
  const chartMonth = data.months.find((month) => month.key === selectedMonth) || data.months.at(-1);
  const chartPeak = Math.max(0, ...data.months.map((month) => month.proposed));
  const chartMax = Math.max(1, chartPeak);
  const quoteValue = (value) => loading ? "…" : quotesError ? "—" : value;
  let ringOffset = 0;
  const ringSegments = data.states.map((status) => {
    const start = ringOffset;
    ringOffset += data.periodQuotes.length ? status.count / data.periodQuotes.length * 100 : 0;
    return `${status.color} ${start}% ${ringOffset}%`;
  }).join(", ");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      const [quotesResponse, customersResponse] = await Promise.allSettled([
        apiRequest("/quotes/", { token }), apiRequest("/customers/", { token }),
      ]);
      if (active) setResult({
        token,
        quotes: quotesResponse.status === "fulfilled" ? quotesResponse.value : null,
        customers: customersResponse.status === "fulfilled" ? customersResponse.value : null,
        quotesError: quotesResponse.status === "rejected" ? quotesResponse.reason.message : "",
        customersError: customersResponse.status === "rejected" ? customersResponse.reason.message : "",
        loadedAt: new Date(),
      });
    }
    loadDashboard();
    return () => { active = false; };
  }, [token, reload]);

  function refresh() {
    setResult(null);
    setReload((value) => value + 1);
  }

  return (
    <AuthenticatedLayout variant="dashboard" search={search} onSearch={setSearch}>
      <div className="dash-heading">
        <div><nav className="dash-breadcrumb" aria-label="Percorso"><span>SmartQuote</span><Icon name="chevron" size={14} /><span aria-current="page">Dashboard</span></nav><h1>La tua attività, a colpo d’occhio.</h1><p>Benvenuto, {user?.username || "utente"}. Ecco come stanno andando clienti e preventivi.</p></div>
        <div className="dash-heading-actions"><label className="dash-period"><Icon name="calendar" size={19} /><select aria-label="Periodo della dashboard" value={monthCount} onChange={(event) => { setMonthCount(Number(event.target.value)); setSelectedMonth(null); }}><option value={3}>Ultimi 3 mesi</option><option value={6}>Ultimi 6 mesi</option><option value={12}>Ultimi 12 mesi</option></select></label><button type="button" className="sq-icon-button" aria-label="Aggiorna dashboard" title="Aggiorna dati" disabled={loading} onClick={refresh}><Icon name="refresh" size={23} /></button></div>
      </div>
      <p className="dash-period-caption">Panoramica dei preventivi creati dal {data.start.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })} a oggi.</p>
      {(quotesError || customersError) && <div className="dash-alert" role="alert"><div>{quotesError && <p>Impossibile caricare i preventivi: {quotesError}</p>}{customersError && <p>Impossibile caricare i clienti: {customersError}</p>}</div><button type="button" onClick={refresh}>Riprova</button></div>}
      {loading && <p className="sq-visually-hidden" role="status">Caricamento dashboard…</p>}

      <section className="dash-metrics" aria-label="Indicatori della tua attività" aria-busy={loading}>
        <Metric loading={loading} label="Valore accettato" value={quoteValue(money(data.acceptedValue))} icon="money" tone="teal" detail={quoteValue(`${data.acceptedCount} preventivi accettati`)} />
        <Metric loading={loading} label="Preventivi attivi" value={quoteValue(data.activeCount)} icon="quote" detail={quoteValue(`${money(data.activeValue)} in pipeline`)} />
        <Metric loading={loading} label="Tasso di accettazione" value={quoteValue(data.acceptanceRate === null ? "—" : `${data.acceptanceRate}%`)} icon="check" tone="teal" detail={quoteValue(data.concludedCount ? `${data.acceptedCount} su ${data.concludedCount} conclusi` : "Nessun preventivo concluso")} />
        <Metric loading={loading} label="Clienti totali" value={loading ? "…" : customersError ? "—" : customers.length} icon="users" tone="violet" detail={loading ? "Caricamento…" : customersError ? "Dati non disponibili" : `${data.newCustomers} nuovi nel periodo`} />
      </section>

      <div className="dash-analysis-grid">
        <section className="dash-panel dash-chart-panel" aria-labelledby="dash-chart-heading">
          <div className="dash-panel-heading"><div><h2 id="dash-chart-heading">Andamento dei preventivi</h2><p>Valore per mese di creazione</p></div><span className="dash-panel-symbol"><Icon name="trend" size={23} /></span></div>
          <div className="dash-chart-legend"><span><i />Totale proposto</span><span><i />Valore accettato</span></div>
          {loading ? <ChartSkeleton months={monthCount} /> : quotesError ? <Empty>Dati dei preventivi non disponibili.</Empty> : <>
            <div className="dash-chart" aria-label="Grafico mensile dei valori proposti e accettati" aria-busy={loading}>
              <div className="dash-chart-scale" aria-hidden="true"><span>{money(chartPeak)}</span><span>{money(chartPeak / 2)}</span><span>0 €</span></div>
              <div className="dash-chart-months" data-months={monthCount} style={{ "--dash-month-count": monthCount }}>
                {data.months.map((month) => <button key={month.key} type="button" className={`dash-month ${chartMonth.key === month.key ? "is-selected" : ""}`} onClick={() => setSelectedMonth(month.key)} disabled={loading} aria-pressed={chartMonth.key === month.key} aria-label={`${month.fullLabel}: ${month.count} preventivi, proposti ${money(month.proposed)}, accettati ${money(month.accepted)}`}><span className="dash-bars"><i style={{ height: `${month.proposed / chartMax * 100}%` }} /><i style={{ height: `${month.accepted / chartMax * 100}%` }} /></span><span className="dash-month-label">{month.label}</span></button>)}
              </div>
            </div>
            <div className="dash-chart-detail" aria-live="polite"><strong>{chartMonth.fullLabel}</strong><span>{loading ? "Caricamento…" : `${chartMonth.count} preventivi · ${money(chartMonth.proposed)} proposti · ${money(chartMonth.accepted)} accettati`}</span></div>
          </>}
        </section>

        <section className="dash-panel dash-status-panel" aria-labelledby="dash-status-heading">
          <div className="dash-panel-heading"><div><h2 id="dash-status-heading">Stato dei preventivi</h2><p>Dal primo contatto alla conferma</p></div></div>
          {loading ? <StatusSkeleton /> : quotesError ? <Empty>Dati dei preventivi non disponibili.</Empty> : <>
            <div className="dash-status-ring" style={{ background: data.periodQuotes.length ? `conic-gradient(${ringSegments})` : "#edf0fb" }} role="img" aria-label={`${data.periodQuotes.length} preventivi nel periodo. ${data.states.map((status) => `${status.label}: ${status.count}`).join(", ")}`}><div><strong>{loading ? "…" : data.periodQuotes.length}</strong><span>preventivi totali</span></div></div>
            <div className="dash-status-list" role="group" aria-label="Filtra i preventivi recenti per stato">{data.states.map((status) => <button key={status.value} type="button" disabled={loading} aria-pressed={statusFilter === status.value} className={statusFilter === status.value ? "is-selected" : ""} onClick={() => setStatusFilter((current) => current === status.value ? "" : status.value)}><span><i style={{ background: status.color }} />{status.label}</span><strong>{status.count}</strong></button>)}</div>
          </>}
        </section>
      </div>

      <div className="dash-details-grid">
        <section className="dash-panel dash-recent-panel" aria-labelledby="dash-recent-heading">
          <div className="dash-panel-heading"><div><h2 id="dash-recent-heading">Preventivi recenti</h2><p>Le ultime proposte aggiornate nel periodo</p></div><Link className="dash-text-link" to="/quotes">Vedi tutti<Icon name="chevron" size={17} /></Link></div>
          {(query || statusFilter) && <div className="dash-filter-note"><span>{recentQuotes.length} risultati{statusFilter ? ` · ${DASHBOARD_STATUSES.find((status) => status.value === statusFilter)?.label}` : ""}</span><button type="button" onClick={() => { setSearch(""); setStatusFilter(""); }}>Reimposta</button></div>}
          {loading ? <ListSkeleton variant="dashboard" label="Caricamento preventivi…" /> : quotesError ? <Empty>Dati dei preventivi non disponibili.</Empty> : recentQuotes.length === 0 ? <Empty icon={query || statusFilter ? "search" : "quote"}>{query || statusFilter ? "Nessun preventivo corrisponde alla ricerca e ai filtri." : "Non ci sono preventivi nel periodo selezionato. Crea una nuova proposta per iniziare."}</Empty> : <div className="dash-table-scroll" tabIndex={0} role="region" aria-label="Tabella preventivi recenti"><table className="dash-table" role="table"><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Preventivo / Cliente</th><th role="columnheader" scope="col">Stato</th><th role="columnheader" scope="col">Importo</th><th role="columnheader" scope="col">Aggiornato</th><th role="columnheader" scope="col"><span className="sq-visually-hidden">Apri</span></th></tr></thead><tbody role="rowgroup">{recentQuotes.slice(0, 5).map((quote) => <tr role="row" key={quote.id}><td role="cell"><Link to={`/quotes?quote=${quote.id}`}><strong>{quote.title}</strong><span>{customerById.get(quote.customer)?.name || "Cliente non disponibile"}</span></Link></td><td role="cell" data-label="Stato"><span className={`dash-badge dash-badge-${quote.status.toLowerCase()}`}><i />{DASHBOARD_STATUSES.find((status) => status.value === quote.status)?.label || quote.status}</span></td><td role="cell" data-label="Importo" className="dash-amount">{money(quote.total)}</td><td role="cell" data-label="Aggiornato" className="dash-date">{new Date(quote.updated_at || quote.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}</td><td role="cell"><Link className="dash-open-quote" to={`/quotes?quote=${quote.id}`} aria-label={`Apri ${quote.title}`}><Icon name="chevron" size={19} /><span className="dash-action-label">Apri preventivo</span></Link></td></tr>)}</tbody></table></div>}
          <div className="dash-recent-footer"><Icon name="document" size={16} /><span>{loading ? <Skeleton width={170} height={14} /> : quotesError ? "Dati non disponibili" : `${recentQuotes.length} preventivi${query || statusFilter ? " corrispondenti" : " nel periodo"}`}</span></div>
        </section>

        <section className="dash-panel dash-customers-panel" aria-labelledby="dash-customers-heading">
          <div className="dash-panel-heading"><div><h2 id="dash-customers-heading">Clienti in evidenza</h2><p>Per valore dei preventivi accettati</p></div><span className="dash-panel-symbol"><Icon name="users" size={22} /></span></div>
          {loading ? <ListSkeleton variant="ranking" rows={4} label="Caricamento clienti…" /> : customersError || quotesError ? <Empty icon="users">Dati dei clienti e dei preventivi necessari per il riepilogo.</Empty> : !topCustomers.length ? <Empty icon={query ? "search" : "users"}>{query ? "Nessun cliente corrisponde alla ricerca." : "I clienti con preventivi nel periodo appariranno qui."}</Empty> : <div className="dash-customer-list">{topCustomers.map((customer, index) => <Link key={customer.id} to={`/quotes?customer=${customer.id}`}><span className={`dash-avatar dash-avatar-${index % 3}`}>{customer.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="dash-customer-name"><strong>{customer.name}</strong><small>{customer.quoteCount} {customer.quoteCount === 1 ? "preventivo" : "preventivi"}</small></span><span className="dash-customer-value">{money(customer.acceptedValue)}<Icon name="chevron" size={16} /></span></Link>)}</div>}
          <Link className="dash-customers-link" to="/customers">Vai all’anagrafica clienti<Icon name="chevron" size={17} /></Link>
        </section>
      </div>

      <section className="dash-quick-actions" aria-label="Azioni rapide">
        <div className="dash-ai-intro"><span><Icon name="sparkle" size={27} /></span><div><h2>La prossima proposta parte da qui.</h2><p>Crea il preventivo, aggiungi i servizi e lascia che l’AI ti aiuti a presentarlo.</p></div></div><Link className="sq-button sq-button-primary" to="/quotes"><Icon name="plus" size={20} />Crea un preventivo</Link>
      </section>
      <footer className="dash-footer"><span><i />{loading ? "Aggiornamento in corso…" : `Ultimo aggiornamento alle ${result.loadedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`}</span><span>SmartQuote · Uno sguardo chiaro sulla tua attività</span></footer>
    </AuthenticatedLayout>
  );
}
