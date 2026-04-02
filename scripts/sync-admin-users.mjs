/**
 * sync-admin-users.mjs
 *
 * Sincroniza os usuários admin entre Firebase Auth e Firestore.
 *
 * O que faz:
 * 1. Para cada e-mail da lista KNOWN_ADMINS:
 *    - Busca o usuário no Firebase Auth por e-mail
 *    - Se existe → obtém o Firebase UID real
 *    - Se não existe → cria o usuário e dispara reset de senha
 * 2. Remove os docs antigos no Firestore (com UUIDs do Supabase)
 * 3. Cria/atualiza docs corretos usando o Firebase UID real
 * 4. Gera o mapeamento supabase_uuid → firebase_uid
 * 5. Salva relatório completo
 *
 * Rodar com:
 *   node scripts/sync-admin-users.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SERVICE_ACCOUNT_PATH = resolve(ROOT, 'firebase-service-account.json')
const OUTPUT_DIR = resolve(ROOT, 'migration/exports/auth')

// ─── LISTA DE ADMINS CONHECIDOS ────────────────────────────────────────────
// Preencher com todos os e-mails que devem ter acesso ao painel /admin
const KNOWN_ADMINS = [
  'bruno.barreto@nextredpro.com',
  'marcio.nicolini@nextredpro.com',
  'sidnei.barreto@nextredpro.com',
  'sidneibarreto24071982@gmail.com',
  'tamiris@nextredpro.com',
]
// ──────────────────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const adminAuth = getAuth()
const db = getFirestore()

async function main() {
  console.log('\n══════════════════════════════════════════════')
  console.log('  🔄 Sync: Firebase Auth ↔ Firestore Admin')
  console.log('══════════════════════════════════════════════\n')

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

  // ─── 1. Carregar docs antigos do Firestore (UUIDs do Supabase) ───────────
  const adminSnap = await db.collection('administradores').get()
  const oldDocs = adminSnap.docs.map((d) => ({ doc_id: d.id, ...d.data() }))

  console.log(`📋 Docs antigos no Firestore (${oldDocs.length}):`)
  for (const d of oldDocs) {
    console.log(`   • ${d.doc_id} → e-mail: ${d.email || '(sem email)'}`)
  }

  // ─── 2. Para cada admin conhecido, buscar/criar no Firebase Auth ─────────
  console.log(`\n👤 Processando ${KNOWN_ADMINS.length} admins conhecidos...\n`)

  const mapping = []   // supabase_uuid → firebase_uid
  const results = []   // resultados completos

  for (const email of KNOWN_ADMINS) {
    console.log(`📧 ${email}`)
    const entry = { email, status: '', firebase_uid: '', action: '', reset_link: '' }

    try {
      // Tenta buscar usuário existente pelo e-mail
      const user = await adminAuth.getUserByEmail(email)
      entry.firebase_uid = user.uid
      entry.status = 'already_exists'
      entry.action = 'none'
      console.log(`   ✓ Já existe no Firebase Auth → UID: ${user.uid}`)
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Cria novo usuário com senha temporária aleatória
        const tempPwd = Math.random().toString(36).slice(-10) + 'A1!'
        try {
          const newUser = await adminAuth.createUser({ email, password: tempPwd })
          entry.firebase_uid = newUser.uid
          entry.status = 'created'
          entry.action = 'created_new_user'
          console.log(`   ✓ Criado no Firebase Auth → UID: ${newUser.uid}`)
        } catch (createErr) {
          entry.status = 'error'
          entry.action = `create_failed: ${createErr.message}`
          console.log(`   ❌ Falha ao criar: ${createErr.message}`)
          results.push(entry)
          continue
        }
      } else {
        entry.status = 'error'
        entry.action = `lookup_failed: ${err.message}`
        console.log(`   ❌ Erro ao buscar: ${err.message}`)
        results.push(entry)
        continue
      }
    }

    // Gerar link de reset de senha
    try {
      const link = await adminAuth.generatePasswordResetLink(email)
      entry.reset_link = link
      console.log(`   ✓ Link de reset gerado`)
    } catch {}

    // Tentar casar com um doc antigo do Firestore pelo e-mail (se stored) ou manter registro
    const oldDoc = oldDocs.find((d) => d.email && d.email.toLowerCase() === email.toLowerCase())
    if (oldDoc) {
      mapping.push({ supabase_uuid: oldDoc.doc_id, firebase_uid: entry.firebase_uid, email })
      entry.old_supabase_uuid = oldDoc.doc_id
    }

    results.push(entry)
  }

  // ─── 3. Atualizar Firestore administradores ──────────────────────────────
  console.log('\n🔄 Atualizando Firestore administradores...')
  const batch = db.batch()

  // Apagar docs antigos com UUIDs do Supabase
  for (const oldDoc of oldDocs) {
    const isSupabaseUuid = !results.some((r) => r.firebase_uid === oldDoc.doc_id)
    if (isSupabaseUuid) {
      batch.delete(db.collection('administradores').doc(oldDoc.doc_id))
      console.log(`   🗑️  Removendo doc antigo: ${oldDoc.doc_id}`)
    }
  }

  // Criar/atualizar docs com Firebase UIDs reais
  for (const r of results) {
    if (!r.firebase_uid) continue
    batch.set(
      db.collection('administradores').doc(r.firebase_uid),
      {
        email: r.email,
        user_id: r.firebase_uid,
        created_at: new Date().toISOString(),
        last_sign_in_at: '',
      },
      { merge: true }
    )
    console.log(`   ✓ Doc criado/atualizado: administradores/${r.firebase_uid} (${r.email})`)
  }

  await batch.commit()
  console.log('   ✅ Firestore atualizado')

  // ─── 4. Salvar arquivos ──────────────────────────────────────────────────
  const mappingPath = resolve(OUTPUT_DIR, 'user-id-mapping.json')
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2))
  console.log('\n📄 Arquivos salvos:')
  console.log('   migration/exports/auth/user-id-mapping.json')

  const resultsPath = resolve(OUTPUT_DIR, 'sync-results.json')
  writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log('   migration/exports/auth/sync-results.json')

  // ─── 5. Resumo final ─────────────────────────────────────────────────────
  const existentes = results.filter((r) => r.status === 'already_exists')
  const criados = results.filter((r) => r.status === 'created')
  const erros = results.filter((r) => r.status === 'error')

  console.log('\n══════════════════════════════════════════════')
  console.log('  ✅ CONCLUÍDO')
  console.log('══════════════════════════════════════════════')
  console.log(`  Já existiam no Firebase: ${existentes.length}`)
  console.log(`  Criados agora: ${criados.length}`)
  console.log(`  Erros: ${erros.length}`)

  if (results.some((r) => r.reset_link)) {
    console.log('\n🔑 Links de reset de senha:')
    for (const r of results) {
      if (r.reset_link) {
        console.log(`\n  ${r.email}:`)
        console.log(`  ${r.reset_link}`)
      }
    }
  }

  console.log()
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
