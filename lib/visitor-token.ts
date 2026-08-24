export const VISITOR_TOKEN_COOKIE = 'louay_phone_visitor_token';

export function getOrCreateVisitorToken() {
  if (typeof document === 'undefined') return '';
  const encoded = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${VISITOR_TOKEN_COOKIE}=`))
    ?.split('=')[1];
  if (encoded) return decodeURIComponent(encoded);

  const token = crypto.randomUUID();
  document.cookie = `${VISITOR_TOKEN_COOKIE}=${encodeURIComponent(token)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  return token;
}

export function setVisitorToken(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${VISITOR_TOKEN_COOKIE}=${encodeURIComponent(token)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
