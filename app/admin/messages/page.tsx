import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const supabase = await createClient();

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id,customer_id,telegram_chat_id,status,last_message_at,created_at')
    .order('last_message_at', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main className="min-h-screen bg-[#030712] p-6 text-white lg:p-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-400/20 bg-red-400/5 p-6">
          <h1 className="text-xl font-extrabold">تعذر تحميل المحادثات</h1>
          <p className="mt-2 text-sm text-slate-400">تحقق من اتصال Supabase وصلاحيات جدول conversations.</p>
        </div>
      </main>
    );
  }

  const customerIds = [...new Set((conversations ?? []).map((c) => c.customer_id).filter(Boolean))] as string[];
  const conversationIds = (conversations ?? []).map((c) => c.id);

  const [{ data: customers }, { data: messages }] = await Promise.all([
    customerIds.length
      ? supabase.from('customers').select('id,name,phone,telegram_username').in('id', customerIds)
      : Promise.resolve({ data: [] as any[] }),
    conversationIds.length
      ? supabase
          .from('messages')
          .select('id,conversation_id,sender_type,message_text,created_at,is_read')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const customerMap = new Map((customers ?? []).map((c: any) => [c.id, c]));
  const latestMessageMap = new Map<string, any>();
  for (const message of messages ?? []) {
    if (!latestMessageMap.has(message.conversation_id)) latestMessageMap.set(message.conversation_id, message);
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white luxury-grid">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-sky-400">LOUAY PHONE</p>
            <h1 className="mt-1 text-3xl font-extrabold">المحادثات</h1>
            <p className="mt-2 text-sm text-slate-400">مراجعة محادثات Telegram المحفوظة في Supabase.</p>
          </div>
          <Link href="/admin" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">العودة للوحة</Link>
        </div>

        {(conversations ?? []).length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-4xl">💬</div>
            <h2 className="mt-4 text-xl font-extrabold">لا توجد محادثات بعد</h2>
            <p className="mt-2 text-sm text-slate-400">عندما يرسل زبون رسالة إلى بوت Louay Phone ستظهر هنا تلقائيًا.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {(conversations ?? []).map((conversation) => {
              const customer = customerMap.get(conversation.customer_id) as any;
              const latest = latestMessageMap.get(conversation.id) as any;
              const name = customer?.name || 'زبون Telegram';
              const statusLabel = conversation.status === 'open' ? 'مفتوحة' : conversation.status === 'processing' ? 'قيد المعالجة' : 'مغلقة';
              return (
                <article key={conversation.id} className="glass rounded-3xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-extrabold">{name}</h2>
                      <p className="mt-1 text-xs text-slate-500">التذكرة: <code>{conversation.id}</code></p>
                    </div>
                    <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-300">{statusLabel}</span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                    <p>📱 Telegram: {customer?.telegram_username ? `@${customer.telegram_username}` : '—'}</p>
                    <p>📞 الهاتف: {customer?.phone || 'غير مضاف'}</p>
                    <p className="sm:col-span-2">💬 {latest?.message_text || 'لا توجد رسائل نصية'}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString('ar-SY') : '—'}</span>
                    <span>Chat ID: {conversation.telegram_chat_id}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
