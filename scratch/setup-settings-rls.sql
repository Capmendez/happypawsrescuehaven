-- Enable RLS and add policies for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to app_settings" ON public.app_settings;
CREATE POLICY "Allow public read access to app_settings" ON public.app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow staff update to app_settings" ON public.app_settings;
CREATE POLICY "Allow staff update to app_settings" ON public.app_settings
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow staff insert to app_settings" ON public.app_settings;
CREATE POLICY "Allow staff insert to app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));
