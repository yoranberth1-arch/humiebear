-- Hummie Bear webshop orders
-- Run this once in Supabase SQL Editor.

create table if not exists public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  customer_name text not null,
  customer_email text not null,
  customer_phone text,

  delivery_street text not null,
  delivery_number text not null,
  delivery_postal_code text not null,
  delivery_city text not null,
  delivery_country text not null default 'BE',

  items jsonb not null default '[]'::jsonb,

  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null,
  total numeric(10,2) not null,

  payment_id text unique,
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'new',
  paid_at timestamptz
);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

create index if not exists orders_fulfillment_status_idx
  on public.orders (fulfillment_status);

alter table public.orders enable row level security;

-- The current Hummie Bear dashboard uses its public Supabase client.
-- These policies follow that existing dashboard architecture so the new
-- Bestellingen tab can read and update orders from the current admin page.
drop policy if exists "orders public select" on public.orders;
create policy "orders public select"
  on public.orders
  for select
  to anon, authenticated
  using (true);

drop policy if exists "orders public update" on public.orders;
create policy "orders public update"
  on public.orders
  for update
  to anon, authenticated
  using (true)
  with check (true);
