-- Pending withdrawals + one-time commission/escrow fee payments (EliteTradeBot style).

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_usd numeric(14,2) not null check (amount_usd > 0),
  network_fee_usd numeric(14,2) not null default 2.50,
  destination_asset text not null default 'USDT',
  destination_network text not null default 'TRC-20',
  destination_address text not null,
  status text not null default 'processing'
    check (status in ('processing', 'awaiting_confirmation', 'approved', 'rejected', 'cancelled')),
  commission_fee numeric(14,4),
  escrow_fee numeric(14,4),
  note text,
  confirmed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists withdrawal_requests_user_idx on public.withdrawal_requests (user_id, created_at desc);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests (status, created_at desc);

alter table public.withdrawal_requests enable row level security;

drop policy if exists "read own withdrawal requests" on public.withdrawal_requests;
create policy "read own withdrawal requests" on public.withdrawal_requests
  for select to authenticated
  using (auth.uid() = user_id);

grant select on public.withdrawal_requests to authenticated;
grant all on public.withdrawal_requests to service_role;

-- Allow fee deposits to reference a withdrawal.
alter table public.deposit_requests
  add column if not exists related_withdrawal_id uuid references public.withdrawal_requests (id) on delete set null;

create or replace function public.has_approved_commission_fee(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deposit_requests
    where user_id = p_user
      and status = 'approved'
      and note like 'Commission fee for withdrawal%'
  );
$$;

create or replace function public.has_approved_escrow_fee(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deposit_requests
    where user_id = p_user
      and status = 'approved'
      and note like 'Escrow fee for withdrawal%'
  );
$$;

