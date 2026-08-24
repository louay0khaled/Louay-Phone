import { createClient } from '@supabase/supabase-js';
import { answerTelegramCallback, editTelegramReplyMarkup, escapeHtml, getAdminChatId, sendTelegramMessage } from '@/lib/telegram';

type CallbackQuery = {
  id: string;
  data?: string;
  message?: { chat?: { id?: number }; message_id?: number };
};

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmpogiiqydoxoclxcvwh.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function claim(callbackId: string) {
  const { data, error } = await db().rpc('claim_telegram_callback', { p_callback_id: callbackId });
  if (error) throw error;
  return data === true;
}

export async function handleReviewCallback(query: CallbackQuery) {
  const adminChatId = getAdminChatId();
  if (adminChatId === null || Number(query.message?.chat?.id) !== adminChatId) return false;
  const [kind, action, reviewId] = String(query.data || '').split(':');
  if (kind !== 'review' || !reviewId || !['approve', 'reject'].includes(action)) return false;

  await answerTelegramCallback(query.id).catch((error) => console.error('review callback answer failed:', error));
  if (!(await claim(query.id))) return true;

  const supabase = db();
  try {
    const { data: review, error } = await supabase
      .from('reviews')
      .select('id,product_id,customer_name,rating,comment,is_approved,order_id')
      .eq('id', reviewId)
      .maybeSingle();
    if (error) throw error;
    if (!review) throw new Error('Review not found');

    const approved = action === 'approve';
    const { data: updated, error: updateError } = await supabase
      .from('reviews')
      .update({ is_approved: approved })
      .eq('id', review.id)
      .select('id,is_approved')
      .single();
    if (updateError || !updated) throw updateError ?? new Error('Review update failed');

    if (query.message?.message_id) await editTelegramReplyMarkup(adminChatId, query.message.message_id, []);
    await supabase.from('audit_logs').insert({
      action: approved ? 'telegram_review_approved' : 'telegram_review_rejected',
      entity: 'review',
      entity_id: review.id,
      metadata: { callback_id: query.id, order_id: review.order_id },
    });

    await sendTelegramMessage(adminChatId, approved
      ? `✅ تم اعتماد تقييم <code>${escapeHtml(review.id)}</code> وسيظهر على صفحة المنتج.`
      : `❌ تم رفض تقييم <code>${escapeHtml(review.id)}</code> ولن يظهر للزوار.`);
    return true;
  } catch (error) {
    console.error('Review callback failed:', error);
    await sendTelegramMessage(adminChatId, '⚠️ تعذر معالجة التقييم.').catch(() => undefined);
    return true;
  }
}
