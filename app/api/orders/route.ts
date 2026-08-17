import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateInstallment } from '@/lib/installments';
import { escapeHtml, getAdminChatId, sendTelegramMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  productId: z.string().uuid(),
  installmentPlanId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  address: z.string().trim().min(2).max(150),
  notes: z.string().trim().max(1000).optional().default(''),
  chatToken: z.string().min(20).max(128).optional(),
  website: z.string().trim().max(200).optional().default(''),
});

type RateEntry = { timestamps: number[] };
const recentRequests = new Map<string, RateEntry>();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

function getClientKey(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || 'unknown';
}

function checkRateLimit(key: string) {
  const now = Date.now();
  for (const [storedKey, entry] of recentRequests) {
    entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
    if (entry.timestamps.length === 0) recentRequests.delete(storedKey);
  }

  const entry = recentRequests.get(key) ?? { timestamps: [] };
  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = entry.timestamps[0] ?? now;
    return Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000));
  }

  entry.timestamps.push(now);
  recentRequests.set(key, entry);
  return 0;
}

function readExchangeRate(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return Number(v.usd_to_syp ?? v.rate ?? 0);
  }
  return 0;
}

function toSyp(priceUsd: number | null, priceSyp: number | null, rate: number) {
  if (priceUsd != null && Number(priceUsd) > 0 && rate > 0) return Math.round(Number(priceUsd) * rate);
  if (priceSyp != null && Number(priceSyp) > 0) return Number(priceSyp);
  return 0;
}

function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, '').replace(/^00/, '+');
}

