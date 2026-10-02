-- Hummie Bear Admin Dashboard v1
-- Run this once in Supabase SQL Editor.
-- The existing quotes/events/orders tables are reused.

create extension if not exists pgcrypto;

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'staff' check (role in ('owner','manager','staff','finance','warehouse')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  unit text not null default 'stuks',
  stock_quantity numeric not null default 0,
  min_stock numeric not null default 0,
  cost_per_unit numeric(12,2) not null default 0,
  sale_price numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text,
  description text,
  amount numeric(12,2) not null default 0,
  event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  due_date date,
  assigned_to uuid references public.staff_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_auth_user_id on public.staff_members(auth_user_id);
create index if not exists idx_inventory_name on public.inventory(name);
create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_audit_created_at on public.audit_log(created_at);

alter table public.staff_members enable row level security;
alter table public.inventory enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.audit_log enable row level security;

-- The Hummie Bear dashboard uses the Vercel server-side API with the
-- Supabase service-role key. Do not grant public access to these tables.
-- Service-role calls bypass RLS.

create or replace view public.dashboard_customer_summary as
with order_customers as (
  select
    lower(coalesce(customer_email, customer_phone, customer_name, '')) as customer_key,
    max(customer_name) as customer_name,
    max(customer_email) as customer_email,
    max(customer_phone) as customer_phone,
    count(*) as webshop_orders,
    coalesce(sum(total),0) as webshop_revenue,
    max(created_at) as last_order_at
  from public.orders
  group by 1
),
quote_customers as (
  select
    lower(coalesce(email, phone, name, '')) as customer_key,
    max(name) as customer_name,
    max(email) as customer_email,
    max(phone) as customer_phone,
    count(*) as quote_count,
    max(created_at) as last_quote_at
  from public.quotes
  group by 1
)
select
  coalesce(o.customer_key,q.customer_key) as customer_key,
  coalesce(o.customer_name,q.customer_name) as customer_name,
  coalesce(o.customer_email,q.customer_email) as customer_email,
  coalesce(o.customer_phone,q.customer_phone) as customer_phone,
  coalesce(o.webshop_orders,0) as webshop_orders,
  coalesce(o.webshop_revenue,0) as webshop_revenue,
  coalesce(q.quote_count,0) as quote_count,
  greatest(o.last_order_at,q.last_quote_at) as last_activity_at
from order_customers o
full outer join quote_customers q using(customer_key);

-- Optional starter settings:
insert into public.inventory (name, sku, unit, stock_quantity, min_stock, cost_per_unit)
select 'Voorbeeld voorraadregel', 'DEMO-001', 'stuks', 0, 0, 0
where not exists (select 1 from public.inventory);

-- IMPORTANT:
-- Set these Vercel Environment Variables:
-- ADMIN_MASTER_PIN
-- ADMIN_SESSION_SECRET
-- SUPABASE_URL
-- SUPABASE_ANON_KEY
-- SUPABASE_SERVICE_ROLE_KEY
-- The service-role key must NEVER be placed in HTML/JS.
