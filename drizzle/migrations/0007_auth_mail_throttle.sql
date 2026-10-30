CREATE TABLE public.auth_mail_throttle (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX auth_mail_throttle_key_idx ON public.auth_mail_throttle (key, created_at);
REVOKE ALL ON public.auth_mail_throttle FROM anon, authenticated;
GRANT ALL ON public.auth_mail_throttle TO service_role;
ALTER TABLE public.auth_mail_throttle ENABLE ROW LEVEL SECURITY;