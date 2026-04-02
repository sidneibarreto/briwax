'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getUser } from '@/lib/auth'
import AdminHeader from '@/components/AdminHeader'
import type { Cotacao, CotacaoItem, Cliente } from '@/lib/types'

interface CotacaoCompleta extends Cotacao {
  cliente: Cliente
  items: CotacaoItemEditavel[]
}

interface CotacaoItemEditavel extends CotacaoItem {
  preco_exibido: number
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  enviada: 'Enviada',
  cancelada: 'Cancelada',
}

const STATUS_CORES: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  em_analise: 'bg-blue-100 text-blue-800',
  enviada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
}

export default function CotacoesAdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [cotacoes, setCotacoes] = useState<CotacaoCompleta[]>([])
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState<CotacaoCompleta | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [mensagemEmail, setMensagemEmail] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

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
    carregarCotacoes()
  }

  async function carregarCotacoes() {
    setLoading(true)
    try {
      // 1. Buscar todas as cotações
      const cotacoesSnap = await getDocs(query(collection(db, 'cotacoes'), orderBy('created_at', 'desc')))
      const cotacoesData = cotacoesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))

      // 2. Buscar todos os itens
      const itensSnap = await getDocs(collection(db, 'itens_cotacao'))
      const itensPorCotacao: Record<string, any[]> = {}
      itensSnap.docs.forEach((d) => {
        const data = d.data() as any
        if (!itensPorCotacao[data.cotacao_id]) itensPorCotacao[data.cotacao_id] = []
        itensPorCotacao[data.cotacao_id].push({ id: d.id, ...data })
      })

      // 3. Buscar clientesúnicos
      const clienteIds = [...new Set(cotacoesData.map((c: any) => c.cliente_id).filter(Boolean))]
      const clienteMap: Record<string, any> = {}
      await Promise.all(
        clienteIds.map(async (id) => {
          const snap = await getDoc(doc(db, 'clientes', id as string))
          if (snap.exists()) clienteMap[snap.id] = { id: snap.id, ...snap.data() }
        })
      )

      const transformadas = cotacoesData.map((c: any) => ({
        ...c,
        cliente: clienteMap[c.cliente_id] || {},
        items: (itensPorCotacao[c.id] || []).map((item: CotacaoItem) => ({
          ...item,
          preco_exibido: (item as any).preco_editado ?? item.preco_unitario,
        })),
      }))
      setCotacoes(transformadas as CotacaoCompleta[])
    } catch {}
    setLoading(false)
  }

  function handleEditarPreco(itemId: string, valor: string) {
    if (!cotacaoSelecionada) return
    const num = parseFloat(valor) || 0
    setCotacaoSelecionada((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, preco_exibido: num } : i
        ),
      }
    })
  }

  async function salvarPrecos() {
    if (!cotacaoSelecionada) return
    for (const item of cotacaoSelecionada.items) {
      await updateDoc(doc(db, 'itens_cotacao', item.id), { preco_editado: item.preco_exibido })
    }
  }

  async function excluirCotacao(cotacaoId: string) {
    if (!confirm('Excluir este pedido de cotação? Esta ação não pode ser desfeita.')) return
    try {
      // Exclui os itens da cotação
      const itensSnap = await getDocs(query(collection(db, 'itens_cotacao'), where('cotacao_id', '==', cotacaoId)))
      await Promise.all(itensSnap.docs.map((d) => deleteDoc(d.ref)))
      // Exclui a cotação
      await deleteDoc(doc(db, 'cotacoes', cotacaoId))
      setCotacoes((prev) => prev.filter((c) => c.id !== cotacaoId))
      if (cotacaoSelecionada?.id === cotacaoId) setCotacaoSelecionada(null)
    } catch (e) {
      console.error('Erro ao excluir:', e)
      alert('Erro ao excluir o pedido.')
    }
  }

  async function alterarStatus(cotacaoId: string, novoStatus: string) {
    await updateDoc(doc(db, 'cotacoes', cotacaoId), { status: novoStatus })
    setCotacoes((prev) =>
      prev.map((c) => c.id === cotacaoId ? { ...c, status: novoStatus as any } : c)
    )
    if (cotacaoSelecionada?.id === cotacaoId) {
      setCotacaoSelecionada((prev) => prev ? { ...prev, status: novoStatus as any } : prev)
    }
  }

  async function handleEnviarEmail() {
    if (!cotacaoSelecionada) return
    setEnviandoEmail(true)
    setMensagemEmail('')

    // Salva preços editados antes de enviar
    await salvarPrecos()

    const { cliente, items } = cotacaoSelecionada
    const cnpjFormatado = (cliente.cnpj || '')
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

    const totalValor = items.reduce((acc, i) => acc + i.preco_exibido * i.quantidade, 0)

    // Monta o corpo do e-mail em HTML
    const itensHtml = items.map((item) =>
      `<tr>
        <td style="padding:10px;border-bottom:1px solid #eee">${item.nome_equipamento}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${item.quantidade}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right">
          ${item.preco_exibido > 0
            ? `R$ ${item.preco_exibido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : 'A consultar'}
        </td>
      </tr>`
    ).join('')

    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto">
  <div style="background:#2563eb;padding:30px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">Cotação de Equipamentos</h1>
    <p style="color:#bfdbfe;margin:8px 0 0">Pedido #${cotacaoSelecionada.id.slice(0, 8).toUpperCase()}</p>
  </div>
  <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:0">
    <h2 style="font-size:16px;color:#2563eb;margin:0 0 16px">Dados da Empresa</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7280;width:140px">Empresa</td><td style="padding:6px 0;font-weight:600">${cliente.nome_empresa}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">CNPJ</td><td style="padding:6px 0">${cnpjFormatado}</td></tr>
      ${cliente.razao_social_oficial ? `<tr><td style="padding:6px 0;color:#6b7280">Razão Social</td><td style="padding:6px 0">${cliente.razao_social_oficial}</td></tr>` : ''}
      ${cliente.nome_socio ? `<tr><td style="padding:6px 0;color:#6b7280">Responsável</td><td style="padding:6px 0">${cliente.nome_socio}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#6b7280">E-mail</td><td style="padding:6px 0">${cliente.email}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">WhatsApp</td><td style="padding:6px 0">${cliente.whatsapp}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Localização</td><td style="padding:6px 0">${cliente.cidade} / ${cliente.estado}</td></tr>
    </table>

    <h2 style="font-size:16px;color:#2563eb;margin:24px 0 16px">Itens Cotados</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px;text-align:left;font-weight:600">Equipamento</th>
          <th style="padding:10px;text-align:center;font-weight:600">Qtd.</th>
          <th style="padding:10px;text-align:right;font-weight:600">Valor Unit.</th>
        </tr>
      </thead>
      <tbody>${itensHtml}</tbody>
      ${totalValor > 0 ? `
      <tfoot>
        <tr style="background:#eff6ff">
          <td colspan="2" style="padding:12px;font-weight:700;font-size:15px">Total estimado</td>
          <td style="padding:12px;font-weight:700;font-size:15px;text-align:right">
            R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tfoot>` : ''}
    </table>

    <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Os valores apresentados são estimativas e podem variar. Entre em contato para confirmar disponibilidade e condições de pagamento.
    </p>
  </div>
</body>
</html>`

    // Envia e-mail via cliente de e-mail padrão (mailto fallback)
    // Para envio automático, integrar com Resend, SendGrid ou Firebase Extension
    try {
      await salvarPrecos()
      const mailtoBody = items
        .map((i) => `• ${i.nome_equipamento} (Qtd: ${i.quantidade}) — ${
          i.preco_exibido > 0
            ? `R$ ${i.preco_exibido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : 'A consultar'
        }`)
        .join('\n')

      const mailtoUrl = `mailto:${cliente.email}?subject=Cotação de equipamentos - ${encodeURIComponent(cliente.nome_empresa)}&body=${encodeURIComponent(
        `Olá, ${cliente.nome_empresa}!\n\nSegue a cotação dos equipamentos solicitados:\n\n${mailtoBody}\n\nAtenciosamente.`
      )}`

      window.open(mailtoUrl)
      await alterarStatus(cotacaoSelecionada.id, 'enviada')
      setMensagemEmail('✓ Cliente de e-mail aberto. Marque como enviada após confirmar o envio.')
    } catch {
      setMensagemEmail('Erro ao tentar abrir cliente de e-mail.')
    }

    setEnviandoEmail(false)
  }

  // Exibe apenas cotações com pelo menos 1 item real
  const cotacoesReais = cotacoes.filter((c) => c.items.length > 0)
  const cotacoesFiltradas = filtroStatus === 'todos'
    ? cotacoesReais
    : cotacoesReais.filter((c) => c.status === filtroStatus)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando cotações...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Pedidos de Cotação</h2>
            <p className="text-gray-500 mt-1">{cotacoesReais.length} {cotacoesReais.length === 1 ? 'pedido' : 'pedidos'} no total</p>
          </div>
          {/* Filtro de status */}
          <div className="flex gap-2 flex-wrap">
            {['todos', 'pendente', 'em_analise', 'enviada', 'cancelada'].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filtroStatus === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de cotações */}
          <div className="lg:col-span-1 space-y-3">
            {cotacoesFiltradas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400">Nenhum pedido encontrado.</p>
              </div>
            ) : (
              cotacoesFiltradas.map((cotacao) => (
                <button
                  key={cotacao.id}
                  onClick={() => { setCotacaoSelecionada(cotacao); setMensagemEmail('') }}
                  className={`w-full text-left bg-white border rounded-2xl p-5 transition-all hover:shadow-md ${
                    cotacaoSelecionada?.id === cotacao.id
                      ? 'border-primary-400 ring-2 ring-primary-100'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {cotacao.cliente?.nome_empresa || 'Empresa'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cotacao.items.length} {cotacao.items.length === 1 ? 'item' : 'itens'} •{' '}
                        {new Date(cotacao.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_CORES[cotacao.status]}`}>
                      {STATUS_LABELS[cotacao.status]}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detalhe da cotação selecionada */}
          <div className="lg:col-span-2">
            {!cotacaoSelecionada ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center h-full flex items-center justify-center">
                <p className="text-gray-400">Selecione um pedido para ver os detalhes.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Cabeçalho do cliente */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold">{cotacaoSelecionada.cliente?.nome_empresa}</h3>
                      {cotacaoSelecionada.cliente?.razao_social_oficial && (
                        <p className="text-primary-200 text-sm mt-0.5">{cotacaoSelecionada.cliente.razao_social_oficial}</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_CORES[cotacaoSelecionada.status]} shrink-0`}>
                      {STATUS_LABELS[cotacaoSelecionada.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 text-sm">
                    <div>
                      <p className="text-primary-300 text-xs uppercase tracking-wide">CNPJ</p>
                      <p className="font-medium mt-0.5">
                        {(cotacaoSelecionada.cliente?.cnpj || '').replace(
                          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                          '$1.$2.$3/$4-$5'
                        ) || '—'}
                      </p>
                    </div>
                    {cotacaoSelecionada.cliente?.nome_socio && (
                      <div>
                        <p className="text-primary-300 text-xs uppercase tracking-wide">Sócio/Responsável</p>
                        <p className="font-medium mt-0.5">{cotacaoSelecionada.cliente.nome_socio}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-primary-300 text-xs uppercase tracking-wide">E-mail</p>
                      <p className="font-medium mt-0.5 truncate">{cotacaoSelecionada.cliente?.email}</p>
                    </div>
                    <div>
                      <p className="text-primary-300 text-xs uppercase tracking-wide">WhatsApp</p>
                      <p className="font-medium mt-0.5">{cotacaoSelecionada.cliente?.whatsapp}</p>
                    </div>
                    <div>
                      <p className="text-primary-300 text-xs uppercase tracking-wide">Localização</p>
                      <p className="font-medium mt-0.5">
                        {cotacaoSelecionada.cliente?.cidade} / {cotacaoSelecionada.cliente?.estado}
                      </p>
                    </div>
                    <div>
                      <p className="text-primary-300 text-xs uppercase tracking-wide">Data do pedido</p>
                      <p className="font-medium mt-0.5">
                        {new Date(cotacaoSelecionada.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Itens */}
                <div className="px-8 py-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Itens solicitados</h4>
                  <div className="space-y-3">
                    {cotacaoSelecionada.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 bg-gray-50 rounded-xl px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.nome_equipamento}</p>
                          <p className="text-sm text-gray-500">Qtd: {item.quantidade}</p>
                        </div>
                        {/* Campo de preço editável */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm text-gray-500">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.preco_exibido || ''}
                            onChange={(e) => handleEditarPreco(item.id, e.target.value)}
                            placeholder="0,00"
                            className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  {cotacaoSelecionada.items.some((i) => i.preco_exibido > 0) && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                      <span className="font-semibold text-gray-700">Total estimado</span>
                      <span className="font-bold text-lg text-primary-700">
                        R$ {cotacaoSelecionada.items
                          .reduce((acc, i) => acc + i.preco_exibido * i.quantidade, 0)
                          .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Alterar status */}
                  <div className="mt-6 flex gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-600 self-center">Alterar status:</span>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      cotacaoSelecionada.status !== key && (
                        <button
                          key={key}
                          onClick={() => alterarStatus(cotacaoSelecionada.id, key)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 text-gray-600 hover:text-primary-600 transition-all"
                        >
                          → {label}
                        </button>
                      )
                    ))}
                  </div>

                  {/* Mensagem de feedback */}
                  {mensagemEmail && (
                    <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                      {mensagemEmail}
                    </p>
                  )}

                  {/* Botão excluir */}
                  <button
                    onClick={() => excluirCotacao(cotacaoSelecionada.id)}
                    className="mt-4 w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium py-3 rounded-2xl transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir pedido
                  </button>

                  {/* Botão enviar por e-mail */}
                  <button
                    onClick={handleEnviarEmail}
                    disabled={enviandoEmail}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-4 rounded-2xl transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {enviandoEmail ? 'Enviando...' : 'Enviar cotação por e-mail'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
