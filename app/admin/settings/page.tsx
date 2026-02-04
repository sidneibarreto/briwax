'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import AdminHeader from '@/components/AdminHeader'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerImages, setBannerImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [message, setMessage] = useState('')
  const [bannerMessage, setBannerMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  
  // Footer settings
  const [footerSettings, setFooterSettings] = useState({
    id: '',
    phone: '',
    email: '',
    address: '',
    instagram_url: '',
    whatsapp_url: ''
  })
  const [footerMessage, setFooterMessage] = useState('')
  const [savingFooter, setSavingFooter] = useState(false)

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
    loadLogo()
    loadBannerImages()
    loadFooterSettings()
  }

  async function loadFooterSettings() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single()
    
    if (data) {
      setFooterSettings({
        id: data.id,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        instagram_url: data.instagram_url || '',
        whatsapp_url: data.whatsapp_url || ''
      })
    }
  }

  async function handleSaveFooterSettings() {
    setSavingFooter(true)
    setFooterMessage('')

    const { error } = await supabase
      .from('site_settings')
      .update({
        phone: footerSettings.phone,
        email: footerSettings.email,
        address: footerSettings.address,
        instagram_url: footerSettings.instagram_url,
        whatsapp_url: footerSettings.whatsapp_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', footerSettings.id)

    if (error) {
      setFooterMessage('Erro ao salvar: ' + error.message)
    } else {
      setFooterMessage('Configurações salvas com sucesso! ✅')
    }

    setSavingFooter(false)
  }

  async function loadLogo() {
    const { data } = supabase.storage
      .from('equipments')
      .getPublicUrl('logo.png')
    
    if (data) {
      setLogoUrl(data.publicUrl + '?t=' + Date.now())
    }
  }

  async function loadBannerImages() {
    const { data, error } = await supabase.storage
      .from('equipments')
      .list('banner', {
        limit: 10,
        offset: 0,
      })
    
    if (data) {
      const urls = data.map(file => {
        const { data: urlData } = supabase.storage
          .from('equipments')
          .getPublicUrl(`banner/${file.name}`)
        return urlData.publicUrl
      })
      setBannerImages(urls)
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    
    // Validar todos os arquivos
    for (let i = 0; i < files.length; i++) {
      if (!validTypes.includes(files[i].type)) {
        setBannerMessage(`Formato inválido no arquivo ${files[i].name}. Use PNG, JPG ou WebP`)
        return
      }
      if (files[i].size > 5 * 1024 * 1024) {
        setBannerMessage(`Arquivo ${files[i].name} muito grande. Máximo 5MB`)
        return
      }
    }

    setUploadingBanner(true)
    setBannerMessage(`Fazendo upload de ${files.length} imagem(ns)...`)

    // Upload de todos os arquivos
    let uploadedCount = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${i}.${fileExt}`
      const filePath = `banner/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('equipments')
        .upload(filePath, file)

      if (!uploadError) {
        uploadedCount++
      }
    }

    setBannerMessage(`${uploadedCount} imagem(ns) adicionada(s) com sucesso! ✅`)
    loadBannerImages()
    setUploadingBanner(false)
    
    // Limpar o input
    e.target.value = ''
  }

  async function handleDeleteBannerImage(imageUrl: string) {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return

    const fileName = imageUrl.split('/').pop()
    const { error } = await supabase.storage
      .from('equipments')
      .remove([`banner/${fileName}`])

    if (!error) {
      setBannerMessage('Imagem excluída! ✅')
      loadBannerImages()
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setMessage('Formato inválido. Use PNG, JPG ou WebP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Imagem muito grande. Máximo 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string)
      setZoom(1)
      setCropPosition({ x: 0, y: 0 })
      setMessage('')
    }
    reader.readAsDataURL(file)
  }

  function handleZoomIn() {
    setZoom(prev => Math.min(prev + 0.1, 3))
  }

  function handleZoomOut() {
    setZoom(prev => Math.max(prev - 0.1, 0.5))
  }

  function handleResetZoom() {
    setZoom(1)
    setCropPosition({ x: 0, y: 0 })
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function handleMouseMove(e: React.MouseEvent) {
    e.preventDefault()
    if (!dragging || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const circleSize = 250
    
    // Calcula a posição relativa ao mouse
    let x = e.clientX - rect.left - (circleSize / 2)
    let y = e.clientY - rect.top - (circleSize / 2)
    
    // Limita aos bounds da imagem (considerando o zoom)
    x = Math.max(0, Math.min(x, rect.width - circleSize))
    y = Math.max(0, Math.min(y, rect.height - circleSize))
    
    setCropPosition({ x, y })
  }

  function handleMouseUp(e: React.MouseEvent) {
    e.preventDefault()
    setDragging(false)
  }

  async function handleSaveCrop() {
    if (!selectedImage || !canvasRef.current) return

    setUploading(true)
    setMessage('')

    const img = new window.Image()
    img.src = selectedImage
    
    img.onload = async () => {
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      
      // Dimensões da imagem renderizada
      const container = imageRef.current!
      const containerRect = container.getBoundingClientRect()
      
      // Calcula a escala real (considerando o zoom e o tamanho da imagem)
      const displayWidth = containerRect.width
      const displayHeight = containerRect.height
      const scaleX = img.width / displayWidth
      const scaleY = img.height / displayHeight
      
      const circleSize = 250
      const finalSize = 400 // tamanho final da logo
      
      // Converte a posição do círculo para coordenadas da imagem original
      const sourceX = cropPosition.x * scaleX
      const sourceY = cropPosition.y * scaleY
      const sourceSize = circleSize * scaleX

      // Criar canvas circular
      canvas.width = finalSize
      canvas.height = finalSize
      
      // Desenhar círculo
      ctx.beginPath()
      ctx.arc(finalSize / 2, finalSize / 2, finalSize / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      
      // Desenhar imagem recortada
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        finalSize,
        finalSize
      )

      // Converter para blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setMessage('Erro ao processar imagem')
          setUploading(false)
          return
        }

        // Deletar logo antiga
        await supabase.storage
          .from('equipments')
          .remove(['logo.png'])

        // Upload da nova logo
        const { error: uploadError } = await supabase.storage
          .from('equipments')
          .upload('logo.png', blob, {
            cacheControl: '0',
            upsert: true
          })

        if (uploadError) {
          setMessage('Erro ao fazer upload: ' + uploadError.message)
          setUploading(false)
          return
        }

        setMessage('Logo atualizada com sucesso! ✅')
        setSelectedImage(null)
        loadLogo()
        setUploading(false)
        
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }, 'image/png')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <AdminHeader user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-700">
            ← Voltar ao Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Configurações</h2>
          <p className="text-gray-600 mt-2">Personalize o visual do site</p>
        </div>

        <div className="space-y-8">
          {/* Seção de Configurações do Rodapé */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Configurações do Rodapé</h3>
            <p className="text-sm text-gray-600 mb-6">
              Configure as informações de contato e redes sociais que aparecem no rodapé do site
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={footerSettings.phone}
                    onChange={(e) => setFooterSettings({ ...footerSettings, phone: e.target.value })}
                    placeholder="(11) 988 212 411"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={footerSettings.email}
                    onChange={(e) => setFooterSettings({ ...footerSettings, email: e.target.value })}
                    placeholder="contato@seusite.com.br"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <input
                  type="text"
                  value={footerSettings.address}
                  onChange={(e) => setFooterSettings({ ...footerSettings, address: e.target.value })}
                  placeholder="Av. Santo Amaro, 4644 - Loja 3 • Brooklin Office Center"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link do Instagram
                  </label>
                  <input
                    type="url"
                    value={footerSettings.instagram_url}
                    onChange={(e) => setFooterSettings({ ...footerSettings, instagram_url: e.target.value })}
                    placeholder="https://www.instagram.com/seuperfil"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link do WhatsApp
                  </label>
                  <input
                    type="url"
                    value={footerSettings.whatsapp_url}
                    onChange={(e) => setFooterSettings({ ...footerSettings, whatsapp_url: e.target.value })}
                    placeholder="https://wa.me/5511988538000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: https://wa.me/55DDDNÚMERO (exemplo: https://wa.me/5511988538000)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSaveFooterSettings}
                  disabled={savingFooter}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {savingFooter ? 'Salvando...' : 'Salvar Configurações'}
                </button>

                {footerMessage && (
                  <p className={`text-sm ${footerMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {footerMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Dica</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Deixe os campos vazios se não quiser exibir determinada informação</li>
                <li>Os links das redes sociais devem começar com https://</li>
                <li>Use o formato correto do WhatsApp: https://wa.me/55DDDNÚMERO</li>
              </ul>
            </div>
          </div>

          {/* Seção de Banner/Carrossel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Imagens do Banner</h3>
            <p className="text-sm text-gray-600 mb-6">
              Adicione imagens para o carrossel do topo da página. Use proporção 3:1 (horizontal panorâmica).
            </p>

            {/* Grid de imagens do banner */}
            {bannerImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {bannerImages.map((imageUrl, index) => (
                  <div key={index} className="relative group aspect-[4/5] rounded-lg overflow-hidden border border-gray-200">
                    <Image
                      src={imageUrl}
                      alt={`Banner ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => handleDeleteBannerImage(imageUrl)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload de nova imagem */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adicionar imagens (pode selecionar várias de uma vez)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-600 hover:file:bg-green-100 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Recomendado: 1800x600px (proporção 3:1). Máximo 5MB por imagem (aceita JPG, PNG ou WebP). Para telas Retina, pode usar até 3600x1200px mantendo a mesma proporção.
                </p>
              </div>

              {uploadingBanner && (
                <p className="text-sm text-gray-600">Fazendo upload...</p>
              )}

              {bannerMessage && (
                <p className={`text-sm ${bannerMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {bannerMessage}
                </p>
              )}
            </div>

            {/* Instruções */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Como funciona</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>As imagens aparecerão no banner do topo da página inicial</li>
                <li>Use proporção 3:1 (horizontal) para preencher todo o banner sem cortes</li>
                <li>Você pode adicionar várias imagens que rotacionarão automaticamente</li>
                <li>Para excluir, passe o mouse sobre a imagem e clique no ícone de lixeira</li>
              </ul>
            </div>
          </div>

        {/* Editor de Crop */}
        {selectedImage ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Ajustar Logo</h3>
            
            <div className="space-y-6">
              {/* Controles de Zoom com Slider */}
              <div className="p-6 bg-white rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ajustar Zoom: {Math.round(zoom * 100)}%
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">50%</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <span className="text-sm text-gray-500">300%</span>
                  <button
                    onClick={handleResetZoom}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    ↻ Reset
                  </button>
                </div>
              </div>

              {/* Área de Crop */}
              <div className="bg-gray-900 rounded-lg p-8 relative overflow-hidden select-none">
                <p className="text-sm text-gray-300 mb-4 text-center">
                  Arraste o círculo azul para posicionar a logo
                </p>
                
                <div 
                  className="flex items-center justify-center select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  <div className="relative inline-block select-none">
                    <img
                      ref={imageRef}
                      src={selectedImage}
                      alt="Crop"
                      draggable={false}
                      className="max-w-full h-auto select-none pointer-events-none"
                      style={{ 
                        maxHeight: '600px',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        transition: dragging ? 'none' : 'transform 0.2s ease',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                      }}
                    />
                    
                    {/* Área de crop circular */}
                    <div
                      className="absolute border-4 border-primary-500 rounded-full cursor-grab active:cursor-grabbing select-none"
                      style={{
                        width: '250px',
                        height: '250px',
                        left: `${cropPosition.x}px`,
                        top: `${cropPosition.y}px`,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(59, 130, 246, 0.3)',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-white text-xs font-medium bg-primary-600/80 px-3 py-1 rounded-full">
                          Arraste aqui
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveCrop}
                  disabled={uploading}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {uploading ? 'Salvando...' : 'Salvar Logo'}
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>

              {message && (
                <p className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Logo do Site</h3>
            
            {logoUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Preview:</p>
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escolher nova logo
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageSelect}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Recomendado: imagem quadrada de pelo menos 800x800px, até 5MB (JPG, PNG ou WebP). Você poderá ajustar a posição antes de salvar.
                </p>
              </div>

              {message && (
                <p className={`text-sm ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </p>
              )}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Dica</h4>
              <p className="text-sm text-blue-700">
                A logo aparecerá no canto superior esquerdo do site em formato redondo.
                Após selecionar a imagem, você poderá ajustar a área que será usada.
              </p>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  )
}
