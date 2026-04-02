'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getUser } from '@/lib/auth'
import AdminHeader from '@/components/AdminHeader'

interface Cliente {
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

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function ClientesPage() {
  const [user, setUser] = useState<any>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msgEdicao, setMsgEdicao] = useState('')

  useEffect(() => {
    getUser().then((u) => setUser(u))
    loadClientes()
  }, [])

  async function loadClientes() {
    setLoading(true)
    try {
      // Sem orderBy para não excluir documentos sem o campo created_at
      const snap = await getDocs(collection(db, 'clientes'))
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cliente))
      // Ordena client-side: mais recentes primeiro, documentos sem data vão para o fim
      lista.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0
        const db2 = b.created_at ? new Date(b.created_at).getTime() : 0
        return db2 - da
      })
      setClientes(lista)
    } catch (e) {
      console.error('Erro ao carregar clientes:', e)
    }
    setLoading(false)
  }

  function isIncompleto(c: Cliente) {
    return !c.cnpj || !c.nome_empresa || c.nome_empresa === c.email || !c.whatsapp
  }

  function abrirEdicao(c: Cliente) {
    setEditando({ ...c })
    setMsgEdicao('')
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    setMsgEdicao('')
    try {
      await updateDoc(doc(db, 'clientes', editando.id), {
        nome_empresa: editando.nome_empresa,
        cnpj: editando.cnpj.replace(/\D/g, ''),
        whatsapp: editando.whatsapp,
        estado: editando.estado,
        cidade: editando.cidade,
        nome_socio: editando.nome_socio || '',
        situacao_cnpj: editando.situacao_cnpj || '',
      })
      setClientes((prev) => prev.map((c) => c.id === editando.id ? { ...c, ...editando } : c))
      setMsgEdicao('Salvo com sucesso! ✅')
      setTimeout(() => setEditando(null), 1200)
    } catch (e) {
      console.error(e)
      setMsgEdicao('Erro ao salvar. Tente novamente.')
    }
    setSalvando(false)
  }

  const clientesFiltrados = clientes.filter((c) => {
    const q = busca.toLowerCase()
    return (
      c.nome_empresa?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.cnpj?.includes(q) ||
      c.cidade?.toLowerCase().includes(q) ||
      c.estado?.toLowerCase().includes(q)
    )
  })

  function formatCNPJ(cnpj: string) {
    const n = cnpj?.replace(/\D/g, '') || ''
    if (n.length !== 14) return cnpj || '—'
    return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  function formatDate(str: string) {
    if (!str) return '—'
    try {
      return new Date(str).toLocaleDateString('pt-BR')
    } catch {
      return str
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            ← Voltar ao Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Clientes Cadastrados</h2>
            <p className="text-gray-500 mt-1">
              {loading ? '...' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} no total`}
            </p>
          </div>
          <button
            onClick={loadClientes}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-4 py-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por empresa, e-mail, CNPJ, cidade..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Carregando clientes...</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {busca ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado ainda.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Empresa</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">E-mail</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">CNPJ</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">WhatsApp</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Localização</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cadastro</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className={`hover:bg-gray-50 transition-colors ${isIncompleto(cliente) ? 'bg-orange-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm">{cliente.nome_empresa || '—'}</p>
                            {isIncompleto(cliente) && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">incompleto</span>
                            )}
                          </div>
                          {cliente.nome_socio && (
                            <p className="text-xs text-gray-500 mt-0.5">{cliente.nome_socio}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{cliente.email || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 font-mono">{formatCNPJ(cliente.cnpj)}</span>
                        {cliente.situacao_cnpj && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            cliente.situacao_cnpj?.toUpperCase() === 'ATIVA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>{cliente.situacao_cnpj}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{cliente.whatsapp || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {cliente.cidade && cliente.estado ? `${cliente.cidade} / ${cliente.estado}` : cliente.estado || cliente.cidade || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(cliente.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => abrirEdicao(cliente)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Editar cadastro</h3>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">E-mail: <span className="font-medium text-gray-800">{editando.email}</span></p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Razão Social</label>
                <input
                  type="text"
                  value={editando.nome_empresa}
                  onChange={(e) => setEditando({ ...editando, nome_empresa: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={editando.cnpj}
                  onChange={(e) => setEditando({ ...editando, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editando.whatsapp}
                  onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={editando.estado}
                    onChange={(e) => setEditando({ ...editando, estado: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione</option>
                    {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={editando.cidade}
                    onChange={(e) => setEditando({ ...editando, cidade: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do sócio</label>
                <input
                  type="text"
                  value={editando.nome_socio || ''}
                  onChange={(e) => setEditando({ ...editando, nome_socio: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Situação CNPJ</label>
                <select
                  value={editando.situacao_cnpj || ''}
                  onChange={(e) => setEditando({ ...editando, situacao_cnpj: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Não informado</option>
                  <option value="ATIVA">ATIVA</option>
                  <option value="INAPTA">INAPTA</option>
                  <option value="SUSPENSA">SUSPENSA</option>
                  <option value="BAIXADA">BAIXADA</option>
                </select>
              </div>

              {msgEdicao && (
                <p className={`text-sm px-4 py-2 rounded-xl ${
                  msgEdicao.includes('sucesso') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>{msgEdicao}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditando(null)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  disabled={salvando}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-bold transition"
                >
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
