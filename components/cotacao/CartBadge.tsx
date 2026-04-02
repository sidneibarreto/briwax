'use client'

import { useRouter } from 'next/navigation'
import { useCart } from './CartProvider'

export default function CartBadge() {
  const { totalItems } = useCart()
  const router = useRouter()

  if (totalItems === 0) return null

  return (
    <div className="fixed top-4 right-4 z-40 animate-fade-in">
      <button
        onClick={() => router.push('/cotacao/revisar')}
        className="flex items-center gap-3 bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl shadow-primary-600/40 transition-all hover:scale-105 active:scale-95"
      >
        {/* Ícone carrinho */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>Fazer Pedido de Cotação</span>
        {/* Badge com quantidade */}
        <span className="bg-white text-primary-600 text-xs font-extrabold rounded-full w-6 h-6 flex items-center justify-center">
          {totalItems}
        </span>
      </button>
    </div>
  )
}
