begin;

alter table public.reviews
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists reviews_order_id_idx on public.reviews(order_id);
create index if not exists reviews_customer_id_idx on public.reviews(customer_id);
create index if not exists reviews_product_approved_created_idx
  on public.reviews(product_id, is_approved, created_at desc);

alter table public.reviews
  drop constraint if exists reviews_rating_check;
alter table public.reviews
  add constraint reviews_rating_check check (rating between 1 and 5);

create unique index if not exists reviews_one_per_order_product
  on public.reviews(order_id, product_id)
  where order_id is not null;

alter table public.reviews enable row level security;

commit;
