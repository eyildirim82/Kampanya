-- Admin kullanıcılar: id = auth.users.id (giriş sonrası admins tablosunda kayıt varsa admin sayılır)
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text DEFAULT 'admin',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_own" ON public.admins FOR SELECT USING (auth.uid() = id);

COMMENT ON TABLE public.admins IS 'Admin panele giriş yetkisi; id auth.users.id ile eşleşir.';
