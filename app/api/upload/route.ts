import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ALLOWED_FOLDERS = ['equipamentos', 'banner', '']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = ((formData.get('folder') as string) ?? '').replace(/[^a-z]/g, '')
    const customName = formData.get('name') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido. Use PNG, JPG ou WebP.' }, { status: 400 })
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Pasta inválida' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png'
      : file.type === 'image/webp' ? 'webp'
      : file.type === 'image/gif' ? 'gif'
      : 'jpeg'

    const fileName = customName || `${Date.now()}_0.${ext}`

    const dir = folder
      ? join(process.cwd(), 'public', folder)
      : join(process.cwd(), 'public')

    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    writeFileSync(join(dir, fileName), buffer)

    const publicPath = folder ? `/${folder}/${fileName}` : `/${fileName}`
    return NextResponse.json({ path: publicPath })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { path } = await request.json()

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 })
    }

    // Segurança: apenas permite excluir dentro de /banner/ ou /equipamentos/
    if (!path.startsWith('/banner/') && !path.startsWith('/equipamentos/')) {
      return NextResponse.json({ error: 'Operação não permitida' }, { status: 403 })
    }

    // Evita path traversal
    const normalizedPath = path.replace(/\.\./g, '')
    const filePath = join(process.cwd(), 'public', normalizedPath)

    unlinkSync(filePath)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }
}
