create table if not exists public.sports (
  id text primary key,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists public.leagues (
  id text primary key,
  sport_id text not null references public.sports (id) on delete cascade,
  name text not null,
  country text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues (id) on delete cascade,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null check (status in ('open', 'live', 'settled')),
  home_score integer,
  away_score integer,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  key text not null,
  name text not null,
  unique (event_id, key)
);

create table if not exists public.selections (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets (id) on delete cascade,
  key text not null,
  name text not null,
  odds numeric(8,2) not null check (odds >= 1.01 and odds <= 1000),
  result text check (result is null or result in ('won', 'lost', 'void')),
  unique (market_id, key)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stake numeric(12,2) not null check (stake >= 1 and stake <= 5000),
  total_odds numeric(14,4) not null check (total_odds >= 1.01),
  potential_payout numeric(14,2) not null,
  status text not null check (status in ('open', 'won', 'lost', 'void', 'cancelled')),
  profit numeric(14,2),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.ticket_legs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete restrict,
  selection_id uuid not null references public.selections (id) on delete restrict,
  market_key text not null,
  selection_key text not null,
  selection_name text not null,
  home_team text not null,
  away_team text not null,
  odds numeric(8,2) not null,
  result text check (result is null or result in ('won', 'lost', 'void'))
);

create index if not exists events_kickoff_idx on public.events (kickoff_at);
create index if not exists events_status_idx on public.events (status, kickoff_at);
create index if not exists events_league_idx on public.events (league_id, kickoff_at);
create index if not exists tickets_user_idx on public.tickets (user_id, created_at desc);
create index if not exists ticket_legs_ticket_idx on public.ticket_legs (ticket_id);
create index if not exists selections_market_idx on public.selections (market_id);

alter table public.sports enable row level security;
alter table public.leagues enable row level security;
alter table public.events enable row level security;
alter table public.markets enable row level security;
alter table public.selections enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_legs enable row level security;

drop policy if exists "read sports" on public.sports;
create policy "read sports" on public.sports for select to anon, authenticated using (true);

drop policy if exists "read leagues" on public.leagues;
create policy "read leagues" on public.leagues for select to anon, authenticated using (true);

drop policy if exists "read events" on public.events;
create policy "read events" on public.events for select to anon, authenticated using (true);

drop policy if exists "read markets" on public.markets;
create policy "read markets" on public.markets for select to anon, authenticated using (true);

drop policy if exists "read selections" on public.selections;
create policy "read selections" on public.selections for select to anon, authenticated using (true);

drop policy if exists "read own tickets" on public.tickets;
create policy "read own tickets" on public.tickets for select to authenticated using (auth.uid() = user_id);

drop policy if exists "read own ticket legs" on public.ticket_legs;
create policy "read own ticket legs" on public.ticket_legs
  for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()));

grant select on public.sports, public.leagues, public.events, public.markets, public.selections to anon, authenticated;
grant select on public.tickets, public.ticket_legs to authenticated;
grant all on public.sports, public.leagues, public.events, public.markets, public.selections, public.tickets, public.ticket_legs to service_role;

create or replace function public.seed_sportsbook()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e uuid;
  m uuid;
