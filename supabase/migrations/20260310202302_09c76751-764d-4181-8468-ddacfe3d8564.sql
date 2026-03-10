CREATE TABLE public.placements_archive (
  id text PRIMARY KEY,
  date text,
  client_name text NOT NULL DEFAULT '',
  team_name text NOT NULL DEFAULT '',
  outlet text NOT NULL DEFAULT '',
  reporter_name text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  vertical text NOT NULL DEFAULT '',
  readership_viewership numeric NOT NULL DEFAULT 0,
  ad_value numeric NOT NULL DEFAULT 0,
  secured_by text NOT NULL DEFAULT '',
  topic_product text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  weekly_wins_trigger boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.placements_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on placements_archive"
  ON public.placements_archive
  FOR SELECT
  TO anon, authenticated
  USING (true);