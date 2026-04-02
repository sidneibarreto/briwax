'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { CartItem, Equipment } from '@/lib/types'

const CART_LS_KEY = 'briwax_cart'

interface CartContextType {
  items: CartItem[]
  totalItems: number
  adicionarItem: (equipment: Equipment) => void
  removerItem: (equipmentId: string) => void
  limparCarrinho: () => void
  // Controle dos modais
  modalAuthAberto: boolean
  abrirModalAuth: (equipmentPendente?: Equipment) => void
  fecharModalAuth: () => void
  equipmentPendente: Equipment | null
}

const CartContext = createContext<CartContextType | null>(null)

// ─── helpers de localStorage (com guard SSR) ───────────────────────────────
function lsKey(uid?: string | null) {
  return uid ? `${CART_LS_KEY}_${uid}` : CART_LS_KEY
}

function lsLoad(uid?: string | null): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(lsKey(uid))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function lsSave(items: CartItem[], uid?: string | null) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(lsKey(uid), JSON.stringify(items))
  } catch { /* quota exceeded – ignora */ }
}

// ─── merge de dois carrinhos (sem duplicar itens) ──────────────────────────
function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const result = [...a]
  for (const bItem of b) {
    const idx = result.findIndex(i => i.equipment.id === bItem.equipment.id)
    if (idx >= 0) {
      result[idx] = { ...result[idx], quantidade: result[idx].quantidade + bItem.quantidade }
    } else {
      result.push(bItem)
    }
  }
  return result
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [modalAuthAberto, setModalAuthAberto] = useState(false)
  const [equipmentPendente, setEquipmentPendente] = useState<Equipment | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const initialized = useRef(false)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalItems = items.reduce((acc, item) => acc + item.quantidade, 0)

  // ─── carregar carrinho do Firestore ───────────────────────────────────────
  async function loadFromFirestore(uid: string): Promise<CartItem[]> {
    try {
      const snap = await getDoc(doc(db, 'carrinhos', uid))
      if (snap.exists()) return (snap.data().items as CartItem[]) || []
    } catch (e) {
      console.error('Carrinho: erro ao ler Firestore:', e)
    }
    return []
  }

  // ─── salvar no Firestore com debounce de 1 s ──────────────────────────────
  function saveToFirestore(uid: string, cartItems: CartItem[]) {
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'carrinhos', uid), {
          items: cartItems,
          updated_at: new Date().toISOString(),
        })
      } catch (e) {
        console.error('Carrinho: erro ao salvar Firestore:', e)
      }
    }, 1000)
  }

  // ─── observar autenticação e inicializar o carrinho ───────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)

        // Tenta carregar do Firestore primeiro
        const fsItems = await loadFromFirestore(user.uid)

        if (fsItems.length > 0) {
          // Firestore tem dados → usa eles (mais confiável)
          setItems(fsItems)
          lsSave(fsItems, user.uid)
        } else {
          // Merge: carrinho do usuário (LS com uid) + itens adicionados sem estar logado
          const userLs = lsLoad(user.uid)
          const anonLs = lsLoad(null)
          const merged = mergeCarts(userLs, anonLs)
          setItems(merged)
          if (merged.length > 0) saveToFirestore(user.uid, merged)
          // Limpa carrinho anônimo após merge
          if (anonLs.length > 0) lsSave([], null)
        }
      } else {
        // Não logado → limpa estado local, carrega carrinho anônimo do LS
        if (syncTimer.current) clearTimeout(syncTimer.current)
        setUserId(null)
        setItems(lsLoad(null))
      }
      initialized.current = true
    })
    return () => unsub()
  }, [])

  // ─── persistir a cada mudança no carrinho ─────────────────────────────────
  useEffect(() => {
    if (!initialized.current) return
    lsSave(items, userId)
    if (userId) saveToFirestore(userId, items)
  }, [items, userId])

  // ─── ações do carrinho ────────────────────────────────────────────────────
  const adicionarItem = useCallback((equipment: Equipment) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.equipment.id === equipment.id)
      if (existente) {
        return prev.map((i) =>
          i.equipment.id === equipment.id
            ? { ...i, quantidade: i.quantidade + 1 }
            : i
        )
      }
      return [...prev, { equipment, quantidade: 1 }]
    })
  }, [])

  const removerItem = useCallback((equipmentId: string) => {
    setItems((prev) => prev.filter((i) => i.equipment.id !== equipmentId))
  }, [])

  const limparCarrinho = useCallback(() => {
    setItems([])
    lsSave([], userId)
    if (userId) {
      if (syncTimer.current) clearTimeout(syncTimer.current)
      setDoc(doc(db, 'carrinhos', userId), { items: [], updated_at: new Date().toISOString() })
        .catch((e) => console.error('Carrinho: erro ao limpar Firestore:', e))
    }
  }, [userId])

  const abrirModalAuth = useCallback((equipment?: Equipment) => {
    setEquipmentPendente(equipment || null)
    setModalAuthAberto(true)
  }, [])

  const fecharModalAuth = useCallback(() => {
    setModalAuthAberto(false)
    setEquipmentPendente(null)
  }, [])

  return (
    <CartContext.Provider value={{
      items,
      totalItems,
      adicionarItem,
      removerItem,
      limparCarrinho,
      modalAuthAberto,
      abrirModalAuth,
      fecharModalAuth,
      equipmentPendente,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
