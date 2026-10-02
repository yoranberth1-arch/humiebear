alter table public.orders
  add column if not exists paid_at timestamptz,
  add column if not exists mollie_status text,
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_status text not null default 'pending',
  add column if not exists email_error text;

alter table public.order_items
  alter column product_id drop not null;

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_customer_email_idx on public.orders(customer_email);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_status_idx on public.orders(status);