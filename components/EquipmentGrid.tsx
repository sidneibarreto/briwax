'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getUser } from '@/lib/auth'
import { useCart } from '@/components/cotacao/CartProvider'
import AuthModalCotacao from '@/components/cotacao/AuthModalCotacao'
import type { Equipment } from '@/lib/types'

interface EquipmentGridProps {
  selectedCategory: string | null
}

export default function EquipmentGrid({ selectedCategory }: EquipmentGridProps) {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [modalImageIndex, setModalImageIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [cardImageIndexes, setCardImageIndexes] = useState<Record<string, number>>({})
  const [adicionadoId, setAdicionadoId] = useState<string | null>(null)
  const [modalAuthAberto, setModalAuthAberto] = useState(false)
  const [equipmentParaAdicionar, setEquipmentParaAdicionar] = useState<Equipment | null>(null)

  const { adicionarItem } = useCart()

  useEffect(() => {
    loadEquipments()
  }, [selectedCategory])

  // Carrossel automático nos cards da grid
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = []
    
    equipments.forEach((equipment) => {
      const images = getEquipmentImages(equipment)
      if (images.length > 1) {
        const interval = setInterval(() => {
          setCardImageIndexes((prev) => ({
            ...prev,
            [equipment.id]: ((prev[equipment.id] || 0) + 1) % images.length
          }))
        }, 5000)
        intervals.push(interval)
      }
    })

    return () => intervals.forEach(interval => clearInterval(interval))
  }, [equipments])

  // Carrossel automático no modal
  useEffect(() => {
    if (!selectedEquipment || isPaused) return
    
    const images = getEquipmentImages(selectedEquipment)
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setModalImageIndex((prev) => (prev + 1) % images.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedEquipment, isPaused])

  function getEquipmentImages(equipment: Equipment): string[] {
    const images: string[] = []
    const equipmentWithImages = equipment as any
    
    // Priorizar array de imagens
    if (equipmentWithImages.images && Array.isArray(equipmentWithImages.images) && equipmentWithImages.images.length > 0) {
      return equipmentWithImages.images
    }
    
    // Fallback para image_url
    if (equipment.image_url) {
      images.push(equipment.image_url)
    }
    
    return images
  }

  // Verifica autenticação e adiciona ao carrinho
  async function handleAdicionarCarrinho(e: React.MouseEvent, equipment: Equipment) {
    e.stopPropagation()
    const user = await getUser()
    if (!user) {
      setEquipmentParaAdicionar(equipment)
      setModalAuthAberto(true)
      return
    }
    adicionarItem(equipment)
    setAdicionadoId(equipment.id)
    setTimeout(() => setAdicionadoId(null), 2000)
  }

  function handleAutenticado() {
    setModalAuthAberto(false)
    if (equipmentParaAdicionar) {
      adicionarItem(equipmentParaAdicionar)
      setAdicionadoId(equipmentParaAdicionar.id)
      setTimeout(() => setAdicionadoId(null), 2000)
      setEquipmentParaAdicionar(null)
    }
  }

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    setIsPaused(true)
    inactivityTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 15000)
  }

  const handlePreviousImage = () => {
    if (isAnimating || !selectedEquipment) return
    const images = getEquipmentImages(selectedEquipment)
    setIsAnimating(true)
    setModalImageIndex((prev) => (prev - 1 + images.length) % images.length)
    setTimeout(() => setIsAnimating(false), 500)
    resetInactivityTimer()
  }

  const handleNextImage = () => {
    if (isAnimating || !selectedEquipment) return
    const images = getEquipmentImages(selectedEquipment)
    setIsAnimating(true)
    setModalImageIndex((prev) => (prev + 1) % images.length)
    setTimeout(() => setIsAnimating(false), 500)
    resetInactivityTimer()
  }

  const handleIndicatorClick = (index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setModalImageIndex(index)
    setTimeout(() => setIsAnimating(false), 500)
    resetInactivityTimer()
  }

  async function loadEquipments() {
    setLoading(true)
    try {
      // Buscar mapa de categorias
      const catSnap = await getDocs(collection(db, 'categorias'))
      const catMap: Record<string, { id: string; name: string; slug: string }> = {}
      catSnap.docs.forEach((d) => {
        catMap[d.id] = { id: d.id, ...(d.data() as any) }
      })

      // Buscar equipamentos
      const constraints: any[] = [where('status', '==', 'published')]
      if (selectedCategory) {
        constraints.push(where('category_id', '==', selectedCategory))
      }
      const eqSnap = await getDocs(query(collection(db, 'equipamentos'), ...constraints))
      const equipData = eqSnap.docs
        .map((d) => {
          const data = d.data() as any
          return {
            id: d.id,
            ...data,
            category: catMap[data.category_id] || null
          }
        })
        .sort((a: any, b: any) => {
          const aDate = a.created_at?.toMillis?.() ?? 0
          const bDate = b.created_at?.toMillis?.() ?? 0
          return bDate - aDate
        })
      setEquipments(equipData as Equipment[])
    } catch (e) {
      console.error('[EquipmentGrid] Erro ao carregar equipamentos:', e)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando equipamentos...</p>
        </div>
      </section>
    )
  }

  if (equipments.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum equipamento encontrado.</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {equipments.map((equipment) => {
            const images = getEquipmentImages(equipment)
            const currentImageIndex = cardImageIndexes[equipment.id] || 0
            
            return (
              <div
                key={equipment.id}
                onClick={() => setSelectedEquipment(equipment)}
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-pointer"
              >
                {/* Carrossel de Imagens */}
                {images.length > 0 ? (
                  <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                    <div 
                      className="flex transition-transform duration-500 ease-out h-full"
                      style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                    >
                      {images.map((imageUrl, index) => (
                        <div 
                          key={index}
                          className="min-w-full h-full relative"
                        >
                          <Image
                            src={imageUrl}
                            alt={`${equipment.name} - ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                    
                    {/* Botões de navegação (aparecem no hover, apenas se tiver mais de 1 imagem) */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCardImageIndexes((prev) => ({
                              ...prev,
                              [equipment.id]: ((prev[equipment.id] || 0) - 1 + images.length) % images.length
                            }))
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCardImageIndexes((prev) => ({
                              ...prev,
                              [equipment.id]: ((prev[equipment.id] || 0) + 1) % images.length
                            }))
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    
                    {/* Indicadores (apenas se tiver mais de 1 imagem) */}
                    {images.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, index) => (
                          <div
                            key={index}
                            className={`h-1.5 rounded-full transition-all ${
                              index === currentImageIndex
                                ? 'bg-white w-6'
                                : 'bg-white/50 w-1.5'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[4/5] bg-gray-100 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Sem imagem</p>
                  </div>
                )}
                
                {/* Conteúdo do Card */}
                <div className="p-6 space-y-2">
                  <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">
                    {equipment.category?.name}
                  </p>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {equipment.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {equipment.description || 'Equipamento profissional de alta qualidade.'}
                  </p>
                  {/* Botão Adicionar ao Carrinho de Cotação */}
                  <div className="pt-2">
                    <button
                      onClick={(e) => handleAdicionarCarrinho(e, equipment)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        adicionadoId === equipment.id
                          ? 'bg-green-500 text-white'
                          : 'bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200'
                      }`}
                    >
                      {adicionadoId === equipment.id ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Adicionado!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Adicionar à Cotação
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Modal de Detalhes */}
      {selectedEquipment && (
        <div 
          onClick={() => {
            setSelectedEquipment(null)
            setModalImageIndex(0)
            setIsPaused(false)
            if (inactivityTimerRef.current) {
              clearTimeout(inactivityTimerRef.current)
            }
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="relative">
              {/* Botão Fechar */}
              <button
                onClick={() => {
                  setSelectedEquipment(null)
                  setModalImageIndex(0)
                  setIsPaused(false)
                  if (inactivityTimerRef.current) {
                    clearTimeout(inactivityTimerRef.current)
                  }
                }}
                className="absolute top-6 right-6 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Carrossel de Imagens */}
              {(() => {
                const images = getEquipmentImages(selectedEquipment)
                if (images.length === 0) return null
                
                return (
                  <div className="relative w-full bg-white rounded-t-3xl overflow-hidden flex-1 flex">
                    <div 
                      className="flex transition-transform duration-500 ease-out w-full"
                      style={{ transform: `translateX(-${modalImageIndex * 100}%)` }}
                    >
                      {images.map((imageUrl, index) => (
                        <div 
                          key={index}
                          className="min-w-full flex items-center justify-center bg-white"
                        >
                          <Image
                            src={imageUrl}
                            alt={`${selectedEquipment.name} - Imagem ${index + 1}`}
                            width={1920}
                            height={1080}
                            className="max-h-[70vh] w-auto object-contain"
                            sizes="(max-width: 768px) 100vw, 1200px"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Controles do carrossel (apenas se tiver mais de 1 imagem) */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={handlePreviousImage}
                          disabled={isAnimating}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 disabled:opacity-20 p-3 rounded-full shadow-lg transition-all z-10"
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleNextImage}
                          disabled={isAnimating}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 disabled:opacity-20 p-3 rounded-full shadow-lg transition-all z-10"
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>

                        {/* Indicadores */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                          {images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => handleIndicatorClick(index)}
                              className={`h-2 rounded-full transition-all ${
                                index === modalImageIndex
                                  ? 'bg-white w-8'
                                  : 'bg-white/50 hover:bg-white/75 w-2'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Contador */}
                        <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-3 py-1 rounded-full z-10">
                          {modalImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Conteúdo */}
              <div className="p-8 space-y-4 overflow-y-auto">
                <div>
                  <p className="text-sm font-medium text-primary-600 uppercase tracking-wide mb-2">
                    {selectedEquipment.category?.name}
                  </p>
                  <h2 className="text-4xl font-bold text-gray-900">
                    {selectedEquipment.name}
                  </h2>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {selectedEquipment.description || 'Equipamento profissional de alta qualidade.'}
                </p>
                {/* Botão Pedir Cotação no modal */}
                <div className="pt-2">
                  <button
                    onClick={(e) => handleAdicionarCarrinho(e, selectedEquipment)}
                    className={`flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold transition-all ${
                      adicionadoId === selectedEquipment.id
                        ? 'bg-green-500 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    {adicionadoId === selectedEquipment.id ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Adicionado à cotação!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Pedir Cotação
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de autenticação */}
      {modalAuthAberto && (
        <AuthModalCotacao
          onClose={() => { setModalAuthAberto(false); setEquipmentParaAdicionar(null) }}
          onAutenticado={handleAutenticado}
        />
      )}
    </>
  )
}
