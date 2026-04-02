'use client'

import { useState } from 'react'
import { signIn } from '@/lib/auth'

interface LoginFormCotacaoProps {
  onAutenticado: () => void
  onIrParaCadastro: () => void
}

export default function LoginFormCotacao({ onAutenticado, onIrParaCadastro }: LoginFormCotacaoProps) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await signIn(email, senha)
    setCarregando(false)

    if (error) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
      return
    }

    onAutenticado()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail da empresa</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="empresa@email.com"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
        />
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={carregando}
        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-colors"
      >
        {carregando ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Não tem conta?{' '}
        <button
          type="button"
          onClick={onIrParaCadastro}
          className="text-primary-600 hover:underline font-medium"
        >
          Criar uma conta
        </button>
      </p>
    </form>
  )
}
