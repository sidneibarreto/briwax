'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

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
  situacao_cnpj?: string
}

const CAMPOS_LABELS: Record<string, string> = {
  nome_empresa: 'Nome da empresa',
  whatsapp: 'WhatsApp',
  estado: 'Estado',
  cidade: 'Cidade',
  nome_socio: 'Nome do sócio',
}

export default function PerfilPage() {
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<any>(null)

  // Estado do formulário de solicitação
  const [modoEdicao, setModoEdicao] = useState(false)
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [solicitacaoPendente, setSolicitacaoPendente] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/')
        return
      }
      setUsuario(u)
      await carregarDados(u.uid)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function carregarDados(uid: string) {
    try {
      const snap = await getDocs(query(collection(db, 'clientes'), where('user_id', '==', uid)))
      if (!snap.empty) {
        const d = snap.docs[0]
        setCliente({ id: d.id, ...d.data() } as Cliente)
        // Verifica se já existe solicitação pendente
        const solSnap = await getDocs(
          query(
            collection(db, 'solicitacoes_perfil'),
            where('user_id', '==', uid),
            where('status', '==', 'pendente')
          )
        )
        setSolicitacaoPendente(!solSnap.empty)
      }
    } catch (e) {
      console.error('Erro ao carregar dados do cliente:', e)
    }
  }

  function abrirEdicao() {
    if (!cliente) return
    setCampos({
      nome_empresa: cliente.nome_empresa || '',
      whatsapp: cliente.whatsapp || '',
      estado: cliente.estado || '',
      cidade: cliente.cidade || '',
      nome_socio: cliente.nome_socio || '',
    })
    setModoEdicao(true)
  }

  async function enviarSolicitacao() {
    if (!cliente || !usuario) return

    // Filtra apenas campos que foram alterados
    const modificados: Record<string, string> = {}
    for (const [campo, valor] of Object.entries(campos)) {
      const valorAtual = (cliente as any)[campo] || ''
      if (valor.trim() !== valorAtual.trim() && valor.trim() !== '') {
        modificados[campo] = valor.trim()
      }
    }

    if (Object.keys(modificados).length === 0) {
      alert('Nenhuma alteração foi feita.')
      return
    }

    setEnviando(true)
    try {
      await addDoc(collection(db, 'solicitacoes_perfil'), {
        user_id: usuario.uid,
        cliente_id: cliente.id,
        nome_empresa: cliente.nome_empresa,
        email: cliente.email,
        campos: modificados,
        status: 'pendente',
        created_at: serverTimestamp(),
      })
      setSucesso(true)
      setSolicitacaoPendente(true)
      setModoEdicao(false)
    } catch (e) {
      console.error('Erro ao enviar solicitação:', e)
      alert('Erro ao enviar solicitação. Tente novamente.')
    }
    setEnviando(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="text-gray-600">Cadastro não encontrado. Faça login novamente.</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
            <p className="text-sm text-gray-500 mt-1">{cliente.email}</p>
          </div>
          {!modoEdicao && !solicitacaoPendente && (
            <button
              onClick={abrirEdicao}
              className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition"
            >
              Solicitar alteração
            </button>
          )}
          {solicitacaoPendente && !sucesso && (
            <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-3 py-1.5 rounded-full border border-yellow-200">
              Solicitação pendente
            </span>
          )}
        </div>

        {sucesso && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
            <p className="text-green-800 font-medium text-sm">
              Solicitação enviada com sucesso! Um administrador irá revisar e aplicar as alterações em breve.
            </p>
          </div>
        )}

        {/* Dados atuais */}
        {!modoEdicao && (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {[
              { label: 'Empresa', value: cliente.nome_empresa },
              { label: 'CNPJ', value: cliente.cnpj },
              { label: 'WhatsApp', value: cliente.whatsapp },
              { label: 'Estado', value: cliente.estado },
              { label: 'Cidade', value: cliente.cidade },
              ...(cliente.nome_socio ? [{ label: 'Sócio', value: cliente.nome_socio }] : []),
              ...(cliente.situacao_cnpj ? [{ label: 'Situação CNPJ', value: cliente.situacao_cnpj }] : []),
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-gray-500 w-32 shrink-0">{item.label}</span>
                <span className="text-sm font-medium text-gray-900 text-right">{item.value || '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Formulário de solicitação de edição */}
        {modoEdicao && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-5">
              Preencha apenas os campos que deseja alterar. A solicitação será enviada para aprovação do administrador.
            </p>
            <div className="space-y-4">
              {Object.entries(CAMPOS_LABELS).map(([campo, label]) => (
                <div key={campo}>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={campos[campo] || ''}
                    onChange={(e) => setCampos((prev) => ({ ...prev, [campo]: e.target.value }))}
                    placeholder={(cliente as any)[campo] || 'Valor atual vazio'}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModoEdicao(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={enviarSolicitacao}
                disabled={enviando}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60"
              >
                {enviando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
