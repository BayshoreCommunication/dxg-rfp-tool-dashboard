/**
 * Parses and formats the money strings the intelligence layer produces
 * ("USD 125000", "$208,601.50"), so cards, ranges and confirmations all read
 * the same value the same way.
 */
const symbolCurrencies: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
};

export type Money = { currency: string; amount: number };

export const parseMoney = (value: string): Money | null => {
  const match = value
    .trim()
    .replaceAll(",", "")
    .match(/^(?:([A-Z]{3})\s*)?([$€£])?\s*(-?\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const currency = match[1]?.toUpperCase() ?? (match[2] ? symbolCurrencies[match[2]] : undefined);
  const amount = Number(match[3]);
  return currency && Number.isFinite(amount) ? { currency, amount } : null;
};

export const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};
