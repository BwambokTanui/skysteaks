create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  balance numeric(14,2) not null default 1000 check (balance >= 0),
  last_topup_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  round_number bigint not null unique,
  server_seed text not null,
  server_seed_hash text not null,
  crash_point numeric(12,2) not null check (crash_point >= 1),
  fly_ms integer not null check (fly_ms >= 0),
  status text not null check (status in ('betting', 'flying', 'crashed')),
  betting_started_at timestamptz not null,
  betting_ends_at timestamptz not null,
  flying_started_at timestamptz,
  crashed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  round_id uuid not null references public.rounds (id) on delete cascade,
  round_number bigint not null,
  slot smallint not null check (slot in (0, 1)),
  amount numeric(12,2) not null check (amount >= 1 and amount <= 5000),
  auto_cashout numeric(12,2) check (auto_cashout is null or (auto_cashout >= 1.10 and auto_cashout <= 1000)),
  status text not null check (status in ('open', 'cashed', 'lost', 'cancelled')),
  cashout_multiplier numeric(12,2),
  profit numeric(14,2),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create unique index if not exists bets_active_slot_idx
  on public.bets (round_id, user_id, slot)
  where status <> 'cancelled';

create index if not exists bets_round_idx on public.bets (round_id, created_at desc);
create index if not exists bets_user_idx on public.bets (user_id, created_at desc);
create index if not exists rounds_crashed_idx on public.rounds (round_number desc) where status = 'crashed';

alter table public.profiles enable row level security;
alter table public.rounds enable row level security;
alter table public.bets enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "read own bets" on public.bets;
create policy "read own bets" on public.bets
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.profiles from anon;
revoke all on public.bets from anon;
revoke all on public.rounds from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.bets to authenticated;
grant all on public.profiles, public.bets, public.rounds to service_role;

create or replace function public.hex_to_numeric(p_hex text)
returns numeric
language plpgsql
immutable
as $$
declare
  i integer;
  digit integer;
  result numeric := 0;
begin
  for i in 1..char_length(p_hex) loop
    digit := position(substr(lower(p_hex), i, 1) in '0123456789abcdef') - 1;
    if digit < 0 then
      raise exception 'bad hex';
    end if;
    result := result * 16 + digit;
  end loop;
  return result;
end;
$$;

create or replace function public.crash_from_seed(p_seed text, p_round bigint)
returns numeric
language plpgsql
immutable
as $$
declare
  hex text;
  h numeric;
  e numeric := 4503599627370496;
  hundred numeric;
begin
  hex := encode(extensions.hmac(convert_to(p_round::text, 'UTF8'), convert_to(p_seed, 'UTF8'), 'sha256'), 'hex');
  h := public.hex_to_numeric(substr(hex, 1, 13));
  if mod(h, 33) = 0 then
    return 1.00;
  end if;
  hundred := floor((100 * e - h) / (e - h));
  if hundred > 100000000 then
    return 1000000.00;
  end if;
  if hundred < 100 then
    return 1.00;
  end if;
  return hundred / 100;
end;
$$;

create or replace function public.fly_ms(p_crash numeric)
returns integer
language sql
immutable
as $$
  select case
    when p_crash <= 1 then 0
    else ceil(ln(p_crash) / 0.00006)::integer
  end;
$$;

