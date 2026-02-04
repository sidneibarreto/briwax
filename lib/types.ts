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
  category_id: string
  status: 'draft' | 'published'
  created_at: string
  category?: Category
}
