CREATE OR REPLACE FUNCTION public.cleanup_old_manual_schedules()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _count integer := 0;
BEGIN
  DELETE FROM public.daily_games
  WHERE date < _today;

  GET DIAGNOSTICS _count = ROW_COUNT;

  IF _count > 0 THEN
    INSERT INTO public.audit_logs (action, entity, actor_id, payload)
    VALUES (
      'cleanup_old_schedules',
      'daily_games',
      NULL,
      jsonb_build_object('deleted_count', _count, 'retained_from', _today)
    );
  END IF;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_manual_schedules() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_manual_schedules() TO service_role;

SELECT cron.schedule(
  'cleanup-old-manual-schedules-daily',
  '15 6 * * *',
  $$SELECT public.cleanup_old_manual_schedules();$$
);