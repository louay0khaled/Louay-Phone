const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is missing');
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendTelegramMessage(chatId: number | string, text: string) {
  const response = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Telegram sendMessage failed: ${response.status} ${details}`);
  }

  return response.json();
}

export function getAdminChatId() {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
