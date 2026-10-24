-- My Tiffin Provider: private, per-account records for Supabase Auth users.
-- Safe to run in the Supabase SQL Editor for a new project.

create table if not exists public.provider_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prices jsonb not null default '{"miniLunch":70,"miniDinner":70,"fullLunch":100,"fullDinner":100}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint provider_settings_prices_object check (jsonb_typeof(prices) = 'object')
);

create table if not exists public.provider_customers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text not null default '',
  address text not null default '',
  notes text not null default '',
  active boolean not null default true,
  lunch_plan text not null default 'Mini Meal' check (lunch_plan in ('Mini Meal','Full Meal','No Order')),
  dinner_plan text not null default 'Mini Meal' check (dinner_plan in ('Mini Meal','Full Meal','No Order')),
  created_at timestamptz not null default now()
);

create table if not exists public.provider_orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id text not null references public.provider_customers(id) on delete cascade,
  order_date date not null,
  slot text not null check (slot in ('Lunch','Dinner')),
  meal text not null check (meal in ('Mini Meal','Full Meal','No Order')),
  quantity integer not null default 1 check (quantity between 1 and 50),
  unit_price numeric(10,2) not null default 0 check (unit_price >= 0),
  status text not null default 'Pending' check (status in ('Pending','Preparing','Dispatched','Delivered')),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (customer_id, order_date, slot),
  constraint no_order_has_zero_price check (meal <> 'No Order' or unit_price = 0)
);

create table if not exists public.provider_payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id text not null references public.provider_customers(id) on delete cascade,
  payment_date date not null,
  billing_month text not null check (billing_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('Cash','UPI','Bank Transfer','Other')),
  reference text not null default '',
  notes text not null default ''
);

create index if not exists provider_customers_user_id_idx on public.provider_customers(user_id);
create index if not exists provider_orders_user_date_idx on public.provider_orders(user_id, order_date);
create index if not exists provider_orders_customer_month_idx on public.provider_orders(customer_id, order_date);
create index if not exists provider_payments_user_month_idx on public.provider_payments(user_id, billing_month);
create index if not exists provider_payments_customer_month_idx on public.provider_payments(customer_id, billing_month);

alter table public.provider_settings enable row level security;
alter table public.provider_customers enable row level security;
alter table public.provider_orders enable row level security;
alter table public.provider_payments enable row level security;

-- Explicit grants: signed-out visitors cannot access provider data.
revoke all on table public.provider_settings from anon, authenticated;
revoke all on table public.provider_customers from anon, authenticated;
revoke all on table public.provider_orders from anon, authenticated;
revoke all on table public.provider_payments from anon, authenticated;
grant select, insert, update, delete on table public.provider_settings to authenticated;
grant select, insert, update, delete on table public.provider_customers to authenticated;
grant select, insert, update, delete on table public.provider_orders to authenticated;
grant select, insert, update, delete on table public.provider_payments to authenticated;

-- Settings: a user can read/change only their own settings row.
drop policy if exists provider_settings_select_own on public.provider_settings;
drop policy if exists provider_settings_insert_own on public.provider_settings;
drop policy if exists provider_settings_update_own on public.provider_settings;
drop policy if exists provider_settings_delete_own on public.provider_settings;
create policy provider_settings_select_own on public.provider_settings for select to authenticated using (user_id = (select auth.uid()));
create policy provider_settings_insert_own on public.provider_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy provider_settings_update_own on public.provider_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy provider_settings_delete_own on public.provider_settings for delete to authenticated using (user_id = (select auth.uid()));

-- Customers: only the owner account may CRUD its own customer rows.
drop policy if exists provider_customers_select_own on public.provider_customers;
drop policy if exists provider_customers_insert_own on public.provider_customers;
drop policy if exists provider_customers_update_own on public.provider_customers;
drop policy if exists provider_customers_delete_own on public.provider_customers;
create policy provider_customers_select_own on public.provider_customers for select to authenticated using (user_id = (select auth.uid()));
create policy provider_customers_insert_own on public.provider_customers for insert to authenticated with check (user_id = (select auth.uid()));
create policy provider_customers_update_own on public.provider_customers for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy provider_customers_delete_own on public.provider_customers for delete to authenticated using (user_id = (select auth.uid()));

-- Orders: the row owner and referenced customer must belong to the same signed-in user.
drop policy if exists provider_orders_select_own on public.provider_orders;
drop policy if exists provider_orders_insert_own on public.provider_orders;
drop policy if exists provider_orders_update_own on public.provider_orders;
drop policy if exists provider_orders_delete_own on public.provider_orders;
create policy provider_orders_select_own on public.provider_orders for select to authenticated using (user_id = (select auth.uid()));
create policy provider_orders_insert_own on public.provider_orders for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.provider_customers c where c.id = customer_id and c.user_id = (select auth.uid())
  )
);
create policy provider_orders_update_own on public.provider_orders for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.provider_customers c where c.id = customer_id and c.user_id = (select auth.uid())
  )
);
create policy provider_orders_delete_own on public.provider_orders for delete to authenticated using (user_id = (select auth.uid()));

-- Payments: payment rows must belong to the signed-in user and one of their customers.
drop policy if exists provider_payments_select_own on public.provider_payments;
drop policy if exists provider_payments_insert_own on public.provider_payments;
drop policy if exists provider_payments_update_own on public.provider_payments;
drop policy if exists provider_payments_delete_own on public.provider_payments;
create policy provider_payments_select_own on public.provider_payments for select to authenticated using (user_id = (select auth.uid()));
create policy provider_payments_insert_own on public.provider_payments for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.provider_customers c where c.id = customer_id and c.user_id = (select auth.uid())
  )
);
create policy provider_payments_update_own on public.provider_payments for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.provider_customers c where c.id = customer_id and c.user_id = (select auth.uid())
  )
);
create policy provider_payments_delete_own on public.provider_payments for delete to authenticated using (user_id = (select auth.uid()));
