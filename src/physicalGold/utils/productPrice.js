// Product price helpers — read the price the same way ProductCard does
// (first embedded variant, then the product's own price fields).

const toNumber = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  // "₹1,234", "1234.50", or a range like "₹2,181 - ₹4,262" → the first
  // non-zero number (so "₹0 - ₹500" still counts as priced).
  const nums = (String(v).replace(/,/g, "").match(/\d+(\.\d+)?/g) || []).map(Number);
  return nums.find((n) => n > 0) || 0;
};

export const getProductPrice = (product) =>
  toNumber(
    product?.variants?.[0]?.price ||
      product?.minPrice ||
      product?.priceRange ||
      product?.price ||
      product?.basePrice ||
      product?.amount,
  );

// Only products that actually have a price — ₹0 / missing ones are hidden.
export const hasPrice = (product) => getProductPrice(product) > 0;

export const withPrice = (list) => (Array.isArray(list) ? list.filter(hasPrice) : []);
