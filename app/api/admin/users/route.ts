import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'

async function verifyAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  try {
    return await adminAuth.verifyIdToken(token)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const snap = await adminDb.collection('administradores').orderBy('created_at', 'desc').get()
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ users })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { email, password } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })

    const newUser = await adminAuth.createUser({ email, password })
    const now = new Date().toISOString()
    // Usa o Firebase UID como ID do documento para facilitar lookups
    await adminDb.collection('administradores').doc(newUser.uid).set({
      email: newUser.email || email,
      created_at: now,
      last_sign_in_at: ''
    })
    return NextResponse.json({ success: true, user: { id: newUser.uid, email, created_at: now, last_sign_in_at: '' } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { id, password } = await request.json()
    if (!id || !password) return NextResponse.json({ error: 'ID e nova senha são obrigatórios' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 })

    await adminAuth.updateUser(id, { password })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    if (!userId) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    if (userId === admin.uid) return NextResponse.json({ error: 'Não é possível excluir seu próprio usuário' }, { status: 400 })

    await adminAuth.deleteUser(userId)
    await adminDb.collection('administradores').doc(userId).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
