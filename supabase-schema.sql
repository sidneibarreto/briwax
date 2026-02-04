-- ============================================
-- BRIWAX DATABASE SCHEMA
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela de categorias
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de equipamentos
CREATE TABLE IF NOT EXISTS equipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_equipments_category_id ON equipments(category_id);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments(status);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SEGURANÇA - CATEGORIES
-- ============================================

-- Permitir leitura pública de todas as categorias
CREATE POLICY "Permitir leitura pública de categorias"
  ON categories
  FOR SELECT
  TO public
  USING (true);

-- Permitir INSERT apenas para usuários autenticados
CREATE POLICY "Permitir criação de categorias para autenticados"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir UPDATE apenas para usuários autenticados
CREATE POLICY "Permitir atualização de categorias para autenticados"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir DELETE apenas para usuários autenticados
CREATE POLICY "Permitir exclusão de categorias para autenticados"
  ON categories
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- POLÍTICAS DE SEGURANÇA - EQUIPMENTS
-- ============================================

-- Permitir leitura pública apenas de equipamentos publicados
CREATE POLICY "Permitir leitura pública de equipamentos publicados"
  ON equipments
  FOR SELECT
  TO public
  USING (status = 'published');

-- Permitir leitura completa para usuários autenticados (incluindo drafts)
CREATE POLICY "Permitir leitura completa para autenticados"
  ON equipments
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir INSERT apenas para usuários autenticados
CREATE POLICY "Permitir criação de equipamentos para autenticados"
  ON equipments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir UPDATE apenas para usuários autenticados
CREATE POLICY "Permitir atualização de equipamentos para autenticados"
  ON equipments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir DELETE apenas para usuários autenticados
CREATE POLICY "Permitir exclusão de equipamentos para autenticados"
  ON equipments
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- ============================================

-- 4. Criar tabela de configurações do site
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT,
  email TEXT,
  address TEXT,
  instagram_url TEXT,
  whatsapp_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública de configurações"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

-- Política de UPDATE para autenticados
CREATE POLICY "Permitir atualização de configurações para autenticados"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política de INSERT para autenticados
CREATE POLICY "Permitir criação de configurações para autenticados"
  ON site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Inserir configurações padrão
INSERT INTO site_settings (phone, email, address, instagram_url, whatsapp_url) VALUES
  ('(11) 988 212 411', 'contato@artbox3d.com.br', 'Av. Santo Amaro, 4644 - Loja 3 • Brooklin Office Center', 'https://www.instagram.com/worldstage.store?igsh=cDlwNnJ4azFxcm9k', 'https://wa.me/5511988538000')
ON CONFLICT DO NOTHING;

-- Inserir categorias de exemplo
INSERT INTO categories (name, slug) VALUES
  ('Áudio', 'audio'),
  ('Vídeo', 'video'),
  ('Iluminação', 'iluminacao'),
  ('Fotografia', 'fotografia')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- STORAGE BUCKET PARA IMAGENS
-- Execute este código no Supabase Dashboard > Storage
-- ============================================

-- Criar bucket 'equipments' (faça isso manualmente no Dashboard ou via SQL)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('equipments', 'equipments', true);

-- Política de leitura pública para o bucket equipments
-- CREATE POLICY "Permitir leitura pública de imagens"
--   ON storage.objects FOR SELECT
--   TO public
--   USING (bucket_id = 'equipments');

-- Política de upload para usuários autenticados
-- CREATE POLICY "Permitir upload para autenticados"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'equipments');

-- Política de delete para usuários autenticados
-- CREATE POLICY "Permitir delete para autenticados"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (bucket_id = 'equipments');
