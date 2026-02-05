'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
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
    
    let query = supabase
      .from('equipments')
      .select(`
        id,
        name,
        description,
        image_url,
        images,
        category_id,
        status,
        created_at,
        category:categories(id, name, slug)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory)
    }

    const { data } = await query
    
    if (data) {
      // Transformar category de array para objeto único
      const transformedData = data.map((item: any) => ({
        ...item,
        category: Array.isArray(item.category) ? item.category[0] : item.category
      }))
      setEquipments(transformedData as Equipment[])
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
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
                  <div className="relative w-full h-96 bg-gray-100 overflow-hidden">
                    <div 
                      className="flex transition-transform duration-500 ease-out h-full"
                      style={{ transform: `translateX(-${modalImageIndex * 100}%)` }}
                    >
                      {images.map((imageUrl, index) => (
                        <div 
                          key={index}
                          className="min-w-full h-full relative"
                        >
                          <Image
                            src={imageUrl}
                            alt={`${selectedEquipment.name} - Imagem ${index + 1}`}
                            fill
                            className="object-cover"
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
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 disabled:opacity-20 p-3 rounded-full shadow-lg transition-all z-10"
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleNextImage}
                          disabled={isAnimating}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 disabled:opacity-20 p-3 rounded-full shadow-lg transition-all z-10"
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
                        <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full z-10">
                          {modalImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Conteúdo */}
              <div className="p-8 space-y-4">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
