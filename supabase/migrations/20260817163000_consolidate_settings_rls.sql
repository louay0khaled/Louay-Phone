drop policy if exists "admins read settings" on public.settings;
drop policy if exists "public read store settings" on public.settings;
create policy "anon read store settings" on public.settings
for select to anon
using (key = any (array['exchange_rate','store']::text[]));
