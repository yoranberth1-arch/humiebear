create table if not exists public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_street text not null,
  delivery_number text not null,
  delivery_postal_code text not null,
  delivery_city text not null,
  delivery_country text not null default 'BE',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  discount_code text,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_id text unique,
  payment_status text not null default 'open',
  fulfillment_status text not null default 'new',
  paid_at timestamptz,
  confirmation_email_sent_at timestamptz,
  confirmation_email_status text not null default 'pending',
  email_error text
);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_customer_email_idx on public.orders(customer_email);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_fulfillment_status_idx on public.orders(fulfillment_status);
alter table public.orders enable row level security;
drop policy if exists "orders public select" on public.orders;
drop policy if exists "orders public update" on public.orders;