'use client'

import { useEffect, useState, Dispatch, SetStateAction, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import AdminHeader from '@/components/AdminHeader'

interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string
}

export default function UsersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

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
    loadUsers()
  }

  async function loadUsers() {
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const data = await response.json()
      
      if (response.ok && data.users) {
        const formattedUsers = data.users.map((u: any) => ({
          id: u.id,
          email: u.email || '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || ''
        }))
        setUsers(formattedUsers)
      } else {
        setMessage(data.error || 'Erro ao carregar usuários')
        setIsError(true)
      }
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
      setMessage('Erro ao carregar usuários. Verifique as permissões.')
      setIsError(true)
    }
    
    setLoading(false)
  }

  function openPasswordModal(adminUser: AdminUser) {
    setSelectedUser(adminUser)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('')
    setShowPasswordModal(true)
  }

  function closePasswordModal() {
    setShowPasswordModal(false)
    setSelectedUser(null)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage('')
    setUpdatingPassword(false)
  }

  async function handlePasswordUpdate(e: FormEvent) {
    e.preventDefault()

    if (!selectedUser) return

    setPasswordMessage('')

    if (newPassword.trim().length < 6) {
      setPasswordMessage('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('As senhas não coincidem.')
      return
    }

    setUpdatingPassword(true)

    try {
      if (selectedUser.id === user?.id) {
        const { error } = await supabase.auth.updateUser({ password: newPassword })

        if (error) {
          setPasswordMessage('Erro ao atualizar senha: ' + error.message)
          setUpdatingPassword(false)
          return
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            id: selectedUser.id,
            password: newPassword
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setPasswordMessage('Erro ao atualizar senha: ' + (data.error || 'Erro desconhecido'))
          setUpdatingPassword(false)
          return
        }
      }

      setPasswordMessage('Senha atualizada com sucesso! ✅')
      setNewPassword('')
      setConfirmPassword('')
      await loadUsers()

      setTimeout(() => {
        closePasswordModal()
      }, 1200)
    } catch (error: any) {
      setPasswordMessage('Erro ao atualizar senha: ' + error.message)
    } finally {
      setUpdatingPassword(false)
    }
  }

  async function handleAddUser() {
    if (!newUserEmail || !newUserPassword) {
      setMessage('Preencha email e senha')
      setIsError(true)
      return
    }

    if (newUserPassword.length < 6) {
      setMessage('A senha deve ter no mínimo 6 caracteres')
      setIsError(true)
      return
    }

    setMessage('Criando usuário...')
    setIsError(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Usuário criado com sucesso! ✅')
        setIsError(false)
        setNewUserEmail('')
        setNewUserPassword('')
        setShowAddModal(false)
        loadUsers()
        
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Erro ao criar usuário: ' + data.error)
        setIsError(true)
      }
    } catch (error: any) {
      setMessage('Erro ao criar usuário: ' + error.message)
      setIsError(true)
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    // Não permitir deletar o próprio usuário
    if (userId === user?.id) {
      setMessage('Você não pode deletar seu próprio usuário!')
      setIsError(true)
      return
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Usuário excluído com sucesso! ✅')
        setIsError(false)
        loadUsers()
        
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage('Erro ao excluir usuário: ' + data.error)
        setIsError(true)
      }
    } catch (error: any) {
      setMessage('Erro ao excluir usuário: ' + error.message)
      setIsError(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader user={user} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-primary-600 hover:text-primary-700">
            ← Voltar ao Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Usuários Admin</h2>
            <p className="text-gray-600 mt-2">Gerencie os usuários com acesso ao painel administrativo</p>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Usuário
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* Lista de usuários */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Criado em</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Último acesso</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((adminUser) => (
                    <tr key={adminUser.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{adminUser.email}</span>
                          {adminUser.id === user?.id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Você
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(adminUser.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {adminUser.last_sign_in_at 
                          ? new Date(adminUser.last_sign_in_at).toLocaleDateString('pt-BR')
                          : 'Nunca'
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => openPasswordModal(adminUser)}
                            className="text-gray-600 hover:text-primary-600 transition-colors"
                            title="Alterar senha"
                            aria-label="Alterar senha"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.651 1.651m-2.475-2.475l-9.193 9.193a2.25 2.25 0 00-.57.96l-.772 2.904a.75.75 0 00.916.916l2.904-.772a2.25 2.25 0 00.96-.57l9.193-9.193m-2.475-2.475l2.475 2.475" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(adminUser.id, adminUser.email)}
                            disabled={adminUser.id === user?.id}
                            className="text-red-600 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={adminUser.id === user?.id ? 'Você não pode deletar seu próprio usuário' : 'Excluir usuário'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Informações importantes */}
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Importante</h4>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>Apenas usuários com acesso admin podem visualizar e modificar o painel</li>
            <li>A senha deve ter no mínimo 6 caracteres</li>
            <li>Você não pode deletar seu próprio usuário</li>
            <li>Os usuários criados aqui terão acesso total ao painel administrativo</li>
          </ul>
        </div>
      </main>

      {/* Modal para adicionar usuário */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Adicionar Novo Usuário</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@exemplo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A senha deve ter no mínimo 6 caracteres
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAddUser}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Criar Usuário
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewUserEmail('')
                  setNewUserPassword('')
                  setMessage('')
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && selectedUser && (
        <PasswordModal
          userEmail={selectedUser.email}
          onClose={closePasswordModal}
          onSubmit={handlePasswordUpdate}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          setNewPassword={setNewPassword}
          setConfirmPassword={setConfirmPassword}
          passwordMessage={passwordMessage}
          updatingPassword={updatingPassword}
          isCurrentUser={selectedUser.id === user?.id}
        />
      )}
    </div>
  )
}

interface PasswordModalProps {
  userEmail: string
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  newPassword: string
  confirmPassword: string
  setNewPassword: Dispatch<SetStateAction<string>>
  setConfirmPassword: Dispatch<SetStateAction<string>>
  passwordMessage: string
  updatingPassword: boolean
  isCurrentUser: boolean
}

function PasswordModal({
  userEmail,
  onClose,
  onSubmit,
  newPassword,
  confirmPassword,
  setNewPassword,
  setConfirmPassword,
  passwordMessage,
  updatingPassword,
  isCurrentUser
}: PasswordModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Alterar senha</h3>
            <p className="text-sm text-gray-500 mt-1">{userEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-8 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••"
            />
          </div>

          <p className="text-xs text-gray-500">A senha deve ter pelo menos 6 caracteres. {isCurrentUser ? 'Você está atualizando a sua própria senha.' : 'Esta alteração será aplicada ao usuário selecionado.'}</p>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updatingPassword}
              className="px-5 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium transition-colors"
            >
              {updatingPassword ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </div>

          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {passwordMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
