export const DASHBOARD_STATUSES = [
  { value: "DRAFT", label: "Bozza", color: "#b5b2cb", icon: "edit" },
  { value: "SENT", label: "Inviato", color: "#7770ee", icon: "send" },
  { value: "VIEWED", label: "Visualizzato", color: "#8fb9fa", icon: "eye" },
  { value: "ACCEPTED", label: "Accettato", color: "#48c7b3", icon: "check" },
  { value: "REJECTED", label: "Rifiutato", color: "#efaaa1", icon: "close" },
];

export const money = (value) => Number(value).toLocaleString("it-IT", {
  style: "currency", currency: "EUR", useGrouping: "always", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export function buildDashboardData(quotes, customers, monthCount, now) {
  const start = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
  const inPeriod = (date) => new Date(date) >= start && new Date(date) <= now;
  const periodQuotes = quotes.filter((quote) => inPeriod(quote.created_at));
  const accepted = periodQuotes.filter((quote) => quote.status === "ACCEPTED");
  const concluded = periodQuotes.filter((quote) => ["ACCEPTED", "REJECTED"].includes(quote.status));
  const active = periodQuotes.filter((quote) => ["DRAFT", "SENT", "VIEWED"].includes(quote.status));
  const sum = (entries) => entries.reduce((total, quote) => total + Number(quote.total), 0);
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const entries = periodQuotes.filter((quote) => {
      const created = new Date(quote.created_at);
      return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
    });
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("it-IT", { month: "short" }),
      fullLabel: date.toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
      count: entries.length,
      proposed: sum(entries),
      accepted: sum(entries.filter((quote) => quote.status === "ACCEPTED")),
    };
  });
  const ranking = customers.map((customer) => {
    const related = periodQuotes.filter((quote) => quote.customer === customer.id);
    return { ...customer, quoteCount: related.length, acceptedValue: sum(related.filter((quote) => quote.status === "ACCEPTED")) };
  }).filter((customer) => customer.quoteCount > 0)
    .sort((a, b) => b.acceptedValue - a.acceptedValue || b.quoteCount - a.quoteCount || a.name.localeCompare(b.name, "it"));
  return {
    start, periodQuotes, months, ranking,
    acceptedValue: sum(accepted),
    activeValue: sum(active),
    activeCount: active.length,
    acceptedCount: accepted.length,
    concludedCount: concluded.length,
    acceptanceRate: concluded.length ? Math.round(accepted.length / concluded.length * 100) : null,
    newCustomers: customers.filter((customer) => inPeriod(customer.created_at)).length,
    states: DASHBOARD_STATUSES.map((status) => ({ ...status, count: periodQuotes.filter((quote) => quote.status === status.value).length })),
  };
}
