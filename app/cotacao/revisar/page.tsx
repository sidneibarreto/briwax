'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { auth } from '@/lib/firebase'
import { useCart } from '@/components/cotacao/CartProvider'
import type { CartItem } from '@/lib/types'

function RevisarPedidoContent() {
  const router = useRouter()
  const { items, removerItem, limparCarrinho } = useCart()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  function getImagemEquipment(item: CartItem): string {
    const eq = item.equipment as any
    if (eq.images && Array.isArray(eq.images) && eq.images.length > 0) return eq.images[0]
    if (eq.image_url) return eq.image_url
    return ''
  }

  async function handleEnviar() {
    if (items.length === 0) return
    setErro('')
    setEnviando(true)

    // Aguarda a inicialização do Firebase Auth (resolve quando o estado é confirmado)
    const user = await new Promise<any>((resolve) => {
      const unsub = auth.onAuthStateChanged((u) => { unsub(); resolve(u) })
    })

    if (!user) {
      setErro('Você precisa estar logado para enviar uma cotação.')
      setEnviando(false)
      return
    }

    // Busca o documento de cliente pelo uid
    let clienteId: string
    try {
      const clienteSnap = await getDocs(
        query(collection(db, 'clientes'), where('user_id', '==', user.uid))
      )
      if (!clienteSnap.empty) {
        clienteId = clienteSnap.docs[0].id
      } else {
        // Documento não existe (signup anterior pode ter falhado)
        // Cria registro mínimo para que a cotação possa ser enviada
        const novoCliente = await addDoc(collection(db, 'clientes'), {
          user_id: user.uid,
          email: user.email || '',
          nome_empresa: user.displayName || user.email || 'Cliente',
          cnpj: '',
          whatsapp: '',
          estado: '',
          cidade: '',
          created_at: serverTimestamp(),
        })
        clienteId = novoCliente.id
      }
    } catch (e) {
      console.error('Erro ao buscar/criar cliente:', e)
      setErro('Erro ao identificar sua conta. Tente novamente.')
      setEnviando(false)
      return
    }

    // Criar a cotação
    const cotacaoRef = await addDoc(collection(db, 'cotacoes'), {
      cliente_id: clienteId,
      user_id: user.uid,
      status: 'pendente',
      created_at: serverTimestamp()
    })

    // Inserir os itens
    try {
      await Promise.all(
        items.map((item) =>
          addDoc(collection(db, 'itens_cotacao'), {
            cotacao_id: cotacaoRef.id,
            equipment_id: item.equipment.id,
            nome_equipamento: item.equipment.name,
            quantidade: item.quantidade,
            preco_unitario: item.equipment.preco ?? 0,
            created_at: serverTimestamp()
          })
        )
      )
    } catch {
      setErro('Erro ao salvar os itens do pedido. Tente novamente.')
      setEnviando(false)
      return
    }

    setEnviando(false)
    limparCarrinho()
    setSucesso(true)
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Pedido enviado!</h2>
          <p className="text-gray-600">
            Seu pedido de cotação foi recebido com sucesso. Nossa equipe entrará em contato em breve.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
          >
            Voltar ao portfólio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Revisar pedido de cotação</h1>
            <p className="text-sm text-gray-500">{items.length} {items.length === 1 ? 'item' : 'itens'} selecionados</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Nenhum equipamento adicionado.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 text-primary-600 hover:underline font-medium"
            >
              Ver portfólio
            </button>
          </div>
        ) : (
          <>
            {/* Lista de itens */}
            <div className="space-y-3">
              {items.map((item) => {
                const imagem = getImagemEquipment(item)
                return (
                  <div
                    key={item.equipment.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4"
                  >
                    {/* Imagem */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {imagem ? (
                        <Image
                          src={imagem}
                          alt={item.equipment.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">
                        {item.equipment.category?.name}
                      </p>
                      <h3 className="font-semibold text-gray-900 truncate">{item.equipment.name}</h3>
                      <p className="text-sm text-gray-500">Qtd: {item.quantidade}</p>
                    </div>
                    {/* Remover */}
                    <button
                      onClick={() => removerItem(item.equipment.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {erro}
              </p>
            )}

            {/* Botão enviar */}
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-primary-600/20"
            >
              {enviando ? 'Enviando pedido...' : 'Enviar pedido de cotação'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function RevisarPedidoPage() {
  return <RevisarPedidoContent />
}
