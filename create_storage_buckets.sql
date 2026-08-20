-- ============================================================
-- CREACIÓN DE BUCKETS DE ALMACENAMIENTO EN SUPABASE
-- Pega y ejecuta esto en Supabase -> SQL Editor
-- ============================================================

-- 1. Crear los buckets públicos para fotos de perfil y logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('branch-logos', 'branch-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir que cualquier persona pueda ver las fotos y logos
DROP POLICY IF EXISTS "Public avatars access" ON storage.objects;
CREATE POLICY "Public avatars access" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public branch-logos access" ON storage.objects;
CREATE POLICY "Public branch-logos access" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'branch-logos');

-- 3. Permitir que los usuarios autenticados suban y actualicen fotos
DROP POLICY IF EXISTS "Auth upload avatars" ON storage.objects;
CREATE POLICY "Auth upload avatars" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth update avatars" ON storage.objects;
CREATE POLICY "Auth update avatars" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth upload branch-logos" ON storage.objects;
CREATE POLICY "Auth upload branch-logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branch-logos');

DROP POLICY IF EXISTS "Auth update branch-logos" ON storage.objects;
CREATE POLICY "Auth update branch-logos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'branch-logos');
