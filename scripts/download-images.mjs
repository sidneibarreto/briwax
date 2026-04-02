/**
 * download-images.mjs
 *
 * Baixa todas as imagens do Supabase Storage para a pasta /public/
 * e atualiza os campos image_url no Firestore para usar caminhos locais.
 *
 * Rodar com:
 *   node scripts/download-images.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── CONFIG ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dqwjnyoryvrhwyybrdtz.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_BUCKET = 'equipments'
const PUBLIC_DIR = resolve(__dirname, '../public')
const SERVICE_ACCOUNT_PATH = resolve(__dirname, '../firebase-service-account.json')

// ─── INICIALIZAÇÃO ─────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// ─── HELPERS ───────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function downloadFile(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function listBucket(prefix = '') {
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
  return Array.isArray(data) ? data.filter((f) => f.id !== null && f.name) : []
}

function supabaseUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`
}

// ─── PASSO 1: BAIXAR LOGO ──────────────────────────────────────────────────

async function downloadLogo() {
  console.log('\n🖼️  Logo...')
  ensureDir(PUBLIC_DIR)
  try {
    const buf = await downloadFile(supabaseUrl('logo.png'))
    writeFileSync(resolve(PUBLIC_DIR, 'logo.png'), buf)
    console.log('   ✓ public/logo.png')
    return '/logo.png'
  } catch (e) {
    console.log(`   ⚠️  ${e.message}`)
    return null
  }
}

// ─── PASSO 2: BAIXAR BANNERS ───────────────────────────────────────────────

async function downloadBanners() {
  console.log('\n🎨 Banners...')
  const bannerDir = resolve(PUBLIC_DIR, 'banner')
  ensureDir(bannerDir)
  const files = await listBucket('banner')
  const localPaths = []
  for (const f of files) {
    try {
      const buf = await downloadFile(supabaseUrl(`banner/${f.name}`))
      writeFileSync(resolve(bannerDir, f.name), buf)
      const localPath = `/banner/${f.name}`
      localPaths.push(localPath)
      console.log(`   ✓ public/banner/${f.name}`)
    } catch (e) {
      console.log(`   ⚠️  banner/${f.name}: ${e.message}`)
    }
  }
  return localPaths
}

// ─── PASSO 3: BAIXAR IMAGENS DE EQUIPAMENTOS ──────────────────────────────

async function downloadEquipmentImages() {
  console.log('\n📷 Imagens de equipamentos...')
  const imgDir = resolve(PUBLIC_DIR, 'equipamentos')
  ensureDir(imgDir)

  // Lista todos os arquivos na raiz do bucket (excluindo pasta banner e logo)
  const files = await listBucket('')
  const imageFiles = files.filter(
    (f) => f.name !== 'logo.png' && !f.name.startsWith('banner')
  )

  // Mapa: URL Supabase → caminho local
  const urlMap = {}
  for (const f of imageFiles) {
    try {
      const buf = await downloadFile(supabaseUrl(f.name))
      writeFileSync(resolve(imgDir, f.name), buf)
      const supaUrl = supabaseUrl(f.name)
      urlMap[supaUrl] = `/equipamentos/${f.name}`
      console.log(`   ✓ public/equipamentos/${f.name}`)
    } catch (e) {
      console.log(`   ⚠️  ${f.name}: ${e.message}`)
    }
  }
  return urlMap
}

// ─── PASSO 4: ATUALIZAR FIRESTORE ─────────────────────────────────────────

async function updateFirestore(logoPath, bannerPaths, equipmentUrlMap) {
  console.log('\n🔄 Atualizando Firestore...')

  // 4a. Atualizar configurações do site (logo + banners)
  const settingsRef = db.collection('configuracoes_site').doc('principal')
  const settingsSnap = await settingsRef.get()
  if (settingsSnap.exists) {
    const updates = {}
    if (logoPath) updates.logo_url = logoPath
    if (bannerPaths.length > 0) updates.banners = bannerPaths
    if (Object.keys(updates).length > 0) {
      await settingsRef.update(updates)
      console.log('   ✓ configuracoes_site/principal atualizado')
    }
  }

  // 4b. Atualizar image_url dos equipamentos
  const equipSnap = await db.collection('equipamentos').get()
  let updated = 0
  for (const doc of equipSnap.docs) {
    const data = doc.data()
    const updates = {}

    // image_url principal
    if (data.image_url && equipmentUrlMap[data.image_url]) {
      updates.image_url = equipmentUrlMap[data.image_url]
    }

    // array images[]
    if (Array.isArray(data.images)) {
      const newImages = data.images.map((url) => equipmentUrlMap[url] || url)
      if (JSON.stringify(newImages) !== JSON.stringify(data.images)) {
        updates.images = newImages
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates)
      updated++
    }
  }
  console.log(`   ✓ ${updated} equipamentos atualizados`)
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════════════')
  console.log('  📥 Download: Supabase Storage → /public/')
  console.log('════════════════════════════════════════════════')

  const logoPath = await downloadLogo()
  const bannerPaths = await downloadBanners()
  const equipmentUrlMap = await downloadEquipmentImages()

  await updateFirestore(logoPath, bannerPaths, equipmentUrlMap)

  console.log('\n════════════════════════════════════════════════')
  console.log('  ✅ Pronto! Imagens em /public/, Firestore atualizado.')
  console.log('════════════════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
