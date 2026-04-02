'use client'

import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

// Lista de estados brasileiros
const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
]

interface SignupFormCotacaoProps {
  onAutenticado: () => void
  onIrParaLogin: () => void
}

interface DadosCNPJ {
  nome?: string
  fantasia?: string
  situacao?: string
  qsa?: { qual: string; nome: string }[]
}

export default function SignupFormCotacao({ onAutenticado, onIrParaLogin }: SignupFormCotacaoProps) {
  const [form, setForm] = useState({
    nomeEmpresa: '',
    email: '',
    cnpj: '',
    whatsapp: '',
    senha: '',
    confirmarSenha: '',
    estado: '',
    cidade: '',
  })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [validandoCNPJ, setValidandoCNPJ] = useState(false)
  const [dadosCNPJ, setDadosCNPJ] = useState<DadosCNPJ | null>(null)
  const [erroCNPJ, setErroCNPJ] = useState('')

  function formatarCNPJ(valor: string) {
    // Remove tudo que não for número
    const nums = valor.replace(/\D/g, '').slice(0, 14)
    // Aplica máscara: 00.000.000/0000-00
    return nums
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    if (name === 'cnpj') {
      const formatado = formatarCNPJ(value)
      setForm((prev) => ({ ...prev, cnpj: formatado }))
      setDadosCNPJ(null)
      setErroCNPJ('')
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function validarCNPJ() {
    const cnpjLimpo = form.cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      setErroCNPJ('CNPJ deve ter 14 dígitos.')
      return
    }

    setValidandoCNPJ(true)
    setErroCNPJ('')
    setDadosCNPJ(null)

    try {
      // API pública brasileira de consulta de CNPJ
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
      if (!res.ok) {
        setErroCNPJ('CNPJ não encontrado ou inativo. Verifique e tente novamente.')
        setValidandoCNPJ(false)
        return
      }
      const dados = await res.json()

      // Pega o primeiro sócio da lista
      const socio = dados.qsa?.[0]?.nome_socio || dados.qsa?.[0]?.nome || ''

      setDadosCNPJ({
        nome: dados.razao_social,
        fantasia: dados.nome_fantasia,
        situacao: dados.descricao_situacao_cadastral,
        qsa: [{ qual: '', nome: socio }],
      })

      if (dados.descricao_situacao_cadastral?.toUpperCase() !== 'ATIVA') {
        setErroCNPJ(`CNPJ com situação "${dados.descricao_situacao_cadastral}". Apenas CNPJs ativos são aceitos.`)
      }
    } catch {
      setErroCNPJ('Erro ao consultar CNPJ. Verifique sua conexão e tente novamente.')
    }

    setValidandoCNPJ(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    // Validação completa de todos os campos obrigatórios
    if (!form.nomeEmpresa.trim()) {
      setErro('Informe o nome da empresa.')
      return
    }
    if (!form.whatsapp.trim()) {
      setErro('Informe o WhatsApp da empresa.')
      return
    }
    if (!form.estado) {
      setErro('Selecione o estado.')
      return
    }
    if (!form.cidade.trim()) {
      setErro('Informe a cidade.')
      return
    }
    if (!dadosCNPJ) {
      setErro('Valide o CNPJ antes de continuar.')
      return
    }
    if (dadosCNPJ.situacao?.toUpperCase() !== 'ATIVA') {
      setErro('Apenas empresas com CNPJ ativo podem se cadastrar.')
      return
    }
    if (form.senha !== form.confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }
    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setCarregando(true)
    let userCriado: any = null

    try {
      // 1. Criar usuário no Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.senha)
      userCriado = cred.user

      // 2. Salvar dados completos na coleção clientes
      await addDoc(collection(db, 'clientes'), {
        user_id: cred.user.uid,
        nome_empresa: form.nomeEmpresa.trim(),
        email: form.email.trim(),
        cnpj: form.cnpj.replace(/\D/g, ''),
        whatsapp: form.whatsapp.trim(),
        estado: form.estado,
        cidade: form.cidade.trim(),
        nome_socio: dadosCNPJ.qsa?.[0]?.nome || '',
        razao_social_oficial: dadosCNPJ.nome || '',
        situacao_cnpj: dadosCNPJ.situacao || 'ATIVA',
        created_at: serverTimestamp(),
      })

      setCarregando(false)
      onAutenticado()
    } catch (err: any) {
      setCarregando(false)
      console.error('Erro no cadastro:', err?.code, err?.message)

      // Se o Auth foi criado mas o Firestore falhou, exclui o usuário do Auth
      // para não deixar conta fantasma sem dados
      if (userCriado && (err.code === 'permission-denied' || err.code?.includes('firestore'))) {
        try { await userCriado.delete() } catch {}
        setErro('Erro ao salvar dados da empresa. Tente novamente.')
        return
      }

      if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está cadastrado. Faça login.')
      } else if (err.code === 'auth/weak-password') {
        setErro('Senha muito fraca. Use pelo menos 6 caracteres.')
      } else if (err.code === 'auth/invalid-email') {
        setErro('E-mail inválido. Verifique e tente novamente.')
      } else {
        setErro('Erro ao criar conta. Tente novamente.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      {/* Nome da empresa */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa</label>
        <input
          type="text"
          name="nomeEmpresa"
          value={form.nomeEmpresa}
          onChange={handleChange}
          required
          placeholder="Razão social ou nome fantasia"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
        />
      </div>

      {/* E-mail */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-mail da empresa <span className="text-gray-400 font-normal">(use o e-mail corporativo)</span>
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="empresa@seudominio.com"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
        />
      </div>

      {/* CNPJ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="cnpj"
            value={form.cnpj}
            onChange={handleChange}
            required
            placeholder="00.000.000/0000-00"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
          <button
            type="button"
            onClick={validarCNPJ}
            disabled={validandoCNPJ || form.cnpj.replace(/\D/g, '').length !== 14}
            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl transition whitespace-nowrap"
          >
            {validandoCNPJ ? 'Validando...' : 'Validar'}
          </button>
        </div>
        {erroCNPJ && (
          <p className="text-xs text-red-600 mt-1">{erroCNPJ}</p>
        )}
        {dadosCNPJ && !erroCNPJ && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800 space-y-0.5">
            <p className="font-semibold">✓ CNPJ válido</p>
            {dadosCNPJ.nome && <p>Razão social: {dadosCNPJ.nome}</p>}
            {dadosCNPJ.qsa?.[0]?.nome && <p>Sócio/responsável: {dadosCNPJ.qsa[0].nome}</p>}
          </div>
        )}
      </div>

      {/* WhatsApp */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
        <input
          type="text"
          name="whatsapp"
          value={form.whatsapp}
          onChange={handleChange}
          required
          placeholder="(11) 99999-9999"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
        />
      </div>

      {/* Estado e Cidade */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition bg-white"
          >
            <option value="">Selecione</option>
            {ESTADOS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
          <input
            type="text"
            name="cidade"
            value={form.cidade}
            onChange={handleChange}
            required
            placeholder="Sua cidade"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
        </div>
      </div>

      {/* Senha */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input
            type="password"
            name="senha"
            value={form.senha}
            onChange={handleChange}
            required
            placeholder="Mínimo 6 dígitos"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
          <input
            type="password"
            name="confirmarSenha"
            value={form.confirmarSenha}
            onChange={handleChange}
            required
            placeholder="Repita a senha"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
        </div>
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
        {carregando ? 'Criando conta...' : 'Criar conta e continuar'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <button
          type="button"
          onClick={onIrParaLogin}
          className="text-primary-600 hover:underline font-medium"
        >
          Entrar
        </button>
      </p>
    </form>
  )
}
