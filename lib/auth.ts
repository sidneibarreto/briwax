import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from './firebase'

export async function signIn(email: string, password: string) {
  try {
    const data = await signInWithEmailAndPassword(auth, email, password)
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth)
    return { error: null }
  } catch (error: any) {
    return { error }
  }
}

// Retorna o usuário atual de forma assíncrona (aguarda estado de auth)
export async function getUser() {
  return new Promise<any>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

// Compatibilidade com código que usa getSession()
export async function getSession() {
  const user = auth.currentUser
  if (!user) return null
  const token = await user.getIdToken()
  return { access_token: token, user }
}

// Criar usuário admin (usado na página de usuários)
export async function criarUsuario(email: string, password: string) {
  try {
    const data = await createUserWithEmailAndPassword(auth, email, password)
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

// Atualizar senha do usuário logado
export async function atualizarSenha(novaSenha: string) {
  const user = auth.currentUser
  if (!user) return { error: new Error('Usuário não autenticado') }
  try {
    await firebaseUpdatePassword(user, novaSenha)
    return { error: null }
  } catch (error: any) {
    return { error }
  }
}