create or replace function public.apply_cashout(p_bet_id uuid, p_multiplier numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bets%rowtype;
  payout numeric(14,2);
begin
  select * into b from public.bets where id = p_bet_id for update;
  if not found or b.status <> 'open' then
    return;
  end if;
  payout := round(b.amount * p_multiplier, 2);
  update public.bets
    set status = 'cashed',
        cashout_multiplier = round(p_multiplier, 2),
        profit = payout - b.amount,
        settled_at = clock_timestamp()
    where id = b.id;
  update public.profiles
    set balance = balance + payout
    where id = b.user_id;
end;
$$;

create or replace function public.settle_due_autos(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rounds%rowtype;
  b public.bets%rowtype;
  due_at timestamptz;
  crash_at timestamptz;
  target_ms integer;
begin
  select * into r from public.rounds where id = p_round_id;
  if r.id is null or r.status <> 'flying' or r.flying_started_at is null then
    return;
  end if;
  crash_at := r.flying_started_at + r.fly_ms * interval '1 millisecond';
  for b in
    select * from public.bets
    where round_id = p_round_id and status = 'open' and auto_cashout is not null
    for update
  loop
    if b.auto_cashout < r.crash_point then
      target_ms := ceil(ln(b.auto_cashout) / 0.00006)::integer;
      due_at := r.flying_started_at + target_ms * interval '1 millisecond';
      if clock_timestamp() >= due_at and due_at < crash_at then
        perform public.apply_cashout(b.id, b.auto_cashout);
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.advance_round()
returns public.rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rounds%rowtype;
  i integer;
  seed text;
  crash numeric(12,2);
  fly integer;
  ts timestamptz;
  crash_at timestamptz;
begin
  perform pg_advisory_xact_lock(842174);
  select * into r from public.rounds order by round_number desc limit 1 for update;

  if not found then
    ts := clock_timestamp();
    seed := encode(extensions.gen_random_bytes(32), 'hex');
    crash := public.crash_from_seed(seed, 1);
    fly := public.fly_ms(crash);
    insert into public.rounds (
      round_number, server_seed, server_seed_hash, crash_point, fly_ms, status,
      betting_started_at, betting_ends_at
    ) values (
      1,
      seed,
      encode(extensions.digest(convert_to(seed, 'UTF8'), 'sha256'), 'hex'),
      crash,
      fly,
      'betting',
      ts,
      ts + interval '6 seconds'
    )
    returning * into r;
  end if;

  for i in 1..180 loop
    if r.status = 'betting' and clock_timestamp() >= r.betting_ends_at then
      update public.rounds
        set status = 'flying',
            flying_started_at = r.betting_ends_at
        where id = r.id
        returning * into r;
      continue;
    end if;

    if r.status = 'flying' then
      if r.flying_started_at is null then
        return r;
      end if;
      perform public.settle_due_autos(r.id);
      crash_at := r.flying_started_at + r.fly_ms * interval '1 millisecond';
      if clock_timestamp() >= crash_at then
        update public.rounds
          set status = 'crashed',
              crashed_at = crash_at
          where id = r.id
          returning * into r;
        update public.bets
          set status = 'lost',
              profit = -amount,
              settled_at = crash_at
          where round_id = r.id and status = 'open';
        continue;
      end if;
      return r;
    end if;

    if r.status = 'crashed' and r.crashed_at is not null and clock_timestamp() >= r.crashed_at + interval '3 seconds' then
      ts := clock_timestamp();
      seed := encode(extensions.gen_random_bytes(32), 'hex');
      crash := public.crash_from_seed(seed, r.round_number + 1);
      fly := public.fly_ms(crash);
      insert into public.rounds (
        round_number, server_seed, server_seed_hash, crash_point, fly_ms, status,
        betting_started_at, betting_ends_at
      ) values (
        r.round_number + 1,
        seed,
        encode(extensions.digest(convert_to(seed, 'UTF8'), 'sha256'), 'hex'),
        crash,
        fly,
        'betting',
        ts,
        ts + interval '6 seconds'
      )
      returning * into r;
      continue;
    end if;

    return r;
  end loop;

  return r;
end;
$$;

create or replace function public.sync_rounds()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rounds%rowtype;
begin
  r := public.advance_round();
  return jsonb_build_object(
    'id', r.id,
    'roundNumber', r.round_number,
    'status', r.status,
    'bettingStartedAt', r.betting_started_at,
    'bettingEndsAt', r.betting_ends_at,
    'flyingStartedAt', r.flying_started_at,
    'crashedAt', r.crashed_at,
    'serverSeedHash', r.server_seed_hash,
    'serverSeed', case when r.status = 'crashed' then r.server_seed else null end,
    'crashPoint', case when r.status in ('flying', 'crashed') then r.crash_point else null end,
    'flyMs', case when r.status in ('flying', 'crashed') then r.fly_ms else null end,
    'serverNow', clock_timestamp()
  );
end;
$$;

create or replace function public.place_bet(
  p_user uuid,
  p_round uuid,
  p_amount numeric,
  p_slot integer,
  p_auto numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rounds%rowtype;
  v_balance numeric(14,2);
  v_amount numeric(12,2);
  v_auto numeric(12,2);
begin
  if p_user is null then
    raise exception 'not authenticated';
  end if;
  if p_slot not in (0, 1) then
    raise exception 'invalid slot';
  end if;
  if p_amount is null then
    raise exception 'invalid amount';
  end if;
  v_amount := round(p_amount, 2);
  if v_amount < 1 or v_amount > 5000 then
    raise exception 'invalid amount';
  end if;
  if p_auto is not null then
    v_auto := round(p_auto, 2);
    if v_auto < 1.10 or v_auto > 1000 then
      raise exception 'invalid auto cashout';
    end if;
  end if;

  r := public.advance_round();
  if r.id <> p_round or r.status <> 'betting' then
    raise exception 'betting closed';
  end if;

  select balance into v_balance from public.profiles where id = p_user for update;
  if v_balance is null then
    raise exception 'profile missing';
  end if;
  if v_balance < v_amount then
    raise exception 'insufficient balance';
  end if;

  insert into public.bets (user_id, round_id, round_number, slot, amount, auto_cashout, status)
  values (p_user, r.id, r.round_number, p_slot, v_amount, v_auto, 'open');

  update public.profiles
    set balance = balance - v_amount
    where id = p_user
    returning balance into v_balance;

  return jsonb_build_object('balance', v_balance);
exception
  when unique_violation then
    raise exception 'slot taken';
end;
$$;

create or replace function public.cashout_bet(p_user uuid, p_bet uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rounds%rowtype;
  b public.bets%rowtype;
  elapsed_ms numeric;
  mult numeric;
  v_balance numeric(14,2);
begin
  if p_user is null then
    raise exception 'not authenticated';
  end if;

  r := public.advance_round();
  select * into b from public.bets where id = p_bet and user_id = p_user for update;
  if not found then
    raise exception 'bet not found';
  end if;
  if b.status = 'cashed' then
    select balance into v_balance from public.profiles where id = p_user;
    return jsonb_build_object('balance', v_balance, 'status', 'cashed', 'multiplier', b.cashout_multiplier);
  end if;
  if b.status <> 'open' then
    select balance into v_balance from public.profiles where id = p_user;
    return jsonb_build_object('balance', v_balance, 'status', b.status);
  end if;
  if r.id = b.round_id and r.status = 'betting' then
    raise exception 'round not flying';
  end if;
  if r.id <> b.round_id or r.status <> 'flying' or r.flying_started_at is null then
    update public.bets
      set status = 'lost', profit = -b.amount, settled_at = clock_timestamp()
      where id = b.id and status = 'open';
    select balance into v_balance from public.profiles where id = p_user;
    return jsonb_build_object('balance', v_balance, 'status', 'lost');
  end if;

  elapsed_ms := extract(epoch from (clock_timestamp() - r.flying_started_at)) * 1000;
  mult := floor(exp(0.00006 * elapsed_ms) * 100) / 100;
  if elapsed_ms >= r.fly_ms then
    update public.bets
      set status = 'lost', profit = -b.amount, settled_at = clock_timestamp()
      where id = b.id and status = 'open';
    select balance into v_balance from public.profiles where id = p_user;
    return jsonb_build_object('balance', v_balance, 'status', 'lost');
  end if;
  if mult >= r.crash_point then
    mult := floor((r.crash_point - 0.01) * 100) / 100;
  end if;
  if mult < 1 then
    update public.bets
      set status = 'lost', profit = -b.amount, settled_at = clock_timestamp()
      where id = b.id and status = 'open';
    select balance into v_balance from public.profiles where id = p_user;
    return jsonb_build_object('balance', v_balance, 'status', 'lost');
  end if;

  perform public.apply_cashout(b.id, mult);
  select balance into v_balance from public.profiles where id = p_user;
  return jsonb_build_object('balance', v_balance, 'status', 'cashed', 'multiplier', mult);
end;
$$;

create or replace function public.cancel_bet(p_user uuid, p_bet uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rounds%rowtype;
  b public.bets%rowtype;
  v_balance numeric(14,2);
begin
  if p_user is null then
    raise exception 'not authenticated';
  end if;

  r := public.advance_round();
  select * into b from public.bets where id = p_bet and user_id = p_user for update;
  if not found then
    raise exception 'bet not found';
  end if;
  if b.status <> 'open' then
    raise exception 'bet not open';
  end if;
  if r.id <> b.round_id or r.status <> 'betting' then
    raise exception 'betting closed';
  end if;

  update public.bets
    set status = 'cancelled', profit = 0, settled_at = clock_timestamp()
    where id = b.id;

  update public.profiles
    set balance = balance + b.amount
    where id = p_user
    returning balance into v_balance;

  return jsonb_build_object('balance', v_balance, 'status', 'cancelled');
end;
$$;

create or replace function public.topup_play_credit()
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(14,2);
  v_last timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select balance, last_topup_at into v_balance, v_last
  from public.profiles
  where id = auth.uid()
  for update;
  if v_balance is null then
    raise exception 'profile missing';
  end if;
  if v_last is not null and v_last > clock_timestamp() - interval '20 seconds' then
    raise exception 'wait before topping up';
  end if;
  if v_balance + 1000 > 50000 then
    raise exception 'balance cap reached';
  end if;
  update public.profiles
    set balance = balance + 1000,
        last_topup_at = clock_timestamp()
    where id = auth.uid()
    returning balance into v_balance;
  return v_balance;
end;
$$;

create or replace function public.username_available(p_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(p_name))
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
begin
  base := lower(coalesce(new.raw_user_meta_data->>'username', 'pilot'));
  base := left(regexp_replace(base, '[^a-z0-9_]', '', 'g'), 16);
  if char_length(base) < 3 then
    base := 'pilot';
  end if;
  begin
    insert into public.profiles (id, username) values (new.id, base);
  exception
    when unique_violation then
      insert into public.profiles (id, username)
      values (new.id, left(base, 11) || '_' || substr(replace(new.id::text, '-', ''), 1, 4));
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.hex_to_numeric(text) from public, anon, authenticated;
revoke all on function public.crash_from_seed(text, bigint) from public, anon, authenticated;
revoke all on function public.fly_ms(numeric) from public, anon, authenticated;
revoke all on function public.apply_cashout(uuid, numeric) from public, anon, authenticated;
revoke all on function public.settle_due_autos(uuid) from public, anon, authenticated;
revoke all on function public.advance_round() from public, anon, authenticated;
revoke all on function public.sync_rounds() from public, anon, authenticated;
revoke all on function public.place_bet(uuid, uuid, numeric, integer, numeric) from public, anon, authenticated;
revoke all on function public.cashout_bet(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_bet(uuid, uuid) from public, anon, authenticated;
revoke all on function public.topup_play_credit() from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.sync_rounds() to service_role;
grant execute on function public.place_bet(uuid, uuid, numeric, integer, numeric) to service_role;
grant execute on function public.cashout_bet(uuid, uuid) to service_role;
grant execute on function public.cancel_bet(uuid, uuid) to service_role;
grant execute on function public.topup_play_credit() to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- After this file, run supabase/sports.sql for the sportsbook, seed matches, and tickets.
