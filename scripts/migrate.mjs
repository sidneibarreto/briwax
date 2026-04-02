/**
 * migrate.mjs — Migração completa Supabase → Firebase
 *
 * ATENÇÃO: Migração já executada com sucesso. Este script é mantido apenas para
 * referência histórica ou execução em novos ambientes.
 *
 * Credenciais necessárias em .env.local ou variáveis de ambiente:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_DB_HOST
 *   SUPABASE_DB_PASSWORD
 *
 * Rodar com:
 *   node scripts/migrate.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import pkg from 'pg'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { Client } = pkg

// ─── CONFIG ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dqwjnyoryvrhwyybrdtz.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_BUCKET = 'equipments'
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'worldstagestorebrasil.firebasestorage.app'
const SERVICE_ACCOUNT_PATH = resolve(__dirname, '../firebase-service-account.json')

// ─── VALIDAÇÃO ─────────────────────────────────────────────────────────────

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\n❌ Arquivo não encontrado: firebase-service-account.json')
  console.error('   Gere em: Firebase Console → Project Settings → Service Accounts → Generate new private key')
  console.error('   Salve como: briwax/firebase-service-account.json\n')
  process.exit(1)
}

// ─── INICIALIZAÇÃO ─────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: FIREBASE_STORAGE_BUCKET,
})

const db = getFirestore()
let bucket = getStorage().bucket()

async function ensureBucketExists() {
  // Tenta os dois formatos de nome de bucket do Firebase
  const candidates = [
    'worldstagestorebrasil.firebasestorage.app',
    'worldstagestorebrasil.appspot.com',
  ]
  for (const name of candidates) {
    try {
      const b = getStorage().bucket(name)
      const [exists] = await b.exists()
      if (exists) {
        bucket = b
        console.log(`   ✓ Bucket encontrado: ${name}`)
        return true
      }
    } catch {}
  }
  // Nenhum bucket encontrado — tenta criar
  console.log('   ⚠️  Nenhum bucket encontrado. Tentando criar...')
  try {
    const b = getStorage().bucket('worldstagestorebrasil.appspot.com')
    await b.create({ location: 'US' })
    bucket = b
    console.log('   ✓ Bucket criado: worldstagestorebrasil.appspot.com')
    return true
  } catch (e) {
    console.log(`   ❌ Não foi possível criar o bucket: ${e.message}`)
    console.log('   💡 Vá ao Firebase Console → Storage → Get Started e inicialize o Storage')
    return false
  }
}

const pg = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.dqwjnyoryvrhwyybrdtz.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || '',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

// ─── HELPERS ───────────────────────────────────────────────────────────────

function supabasePublicUrl(filePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filePath}`
}

async function downloadFile(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function uploadToFirebase(buffer, destPath, contentType = 'image/jpeg') {
  const file = bucket.file(destPath)
  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: 'public, max-age=31536000' },
  })
  console.log(`      ✓ ${destPath}`)
}

async function listSupabaseBucket(prefix = '') {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix, limit: 200, offset: 0 }),
    }
  )
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function contentTypeFor(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'image/jpeg'
}

// ─── MIGRAÇÃO DE TABELAS ───────────────────────────────────────────────────

async function migrateCategories() {
  console.log('\n📂 Categorias...')
  const { rows } = await pg.query('SELECT * FROM categories ORDER BY created_at')
  for (const row of rows) {
    await db.collection('categorias').doc(row.id).set({
      name: row.name || '',
      slug: row.slug || '',
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
    })
  }
  console.log(`   ✓ ${rows.length} registros`)
}

async function migrateEquipments() {
  console.log('\n🔧 Equipamentos...')
  const { rows } = await pg.query('SELECT * FROM equipments ORDER BY created_at')
  for (const row of rows) {
    await db.collection('equipamentos').doc(row.id).set({
      name: row.name || '',
      description: row.description || '',
      image_url: row.image_url || '',
      images: row.images || (row.image_url ? [row.image_url] : []),
      category_id: row.category_id || '',
      status: row.status || 'draft',
      preco: row.preco || 0,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
    })
  }
  console.log(`   ✓ ${rows.length} registros`)
}

async function migrateSiteSettings() {
  console.log('\n⚙️  Configurações do site...')
  const { rows } = await pg.query('SELECT * FROM site_settings LIMIT 1')
  if (rows.length === 0) {
    console.log('   ℹ️  Nenhuma configuração encontrada')
    return
  }
  const row = rows[0]
  await db.collection('configuracoes_site').doc('principal').set({
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    instagram_url: row.instagram_url || '',
    whatsapp_url: row.whatsapp_url || '',
    updated_at: row.updated_at?.toISOString() || new Date().toISOString(),
  })
  console.log('   ✓ 1 registro')
}

async function migrateAdminUsers() {
  console.log('\n👤 Usuários admin (tabela admin_users)...')
  try {
    const { rows } = await pg.query(
      `SELECT user_id, created_at FROM admin_users ORDER BY created_at`
    )
    for (const row of rows) {
      await db.collection('administradores').doc(row.user_id).set({
        user_id: row.user_id || '',
        created_at: row.created_at?.toISOString() || new Date().toISOString(),
      })
    }
    console.log(`   ✓ ${rows.length} usuários`)
  } catch (e) {
    console.log(`   ⚠️  ${e.message}`)
  }
}

// ─── MIGRAÇÃO DE STORAGE ───────────────────────────────────────────────────

async function migrateStorage() {
  console.log('\n🗂️  Arquivos de Storage...')

  const bucketOk = await ensureBucketExists()
  if (!bucketOk) return

  // 1. Logo
  try {
    console.log('   Baixando logo.png...')
    const buf = await downloadFile(supabasePublicUrl('logo.png'))
    await uploadToFirebase(buf, 'logo.png', 'image/png')
  } catch (e) {
    console.log(`   ⚠️  logo.png: ${e.message}`)
  }

  // 2. Banner
  try {
    console.log('   Listando banner/...')
    const files = await listSupabaseBucket('banner')
    const valid = files.filter((f) => f.id !== null && f.name)
    for (const f of valid) {
      try {
        const buf = await downloadFile(supabasePublicUrl(`banner/${f.name}`))
        await uploadToFirebase(buf, `banner/${f.name}`, contentTypeFor(f.name))
      } catch (e) {
        console.log(`   ⚠️  banner/${f.name}: ${e.message}`)
      }
    }
    console.log(`   ✓ ${valid.length} imagens de banner`)
  } catch (e) {
    console.log(`   ⚠️  banner: ${e.message}`)
  }

  // 3. Imagens de equipamentos (raiz do bucket)
  try {
    console.log('   Listando imagens de equipamentos...')
    const files = await listSupabaseBucket('')
    const images = files.filter(
      (f) => f.id !== null && f.name && f.name !== 'logo.png' && !f.name.startsWith('banner')
    )
    for (const f of images) {
      try {
        const buf = await downloadFile(supabasePublicUrl(f.name))
        await uploadToFirebase(buf, f.name, contentTypeFor(f.name))
      } catch (e) {
        console.log(`   ⚠️  ${f.name}: ${e.message}`)
      }
    }
    console.log(`   ✓ ${images.length} imagens de equipamentos`)
  } catch (e) {
    console.log(`   ⚠️  imagens: ${e.message}`)
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  🚀 Migração Supabase → Firebase')
  console.log('═══════════════════════════════════════════════')

  await pg.connect()
  console.log('✓ Conectado ao PostgreSQL (Supabase)')

  await migrateCategories()
  await migrateEquipments()
  await migrateSiteSettings()
  await migrateAdminUsers()
  await migrateStorage()

  await pg.end()

  console.log('\n═══════════════════════════════════════════════')
  console.log('  ✅ Migração concluída com sucesso!')
  console.log('═══════════════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('\n❌ Erro na migração:', err.message)
  process.exit(1)
})
