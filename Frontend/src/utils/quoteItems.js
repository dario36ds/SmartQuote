let nextItemKey = 0;

// These keys identify editor rows only; they do not need cryptographic UUIDs.
export function createQuoteItem({ description = "", quantity = "1", unit_price = "" } = {}) {
  return {
    key: `quote-item-${nextItemKey++}`,
    description,
    quantity,
    unit_price,
  };
}
