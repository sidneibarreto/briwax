'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function Banner() {
  const [bannerImages, setBannerImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadBannerImages()
  }, [])

  useEffect(() => {
    if (bannerImages.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerImages.length)
    }, 3000) // Muda a cada 3 segundos

    return () => clearInterval(interval)
  }, [bannerImages.length, isPaused])

  async function loadBannerImages() {
    const { data } = await supabase.storage
      .from('equipments')
      .list('banner', {
        limit: 10,
        offset: 0,
      })
    
    if (data && data.length > 0) {
      const urls = data.map(file => {
        const { data: urlData } = supabase.storage
          .from('equipments')
          .getPublicUrl(`banner/${file.name}`)
        return urlData.publicUrl
      })
      setBannerImages(urls)
    }
  }

  const resetInactivityTimer = () => {
    // Limpar timer existente
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    
    // Pausar o carrossel
    setIsPaused(true)
    
    // Criar novo timer de 15 segundos
    inactivityTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 15000)
  }

  const handlePrevious = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)
    setTimeout(() => setIsAnimating(false), 500)
    resetInactivityTimer()
  }

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex((prev) => (prev + 1) % bannerImages.length)
    setTimeout(() => setIsAnimating(false), 500)
  }

  const handleManualNext = () => {
    handleNext()
    resetInactivityTimer()
  }

  const handleIndicatorClick = (index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 500)
    resetInactivityTimer()
  }

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Equipamentos de Alta Performance
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore nossa coleção de equipamentos técnicos profissionais
          </p>
        </div>
        
        {/* Carrossel de imagens */}
        {bannerImages.length > 0 ? (
          <div className="relative max-w-7xl mx-auto">
            {/* Container do carrossel com overflow hidden */}
            <div className="relative aspect-[6/2] rounded-2xl overflow-hidden bg-gray-100">
              {/* Slides */}
              <div 
                className="flex transition-transform duration-500 ease-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {bannerImages.map((imageUrl, index) => (
                  <div 
                    key={index}
                    className="min-w-full h-full relative"
                  >
                    <Image
                      src={imageUrl}
                      alt={`Banner ${index + 1}`}
                      fill
                      className="object-contain"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Controles (apenas se tiver mais de 1 imagem) */}
            {bannerImages.length > 1 && (
              <>
                {/* Botões de navegação */}
                <button
                  onClick={handlePrevious}
                  disabled={isAnimating}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 disabled:opacity-20 p-3 rounded-full shadow-lg transition-all z-10"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleManualNext}
                  disabled={isAnimating}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 disabled:opacity-20 p-3 rounded-full shadow-lg transition-all z-10"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {bannerImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleIndicatorClick(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'bg-white w-8'
                          : 'bg-white/50 hover:bg-white/75 w-2'
                      }`}
                    />
                  ))}
                </div>

                {/* Contador */}
                <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full z-10">
                  {currentIndex + 1} / {bannerImages.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-2xl h-96 flex items-center justify-center max-w-7xl mx-auto">
            <p className="text-gray-400">Configure imagens do banner no admin</p>
          </div>
        )}
      </div>
    </section>
  )
}
