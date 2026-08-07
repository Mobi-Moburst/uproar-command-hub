CREATE TABLE public.pitch_voice_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text,
  name text NOT NULL DEFAULT 'Uproar house voice',
  guidance text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pitch_voice_profiles_global_uniq
  ON public.pitch_voice_profiles ((1)) WHERE client_name IS NULL;
CREATE UNIQUE INDEX pitch_voice_profiles_client_uniq
  ON public.pitch_voice_profiles (client_name) WHERE client_name IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pitch_voice_profiles TO authenticated;
GRANT ALL ON public.pitch_voice_profiles TO service_role;

ALTER TABLE public.pitch_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read voice profiles"
  ON public.pitch_voice_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert voice profiles"
  ON public.pitch_voice_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update voice profiles"
  ON public.pitch_voice_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete voice profiles"
  ON public.pitch_voice_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pitch_voice_profiles_updated_at
  BEFORE UPDATE ON public.pitch_voice_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();