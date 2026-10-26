create table if not exists public.kiosk_settings (
 id boolean primary key default true check (id = true),
 event_name text not null default 'Lollywafel Edition',
 mode text not null default 'paid' check (mode in ('paid','included')),
 base_price_cents integer not null default 500 check (base_price_cents >= 0),
 extra_topping_price_cents integer not null default 50 check (extra_topping_price_cents >= 0),
 updated_at timestamptz not null default now()
);
insert into public.kiosk_settings(id) values(true) on conflict(id) do nothing;
create table if not exists public.kiosk_options (
 id text primary key,
 name text not null,
 kind text not null check (kind in ('chocolate','sauce','topping')),
 active boolean not null default true,
 sort_order integer not null default 0
);
insert into public.kiosk_options(id,name,kind,sort_order) values
 ('choc-milk','Melkchocolade','chocolate',1),
 ('choc-white','Witte chocolade','chocolate',2),
 ('sauce-strawberry','Aardbeiensaus','sauce',1),
 ('sauce-caramel','Caramelsaus','sauce',2),
 ('top-brazil','Braziliaanse nootjes','topping',1),
 ('top-oreo','Oreo-kruimels','topping',2),
 ('top-speculoos','Speculooskruimels','topping',3),
 ('top-marshmallow','Marshmallows','topping',4),
 ('top-coco','Kleine coco balls','topping',5),
 ('top-sprinkles','Sprinkles','topping',6)
on conflict(id) do nothing;
create table if not exists public.kiosk_orders (
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique,
 customer_name text not null,
 items jsonb not null,
 total_cents integer not null default 0 check (total_cents >= 0),
 price_mode text not null check (price_mode in ('paid','included')),
 payment_status text not null default 'pending' check (payment_status in ('pending','paid','included','failed','expired','canceled','refund_pending','refunded')),
 status text not null default 'new' check (status in ('new','preparing','ready','completed')),
 mollie_payment_id text unique,
 refund_id text,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists kiosk_orders_created_at_idx on public.kiosk_orders(created_at desc);
create index if not exists kiosk_orders_status_idx on public.kiosk_orders(status,payment_status);
alter table public.kiosk_settings enable row level security;
alter table public.kiosk_options enable row level security;
alter table public.kiosk_orders enable row level security;
revoke all on public.kiosk_settings,public.kiosk_options,public.kiosk_orders from anon,authenticated;
grant select on public.kiosk_settings,public.kiosk_options to anon,authenticated;
create policy "Public can read kiosk settings" on public.kiosk_settings for select to anon,authenticated using (true);
create policy "Public can read active kiosk options" on public.kiosk_options for select to anon,authenticated using (active=true);
-- Orders are deliberately not accessible directly from browser roles. Server functions use the service role key.
