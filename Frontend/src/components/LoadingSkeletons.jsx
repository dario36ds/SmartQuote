import Icon from "./Icon";
import Skeleton from "./Skeleton";

export function SkeletonLines({ lines = 4 }) {
  return <span className="sq-skeleton-lines" aria-hidden="true">{Array.from({ length: lines }, (_, index) => <Skeleton key={index} width={index === lines - 1 ? "65%" : index % 2 ? "90%" : "100%"} />)}</span>;
}

export function ListSkeleton({ variant = "quotes", rows = 3, label = "Caricamento…" }) {
  const columns = variant === "customers" ? 6 : variant === "quotes" ? 7 : variant === "ranking" ? 3 : 4;
  return (
    <div className={`sq-list-skeleton sq-list-skeleton-${variant}`} role="status">
      <span className="sq-loading-label">{label}</span>
      <div aria-hidden="true">
        {variant !== "ranking" && <Skeleton height={42} className="sq-list-skeleton-header" />}
        {Array.from({ length: rows }, (_, row) => <div className="sq-list-skeleton-row" key={row}>
          <div className="sq-list-skeleton-identity">
            {(variant === "customers" || variant === "ranking") && <Skeleton width={40} height={40} className="sq-skeleton-circle" />}
            <SkeletonLines lines={2} />
          </div>
          {Array.from({ length: columns - 1 }, (_, column) => <div className="sq-list-skeleton-field" key={column}><Skeleton width="55%" height={10} /><Skeleton height={column === columns - 2 ? 30 : 16} /></div>)}
        </div>)}
      </div>
    </div>
  );
}

export function ChartSkeleton({ months = 6 }) {
  return <div className="sq-chart-skeleton" role="status"><span className="sq-loading-label">Caricamento del grafico…</span><div className="sq-chart-skeleton-bars" aria-hidden="true">{Array.from({ length: months }, (_, index) => <div key={index}><Skeleton height={`${45 + index % 4 * 15}%`} /><Skeleton width="70%" height={10} /></div>)}</div><Skeleton height={40} /></div>;
}

export function StatusSkeleton() {
  return <div className="sq-status-skeleton" role="status"><span className="sq-loading-label">Caricamento degli stati dei preventivi…</span><div className="sq-status-skeleton-content" aria-hidden="true"><div className="sq-status-skeleton-ring"><Skeleton height={148} className="sq-skeleton-circle" /><span /></div><div className="sq-status-skeleton-list">{Array.from({ length: 5 }, (_, index) => <div key={index}><Skeleton width="60%" height={14} /><Skeleton width={24} height={14} /></div>)}</div></div></div>;
}

export function FormSkeleton() {
  return <div className="sq-form-skeleton" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div key={index}><Skeleton width="55%" height={14} /><Skeleton height={index === 4 ? 95 : 50} /></div>)}</div>;
}

export function QuoteItemsSkeleton() {
  return <div className="sq-items-skeleton" aria-hidden="true"><Skeleton height={14} width="75%" /><div>{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={46} />)}</div><Skeleton height={50} /></div>;
}

export function QuoteSummarySkeleton() {
  return <div className="sq-summary-skeleton" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton width="50%" height={14} /><Skeleton width="30%" height={14} /></div>)}<Skeleton height={110} /><Skeleton height={50} /><Skeleton height={46} /><SkeletonLines lines={2} /></div>;
}

export function PublicQuoteSkeleton() {
  return <div className="sq-public-skeleton" role="status"><span className="sq-loading-label">Caricamento dei dettagli del preventivo…</span><div className="sq-public-skeleton-heading" aria-hidden="true"><Skeleton width="40%" height={12} /><Skeleton width="75%" height={40} /><Skeleton width="90%" /></div><div className="pq-layout" aria-hidden="true"><div className="pq-details"><section className="pq-card"><Skeleton height={24} width="70%" /><div className="pq-info-grid"><SkeletonLines lines={2} /><SkeletonLines lines={2} /></div><SkeletonLines lines={4} /></section><section className="pq-card"><Skeleton width="65%" height={24} /><div className="sq-public-skeleton-services"><Skeleton height={42} /><SkeletonLines lines={4} /><Skeleton height={24} width="45%" /></div></section></div><aside className="pq-sidebar"><section className="pq-card"><Skeleton height={24} width="80%" /><div className="sq-public-skeleton-services"><QuoteSummarySkeleton /></div></section></aside></div></div>;
}

export function SessionSkeleton() {
  return <main className="sq-session-skeleton" role="status"><span className="sq-loading-label">Caricamento del tuo spazio di lavoro…</span><div className="sq-session-skeleton-card" aria-hidden="true"><div className="sq-session-skeleton-brand"><Icon name="quote" size={30} /><strong>SmartQuote</strong></div><Skeleton height={32} width="75%" /><SkeletonLines lines={3} /><Skeleton height={50} /></div></main>;
}
