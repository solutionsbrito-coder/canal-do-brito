CREATE TABLE public.schedule_publication_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('publish', 'republish', 'restore')),
  dates date[] NOT NULL DEFAULT '{}',
  game_count integer NOT NULL DEFAULT 0 CHECK (game_count >= 0),
  games jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.schedule_publication_versions TO authenticated;
GRANT ALL ON public.schedule_publication_versions TO service_role;

ALTER TABLE public.schedule_publication_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read schedule publication versions"
ON public.schedule_publication_versions
FOR SELECT TO authenticated
USING (public.has_role((select auth.uid()), 'admin'));

CREATE POLICY "Admins can create schedule publication versions"
ON public.schedule_publication_versions
FOR INSERT TO authenticated
WITH CHECK (public.has_role((select auth.uid()), 'admin') AND created_by = (select auth.uid()));

CREATE INDEX schedule_publication_versions_created_at_idx
ON public.schedule_publication_versions (created_at DESC);

CREATE INDEX schedule_publication_versions_dates_idx
ON public.schedule_publication_versions USING gin (dates);

COMMENT ON TABLE public.schedule_publication_versions IS 'Private admin-only snapshots of manually published sports schedules.';