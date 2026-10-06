create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  mollie_customer_id text not null,
  mollie_subscription_id text,
  mollie_payment_id text,
  plan text not null,
  plan_name text not null,
  monthly_price numeric(10,2) not null,
  frequency text,
  frequency_label text,
  mollie_interval text,
  weight_grams integer,
  delivery_price numeric(10,2),
  minimum_deliveries integer not null default 3,
  deliveries_completed integer not null default 0,
  minimum_end_at timestamptz,
  customer_first_name text not null,
  customer_last_name text,
  customer_email text not null,
  customer_phone text,
  shipping_address text not null,
  shipping_postal_code text not null,
  shipping_city text not null,
  shipping_country text not null default 'BE',
  box_style text not null,
  avoid text,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  current_payment_id text,
  last_payment_status text,
  last_payment_at timestamptz,
  next_payment_at timestamptz,
  cancellation_requested_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions
  add column if not exists frequency text,
  add column if not exists frequency_label text,
  add column if not exists mollie_interval text,
  add column if not exists weight_grams integer,
  add column if not exists delivery_price numeric(10,2),
  add column if not exists minimum_deliveries integer not null default 3,
  add column if not exists deliveries_completed integer not null default 0,
  add column if not exists minimum_end_at timestamptz,
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists canceled_at timestamptz;
alter table public.subscriptions enable row level security;
create unique index if not exists subscriptions_mollie_customer_idx on public.subscriptions(mollie_customer_id);
create unique index if not exists subscriptions_mollie_subscription_idx on public.subscriptions(mollie_subscription_id) where mollie_subscription_id is not null;
create index if not exists subscriptions_email_idx on public.subscriptions(customer_email);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
