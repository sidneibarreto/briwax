'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getUser } from '@/lib/auth'
import AdminHeader from '@/components/AdminHeader'

interface Solicitacao {
  id: string
  user_id: string
  cliente_id: string
  nome_empresa: string
  email: string
  campos: Record<string, string>
  status: 'pendente' | 'aprovada' | 'recusada'
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [solicitacaoAberta, setSolicitacaoAberta] = useState<Solicitacao | null>(null)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const currentUser = await getUser()
    if (!currentUser) {
      router.push('/admin')
      return
    }
    setUser(currentUser)
    await loadSolicitacoes()
    setLoading(false)
  }

  async function loadSolicitacoes() {
    try {
      const snap = await getDocs(
        query(collection(db, 'solicitacoes_perfil'), where('status', '==', 'pendente'))
      )
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Solicitacao))
      lista.sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
      setSolicitacoes(lista)
    } catch (e) {
      console.error('Erro ao carregar solicitações:', e)
    }
  }

  async function aprovar(s: Solicitacao) {
    setProcessando(true)
    try {
      // Atualiza documento do cliente com os novos campos
      await updateDoc(doc(db, 'clientes', s.cliente_id), {
        ...s.campos,
        updated_at: serverTimestamp(),
      })
      // Marca solicitação como aprovada
      await updateDoc(doc(db, 'solicitacoes_perfil', s.id), {
        status: 'aprovada',
        resolved_at: serverTimestamp(),
      })
      setSolicitacoes((prev) => prev.filter((x) => x.id !== s.id))
      setSolicitacaoAberta(null)
    } catch (e) {
      console.error('Erro ao aprovar:', e)
    }
    setProcessando(false)
  }

  async function recusar(s: Solicitacao) {
    setProcessando(true)
    try {
      await updateDoc(doc(db, 'solicitacoes_perfil', s.id), {
        status: 'recusada',
        resolved_at: serverTimestamp(),
      })
      setSolicitacoes((prev) => prev.filter((x) => x.id !== s.id))
      setSolicitacaoAberta(null)
    } catch (e) {
      console.error('Erro ao recusar:', e)
    }
    setProcessando(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-2">Gerencie categorias e equipamentos</p>
        </div>

        {/* Notificações de solicitações pendentes */}
        {solicitacoes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
              <h3 className="text-base font-semibold text-gray-900">
                Solicitações de edição de perfil
                <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {solicitacoes.length}
                </span>
              </h3>
            </div>
            <div className="space-y-2">
              {solicitacoes.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-orange-200 rounded-2xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{s.nome_empresa}</p>
                    <p className="text-xs text-gray-500">{s.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Campos solicitados: {Object.keys(s.campos).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSolicitacaoAberta(s)}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
                  >
                    Revisar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Categorias */}
          <Link href="/admin/categories" className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-primary-500 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Categorias</h3>
            <p className="text-gray-600">Gerenciar categorias de equipamentos</p>
          </Link>

          {/* Card Equipamentos */}
          <Link href="/admin/equipments" className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-primary-500 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Equipamentos</h3>
            <p className="text-gray-600">Gerenciar equipamentos do portfólio</p>
          </Link>

          {/* Card Configurações */}
          <Link href="/admin/settings" className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-primary-500 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Configurações</h3>
            <p className="text-gray-600">Personalizar logo e visual do site</p>
          </Link>

          {/* Card Administradores */}
          <Link href="/admin/users" className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-primary-500 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Administradores</h3>
            <p className="text-gray-600">Gerenciar usuários com acesso ao painel</p>
          </Link>

          {/* Card Clientes */}
          <Link href="/admin/clientes" className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-primary-500 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-teal-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Clientes</h3>
            <p className="text-gray-600">Ver empresas cadastradas para cotação</p>
          </Link>

          {/* Card Pedidos de Cotação */}
          <Link href="/admin/cotacoes" className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-primary-500 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pedidos de Cotação</h3>
            <p className="text-gray-600">Visualizar e responder cotações de clientes</p>
          </Link>
        </div>

        <div className="mt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Ver site público
          </Link>
        </div>
      </main>

      {/* Modal de revisão de solicitação */}
      {solicitacaoAberta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Solicitação de edição de perfil</h3>
              <p className="text-sm text-gray-500 mt-1">{solicitacaoAberta.nome_empresa} — {solicitacaoAberta.email}</p>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700 font-medium">Alterações solicitadas:</p>
              {Object.entries(solicitacaoAberta.campos).map(([campo, valor]) => (
                <div key={campo} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{campo.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{valor || '(vazio)'}</p>
                </div>
              ))}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => recusar(solicitacaoAberta)}
                disabled={processando}
                className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-60"
              >
                Recusar
              </button>
              <button
                onClick={() => aprovar(solicitacaoAberta)}
                disabled={processando}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60"
              >
                {processando ? 'Processando...' : 'Aprovar e aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
