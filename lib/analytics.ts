export function trackAnalytics(eventName: 'page_view' | 'product_view' | 'order_start' | 'chat_start' | 'review_submit', path = window.location.pathname, metadata: Record<string, unknown> = {}) {
  const body = JSON.stringify({ eventName, path, referrer: document.referrer || null, metadata });
  const blob = new Blob([body], { type: 'application/json' });
  if (navigator.sendBeacon?.('/api/analytics', blob)) return;
  void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}
