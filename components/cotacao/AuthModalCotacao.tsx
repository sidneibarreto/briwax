'use client'

import { useState } from 'react'
import LoginFormCotacao from './LoginFormCotacao'
import SignupFormCotacao from './SignupFormCotacao'

interface AuthModalCotacaoProps {
  onClose: () => void
  onAutenticado: () => void
}

type Tela = 'escolha' | 'login' | 'cadastro'

export default function AuthModalCotacao({ onClose, onAutenticado }: AuthModalCotacaoProps) {
  const [tela, setTela] = useState<Tela>('escolha')

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          {tela !== 'escolha' && (
            <button
              onClick={() => setTela('escolha')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className={tela === 'escolha' ? 'flex-1' : 'flex-1 ml-2'}>
            <h2 className="text-xl font-bold text-gray-900">
              {tela === 'escolha' && 'Acesse sua conta'}
              {tela === 'login' && 'Entrar'}
              {tela === 'cadastro' && 'Criar conta'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {tela === 'escolha' && 'Para fazer um pedido de cotação'}
              {tela === 'login' && 'Informe seu e-mail e senha'}
              {tela === 'cadastro' && 'Preencha os dados da sua empresa'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-8 pb-8">
          {/* Tela de escolha */}
          {tela === 'escolha' && (
            <div className="space-y-3 mt-4">
              <button
                onClick={() => setTela('login')}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-2xl transition-colors text-base"
              >
                Já tenho conta — Entrar
              </button>
              <button
                onClick={() => setTela('cadastro')}
                className="w-full border-2 border-gray-200 hover:border-primary-300 hover:bg-gray-50 text-gray-800 font-semibold py-4 rounded-2xl transition-all text-base"
              >
                Criar uma conta
              </button>
            </div>
          )}

          {/* Tela de login */}
          {tela === 'login' && (
            <LoginFormCotacao
              onAutenticado={onAutenticado}
              onIrParaCadastro={() => setTela('cadastro')}
            />
          )}

          {/* Tela de cadastro */}
          {tela === 'cadastro' && (
            <SignupFormCotacao
              onAutenticado={onAutenticado}
              onIrParaLogin={() => setTela('login')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
