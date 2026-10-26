alter table public.kiosk_orders
  add column if not exists payment_method text not null default 'mollie';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'kiosk_orders_payment_method_check'
      and conrelid = 'public.kiosk_orders'::regclass
  ) then
    alter table public.kiosk_orders
      add constraint kiosk_orders_payment_method_check
      check (payment_method in ('mollie','cash','included'));
  end if;
end $$;

create index if not exists kiosk_orders_payment_method_status_idx
  on public.kiosk_orders(payment_method, payment_status);
