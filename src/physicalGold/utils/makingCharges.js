// Making-charges percentage for the bill — display only.
//
// The cart API returns only the total making charges (₹). Making applies to
// gold items (silver carries none), so the rate shown is:
//     making ÷ value of the non-silver items × 100
// e.g. ₹2,447 on a ₹61,175 gold coin → 4%.
// Returns null when there's nothing meaningful to show.

const isSilverItem = (item) =>
  /silver/i.test(String(item?.productName || item?.name || "")) ||
  // "999" = fine silver; 24K gold may be "999.9", so match exactly.
  /silver/i.test(String(item?.purity || "")) ||
  String(item?.purity || "").trim() === "999";

export const makingChargesPercent = (items, making, getItemTotal) => {
  const amount = Number(making) || 0;
  if (amount <= 0 || !Array.isArray(items) || !items.length) return null;
  const base = items
    .filter((item) => !isSilverItem(item))
    .reduce((sum, item) => sum + (Number(getItemTotal(item)) || 0), 0);
  if (base <= 0) return null;
  const pct = Math.round((amount / base) * 1000) / 10; // 1 decimal
  return Number.isFinite(pct) && pct > 0 ? pct : null;
};

// "4%" / "3.5%"
export const formatPercent = (pct) => `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
