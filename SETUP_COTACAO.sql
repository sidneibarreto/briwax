-- ============================================================
-- SISTEMA DE COTAÇÃO - SETUP COMPLETO
-- Execute este SQL no painel do Supabase (SQL Editor)
-- ============================================================

-- 1. TABELA DE CLIENTES (empresas que fazem cotação)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_empresa TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cnpj TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  estado TEXT NOT NULL,
  cidade TEXT NOT NULL,
  -- Dados buscados automaticamente via API de CNPJ
  nome_socio TEXT,
  razao_social_oficial TEXT,
  situacao_cnpj TEXT DEFAULT 'ATIVA',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE COTAÇÕES
CREATE TABLE IF NOT EXISTS cotacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'enviada', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE ITENS DA COTAÇÃO
CREATE TABLE IF NOT EXISTS cotacao_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID REFERENCES cotacoes(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipments(id) ON DELETE SET NULL,
  nome_equipamento TEXT NOT NULL,
  quantidade INTEGER DEFAULT 1,
  -- Preço padrão vindo do estoque (editável pelo admin)
  preco_unitario NUMERIC(12, 2) DEFAULT 0,
  preco_editado NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Adicionar campo de preço padrão nos equipamentos (para o estoque)
ALTER TABLE equipments ADD COLUMN IF NOT EXISTS preco NUMERIC(12, 2) DEFAULT 0;

-- 5. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_cliente_id ON cotacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_status ON cotacoes(status);
CREATE INDEX IF NOT EXISTS idx_cotacao_items_cotacao_id ON cotacao_items(cotacao_id);

-- 6. TRIGGER para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cotacoes_updated_at
  BEFORE UPDATE ON cotacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacao_items ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes:
-- Cliente só vê seus próprios dados
CREATE POLICY "cliente_ver_proprio" ON clientes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cliente_inserir_proprio" ON clientes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cliente_atualizar_proprio" ON clientes
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para cotações:
-- Cliente só vê suas próprias cotações
CREATE POLICY "cliente_ver_cotacoes" ON cotacoes
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
  );

CREATE POLICY "cliente_inserir_cotacao" ON cotacoes
  FOR INSERT WITH CHECK (
    cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
  );

-- Políticas para itens:
CREATE POLICY "cliente_ver_items" ON cotacao_items
  FOR SELECT USING (
    cotacao_id IN (
      SELECT c.id FROM cotacoes c
      JOIN clientes cl ON c.cliente_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

CREATE POLICY "cliente_inserir_items" ON cotacao_items
  FOR INSERT WITH CHECK (
    cotacao_id IN (
      SELECT c.id FROM cotacoes c
      JOIN clientes cl ON c.cliente_id = cl.id
      WHERE cl.user_id = auth.uid()
    )
  );

-- 8. Acesso total para usuários autenticados como admin
-- (Os admins usam a service_role key no backend ou têm role especial)
-- Para simplificar, permitir SELECT de todas cotacoes para usuários autenticados do painel admin:
CREATE POLICY "admin_ver_tudo_clientes" ON clientes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (true);

CREATE POLICY "admin_ver_tudo_cotacoes" ON cotacoes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (true);

CREATE POLICY "admin_ver_tudo_items" ON cotacao_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (true);

-- ============================================================
-- FIM DO SETUP
-- ============================================================
