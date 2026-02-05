'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/types'

interface HeaderProps {
  selectedCategory: string | null
  onCategoryChange: (categoryId: string | null) => void
}

export default function Header({ selectedCategory, onCategoryChange }: HeaderProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    loadCategories()
    loadLogo()
  }, [])

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (data) {
      setCategories(data)
    }
  }

  async function loadLogo() {
    const { data } = supabase.storage
      .from('equipments')
      .getPublicUrl('logo.png')
    
    if (data) {
      setLogoUrl(data.publicUrl)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo */}
          <div className="flex items-center justify-center sm:justify-start">
            {logoUrl ? (
              <button 
                onClick={() => window.location.reload()}
                className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer hover:scale-105"
                title="Recarregar página"
              >
                <img 
                  src={logoUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </button>
            ) : null}
          </div>

          {/* Category Filters - Estilo Apple */}
          <nav className="w-full flex flex-wrap items-center justify-start sm:justify-end gap-2 bg-gray-100/80 backdrop-blur-sm p-2 rounded-2xl shadow-sm overflow-x-auto sm:overflow-visible">
            <button
              onClick={() => onCategoryChange(null)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
                selectedCategory === null
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {category.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