begin
  insert into public.sports (id, name, sort_order) values
    ('football', 'Football', 1),
    ('basketball', 'Basketball', 2),
    ('tennis', 'Tennis', 3)
  on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

  insert into public.leagues (id, sport_id, name, country, sort_order) values
    ('epl', 'football', 'Premier League', 'England', 1),
    ('laliga', 'football', 'La Liga', 'Spain', 2),
    ('ucl', 'football', 'Champions League', 'Europe', 3),
    ('nba', 'basketball', 'NBA', 'USA', 1),
    ('atp', 'tennis', 'ATP Tour', 'World', 1)
  on conflict (id) do update set name = excluded.name, country = excluded.country, sort_order = excluded.sort_order;

  -- Always ensure at least one open/live card per sport so empty leagues never look broken.
  if not exists (select 1 from public.events e join public.leagues l on l.id = e.league_id where l.sport_id = 'basketball' and e.status <> 'settled') then
    insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured, external_id, home_score, away_score, minute)
    values
      ('nba', 'Lakers', 'Celtics', clock_timestamp() + interval '90 minutes', 'open', true, 'seed-nba-lakers-celtics', 0, 0, null),
      ('nba', 'Heat', 'Bucks', clock_timestamp() - interval '35 minutes', 'live', true, 'seed-nba-heat-bucks', 78, 74, 36);
    insert into public.markets (event_id, key, name)
      select id, '1x2', 'Match Winner' from public.events where external_id in ('seed-nba-lakers-celtics', 'seed-nba-heat-bucks');
    insert into public.selections (market_id, key, name, odds)
      select m.id, x.key, x.name, x.odds
      from public.markets m
      join public.events e on e.id = m.event_id
      cross join (values ('1','1',1.90), ('2','2',1.95)) as x(key, name, odds)
      where e.external_id in ('seed-nba-lakers-celtics', 'seed-nba-heat-bucks');
  end if;

  if not exists (select 1 from public.events e join public.leagues l on l.id = e.league_id where l.sport_id = 'tennis' and e.status <> 'settled') then
    insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured, external_id, home_score, away_score)
    values
      ('atp', 'Djokovic', 'Alcaraz', clock_timestamp() + interval '70 minutes', 'open', true, 'seed-atp-djokovic-alcaraz', 0, 0),
      ('atp', 'Swiatek', 'Gauff', clock_timestamp() - interval '40 minutes', 'live', true, 'seed-wta-swiatek-gauff', 1, 0);
    insert into public.markets (event_id, key, name)
      select id, '1x2', 'Match Winner' from public.events where external_id in ('seed-atp-djokovic-alcaraz', 'seed-wta-swiatek-gauff');
    insert into public.selections (market_id, key, name, odds)
      select m.id, x.key, x.name, x.odds
      from public.markets m
      join public.events e on e.id = m.event_id
      cross join (values ('1','1',1.90), ('2','2',1.95)) as x(key, name, odds)
      where e.external_id in ('seed-atp-djokovic-alcaraz', 'seed-wta-swiatek-gauff');
  end if;

  if exists (select 1 from public.events limit 1) then
    return;
  end if;

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured)
  values ('epl', 'Arsenal', 'Chelsea', clock_timestamp() + interval '45 minutes', 'open', true)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Result') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 2.15), (m, 'x', 'X', 3.40), (m, '2', '2', 3.20);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured)
  values ('epl', 'Liverpool', 'Man City', clock_timestamp() + interval '2 hours', 'open', true)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Result') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 2.55), (m, 'x', 'X', 3.50), (m, '2', '2', 2.70);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured)
  values ('laliga', 'Real Madrid', 'Barcelona', clock_timestamp() + interval '3 hours', 'open', true)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Result') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 2.20), (m, 'x', 'X', 3.60), (m, '2', '2', 3.05);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured)
  values ('ucl', 'Bayern Munich', 'Inter', clock_timestamp() + interval '5 hours', 'open', true)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Result') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 1.95), (m, 'x', 'X', 3.55), (m, '2', '2', 3.80);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured, home_score, away_score)
  values ('epl', 'Tottenham', 'Newcastle', clock_timestamp() - interval '35 minutes', 'live', true, 1, 1)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Result') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 2.80), (m, 'x', 'X', 2.90), (m, '2', '2', 2.85);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured, home_score, away_score)
  values ('laliga', 'Atletico Madrid', 'Sevilla', clock_timestamp() - interval '55 minutes', 'live', false, 2, 0)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Result') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 1.45), (m, 'x', 'X', 4.20), (m, '2', '2', 7.50);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured)
  values ('nba', 'Lakers', 'Celtics', clock_timestamp() + interval '90 minutes', 'open', true)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Winner') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 1.85), (m, '2', '2', 1.95);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured)
  values ('nba', 'Warriors', 'Nuggets', clock_timestamp() + interval '4 hours', 'open', false)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Winner') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 2.05), (m, '2', '2', 1.78);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured)
  values ('atp', 'Djokovic', 'Alcaraz', clock_timestamp() + interval '70 minutes', 'open', true)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Winner') returning id into m;
  insert into public.selections (market_id, key, name, odds) values
    (m, '1', '1', 2.10), (m, '2', '2', 1.72);

  insert into public.events (league_id, home_team, away_team, kickoff_at, status, featured, home_score, away_score)
  values ('epl', 'Brighton', 'Fulham', clock_timestamp() - interval '3 hours', 'settled', false, 2, 1)
  returning id into e;
  insert into public.markets (event_id, key, name) values (e, '1x2', 'Match Result') returning id into m;
  insert into public.selections (market_id, key, name, odds, result) values
    (m, '1', '1', 2.30, 'won'), (m, 'x', 'X', 3.20, 'lost'), (m, '2', '2', 3.10, 'lost');