export async function POST(req: Request) {
  try {
    const payload = bodySchema.parse(await req.json());
    if (payload.website) return NextResponse.json({ error: 'تعذر إرسال الطلب.' }, { status: 400 });

    const retryAfter = checkRateLimit(getClientKey(req));
    if (retryAfter > 0) {
      return NextResponse.json(
        { error: 'تم استلام عدة محاولات خلال وقت قصير. أعد المحاولة بعد قليل.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    const db = createAdminClient() as any;
    const normalizedPhone = normalizePhone(payload.phone);

    const [{ data: rateRow }, { data: product }] = await Promise.all([
      db.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
      db.from('products').select('id,name,slug,model,description,price_usd,price_syp,installment_enabled,is_active').eq('id', payload.productId).eq('is_active', true).maybeSingle(),
    ]);

    if (!product) return NextResponse.json({ error: 'الهاتف المطلوب غير موجود.' }, { status: 404 });

    const rate = readExchangeRate(rateRow?.value);
    const totalPrice = toSyp(product.price_usd, product.price_syp, rate);
    if (totalPrice <= 0) return NextResponse.json({ error: 'سعر المنتج بالليرة غير متاح حاليًا. يرجى المحاولة لاحقًا.' }, { status: 503 });

    let plan: any | null = null;
    if (payload.installmentPlanId) {
      const { data } = await db
        .from('installment_plans')
        .select('id,product_id,months,first_payment_type,first_payment_value,total_price,monthly_amount,is_active')
        .eq('id', payload.installmentPlanId)
        .eq('product_id', product.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!data) return NextResponse.json({ error: 'خطة التقسيط غير متاحة.' }, { status: 400 });
      plan = data;
    }

    if (!product.installment_enabled && plan) return NextResponse.json({ error: 'هذا الهاتف غير متاح للتقسيط.' }, { status: 400 });

    const install = plan
      ? calculateInstallment(totalPrice, {
          months: Number(plan.months),
          first_payment_type: plan.first_payment_type,
          first_payment_value: Number(plan.first_payment_value),
          total_price: plan.total_price != null ? Number(plan.total_price) : totalPrice,
          monthly_amount: plan.monthly_amount != null ? Number(plan.monthly_amount) : undefined,
        })
      : null;

    const { data: customerMatch } = await db.from('customers').select('id,name,phone,address').eq('phone', normalizedPhone).maybeSingle();
    let customerId = customerMatch?.id as string | undefined;
    if (!customerId) {
      const { data: insertedCustomer, error: customerError } = await db.from('customers').insert({ name: payload.name, phone: normalizedPhone, address: payload.address }).select('id').single();
      if (customerError) throw customerError;
      customerId = insertedCustomer.id;
    } else {
      const { error: customerUpdateError } = await db.from('customers').update({ name: payload.name, address: payload.address }).eq('id', customerId);
      if (customerUpdateError) throw customerUpdateError;
    }

    let conversationId: string | null = null;
    let ticketCode: string | null = null;

    if (payload.chatToken) {
      const { data: conversation } = await db.from('conversations').select('id,ticket_code,customer_id,status').eq('visitor_token', payload.chatToken).maybeSingle();
      if (conversation && conversation.status !== 'closed') {
        conversationId = conversation.id;
        ticketCode = conversation.ticket_code;
        await db.from('conversations').update({ customer_id: customerId, visitor_name: payload.name, last_message_at: new Date().toISOString(), status: 'open' }).eq('id', conversation.id);
      }
    }

    if (!conversationId) {
      const { data: existing } = await db.from('conversations').select('id,ticket_code,status').eq('customer_id', customerId).is('telegram_chat_id', null).neq('status', 'closed').maybeSingle();
      if (existing) {
        conversationId = existing.id;
        ticketCode = existing.ticket_code;
      } else {
        const { data: created, error } = await db
          .from('conversations')
          .insert({ customer_id: customerId, visitor_token: payload.chatToken ?? null, visitor_name: payload.name, telegram_chat_id: null, status: 'open', last_message_at: new Date().toISOString() })
          .select('id,ticket_code')
          .single();
        if (error) throw error;
        conversationId = created.id;
        ticketCode = created.ticket_code;
      }
    }

    if (!conversationId) throw new Error('Conversation could not be created');

    const { data: order, error: orderError } = await db.from('orders').insert({
      customer_id: customerId,
      product_id: product.id,
      installment_plan_id: plan?.id ?? null,
      status: 'new',
      notes: payload.notes || null,
      total_amount: totalPrice,
      first_payment: install?.firstPayment ?? null,
      monthly_amount: install?.monthly ?? null,
      months: install?.months ?? null,
    }).select('id,created_at').single();
    if (orderError) throw orderError;

    const { error: conversationUpdateError } = await db.from('conversations').update({ last_message_at: new Date().toISOString(), status: 'open' }).eq('id', conversationId);
    if (conversationUpdateError) console.error('Conversation update after order failed:', conversationUpdateError);

    const ticketForTelegram = ticketCode ?? '—';
    const orderText = `<b>🛍️ تم تأكيد طلب جديد</b>\n<b>رقم الطلب:</b> <code>${escapeHtml(order.id)}</code>\n<b>التذكرة:</b> <code>${escapeHtml(ticketForTelegram)}</code>\n<b>الهاتف:</b> ${escapeHtml(product.name)}\n<b>الزبون:</b> ${escapeHtml(payload.name)}\n<b>الهاتف للتواصل:</b> ${escapeHtml(normalizedPhone)}\n<b>العنوان:</b> ${escapeHtml(payload.address)}${install ? `\n<b>التقسيط:</b> ${install.months} أشهر\n<b>الدفعة الأولى:</b> ${Math.round(install.firstPayment).toLocaleString('ar-SY')} ل.س\n<b>القسط الشهري:</b> ${Math.round(install.monthly).toLocaleString('ar-SY')} ل.س` : ''}\n<b>الملاحظات:</b> ${escapeHtml(payload.notes || '—')}\n<b>السعر الإجمالي:</b> ${Math.round(totalPrice).toLocaleString('ar-SY')} ل.س\n\n<b>للرد على المحادثة:</b> <code>/reply ${escapeHtml(ticketForTelegram)} نص الرد</code>`;

    let telegramNotified = false;
    const adminChatId = getAdminChatId();
    if (adminChatId) {
      try {
        await sendTelegramMessage(adminChatId, orderText);
        telegramNotified = true;
      } catch (telegramError) {
        console.error('Telegram order notification failed:', telegramError);
      }
    }

    return NextResponse.json({ ok: true, orderId: order.id, ticketId: ticketCode, telegramNotified });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'تحقق من بيانات الطلب المدخلة.' }, { status: 400 });
    console.error('Order API failed:', error);
    return NextResponse.json({ error: 'تعذر إرسال الطلب حاليًا. حاول مرة أخرى.' }, { status: 500 });
  }
}
