CREATE OR REPLACE FUNCTION public.restore_schedule_publication_version(_version_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _version public.schedule_publication_versions%ROWTYPE;
  _count integer := 0;
BEGIN
  IF NOT public.has_role((select auth.uid()), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _version
  FROM public.schedule_publication_versions
  WHERE id = _version_id;

  IF NOT FOUND OR jsonb_typeof(_version.games) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid version';
  END IF;

  DELETE FROM public.daily_games WHERE date = ANY(_version.dates);

  INSERT INTO public.daily_games (
    date, home_team, away_team, competition, competition_detail, game_time,
    channels, is_live, is_womens, active, archived, status_short,
    elapsed_minutes, publish_at, sport_type, source, home_score, away_score,
    live_status, live_updated_at, live_clock, period, broadcast_country
  )
  SELECT
    (item->>'date')::date,
    coalesce(item->>'home_team', ''),
    coalesce(item->>'away_team', ''),
    coalesce(item->>'competition', ''),
    nullif(item->>'competition_detail', ''),
    coalesce(nullif(item->>'game_time', ''), '00:00')::time,
    coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(item->'channels', '[]'::jsonb))), '{}'),
    coalesce((item->>'is_live')::boolean, false),
    coalesce((item->>'is_womens')::boolean, false),
    coalesce((item->>'active')::boolean, true),
    coalesce((item->>'archived')::boolean, false),
    coalesce(item->>'status_short', 'NS'),
    nullif(item->>'elapsed_minutes', '')::integer,
    nullif(item->>'publish_at', '')::timestamptz,
    coalesce(item->>'sport_type', 'football'),
    'manual',
    nullif(item->>'home_score', '')::integer,
    nullif(item->>'away_score', '')::integer,
    nullif(item->>'live_status', ''),
    nullif(item->>'live_updated_at', '')::timestamptz,
    nullif(item->>'live_clock', ''),
    nullif(item->>'period', ''),
    nullif(item->>'broadcast_country', '')
  FROM jsonb_array_elements(_version.games) AS item;

  GET DIAGNOSTICS _count = ROW_COUNT;

  INSERT INTO public.schedule_publication_versions (action, dates, game_count, games, created_by)
  VALUES ('restore', _version.dates, _count, _version.games, (select auth.uid()));

  INSERT INTO public.audit_logs (action, entity, actor_id, payload)
  VALUES ('restore', 'daily_games', (select auth.uid()), jsonb_build_object('version_id', _version_id, 'dates', _version.dates, 'game_count', _count));

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_schedule_publication_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_schedule_publication_version(uuid) TO authenticated, service_role;