/** Thousands separated the Russian way, as in the Mini App's `formatPrice`. */
export function formatPrice(price?: number | null): string {
  if (price == null || Number.isNaN(price)) return '0';
  return new Intl.NumberFormat('ru-RU').format(price);
}

/** `newCurrency` — UZS is spelled `so\`m`, everything else lowercased. */
export function currencyLabel(currency?: string | null): string {
  if (!currency) return '';
  return currency === 'UZS' ? 'so`m' : currency.toLowerCase();
}

export function productUnitPrice(product: {
  price?: number;
  discount?: { discounted_price?: number } | null;
}): number {
  return product.discount?.discounted_price ?? product.price ?? 0;
}
