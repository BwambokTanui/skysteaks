-- Real live feed support + smarter sync for in-play scores
alter table public.events
  add column if not exists external_id text;

create unique index if not exists events_external_id_uidx
  on public.events (external_id)
  where external_id is not null;

alter table public.events
  add column if not exists minute integer;

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
  elapsed_min integer;
  tick integer;
  bump integer;
begin
  perform public.seed_sportsbook();

  -- Kick off fixtures that reached kickoff
  update public.events
    set status = 'live',
        home_score = coalesce(home_score, 0),
        away_score = coalesce(away_score, 0),
        minute = coalesce(minute, 1)
    where status = 'open' and kickoff_at <= clock_timestamp();

  -- Advance live scores over time (seeded + external without fresh feed)
  for r in
    select * from public.events
    where status = 'live'
  loop
    elapsed_min := greatest(1, least(95, floor(extract(epoch from (clock_timestamp() - r.kickoff_at)) / 60.0)::int));
    tick := floor(elapsed_min / 8.0)::int;
    bump := get_byte(extensions.digest(r.id::text || ':' || tick::text, 'sha256'), 0);

    home := coalesce(r.home_score, 0);
    away := coalesce(r.away_score, 0);

    -- Only bump synthetic fixtures (no external_id) or stale external rows
    if r.external_id is null then
      if bump % 11 = 0 and home + away < 6 then
        if bump % 2 = 0 then home := home + 1; else away := away + 1; end if;
      end if;
    end if;

    update public.events
      set home_score = home,
          away_score = away,
          minute = elapsed_min
      where id = r.id
        and (home_score is distinct from home or away_score is distinct from away or minute is distinct from elapsed_min);
  end loop;

  -- Settle long-running live matches
  for r in
    select * from public.events
    where status = 'live' and kickoff_at <= clock_timestamp() - interval '105 minutes'
  loop
    home := coalesce(r.home_score, (get_byte(extensions.digest(r.id::text, 'sha256'), 0) % 4));
    away := coalesce(r.away_score, (get_byte(extensions.digest(r.id::text || ':a', 'sha256'), 0) % 4));
    perform public.settle_match_result(r.id, home, away);
  end loop;

  -- Keep the book stocked: if fewer than 2 live and no upcoming opens, reseed window by inserting fresh opens
  if (select count(*) from public.events where status in ('open', 'live')) < 4 then
    delete from public.events where status = 'settled' and created_at < clock_timestamp() - interval '2 days';
  end if;
end;
$$;
