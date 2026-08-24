function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing');
  return token;
}

export function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: unknown) {
  const botToken = getBotToken();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Telegram sendMessage failed: ${response.status} ${details}`);
  }
  return response.json();
}

export async function answerTelegramCallback(callbackQueryId: string, text = 'تم') {
  const botToken = getBotToken();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Telegram answerCallbackQuery failed: ${response.status} ${details}`);
  }
  return response.json();
}

export async function editTelegramReplyMarkup(chatId: number | string, messageId: number, inlineKeyboard: unknown[][] = []) {
  const botToken = getBotToken();
  const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: inlineKeyboard } }),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Telegram editMessageReplyMarkup failed: ${response.status} ${details}`);
  }
  return response.json();
}

export function getAdminChatId() {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
