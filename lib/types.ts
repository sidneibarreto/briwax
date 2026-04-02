export interface Category {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Equipment {
  id: string
  name: string
  description: string
  image_url: string
  images?: string[]
  category_id: string
  status: 'draft' | 'published'
  preco?: number
  created_at: string
  category?: Category
}

// Tipos do sistema de cotação
export interface Cliente {
  id: string
  user_id: string
  nome_empresa: string
  email: string
  cnpj: string
  whatsapp: string
  estado: string
  cidade: string
  nome_socio?: string
  razao_social_oficial?: string
  situacao_cnpj?: string
  created_at: string
}

export interface Cotacao {
  id: string
  cliente_id: string
  status: 'pendente' | 'em_analise' | 'enviada' | 'cancelada'
  observacoes?: string
  created_at: string
  updated_at: string
  cliente?: Cliente
  items?: CotacaoItem[]
}

export interface CotacaoItem {
  id: string
  cotacao_id: string
  equipment_id?: string
  nome_equipamento: string
  quantidade: number
  preco_unitario: number
  preco_editado?: number
  created_at: string
  equipment?: Equipment
}

// Item dentro do carrinho (antes de salvar no BD)
export interface CartItem {
  equipment: Equipment
  quantidade: number
}
