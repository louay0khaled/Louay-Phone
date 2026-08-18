export type ProductImageLike = { url: string; alt_text?: string | null; is_primary?: boolean | null; position?: number | null };

export function currentSyp(priceUsd: unknown, storedSyp: unknown, rateValue: unknown) {
  const usd = Number(priceUsd || 0);
  const stored = Number(storedSyp || 0);
  const value = rateValue as any;
  const rate = Number(value?.usd_to_syp ?? value?.rate ?? (typeof value === 'string' || typeof value === 'number' ? value : 0));
  if (usd > 0 && rate > 0) return Math.round(usd * rate);
  return stored > 0 ? stored : 0;
}

export function formatSyp(value: unknown) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString('ar-SY')} ل.س` : 'السعر عند الطلب';
}

export function formatUsd(value: unknown) {
  const amount = Number(value || 0);
  return amount > 0 ? amount.toLocaleString('en-US') : '';
}

export function sortedProductImages(images: ProductImageLike[] | null | undefined) {
  return [...(images ?? [])].filter((image) => Boolean(image?.url)).sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
}

export function primaryProductImage(images: ProductImageLike[] | null | undefined) {
  const safe = sortedProductImages(images);
  return safe.find((image) => image.is_primary) ?? safe[0] ?? null;
}

export function stockLabel(status: string | null | undefined) {
  if (status === 'in_stock') return 'متوفر حاليًا';
  if (status === 'out_of_stock') return 'غير متوفر';
  return 'تحقق من التوفر';
}
