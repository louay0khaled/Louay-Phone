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
});

function toSyp(priceUsd: number | null, priceSyp: number | null, rate: number) {
  if (priceSyp != null) return Number(priceSyp);
  if (priceUsd != null && rate > 0) return Math.round(Number(priceUsd) * rate);
  return 0;
}

export async function POST(req: Request) {
  try {
    const payload = bodySchema.parse(await req.json());
    const supabase = createAdminClient();

    const [{ data: rateRow }, { data: product }] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'exchange_rate').maybeSingle(),
      supabase
        .from('products')
        .select('id,name,slug,model,description,price_usd,price_syp,installment_enabled,is_active')
        .eq('id', payload.productId)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (!product) {
      return NextResponse.json({ error: 'الهاتف المطلوب غير موجود.' }, { status: 404 });
    }

    let plan: any | null = null;
    if (payload.installmentPlanId) {
      const { data } = await supabase
        .from('installment_plans')
        .select('id,product_id,months,first_payment_type,first_payment_value,total_price,monthly_amount,is_active')
        .eq('id', payload.installmentPlanId)
        .eq('product_id', product.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!data) {
        return NextResponse.json({ error: 'خطة التقسيط غير متاحة.' }, { status: 400 });
      }
      plan = data;
    }

    if (!product.installment_enabled && plan) {
      return NextResponse.json({ error: 'هذا الهاتف غير متاح للتقسيط.' }, { status: 400 });
    }

    const rate = Number((rateRow?.value as any)?.usd_to_syp ?? 0);
    const totalPrice = toSyp(product.price_usd, product.price_syp, rate);

    const install = plan
      ? calculateInstallment(totalPrice, {
          months: plan.months,
          first_payment_type: plan.first_payment_type,
          first_payment_value: Number(plan.first_payment_value),
          total_price: plan.total_price != null ? Number(plan.total_price) : totalPrice,
          monthly_amount: plan.monthly_amount != null ? Number(plan.monthly_amount) : null,
        })
      : null;

    const { data: customerMatch } = await supabase
      .from('customers')
      .select('id,name,phone,address')
      .eq('phone', payload.phone)
      .maybeSingle();

    let customerId = customerMatch?.id as string | undefined;
    if (!customerId) {
      const { data: insertedCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ name: payload.name, phone: payload.phone, address: payload.address })
        .select('id')
        .single();
      if (customerError) throw customerError;
      customerId = insertedCustomer.id;
    } else {
      await supabase.from('customers').update({ name: payload.name, address: payload.address }).eq('id', customerId);
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        product_id: product.id,
        installment_plan_id: plan?.id ?? null,
        status: 'new',
        notes: payload.notes || null,
        total_amount: totalPrice || null,
        first_payment: install?.firstPayment ?? null,
        monthly_amount: install?.monthly ?? null,
        months: install?.months ?? null,
      })
      .select('id,created_at')
      .single();

    if (orderError) throw orderError;

    const adminChatId = getAdminChatId();
    let telegramNotified = false;
    if (adminChatId) {
      const planText = install
        ? `\n<b>التقسيط:</b> ${install.months} أشهر\n<b>الدفعة الأولى:</b> ${Math.round(install.firstPayment).toLocaleString('ar-SY')} ل.س\n<b>القسط الشهري:</b> ${Math.round(install.monthly).toLocaleString('ar-SY')} ل.س`
        : '';

      try {
        await sendTelegramMessage(
          adminChatId,
          [
            `<b>طلب جديد — Louay Phone</b>`,
            `<b>رقم الطلب:</b> ${escapeHtml(order.id)}`,
            `<b>الهاتف:</b> ${escapeHtml(product.name)}`,
            `<b>الزبون:</b> ${escapeHtml(payload.name)}`,
            `<b>الهاتف للتواصل:</b> ${escapeHtml(payload.phone)}`,
            `<b>العنوان:</b> ${escapeHtml(payload.address)}`,
            planText,
            `<b>الملاحظات:</b> ${escapeHtml(payload.notes || '—')}`,
            `<b>السعر الإجمالي:</b> ${Math.round(totalPrice).toLocaleString('ar-SY')} ل.س`,
            `\nللرد من تيليجرام استخدم: <code>/reply ${escapeHtml(order.id)} نص الرد</code>`,
          ]
            .filter(Boolean)
            .join('\n'),
        );
        telegramNotified = true;
      } catch {
        telegramNotified = false;
      }
    }

    return NextResponse.json({ ok: true, orderId: order.id, telegramNotified });
  } catch (error: any) {
    const message = error?.message || 'تعذر إرسال الطلب.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
