'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [verificado, setVerificado] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // Página de login do admin não precisa de verificação
      if (pathname === '/admin') {
        setVerificado(true)
        return
      }

      if (!user) {
        router.replace('/admin')
        return
      }

      // Verifica se o uid está na coleção administradores
      try {
        const snap = await getDoc(doc(db, 'administradores', user.uid))
        if (snap.exists()) {
          setVerificado(true)
        } else {
          // Usuário autenticado mas não é admin → redireciona para home
          router.replace('/')
        }
      } catch {
        router.replace('/')
      }
    })
    return () => unsub()
  }, [pathname, router])

  if (!verificado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
