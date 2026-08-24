begin;

alter table public.conversations
  add column if not exists channel_origin text not null default 'web',
  add column if not exists order_id uuid references public.orders(id) on delete set null;

alter table public.orders
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

alter table public.messages
  add column if not exists client_message_id text,
  add column if not exists telegram_chat_id bigint;

update public.conversations
set ticket_code = 'WEB-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where ticket_code is null;

alter table public.conversations
  drop constraint if exists conversations_channel_origin_check;
alter table public.conversations
  add constraint conversations_channel_origin_check
  check (channel_origin in ('web','telegram','order'));

create unique index if not exists uniq_conversations_ticket_code
  on public.conversations(ticket_code)
  where ticket_code is not null;
create unique index if not exists uniq_conversations_visitor_token
  on public.conversations(visitor_token)
  where visitor_token is not null;
create unique index if not exists uniq_conversations_telegram_chat
  on public.conversations(telegram_chat_id)
  where telegram_chat_id is not null;
create unique index if not exists uniq_messages_client_message_id
  on public.messages(client_message_id)
  where client_message_id is not null;

create unique index if not exists uniq_messages_telegram_chat_message_id
  on public.messages(telegram_chat_id, telegram_message_id)
  where telegram_chat_id is not null and telegram_message_id is not null;

create table if not exists public.telegram_processed_callbacks (
  callback_id text primary key,
  status text not null default 'processing' check (status in ('processing','succeeded','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_notifications (
  order_id uuid primary key references public.orders(id) on delete cascade,
  status text not null check (status in ('pending','sending','sent','failed')) default 'pending',
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.telegram_processed_callbacks enable row level security;
alter table public.order_notifications enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;

create or replace function public.create_order_with_conversation(
  p_customer_id uuid,
  p_product_id uuid,
  p_installment_plan_id uuid,
  p_status text,
  p_notes text,
  p_total_amount numeric,
  p_first_payment numeric,
  p_monthly_amount numeric,
  p_months integer,
  p_visitor_token text,
  p_visitor_name text
)
returns table(order_id uuid, conversation_id uuid, ticket_code text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conversation public.conversations%rowtype;
  v_order public.orders%rowtype;
begin
  if nullif(trim(p_visitor_token), '') is not null then
    select * into v_conversation
    from public.conversations
    where visitor_token = trim(p_visitor_token)
    limit 1
    for update;
  end if;

  if v_conversation.id is null then
    insert into public.conversations (
      customer_id, status, ticket_code, visitor_name, visitor_token,
      channel_origin, last_message_at
    ) values (
      p_customer_id, 'open', 'WEB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
      nullif(trim(p_visitor_name), ''), nullif(trim(p_visitor_token), ''), 'web', now()
    )
    returning * into v_conversation;
  else
    update public.conversations
    set customer_id = coalesce(customer_id, p_customer_id),
        visitor_name = coalesce(nullif(trim(p_visitor_name), ''), visitor_name),
        last_message_at = now(),
        status = case when status = 'closed' then 'open' else status end
    where id = v_conversation.id
    returning * into v_conversation;
  end if;

  insert into public.orders (
    customer_id, product_id, installment_plan_id, status, notes,
    total_amount, first_payment, monthly_amount, months, conversation_id
  ) values (
    p_customer_id, p_product_id, p_installment_plan_id, p_status, p_notes,
    p_total_amount, p_first_payment, p_monthly_amount, p_months, v_conversation.id
  )
  returning * into v_order;

  update public.conversations
  set order_id = v_order.id,
      channel_origin = 'order',
      last_message_at = now()
  where id = v_conversation.id;

  insert into public.messages (conversation_id, sender_type, message_text, is_read)
  values (v_conversation.id, 'bot', 'تم إنشاء الطلب ' || v_order.id::text, true);

  insert into public.order_notifications(order_id, status)
  values (v_order.id, 'pending')
  on conflict (order_id) do nothing;

  return query select v_order.id, v_conversation.id, v_conversation.ticket_code;
end;
$$;

revoke all on function public.create_order_with_conversation(uuid,uuid,uuid,text,text,numeric,numeric,numeric,integer,text,text) from public, anon, authenticated;
grant execute on function public.create_order_with_conversation(uuid,uuid,uuid,text,text,numeric,numeric,numeric,integer,text,text) to service_role;

create or replace function public.claim_order_notification(p_order_id uuid)
returns boolean
language sql
security invoker
set search_path = public
as $$
  update public.order_notifications
  set status = 'sending', attempts = attempts + 1, updated_at = now()
  where order_id = p_order_id
    and (
      status in ('pending','failed')
      or (status = 'sending' and updated_at < now() - interval '5 minutes')
    )
  returning true;
$$;

revoke all on function public.claim_order_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_order_notification(uuid) to service_role;

DO $$
declare
  r record;
  v_conversation_id uuid;
begin
  for r in select o.id, o.customer_id from public.orders o where o.conversation_id is null loop
    select c.id into v_conversation_id
    from public.conversations c
    where c.customer_id = r.customer_id
      and c.order_id is null
    order by c.last_message_at desc
    limit 1;

    if v_conversation_id is null then
      insert into public.conversations (
        customer_id, status, ticket_code, visitor_name, channel_origin, order_id, last_message_at
      )
      select o.customer_id,
             'open',
             'ORDER-' || upper(substr(replace(o.id::text, '-', ''), 1, 8)),
             c.name,
             'order',
             o.id,
             o.updated_at
      from public.orders o
      left join public.customers c on c.id = o.customer_id
      where o.id = r.id
      returning id into v_conversation_id;
    else
      update public.conversations
      set order_id = r.id,
          channel_origin = 'order',
          last_message_at = greatest(last_message_at, now())
      where id = v_conversation_id;
    end if;

    update public.orders set conversation_id = v_conversation_id where id = r.id;
  end loop;
end $$;

commit;