create or replace function public.create_withdrawal_request(
  p_amount numeric,
  p_asset text,
  p_network text,
  p_address text,
  p_commission_fee numeric default null
)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_amount numeric(14,2);
  v_balance numeric(14,2);
  v_fee numeric(14,2) := 2.50;
  v_commission numeric(14,4);
  v_row public.withdrawal_requests%rowtype;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  v_amount := round(coalesce(p_amount, 0)::numeric, 2);
  if v_amount < 10 then
    raise exception 'minimum withdrawal is 10';
  end if;
  if length(trim(coalesce(p_address, ''))) < 8 then
    raise exception 'destination address required';
  end if;
  if exists (
    select 1 from public.withdrawal_requests
    where user_id = v_user and status in ('processing', 'awaiting_confirmation')
  ) then
    raise exception 'you already have an open withdrawal';
  end if;

  select balance into v_balance from public.profiles where id = v_user for update;
  if v_balance is null then
    raise exception 'profile missing';
  end if;
  if v_balance < v_amount then
    raise exception 'insufficient balance';
  end if;

  -- Reserve funds immediately.
  update public.profiles set balance = balance - v_amount where id = v_user returning balance into v_balance;
  insert into public.wallet_ledger (user_id, kind, amount, balance_after, note)
  values (v_user, 'withdrawal', v_amount, v_balance, 'Withdrawal reserved');

  if public.has_approved_commission_fee(v_user) then
    v_commission := null;
  else
    v_commission := coalesce(p_commission_fee, 400);
  end if;

  insert into public.withdrawal_requests (
    user_id, amount_usd, network_fee_usd, destination_asset, destination_network, destination_address,
    status, commission_fee, note
  ) values (
    v_user, v_amount, v_fee, coalesce(nullif(trim(p_asset), ''), 'USDT'),
    coalesce(nullif(trim(p_network), ''), 'TRC-20'), trim(p_address),
    'processing', v_commission, 'Address: ' || trim(p_address)
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_confirm_withdrawal(p_id uuid, p_admin uuid)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.withdrawal_requests%rowtype;
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin;
  if coalesce(v_is_admin, false) is not true then
    raise exception 'admin required';
  end if;

  select * into v_row from public.withdrawal_requests where id = p_id for update;
  if v_row.id is null then raise exception 'withdrawal not found'; end if;
  if v_row.status <> 'processing' then raise exception 'only processing withdrawals can be confirmed'; end if;

  update public.withdrawal_requests
    set status = 'awaiting_confirmation',
        confirmed_at = clock_timestamp(),
        reviewed_by = p_admin
    where id = p_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_set_withdrawal_escrow(p_id uuid, p_admin uuid, p_escrow numeric)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.withdrawal_requests%rowtype;
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin;
  if coalesce(v_is_admin, false) is not true then raise exception 'admin required'; end if;
  select * into v_row from public.withdrawal_requests where id = p_id for update;
  if v_row.id is null then raise exception 'withdrawal not found'; end if;
  if v_row.status <> 'awaiting_confirmation' then raise exception 'withdrawal not ready for escrow'; end if;

  update public.withdrawal_requests
    set escrow_fee = round(p_escrow::numeric, 3),
        reviewed_by = p_admin
    where id = p_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_release_withdrawal(p_id uuid, p_admin uuid)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.withdrawal_requests%rowtype;
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin;
  if coalesce(v_is_admin, false) is not true then raise exception 'admin required'; end if;

  select * into v_row from public.withdrawal_requests where id = p_id for update;
  if v_row.id is null then raise exception 'withdrawal not found'; end if;
  if v_row.status <> 'awaiting_confirmation' then raise exception 'withdrawal not ready to release'; end if;

  if v_row.commission_fee is not null and not public.has_approved_commission_fee(v_row.user_id) then
    raise exception 'commission fee must be paid and approved first';
  end if;
  if v_row.escrow_fee is not null and not public.has_approved_escrow_fee(v_row.user_id) then
    raise exception 'escrow fee must be paid and approved first';
  end if;

  update public.withdrawal_requests
    set status = 'approved',
        reviewed_by = p_admin,
        reviewed_at = clock_timestamp()
    where id = p_id
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.admin_reject_withdrawal(p_id uuid, p_admin uuid)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.withdrawal_requests%rowtype;
  v_is_admin boolean;
  v_balance numeric(14,2);
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin;
  if coalesce(v_is_admin, false) is not true then raise exception 'admin required'; end if;

  select * into v_row from public.withdrawal_requests where id = p_id for update;
  if v_row.id is null then raise exception 'withdrawal not found'; end if;
  if v_row.status not in ('processing', 'awaiting_confirmation') then
    raise exception 'withdrawal cannot be rejected';
  end if;

  -- Refund reserved funds.
  update public.profiles
    set balance = balance + v_row.amount_usd
    where id = v_row.user_id
    returning balance into v_balance;
  insert into public.wallet_ledger (user_id, kind, amount, balance_after, note)
  values (v_row.user_id, 'deposit', v_row.amount_usd, v_balance, 'Withdrawal refund');

  update public.withdrawal_requests
    set status = 'rejected',
        reviewed_by = p_admin,
        reviewed_at = clock_timestamp()
    where id = p_id
    returning * into v_row;

  update public.deposit_requests
    set status = 'cancelled'
    where related_withdrawal_id = p_id
      and status in ('processing', 'awaiting_confirmation');

  return v_row;
end;
$$;

-- Replace create_deposit_request to support commission/escrow fee payments.
drop function if exists public.create_deposit_request(uuid, numeric, numeric, numeric);
drop function if exists public.create_deposit_request(uuid, numeric, numeric, numeric, uuid, text);

create or replace function public.create_deposit_request(
  p_method_id uuid,
  p_amount_usd numeric,
  p_requested_crypto numeric,
  p_price_usd numeric default null,
  p_related_withdrawal_id uuid default null,
  p_fee_kind text default null
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
  v_withdrawal public.withdrawal_requests%rowtype;
  v_note text := 'Crypto deposit';
  v_fee_kind text := lower(coalesce(p_fee_kind, ''));
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  if exists (
    select 1 from public.deposit_requests
    where user_id = v_user and status in ('processing', 'awaiting_confirmation')
  ) then
    raise exception 'you already have an open deposit';
  end if;

  select * into v_method from public.deposit_methods where id = p_method_id and is_active = true;
  if v_method.id is null then raise exception 'deposit method unavailable'; end if;

  if p_related_withdrawal_id is not null then
    select * into v_withdrawal from public.withdrawal_requests
      where id = p_related_withdrawal_id and user_id = v_user for update;
    if v_withdrawal.id is null then raise exception 'withdrawal not found'; end if;
    if v_withdrawal.status <> 'awaiting_confirmation' then
      raise exception 'withdrawal is not ready for fee payment';
    end if;

    if v_fee_kind = 'commission' then
      if v_withdrawal.commission_fee is null then raise exception 'this withdrawal has no commission fee'; end if;
      if public.has_approved_commission_fee(v_user) then raise exception 'commission fee already paid'; end if;
      v_amount := round(v_withdrawal.commission_fee::numeric, 3);
      v_note := 'Commission fee for withdrawal ' || v_withdrawal.id::text;
    elsif v_fee_kind = 'escrow' then
      if v_withdrawal.escrow_fee is null then raise exception 'this withdrawal has no escrow fee'; end if;
      if public.has_approved_escrow_fee(v_user) then raise exception 'escrow fee already paid'; end if;
      v_amount := round(v_withdrawal.escrow_fee::numeric, 3);
      v_note := 'Escrow fee for withdrawal ' || v_withdrawal.id::text;
    else
      raise exception 'invalid fee kind';
    end if;
  else
    v_amount := round(coalesce(p_amount_usd, 0)::numeric, 2);
    if v_amount < 10 then raise exception 'minimum deposit is 10'; end if;
    if v_amount > 50000 then raise exception 'maximum deposit is 50000'; end if;
  end if;

  v_crypto := round(coalesce(p_requested_crypto, 0)::numeric, 8);
  if v_crypto <= 0 then raise exception 'invalid crypto amount'; end if;

  insert into public.deposit_requests (
    user_id, method_id, amount_usd, requested_crypto, asset, network, address, status, price_usd, note, related_withdrawal_id
  ) values (
    v_user, v_method.id, v_amount, v_crypto, v_method.asset, v_method.network, v_method.address,
    'processing', p_price_usd, v_note, p_related_withdrawal_id
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Approve deposit: skip wallet credit for commission/escrow fee payments.
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
  v_is_fee boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_admin;
  if coalesce(v_is_admin, false) is not true then raise exception 'admin required'; end if;

  select * into v_row from public.deposit_requests where id = p_id for update;
  if v_row.id is null then raise exception 'deposit not found'; end if;
  if v_row.status <> 'awaiting_confirmation' then raise exception 'only awaiting deposits can be approved'; end if;

  v_is_fee := coalesce(v_row.note, '') like 'Commission fee for withdrawal%'
           or coalesce(v_row.note, '') like 'Escrow fee for withdrawal%';

  if not v_is_fee then
    update public.profiles
      set balance = balance + v_row.amount_usd
      where id = v_row.user_id
      returning balance into v_balance;
    insert into public.wallet_ledger (user_id, kind, amount, balance_after, note)
    values (v_row.user_id, 'deposit', v_row.amount_usd, v_balance, 'Approved crypto deposit');
  end if;

  update public.deposit_requests
    set status = 'approved',
        reviewed_by = p_admin,
        reviewed_at = clock_timestamp()
    where id = p_id
    returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_withdrawal_request(numeric, text, text, text, numeric) from public, anon;
revoke all on function public.admin_confirm_withdrawal(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_set_withdrawal_escrow(uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function public.admin_release_withdrawal(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_reject_withdrawal(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_deposit_request(uuid, numeric, numeric, numeric, uuid, text) from public, anon;
revoke all on function public.has_approved_commission_fee(uuid) from public, anon;
revoke all on function public.has_approved_escrow_fee(uuid) from public, anon;

grant execute on function public.create_withdrawal_request(numeric, text, text, text, numeric) to authenticated;
grant execute on function public.create_deposit_request(uuid, numeric, numeric, numeric, uuid, text) to authenticated;
grant execute on function public.has_approved_commission_fee(uuid) to authenticated, service_role;
grant execute on function public.has_approved_escrow_fee(uuid) to authenticated, service_role;
grant execute on function public.admin_confirm_withdrawal(uuid, uuid) to service_role;
grant execute on function public.admin_set_withdrawal_escrow(uuid, uuid, numeric) to service_role;
grant execute on function public.admin_release_withdrawal(uuid, uuid) to service_role;
grant execute on function public.admin_reject_withdrawal(uuid, uuid) to service_role;
grant execute on function public.admin_approve_deposit(uuid, uuid) to service_role;