end;
$$;

create or replace function public.settle_match_result(p_event uuid, p_home integer, p_away integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m uuid;
  outcome text;
  ticket_row public.tickets%rowtype;
  won_all boolean;
  lost_any boolean;
  void_all boolean;
  open_left integer;
  payout numeric(14,2);
begin
  if p_home < 0 or p_away < 0 then
    raise exception 'invalid score';
  end if;

  update public.events
    set status = 'settled',
        home_score = p_home,
        away_score = p_away
    where id = p_event;

  select id into m from public.markets where event_id = p_event and key = '1x2' limit 1;
  if m is null then
    return;
  end if;

  if exists (select 1 from public.selections where market_id = m and key = 'x') then
    if p_home > p_away then outcome := '1';
    elsif p_home < p_away then outcome := '2';
    else outcome := 'x';
    end if;
  else
    if p_home >= p_away then outcome := '1'; else outcome := '2'; end if;
  end if;

  update public.selections
    set result = case when key = outcome then 'won' else 'lost' end
    where market_id = m;

  update public.ticket_legs tl
    set result = s.result
    from public.selections s
    where tl.selection_id = s.id and s.market_id = m;

  for ticket_row in
    select distinct t.*
    from public.tickets t
    join public.ticket_legs tl on tl.ticket_id = t.id
    where tl.event_id = p_event and t.status = 'open'
  loop
    select
      bool_and(coalesce(result, 'open') = 'won'),
      bool_or(result = 'lost'),
      bool_and(result = 'void'),
      count(*) filter (where result is null)
    into won_all, lost_any, void_all, open_left
    from public.ticket_legs
    where ticket_id = ticket_row.id;

    if open_left > 0 then
      continue;
    end if;

    if lost_any then
      update public.tickets
        set status = 'lost', profit = -stake, settled_at = clock_timestamp()
        where id = ticket_row.id;
    elsif void_all then
      update public.tickets
        set status = 'void', profit = 0, settled_at = clock_timestamp()
        where id = ticket_row.id;
      update public.profiles set balance = balance + ticket_row.stake where id = ticket_row.user_id;
    elsif won_all then
      payout := ticket_row.potential_payout;
      update public.tickets
        set status = 'won', profit = payout - stake, settled_at = clock_timestamp()
        where id = ticket_row.id;
      update public.profiles set balance = balance + payout where id = ticket_row.user_id;
    end if;
  end loop;
end;
$$;

create or replace function public.sync_sportsbook()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.events%rowtype;
  home integer;
  away integer;
begin
  perform public.seed_sportsbook();

  update public.events
    set status = 'live',
        home_score = coalesce(home_score, 0),
        away_score = coalesce(away_score, 0)
    where status = 'open' and kickoff_at <= clock_timestamp();

  for r in
    select * from public.events
    where status = 'live' and kickoff_at <= clock_timestamp() - interval '105 minutes'
  loop
    home := coalesce(r.home_score, (get_byte(extensions.digest(r.id::text, 'sha256'), 0) % 4));
    away := coalesce(r.away_score, (get_byte(extensions.digest(r.id::text || ':a', 'sha256'), 0) % 4));
    perform public.settle_match_result(r.id, home, away);
  end loop;
end;
$$;

create or replace function public.place_sports_ticket(
  p_user uuid,
  p_stake numeric,
  p_selection_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stake numeric(12,2);
  v_balance numeric(14,2);
  v_odds numeric(14,4) := 1;
  sel record;
  event_ids uuid[] := '{}';
  ticket_id uuid;
  payout numeric(14,2);
begin
  perform public.sync_sportsbook();

  if p_user is null then
    raise exception 'not authenticated';
  end if;
  if p_selection_ids is null or array_length(p_selection_ids, 1) is null then
    raise exception 'empty ticket';
  end if;
  if array_length(p_selection_ids, 1) > 12 then
    raise exception 'too many selections';
  end if;

  v_stake := round(p_stake, 2);
  if v_stake < 1 or v_stake > 5000 then
    raise exception 'invalid amount';
  end if;

  for sel in
    select
      s.id as selection_id,
      s.key as selection_key,
      s.name as selection_name,
      s.odds,
      m.key as market_key,
      e.id as event_id,
      e.home_team,
      e.away_team,
      e.status as event_status
    from public.selections s
    join public.markets m on m.id = s.market_id
    join public.events e on e.id = m.event_id
    where s.id = any(p_selection_ids)
  loop
    if sel.event_status = 'settled' then
      raise exception 'event settled';
    end if;
    if sel.event_id = any(event_ids) then
      raise exception 'same event twice';
    end if;
    event_ids := array_append(event_ids, sel.event_id);
    v_odds := round(v_odds * sel.odds, 4);
  end loop;

  if coalesce(array_length(event_ids, 1), 0) <> array_length(p_selection_ids, 1) then
    raise exception 'selection missing';
  end if;

  select balance into v_balance from public.profiles where id = p_user for update;
  if v_balance is null then
    raise exception 'profile missing';
  end if;
  if v_balance < v_stake then
    raise exception 'insufficient balance';
  end if;

  payout := round(v_stake * v_odds, 2);
  insert into public.tickets (user_id, stake, total_odds, potential_payout, status)
  values (p_user, v_stake, v_odds, payout, 'open')
  returning id into ticket_id;

  insert into public.ticket_legs (
    ticket_id, event_id, selection_id, market_key, selection_key, selection_name,
    home_team, away_team, odds
  )
  select
    ticket_id,
    e.id,
    s.id,
    m.key,
    s.key,
    s.name,
    e.home_team,
    e.away_team,
    s.odds
  from public.selections s
  join public.markets m on m.id = s.market_id
  join public.events e on e.id = m.event_id
  where s.id = any(p_selection_ids);

  update public.profiles
    set balance = balance - v_stake
    where id = p_user
    returning balance into v_balance;

  return jsonb_build_object(
    'ticketId', ticket_id,
    'balance', v_balance,
    'potentialPayout', payout,
    'totalOdds', v_odds
  );
end;
$$;

revoke all on function public.seed_sportsbook() from public, anon, authenticated;
revoke all on function public.settle_match_result(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.sync_sportsbook() from public, anon, authenticated;
revoke all on function public.place_sports_ticket(uuid, numeric, uuid[]) from public, anon, authenticated;

grant execute on function public.seed_sportsbook() to service_role;
grant execute on function public.settle_match_result(uuid, integer, integer) to service_role;
grant execute on function public.sync_sportsbook() to service_role;
grant execute on function public.place_sports_ticket(uuid, numeric, uuid[]) to service_role;

select public.seed_sportsbook();
