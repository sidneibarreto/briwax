-- ============================================
-- CONFIGURAÇÃO DO STORAGE (BUCKET DE IMAGENS)
-- Execute DEPOIS de criar o bucket 'equipments' manualmente
-- ============================================

-- Política de leitura pública para o bucket equipments
DROP POLICY IF EXISTS "Permitir leitura pública de imagens" ON storage.objects;
CREATE POLICY "Permitir leitura pública de imagens"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'equipments');

-- Política de upload para usuários autenticados
DROP POLICY IF EXISTS "Permitir upload para autenticados" ON storage.objects;
CREATE POLICY "Permitir upload para autenticados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'equipments');

-- Política de update para usuários autenticados
DROP POLICY IF EXISTS "Permitir update para autenticados" ON storage.objects;
CREATE POLICY "Permitir update para autenticados"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'equipments')
  WITH CHECK (bucket_id = 'equipments');

-- Política de delete para usuários autenticados
DROP POLICY IF EXISTS "Permitir delete para autenticados" ON storage.objects;
CREATE POLICY "Permitir delete para autenticados"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'equipments');
