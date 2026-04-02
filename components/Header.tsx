'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { signOut } from '@/lib/auth'
import { useCart } from '@/components/cotacao/CartProvider'
import AuthModalCotacao from '@/components/cotacao/AuthModalCotacao'
import type { Category } from '@/lib/types'

interface HeaderProps {
  selectedCategory?: string | null
  onCategoryChange?: (categoryId: string | null) => void
}

export default function Header({ selectedCategory = null, onCategoryChange = () => {} }: HeaderProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [logoUrl] = useState('/logo.png')
  const [user, setUser] = useState<any>(null)
  const [modalAuthAberto, setModalAuthAberto] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const { totalItems } = useCart()
  const router = useRouter()

  useEffect(() => {
    loadCategories()
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsubscribe()
  }, [])

  async function loadCategories() {
    try {
      const q = query(collection(db, 'categorias'), orderBy('name'))
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[]
      setCategories(data)
    } catch (e) {
      console.error('[Header] Erro ao carregar categorias:', e)
    }
  }

  async function handleLogout() {
    await signOut()
    setUser(null)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        {/* Linha superior: Logo + ações */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 group"
              title="Início"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200 group-hover:ring-gray-400 transition-all">
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="hidden sm:block text-base font-semibold text-gray-900 tracking-tight">
                World Stage Store
              </span>
            </button>

            {/* Ações: cotação + auth + hamburguer */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Ver Cotação */}
              <button
                onClick={() => router.push('/cotacao/revisar')}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
              >
                <span className="hidden sm:inline">Ver cotação</span>
                <span className="sm:hidden">Cotação</span>
                {totalItems > 0 && (
                  <span className="bg-indigo-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none shrink-0">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Divisor */}
              <div className="w-px h-5 bg-gray-200 mx-1" />

              {/* Login / Conta */}
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden lg:block text-sm text-gray-500 max-w-[140px] truncate">
                    {user.email}
                  </span>
                  <button
                    onClick={() => router.push('/cotacao/perfil')}
                    title="Meu Perfil"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden sm:inline">Perfil</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    title="Sair"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setModalAuthAberto(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-all shadow-sm shadow-indigo-200"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Entrar</span>
                </button>
              )}

              {/* Hamburguer — oculto apenas em telas grandes */}
              <button
                onClick={() => setMenuAberto((v) => !v)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-600 hover:bg-gray-100 transition-all ml-1"
                aria-label="Categorias"
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${menuAberto ? 'rotate-90' : 'rotate-0'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  {menuAberto
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de categorias — desktop (lg+) */}
        <div className="hidden lg:block border-t border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex items-center gap-1 py-2">
              <button
                onClick={() => onCategoryChange(null)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                  selectedCategory === null
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                    selectedCategory === category.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Dropdown de categorias — mobile/tablet (< lg) — animado */}
        <div
          className={`lg:hidden border-t border-gray-100 bg-white overflow-hidden transition-all duration-300 ease-in-out ${
            menuAberto ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 py-3">
            <nav className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onCategoryChange(null); setMenuAberto(false) }}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                  selectedCategory === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => { onCategoryChange(category.id); setMenuAberto(false) }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                    selectedCategory === category.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Modal de Auth */}
      {modalAuthAberto && (
        <AuthModalCotacao
          onClose={() => setModalAuthAberto(false)}
          onAutenticado={() => setModalAuthAberto(false)}
        />
      )}
    </>
  )
}

