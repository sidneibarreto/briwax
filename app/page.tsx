'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Banner from '@/components/Banner'
import EquipmentGrid from '@/components/EquipmentGrid'
import WhatsAppButton from '@/components/WhatsAppButton'
import Footer from '@/components/Footer'
import CartBadge from '@/components/cotacao/CartBadge'

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-white">
      <Header 
        selectedCategory={selectedCategory} 
        onCategoryChange={setSelectedCategory}
      />
      <main>
        <Banner />
        <EquipmentGrid selectedCategory={selectedCategory} />
      </main>
      <Footer />
      <WhatsAppButton />
      <CartBadge />
    </div>
  )
}
