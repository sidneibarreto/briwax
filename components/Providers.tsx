'use client'

import { CartProvider } from '@/components/cotacao/CartProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
