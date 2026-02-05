-- ============================================
-- CORREÇÃO DOS AVISOS DE SEGURANÇA
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================

-- ============================================
-- PARTE 1: CORRIGIR POLÍTICAS RLS
-- Trocar USING (true) por verificação de admin
-- ============================================

-- Função auxiliar para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$;

-- ============================================
-- CATEGORIES - Políticas Corrigidas
-- ============================================

DROP POLICY IF EXISTS "Permitir criação de categorias para autenticados" ON categories;
CREATE POLICY "Permitir criação de categorias para autenticados"
  ON categories FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Permitir atualização de categorias para autenticados" ON categories;
CREATE POLICY "Permitir atualização de categorias para autenticados"
  ON categories FOR UPDATE TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Permitir exclusão de categorias para autenticados" ON categories;
CREATE POLICY "Permitir exclusão de categorias para autenticados"
  ON categories FOR DELETE TO authenticated 
  USING (is_admin());

-- ============================================
-- EQUIPMENTS - Políticas Corrigidas
-- ============================================

DROP POLICY IF EXISTS "Permitir leitura completa para autenticados" ON equipments;
CREATE POLICY "Permitir leitura completa para autenticados"
  ON equipments FOR SELECT TO authenticated 
  USING (is_admin());

DROP POLICY IF EXISTS "Permitir criação de equipamentos para autenticados" ON equipments;
CREATE POLICY "Permitir criação de equipamentos para autenticados"
  ON equipments FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Permitir atualização de equipamentos para autenticados" ON equipments;
CREATE POLICY "Permitir atualização de equipamentos para autenticados"
  ON equipments FOR UPDATE TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Permitir exclusão de equipamentos para autenticados" ON equipments;
CREATE POLICY "Permitir exclusão de equipamentos para autenticados"
  ON equipments FOR DELETE TO authenticated 
  USING (is_admin());

-- ============================================
-- SITE_SETTINGS - Políticas Corrigidas
-- ============================================

DROP POLICY IF EXISTS "Permitir atualização de configurações para autenticados" ON site_settings;
CREATE POLICY "Permitir atualização de configurações para autenticados"
  ON site_settings FOR UPDATE TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Permitir criação de configurações para autenticados" ON site_settings;
CREATE POLICY "Permitir criação de configurações para autenticados"
  ON site_settings FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

-- ============================================
-- ADMIN_USERS - Política Corrigida
-- ============================================

DROP POLICY IF EXISTS "Usuários autenticados podem ver admins" ON admin_users;
CREATE POLICY "Usuários autenticados podem ver admins"
  ON admin_users FOR SELECT TO authenticated 
  USING (is_admin());

-- ============================================
-- PARTE 2: CORRIGIR FUNÇÕES (SEARCH PATH)
-- ============================================

-- Função: Criar novo usuário admin (CORRIGIDA)
CREATE OR REPLACE FUNCTION create_admin_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT is_admin() THEN
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

-- Função: Listar usuários admin (CORRIGIDA)
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (id UUID, email TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.created_at, u.last_sign_in_at
  FROM auth.users u
  WHERE u.id IN (SELECT user_id FROM admin_users)
  ORDER BY u.created_at DESC;
END;
$$;

-- Função: Deletar usuário admin (CORRIGIDA)
CREATE OR REPLACE FUNCTION delete_admin_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT is_admin() THEN
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

-- Função: Atualizar senha de usuário admin (CORRIGIDA)
CREATE OR REPLACE FUNCTION update_admin_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  IF target_user_id IS NULL OR new_password IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'ID e nova senha são obrigatórios');
  END IF;

  IF LENGTH(new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'A senha deve ter no mínimo 6 caracteres');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- FIM DAS CORREÇÕES
-- ============================================
-- Avisos devem sumir após executar este SQL
