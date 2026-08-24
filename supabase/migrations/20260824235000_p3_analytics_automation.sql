create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (char_length(event_name) between 1 and 80),
  path text not null check (char_length(path) <= 500),
  referrer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_name_created_at_idx on public.analytics_events(event_name, created_at desc);

alter table public.analytics_events enable row level security;

create table if not exists public.analytics_daily (
  day date primary key,
  page_views bigint not null default 0,
  product_views bigint not null default 0,
  order_starts bigint not null default 0,
  chat_starts bigint not null default 0,
  review_submits bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.analytics_daily enable row level security;

revoke all on public.analytics_events from anon, authenticated;
revoke all on public.analytics_daily from anon, authenticated;

grant select on public.analytics_daily to authenticated;

create or replace function public.refresh_analytics_daily(p_day date default current_date)
returns public.analytics_daily
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.analytics_daily;
begin
  insert into public.analytics_daily(day, page_views, product_views, order_starts, chat_starts, review_submits)
  values (
    p_day,
    (select count(*) from public.analytics_events where event_name = 'page_view' and created_at >= p_day and created_at < p_day + 1),
    (select count(*) from public.analytics_events where event_name = 'product_view' and created_at >= p_day and created_at < p_day + 1),
    (select count(*) from public.analytics_events where event_name = 'order_start' and created_at >= p_day and created_at < p_day + 1),
    (select count(*) from public.analytics_events where event_name = 'chat_start' and created_at >= p_day and created_at < p_day + 1),
    (select count(*) from public.analytics_events where event_name = 'review_submit' and created_at >= p_day and created_at < p_day + 1)
  )
  on conflict (day) do update set
    page_views = excluded.page_views,
    product_views = excluded.product_views,
    order_starts = excluded.order_starts,
    chat_starts = excluded.chat_starts,
    review_submits = excluded.review_submits,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.refresh_analytics_daily(date) to service_role;

create or replace function public.prune_analytics_events(p_before timestamptz default now() - interval '90 days')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.analytics_events where created_at < p_before;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.prune_analytics_events(timestamptz) to service_role;
