'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getUser } from '@/lib/auth'
import AdminHeader from '@/components/AdminHeader'
import type { Equipment, Category } from '@/lib/types'

export default function EquipmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    status: 'draft' as 'draft' | 'published',
    image_url: '',
    images: [] as string[]
  })

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
    loadData()
  }

  async function loadData() {
    setLoading(true)
    try {
      // Categorias
      const catSnap = await getDocs(query(collection(db, 'categorias'), orderBy('name')))
      setCategories(catSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[])

      // Equipamentos com categoria
      const catMap: Record<string, any> = {}
      catSnap.docs.forEach((d) => { catMap[d.id] = { id: d.id, ...d.data() } })

      const eqSnap = await getDocs(query(collection(db, 'equipamentos'), orderBy('created_at', 'desc')))
      const eqData = eqSnap.docs.map((d) => {
        const data = d.data() as any
        return { id: d.id, ...data, category: catMap[data.category_id] || null }
      })
      setEquipments(eqData as Equipment[])
    } catch {}
    setLoading(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        alert(`Arquivo ${file.name} tem formato inválido. Use JPG, PNG ou WebP`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`Arquivo ${file.name} é muito grande. Máximo 5MB`)
        return
      }
    }

    setUploading(true)
    const uploadedUrls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'equipamentos')
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.path) uploadedUrls.push(data.path)
      } catch {}
    }

    const allImages = [...formData.images, ...uploadedUrls]
    setFormData({ ...formData, image_url: allImages[0] || '', images: allImages })
    setUploading(false)
    alert(`${uploadedUrls.length} imagem(ns) adicionada(s) com sucesso!`)
  }

  function removeImage(index: number) {
    const newImages = formData.images.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      images: newImages,
      image_url: newImages[0] || ''
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingEquipment) {
        await updateDoc(doc(db, 'equipamentos', editingEquipment.id), formData)
      } else {
        await addDoc(collection(db, 'equipamentos'), { ...formData, created_at: serverTimestamp() })
      }
      loadData()
      resetForm()
    } catch (err: any) {
      alert('Erro: ' + err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return
    try {
      await deleteDoc(doc(db, 'equipamentos', id))
      loadData()
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  function handleEdit(equipment: Equipment) {
    setEditingEquipment(equipment)
    setFormData({
      name: equipment.name,
      description: equipment.description,
      category_id: equipment.category_id || '',
      status: equipment.status,
      image_url: equipment.image_url || '',
      images: (equipment as any).images || [equipment.image_url || '']
    })
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      category_id: '',
      status: 'draft',
      image_url: '',
      images: []
    })
    setEditingEquipment(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-700">
            ← Voltar ao Dashboard
          </Link>
        </div>

        {/* Header com botão */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Equipamentos</h2>
            <p className="text-gray-600 mt-2">Gerencie os equipamentos do portfólio</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Novo Equipamento'}
          </button>
        </div>

        {/* Formulário */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Upload de Imagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagens (pode adicionar várias)
                </label>
                
                {/* Grid de imagens adicionadas */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {formData.images.map((imageUrl, index) => (
                      <div key={index} className="relative aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden group">
                        <Image
                          src={imageUrl}
                          alt={`Imagem ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 bg-primary-500 text-white text-xs px-2 py-1 rounded">
                            Principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {uploading
                    ? 'Fazendo upload...'
                    : 'Recomendado: 1600x2000px (proporção 4:5). Formatos JPG, PNG ou WebP com até 5MB cada. A primeira imagem vira a principal.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ex: Microfone Shure SM7B"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Descreva o equipamento..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="draft">Rascunho (não aparece no site)</option>
                  <option value="published">Publicado (aparece no site)</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  {editingEquipment ? 'Salvar Alterações' : 'Criar Equipamento'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Grid de Equipamentos */}
        {equipments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Nenhum equipamento cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipments.map((equipment) => (
              <div key={equipment.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {equipment.image_url && (
                  <div className="relative w-full h-48 bg-gray-100">
                    <Image
                      src={equipment.image_url}
                      alt={equipment.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      equipment.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {equipment.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-xs text-primary-600 font-medium">
                      {equipment.category?.name}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{equipment.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{equipment.description}</p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleEdit(equipment)}
                      className="flex-1 bg-primary-50 text-primary-600 hover:bg-primary-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(equipment.id)}
                      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
