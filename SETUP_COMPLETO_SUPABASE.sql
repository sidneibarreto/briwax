-- ============================================
-- CONFIGURAÇÃO COMPLETA DO BANCO BRIWAX
-- Execute este arquivo INTEIRO no Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTE 1: TABELAS PRINCIPAIS
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

-- 3. Criar tabela de configurações do site (rodapé)
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

-- 4. Criar tabela para rastrear admins
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_equipments_category_id ON equipments(category_id);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments(status);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================
-- PARTE 2: SEGURANÇA (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SEGURANÇA - CATEGORIES
-- ============================================

DROP POLICY IF EXISTS "Permitir leitura pública de categorias" ON categories;
CREATE POLICY "Permitir leitura pública de categorias"
  ON categories FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Permitir criação de categorias para autenticados" ON categories;
CREATE POLICY "Permitir criação de categorias para autenticados"
  ON categories FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de categorias para autenticados" ON categories;
CREATE POLICY "Permitir atualização de categorias para autenticados"
  ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de categorias para autenticados" ON categories;
CREATE POLICY "Permitir exclusão de categorias para autenticados"
  ON categories FOR DELETE TO authenticated USING (true);

-- ============================================
-- POLÍTICAS DE SEGURANÇA - EQUIPMENTS
-- ============================================

DROP POLICY IF EXISTS "Permitir leitura pública de equipamentos publicados" ON equipments;
CREATE POLICY "Permitir leitura pública de equipamentos publicados"
  ON equipments FOR SELECT TO public USING (status = 'published');

DROP POLICY IF EXISTS "Permitir leitura completa para autenticados" ON equipments;
CREATE POLICY "Permitir leitura completa para autenticados"
  ON equipments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir criação de equipamentos para autenticados" ON equipments;
CREATE POLICY "Permitir criação de equipamentos para autenticados"
  ON equipments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de equipamentos para autenticados" ON equipments;
CREATE POLICY "Permitir atualização de equipamentos para autenticados"
  ON equipments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de equipamentos para autenticados" ON equipments;
CREATE POLICY "Permitir exclusão de equipamentos para autenticados"
  ON equipments FOR DELETE TO authenticated USING (true);

-- ============================================
-- POLÍTICAS DE SEGURANÇA - SITE_SETTINGS
-- ============================================

DROP POLICY IF EXISTS "Permitir leitura pública de configurações" ON site_settings;
CREATE POLICY "Permitir leitura pública de configurações"
  ON site_settings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Permitir atualização de configurações para autenticados" ON site_settings;
CREATE POLICY "Permitir atualização de configurações para autenticados"
  ON site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir criação de configurações para autenticados" ON site_settings;
CREATE POLICY "Permitir criação de configurações para autenticados"
  ON site_settings FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- POLÍTICAS DE SEGURANÇA - ADMIN_USERS
-- ============================================

DROP POLICY IF EXISTS "Usuários autenticados podem ver admins" ON admin_users;
CREATE POLICY "Usuários autenticados podem ver admins"
  ON admin_users FOR SELECT TO authenticated USING (true);

-- ============================================
-- PARTE 3: FUNÇÕES PARA GERENCIAR USUÁRIOS
-- ============================================

-- Função: Criar novo usuário admin
CREATE OR REPLACE FUNCTION create_admin_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  IF user_email IS NULL OR user_password IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Email e senha são obrigatórios');
  END IF;

  IF LENGTH(user_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'A senha deve ter no mínimo 6 caracteres');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Este email já está cadastrado');
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    user_email, crypt(user_password, gen_salt('bf')),
    NOW(), '{"provider":"email","providers":["email"]}', '{}',
    NOW(), NOW(), '', '', '', ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO admin_users (user_id) VALUES (new_user_id);

  RETURN json_build_object('success', true, 'user_id', new_user_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Função: Listar usuários admin
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (id UUID, email TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.created_at, u.last_sign_in_at
  FROM auth.users u
  WHERE u.id IN (SELECT user_id FROM admin_users)
  ORDER BY u.created_at DESC;
END;
$$;

-- Função: Deletar usuário admin
CREATE OR REPLACE FUNCTION delete_admin_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  IF target_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Você não pode deletar seu próprio usuário');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  DELETE FROM admin_users WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Função: Atualizar senha de usuário admin
CREATE OR REPLACE FUNCTION update_admin_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  IF target_user_id IS NULL OR new_password IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ID e nova senha são obrigatórios');
  END IF;

  IF LENGTH(new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'A senha deve ter no mínimo 6 caracteres');
  END IF;

  IF target_user_id <> auth.uid() THEN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = target_user_id) THEN
      RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
    END IF;
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Dar permissões
GRANT EXECUTE ON FUNCTION create_admin_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_password(UUID, TEXT) TO authenticated;

-- ============================================
-- PARTE 4: DADOS INICIAIS
-- ============================================

-- Inserir categorias de exemplo
INSERT INTO categories (name, slug) VALUES
  ('Áudio', 'audio'),
  ('Vídeo', 'video'),
  ('Iluminação', 'iluminacao'),
  ('Fotografia', 'fotografia'),
  ('Estrutural', 'estrutural'),
  ('impressão 3d test', 'impressao-3d-test')
ON CONFLICT (slug) DO NOTHING;

-- Inserir configurações padrão do rodapé
INSERT INTO site_settings (phone, email, address, instagram_url, whatsapp_url) VALUES
  ('(11) 988 212 411', 
   'contato@artbox3d.com.br', 
   'Av. Santo Amaro, 4644 - Loja 3 • Brooklin Office Center',
   'https://www.instagram.com/worldstage.store?igsh=cDlwNnJ4azFxcm9k',
   'https://wa.me/5511988538000')
ON CONFLICT DO NOTHING;

-- IMPORTANTE: Registrar seu usuário como admin
-- Substitua o email abaixo pelo seu email de login
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'sidnei.barreto@nextredpro.com'
ON CONFLICT DO NOTHING;
