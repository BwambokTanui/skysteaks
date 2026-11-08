-- Admin dashboard: roles, forced crash points, next-round overrides.
-- Run after schema.sql / sports.sql.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.rounds
  add column if not exists forced boolean not null default false;

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant all on public.admin_settings to service_role;
revoke all on public.admin_settings from anon, authenticated;

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
  override jsonb;
  forced_flag boolean := false;
begin
  perform pg_advisory_xact_lock(842174);
  select * into r from public.rounds order by round_number desc limit 1 for update;

  if not found then
    ts := clock_timestamp();
    seed := encode(extensions.gen_random_bytes(32), 'hex');
    select value into override from public.admin_settings where key = 'next_crash_point';
    if override is not null and (override->>'crash') is not null then
      crash := greatest(1.00, least(1000000.00, (override->>'crash')::numeric));
      forced_flag := true;
      delete from public.admin_settings where key = 'next_crash_point';
    else
      crash := public.crash_from_seed(seed, 1);
    end if;
    fly := public.fly_ms(crash);
    insert into public.rounds (
      round_number, server_seed, server_seed_hash, crash_point, fly_ms, status, forced,
      betting_started_at, betting_ends_at
    ) values (
      1, seed,
      encode(extensions.digest(convert_to(seed, 'UTF8'), 'sha256'), 'hex'),
      crash, fly, 'betting', forced_flag, ts, ts + interval '6 seconds'
    )
    returning * into r;
  end if;

  for i in 1..180 loop
    if r.status = 'betting' and clock_timestamp() >= r.betting_ends_at then
      update public.rounds
        set status = 'flying', flying_started_at = r.betting_ends_at
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
          set status = 'crashed', crashed_at = crash_at
          where id = r.id
          returning * into r;
        update public.bets
          set status = 'lost', profit = -amount, settled_at = crash_at
          where round_id = r.id and status = 'open';
        continue;
      end if;
      return r;
    end if;

    if r.status = 'crashed' and r.crashed_at is not null and clock_timestamp() >= r.crashed_at + interval '3 seconds' then
      ts := clock_timestamp();
      seed := encode(extensions.gen_random_bytes(32), 'hex');
      forced_flag := false;
      select value into override from public.admin_settings where key = 'next_crash_point';
      if override is not null and (override->>'crash') is not null then
        crash := greatest(1.00, least(1000000.00, (override->>'crash')::numeric));
        forced_flag := true;
        delete from public.admin_settings where key = 'next_crash_point';
      else
        crash := public.crash_from_seed(seed, r.round_number + 1);
      end if;
      fly := public.fly_ms(crash);
      insert into public.rounds (
        round_number, server_seed, server_seed_hash, crash_point, fly_ms, status, forced,
        betting_started_at, betting_ends_at
      ) values (
        r.round_number + 1, seed,
        encode(extensions.digest(convert_to(seed, 'UTF8'), 'sha256'), 'hex'),
        crash, fly, 'betting', forced_flag, ts, ts + interval '6 seconds'
      )
      returning * into r;
      continue;
    end if;

    return r;
  end loop;

  return r;
end;
$$;

create or replace function public.admin_force_current_crash(p_crash numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rounds%rowtype;
  crash numeric(12,2);
  fly integer;
begin
  if p_crash is null or p_crash < 1 or p_crash > 1000000 then
    raise exception 'crash must be between 1 and 1000000';
  end if;
  perform pg_advisory_xact_lock(842174);
  r := public.advance_round();
  if r.status <> 'betting' then
    raise exception 'can only force crash while betting is open';
  end if;
  crash := round(p_crash::numeric, 2);
  fly := public.fly_ms(crash);
  update public.rounds
    set crash_point = crash,
        fly_ms = fly,
        forced = true
    where id = r.id
    returning * into r;
  return jsonb_build_object(
    'id', r.id,
    'roundNumber', r.round_number,
    'status', r.status,
    'crashPoint', r.crash_point,
    'flyMs', r.fly_ms,
    'forced', r.forced
  );
end;
$$;

create or replace function public.admin_set_next_crash(p_crash numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  crash numeric(12,2);
begin
  if p_crash is null or p_crash < 1 or p_crash > 1000000 then
    raise exception 'crash must be between 1 and 1000000';
  end if;
  crash := round(p_crash::numeric, 2);
  insert into public.admin_settings (key, value, updated_at)
  values ('next_crash_point', jsonb_build_object('crash', crash), clock_timestamp())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = clock_timestamp();
  return jsonb_build_object('nextCrashPoint', crash);
end;
$$;

create or replace function public.admin_clear_next_crash()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_settings where key = 'next_crash_point';
  return jsonb_build_object('cleared', true);
end;
$$;

create or replace function public.admin_set_balance(p_user uuid, p_balance numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bal numeric(14,2);
begin
  if p_user is null then raise exception 'user required'; end if;
  if p_balance is null or p_balance < 0 or p_balance > 1000000 then
    raise exception 'balance must be 0..1000000';
  end if;
  bal := round(p_balance::numeric, 2);
  update public.profiles set balance = bal where id = p_user;
  if not found then raise exception 'user not found'; end if;
  return jsonb_build_object('userId', p_user, 'balance', bal);
end;
$$;

create or replace function public.admin_set_flag(p_user uuid, p_admin boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set is_admin = coalesce(p_admin, false) where id = p_user;
  if not found then raise exception 'user not found'; end if;
  return jsonb_build_object('userId', p_user, 'isAdmin', coalesce(p_admin, false));
end;
$$;

revoke all on function public.admin_force_current_crash(numeric) from public, anon, authenticated;
revoke all on function public.admin_set_next_crash(numeric) from public, anon, authenticated;
revoke all on function public.admin_clear_next_crash() from public, anon, authenticated;
revoke all on function public.admin_set_balance(uuid, numeric) from public, anon, authenticated;
revoke all on function public.admin_set_flag(uuid, boolean) from public, anon, authenticated;

grant execute on function public.admin_force_current_crash(numeric) to service_role;
grant execute on function public.admin_set_next_crash(numeric) to service_role;
grant execute on function public.admin_clear_next_crash() to service_role;
grant execute on function public.admin_set_balance(uuid, numeric) to service_role;
grant execute on function public.admin_set_flag(uuid, boolean) to service_role;
