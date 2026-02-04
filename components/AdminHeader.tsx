'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/auth'

interface AdminHeaderProps {
  user: any
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter()
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    loadLogo()
  }, [])

  async function loadLogo() {
    const { data } = supabase.storage
      .from('equipments')
      .getPublicUrl('logo.png')
    
    if (data) {
      setLogoUrl(data.publicUrl)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/admin')
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <button 
              onClick={() => window.location.reload()}
              className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer hover:scale-105"
              title="Recarregar página"
            >
              <img 
                src={logoUrl} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </button>
          )}
          <h1 className="text-2xl font-semibold text-gray-900">Painel Administrativo</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
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
