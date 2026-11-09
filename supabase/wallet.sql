-- Wallet ledger for deposits / withdrawals (USD play credits).

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'withdrawal')),
  amount numeric(14,2) not null check (amount > 0),
  balance_after numeric(14,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_ledger_user_idx on public.wallet_ledger (user_id, created_at desc);

alter table public.wallet_ledger enable row level security;

drop policy if exists "read own wallet ledger" on public.wallet_ledger;
create policy "read own wallet ledger" on public.wallet_ledger
  for select to authenticated
  using (auth.uid() = user_id);

grant select on public.wallet_ledger to authenticated;
grant all on public.wallet_ledger to service_role;

create or replace function public.deposit_play_credit(p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric(14,2);
  v_last timestamptz;
  v_amount numeric(14,2);
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  v_amount := round(coalesce(p_amount, 0)::numeric, 2);
  if v_amount < 10 then
    raise exception 'minimum deposit is 10';
  end if;
  if v_amount > 10000 then
    raise exception 'maximum deposit is 10000';
  end if;
  select balance, last_topup_at into v_balance, v_last
  from public.profiles where id = v_user for update;
  if v_balance is null then
    raise exception 'profile missing';
  end if;
  if v_last is not null and v_last > clock_timestamp() - interval '2 seconds' then
    raise exception 'wait a moment before depositing again';
  end if;
  if v_balance + v_amount > 50000 then
    raise exception 'balance cap reached';
  end if;
  update public.profiles
    set balance = balance + v_amount,
        last_topup_at = clock_timestamp()
    where id = v_user
    returning balance into v_balance;
  insert into public.wallet_ledger (user_id, kind, amount, balance_after, note)
  values (v_user, 'deposit', v_amount, v_balance, 'Play credit deposit');
  return v_balance;
end;
$$;

-- Keep legacy name working (fixed USD 1,000) for older clients.
create or replace function public.topup_play_credit()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.deposit_play_credit(1000);
end;
$$;

create or replace function public.withdraw_play_credit(p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric(14,2);
  v_amount numeric(14,2);
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  v_amount := round(coalesce(p_amount, 0)::numeric, 2);
  if v_amount < 10 then
    raise exception 'minimum withdrawal is 10';
  end if;
  select balance into v_balance from public.profiles where id = v_user for update;
  if v_balance is null then
    raise exception 'profile missing';
  end if;
  if v_balance < v_amount then
    raise exception 'insufficient balance';
  end if;
  update public.profiles
    set balance = balance - v_amount
    where id = v_user
    returning balance into v_balance;
  insert into public.wallet_ledger (user_id, kind, amount, balance_after, note)
  values (v_user, 'withdrawal', v_amount, v_balance, 'Play credit withdrawal');
  return v_balance;
end;
$$;

revoke all on function public.deposit_play_credit(numeric) from public, anon;
revoke all on function public.topup_play_credit() from public, anon;
revoke all on function public.withdraw_play_credit(numeric) from public, anon;
grant execute on function public.deposit_play_credit(numeric) to authenticated;
grant execute on function public.topup_play_credit() to authenticated;
grant execute on function public.withdraw_play_credit(numeric) to authenticated;
