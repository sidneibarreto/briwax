-- ============================================
-- FUNÇÕES SEGURAS PARA GERENCIAMENTO DE USUÁRIOS ADMIN
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela para rastrear admins (opcional, para segurança extra)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Política: apenas usuários autenticados podem ver admins
CREATE POLICY "Usuários autenticados podem ver admins"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- FUNÇÃO: Criar novo usuário admin
-- ============================================
CREATE OR REPLACE FUNCTION create_admin_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios do criador da função
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Verificar se o usuário atual está autenticado
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Não autorizado'
    );
  END IF;

  -- Validações
  IF user_email IS NULL OR user_password IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email e senha são obrigatórios'
    );
  END IF;

  IF LENGTH(user_password) < 6 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'A senha deve ter no mínimo 6 caracteres'
    );
  END IF;

  -- Verificar se o email já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este email já está cadastrado'
    );
  END IF;

  -- Criar o usuário (requer extensão supabase_auth_admin)
  -- Como não podemos usar auth.admin diretamente via função,
  -- vamos usar uma abordagem alternativa: inserir na tabela auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Adicionar à tabela de admins
  INSERT INTO admin_users (user_id) VALUES (new_user_id);

  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================
-- FUNÇÃO: Listar usuários admin
-- ============================================
CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  WHERE u.id IN (SELECT user_id FROM admin_users)
  ORDER BY u.created_at DESC;
END;
$$;

-- ============================================
-- FUNÇÃO: Deletar usuário admin
-- ============================================
CREATE OR REPLACE FUNCTION delete_admin_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual está autenticado
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Não autorizado'
    );
  END IF;

  -- Não permitir que o usuário delete a si mesmo
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você não pode deletar seu próprio usuário'
    );
  END IF;

  -- Verificar se é um admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = target_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não encontrado'
    );
  END IF;

  -- Deletar da tabela admin_users (o cascade vai deletar de auth.users)
  DELETE FROM admin_users WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================
-- FUNÇÃO: Atualizar senha de usuário admin
-- ============================================
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
  SET
    encrypted_password = crypt(new_password, gen_salt('bf')),
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

-- ============================================
-- Dar permissões para usuários autenticados
-- ============================================
GRANT EXECUTE ON FUNCTION create_admin_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_password(UUID, TEXT) TO authenticated;

-- ============================================
-- Inserir o primeiro admin (você)
-- Execute isso apenas UMA VEZ, com o email que você usa para login
-- ============================================
-- Substitua 'seu-email@exemplo.com' pelo email do seu usuário atual
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'sidnei.barreto@nextredpro.com'
ON CONFLICT DO NOTHING;
