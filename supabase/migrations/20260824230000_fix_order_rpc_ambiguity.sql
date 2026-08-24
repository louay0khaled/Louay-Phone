begin;

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
returns table(created_order_id uuid, created_conversation_id uuid, created_ticket_code text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conversation public.conversations%rowtype;
  v_order public.orders%rowtype;
begin
  if nullif(trim(p_visitor_token), '') is not null then
    select c.* into v_conversation
    from public.conversations as c
    where c.visitor_token = trim(p_visitor_token)
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
    update public.conversations as c
    set customer_id = coalesce(c.customer_id, p_customer_id),
        visitor_name = coalesce(nullif(trim(p_visitor_name), ''), c.visitor_name),
        last_message_at = now(),
        status = case when c.status = 'closed' then 'open' else c.status end
    where c.id = v_conversation.id
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

  update public.conversations as c
  set order_id = v_order.id,
      channel_origin = 'order',
      last_message_at = now()
  where c.id = v_conversation.id;

  insert into public.messages (conversation_id, sender_type, message_text, is_read)
  values (v_conversation.id, 'bot', 'تم إنشاء الطلب ' || v_order.id::text, true);

  insert into public.order_notifications (order_id, status)
  values (v_order.id, 'pending')
  on conflict (order_id) do nothing;

  return query
    select v_order.id, v_conversation.id, v_conversation.ticket_code;
end;
$$;

revoke all on function public.create_order_with_conversation(uuid,uuid,uuid,text,text,numeric,numeric,numeric,integer,text,text) from public, anon, authenticated;
grant execute on function public.create_order_with_conversation(uuid,uuid,uuid,text,text,numeric,numeric,numeric,integer,text,text) to service_role;

commit;
