export type ExchangeRate = { usd_to_syp: number };

export function formatSYP(value: number) {
  return new Intl.NumberFormat('ar-SY', { maximumFractionDigits: 0 }).format(Math.round(value)) + ' ل.س';
}

export function formatUSD(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export function usdToSyp(usd: number, rate: number) {
  if (!rate || rate <= 0) return 0;
  return Math.round(usd * rate);
}

export function sypToUsd(syp: number, rate: number) {
  if (!rate || rate <= 0) return 0;
  return syp / rate;
}
