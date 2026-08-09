create extension if not exists pgcrypto;

create table if not exists brands (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(), brand_id uuid references brands(id) on delete set null,
  name text not null, slug text not null unique, model text, description text, price_usd numeric(12,2),
  price_syp numeric(18,0), stock_quantity integer not null default 0, stock_status text not null default 'in_stock' check (stock_status in ('in_stock','out_of_stock','coming_soon')),
  is_active boolean not null default true, is_featured boolean not null default false, installment_enabled boolean not null default false,
  specs jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
  url text not null, position integer not null default 0, alt_text text, is_primary boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists installment_plans (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
  months integer not null check (months > 0), first_payment_type text not null check (first_payment_type in ('fixed','percentage')),
  first_payment_value numeric(18,2) not null check (first_payment_value >= 0), total_price numeric(18,2), monthly_amount numeric(18,2),
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(), name text not null, phone text not null, address text,
  telegram_user_id bigint unique, telegram_chat_id bigint, telegram_username text, created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id) on delete set null,
  product_id uuid references products(id) on delete set null, installment_plan_id uuid references installment_plans(id) on delete set null,
  status text not null default 'new' check (status in ('new','reviewing','contacted','confirmed','cancelled')),
  notes text, total_amount numeric(18,2), first_payment numeric(18,2), monthly_amount numeric(18,2), months integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id) on delete cascade,
  telegram_chat_id bigint not null, status text not null default 'open' check (status in ('open','processing','closed')),
  last_message_at timestamptz not null default now(), assigned_to uuid, created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('user','admin','bot')), message_text text not null,
  telegram_message_id bigint, is_read boolean not null default false, created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
  customer_name text not null, rating integer not null check (rating between 1 and 5), comment text, is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(), key text not null unique, value jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(), admin_id uuid, action text not null, entity text not null, entity_id uuid, metadata jsonb,
  created_at timestamptz not null default now()
);

insert into settings (key, value) values ('exchange_rate', '{"usd_to_syp": 0}'::jsonb) on conflict (key) do nothing;
insert into settings (key, value) values ('store', '{"name":"Louay Phone","currency":"SYP","secondary_currency":"USD"}'::jsonb) on conflict (key) do nothing;

create index if not exists products_brand_idx on products(brand_id);
create index if not exists products_active_idx on products(is_active);
create index if not exists orders_status_idx on orders(status);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

-- Product image storage is provisioned separately in Supabase, but these policies
-- document the intended security model for a reproducible deployment.
-- Bucket: product-images, public read, authenticated active admins write/delete.
