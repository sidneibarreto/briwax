'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth'

interface AdminHeaderProps {
  user: any
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [logoUrl] = useState('/logo.png')
  const isDashboard = pathname === '/admin/dashboard'

  async function handleSignOut() {
    await signOut()
    router.push('/admin')
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo + título linkam para o dashboard */}
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 group"
            title="Ir para o Dashboard"
          >
            {logoUrl && (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 group-hover:border-primary-400 transition-all group-hover:scale-105">
                <img
                  src={logoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h1 className="text-2xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              Painel Administrativo
            </h1>
          </Link>

          {/* Botão voltar — apenas fora do dashboard */}
          {!isDashboard && (
            <Link
              href="/admin/dashboard"
              className="ml-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Dashboard</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
