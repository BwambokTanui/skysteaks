-- Manual crypto deposits (EliteTradeBot-style) with admin confirmation.

create table if not exists public.deposit_methods (
  id uuid primary key default gen_random_uuid(),
  asset text not null,
  network text not null,
  address text not null,
  icon_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  method_id uuid references public.deposit_methods (id) on delete set null,
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  requested_crypto numeric(20,8) not null check (requested_crypto > 0),
  asset text not null,
  network text not null,
  address text not null,
  status text not null default 'processing'
    check (status in ('processing', 'awaiting_confirmation', 'approved', 'rejected', 'cancelled')),
  price_usd numeric(18,8),
  note text,
  address_copied_at timestamptz,
  user_confirmed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deposit_requests_user_idx on public.deposit_requests (user_id, created_at desc);
create index if not exists deposit_requests_status_idx on public.deposit_requests (status, created_at desc);

alter table public.deposit_methods enable row level security;
alter table public.deposit_requests enable row level security;

drop policy if exists "read active deposit methods" on public.deposit_methods;
create policy "read active deposit methods" on public.deposit_methods
  for select to authenticated
  using (is_active = true);

drop policy if exists "read own deposit requests" on public.deposit_requests;
create policy "read own deposit requests" on public.deposit_requests
  for select to authenticated
  using (auth.uid() = user_id);

grant select on public.deposit_methods to authenticated;
grant select on public.deposit_requests to authenticated;
grant all on public.deposit_methods, public.deposit_requests to service_role;

-- Seed default crypto rails (same wallets as EliteTradeBot) if empty.
insert into public.deposit_methods (asset, network, address, icon_url, sort_order)
select * from (values
  ('BTC', 'Bitcoin', 'bc1qud3vfpph36nn8ps3nlr7qfxtxgmt3wpkmjgx3c', 'https://assets.coincap.io/assets/icons/btc@2x.png', 1),
  ('ETH', 'ERC-20', '0x62fC5BD8D38e195D404f1c4c059E30ab829B2265', 'https://assets.coincap.io/assets/icons/eth@2x.png', 2),
  ('USDT', 'TRC-20', 'TKxChJihKmWaBWHsq7SHLX4xPHfWyWFUrx', 'https://assets.coincap.io/assets/icons/usdt@2x.png', 3),
  ('USDT', 'ERC-20', '0x62fC5BD8D38e195D404f1c4c059E30ab829B2265', 'https://assets.coincap.io/assets/icons/usdt@2x.png', 4),
  ('USDT', 'BEP-20', '0x62fC5BD8D38e195D404f1c4c059E30ab829B2265', 'https://assets.coincap.io/assets/icons/usdt@2x.png', 5),
  ('BNB', 'BEP-20', '0x62fC5BD8D38e195D404f1c4c059E30ab829B2265', 'https://assets.coincap.io/assets/icons/bnb@2x.png', 6)
) as v(asset, network, address, icon_url, sort_order)
where not exists (select 1 from public.deposit_methods limit 1);

create or replace function public.create_deposit_request(
  p_method_id uuid,
  p_amount_usd numeric,
  p_requested_crypto numeric,
  p_price_usd numeric default null
)
returns public.deposit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_method public.deposit_methods%rowtype;
  v_amount numeric(14,2);
  v_crypto numeric(20,8);
  v_row public.deposit_requests%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  v_amount := round(coalesce(p_amount_usd, 0)::numeric, 2);
  v_crypto := round(coalesce(p_requested_crypto, 0)::numeric, 8);
  if v_amount < 10 then
    raise exception 'minimum deposit is 10';
  end if;
  if v_amount > 50000 then
    raise exception 'maximum deposit is 50000';
  end if;
  if v_crypto <= 0 then
    raise exception 'invalid crypto amount';
  end if;

  if exists (
    select 1 from public.deposit_requests
    where user_id = v_user and status in ('processing', 'awaiting_confirmation')
  ) then
    raise exception 'you already have an open deposit';
  end if;

  select * into v_method from public.deposit_methods where id = p_method_id and is_active = true;
  if v_method.id is null then
    raise exception 'deposit method unavailable';
  end if;

  insert into public.deposit_requests (
    user_id, method_id, amount_usd, requested_crypto, asset, network, address, status, price_usd, note
  ) values (
    v_user, v_method.id, v_amount, v_crypto, v_method.asset, v_method.network, v_method.address,
    'processing', p_price_usd, 'Crypto deposit'
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.confirm_deposit_sent(p_id uuid)
returns public.deposit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.deposit_requests%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row from public.deposit_requests where id = p_id and user_id = v_user for update;
  if v_row.id is null then
    raise exception 'deposit not found';
  end if;
  if v_row.status <> 'processing' then
    raise exception 'deposit cannot be confirmed';
  end if;

  update public.deposit_requests
    set status = 'awaiting_confirmation',
        user_confirmed_at = clock_timestamp()
    where id = p_id
    returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.mark_deposit_address_copied(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  update public.deposit_requests
    set address_copied_at = coalesce(address_copied_at, clock_timestamp())
    where id = p_id and user_id = v_user and status in ('processing', 'awaiting_confirmation');
end;
$$;

create or replace function public.admin_approve_deposit(p_id uuid, p_admin uuid)
returns public.deposit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.deposit_requests%rowtype;
  v_balance numeric(14,2);
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin;
  if coalesce(v_is_admin, false) is not true then
    raise exception 'admin required';
  end if;

  select * into v_row from public.deposit_requests where id = p_id for update;
  if v_row.id is null then
    raise exception 'deposit not found';
  end if;
  if v_row.status <> 'awaiting_confirmation' then
    raise exception 'only awaiting deposits can be approved';
  end if;

  update public.profiles
    set balance = balance + v_row.amount_usd
    where id = v_row.user_id
    returning balance into v_balance;

  insert into public.wallet_ledger (user_id, kind, amount, balance_after, note)
  values (v_row.user_id, 'deposit', v_row.amount_usd, v_balance, 'Approved crypto deposit');

  update public.deposit_requests
    set status = 'approved',
        reviewed_by = p_admin,
        reviewed_at = clock_timestamp()
    where id = p_id
    returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_reject_deposit(p_id uuid, p_admin uuid)
returns public.deposit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.deposit_requests%rowtype;
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin;
  if coalesce(v_is_admin, false) is not true then
    raise exception 'admin required';
  end if;

  select * into v_row from public.deposit_requests where id = p_id for update;
  if v_row.id is null then
    raise exception 'deposit not found';
  end if;
  if v_row.status not in ('processing', 'awaiting_confirmation') then
    raise exception 'deposit cannot be rejected';
  end if;

  update public.deposit_requests
    set status = 'rejected',
        reviewed_by = p_admin,
        reviewed_at = clock_timestamp()
    where id = p_id
    returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_deposit_request(uuid, numeric, numeric, numeric) from public, anon;
revoke all on function public.confirm_deposit_sent(uuid) from public, anon;
revoke all on function public.mark_deposit_address_copied(uuid) from public, anon;
revoke all on function public.admin_approve_deposit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_reject_deposit(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_deposit_request(uuid, numeric, numeric, numeric) to authenticated;
grant execute on function public.confirm_deposit_sent(uuid) to authenticated;
grant execute on function public.mark_deposit_address_copied(uuid) to authenticated;
grant execute on function public.admin_approve_deposit(uuid, uuid) to service_role;
grant execute on function public.admin_reject_deposit(uuid, uuid) to service_role;
