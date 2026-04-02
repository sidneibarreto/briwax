/**
 * audit-firebase-users.mjs
 * 
 * Lista todos os usuários existentes no Firebase Auth e no Firestore (administradores)
 * e salva os resultados em migration/exports/
 * 
 * Rodar com:
 *   node scripts/audit-firebase-users.mjs
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

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const adminAuth = getAuth()
const db = getFirestore()

async function main() {
  console.log('\n══════════════════════════════════════════════')
  console.log('  🔍 Auditoria: Firebase Auth + Firestore')
  console.log('══════════════════════════════════════════════\n')

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

  // ─── 1. Listar todos os usuários do Firebase Auth ────────────────────────
  console.log('👤 Listando usuários do Firebase Auth...')
  const firebaseUsers = []
  let pageToken

  do {
    const result = await adminAuth.listUsers(1000, pageToken)
    for (const user of result.users) {
      firebaseUsers.push({
        uid: user.uid,
        email: user.email || '',
        emailVerified: user.emailVerified,
        providerData: user.providerData.map((p) => p.providerId),
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime || null,
        disabled: user.disabled,
      })
    }
    pageToken = result.pageToken
  } while (pageToken)

  console.log(`   ✓ ${firebaseUsers.length} usuário(s) encontrado(s) no Firebase Auth`)

  const authPath = resolve(OUTPUT_DIR, 'firebase-auth-users.json')
  writeFileSync(authPath, JSON.stringify(firebaseUsers, null, 2))
  console.log(`   ✓ Salvo em: migration/exports/auth/firebase-auth-users.json`)

  // ─── 2. Listar collection administradores no Firestore ───────────────────
  console.log('\n📋 Listando collection "administradores" no Firestore...')
  const adminSnap = await db.collection('administradores').get()
  const firestoreAdmins = adminSnap.docs.map((d) => ({ doc_id: d.id, ...d.data() }))

  console.log(`   ✓ ${firestoreAdmins.length} doc(s) na collection administradores`)

  const adminPath = resolve(OUTPUT_DIR, 'firestore-administradores.json')
  writeFileSync(adminPath, JSON.stringify(firestoreAdmins, null, 2))
  console.log(`   ✓ Salvo em: migration/exports/auth/firestore-administradores.json`)

  // ─── 3. Análise de vínculo: Firebase Auth ↔ Firestore ───────────────────
  console.log('\n🔗 Analisando vínculos...')

  const firebaseUIDSet = new Set(firebaseUsers.map((u) => u.uid))
  const firebaseEmailMap = new Map(firebaseUsers.map((u) => [u.email.toLowerCase(), u]))

  const linked = []
  const orphanFirestore = []
  const orphanFirebase = []

  // Admins no Firestore que têm ou não têm correspondente no Firebase Auth
  for (const admin of firestoreAdmins) {
    const byUid = firebaseUIDSet.has(admin.doc_id)
    const byEmail = admin.email ? firebaseEmailMap.get(admin.email.toLowerCase()) : null

    if (byUid) {
      linked.push({ source: 'firestore_doc', doc_id: admin.doc_id, email: admin.email, status: 'uid_matches' })
    } else if (byEmail) {
      orphanFirestore.push({
        source: 'firestore_doc',
        doc_id: admin.doc_id,
        email: admin.email,
        firebase_uid: byEmail.uid,
        status: 'email_matches_but_uid_differs',
        action: 'remap_firestore_doc',
      })
    } else {
      orphanFirestore.push({
        source: 'firestore_doc',
        doc_id: admin.doc_id,
        email: admin.email || '(sem email)',
        status: 'not_found_in_firebase_auth',
        action: 'create_firebase_user_or_delete',
      })
    }
  }

  // Usuários no Firebase Auth sem doc no Firestore administradores
  for (const fbUser of firebaseUsers) {
    const hasDoc = firestoreAdmins.some(
      (a) => a.doc_id === fbUser.uid || (a.email && a.email.toLowerCase() === fbUser.email.toLowerCase())
    )
    if (!hasDoc) {
      orphanFirebase.push({
        uid: fbUser.uid,
        email: fbUser.email,
        status: 'firebase_user_without_firestore_admin_doc',
        action: 'create_admin_doc_if_needed',
      })
    }
  }

  const analysis = { linked, orphan_firestore_docs: orphanFirestore, firebase_users_without_admin_doc: orphanFirebase }
  const analysisPath = resolve(OUTPUT_DIR, 'auth-analysis.json')
  writeFileSync(analysisPath, JSON.stringify(analysis, null, 2))

  console.log(`   ✓ ${linked.length} doc(s) com UID correto`)
  console.log(`   ⚠️  ${orphanFirestore.length} doc(s) Firestore com problema de vínculo`)
  console.log(`   ℹ️  ${orphanFirebase.length} usuário(s) Firebase sem doc admin no Firestore`)
  console.log(`   ✓ Análise salva em: migration/exports/auth/auth-analysis.json`)

  // ─── 4. Imprimir resumo ──────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════')
  console.log('  📊 RESUMO')
  console.log('══════════════════════════════════════════════')
  console.log('\nUsuários no Firebase Auth:')
  for (const u of firebaseUsers) {
    console.log(`  • ${u.email || '(sem email)'} — uid: ${u.uid}`)
  }

  if (orphanFirestore.length > 0) {
    console.log('\n⚠️  Docs no Firestore que precisam de correção:')
    for (const a of orphanFirestore) {
      console.log(`  • doc_id: ${a.doc_id} | email: ${a.email} | ação: ${a.action}`)
      if (a.firebase_uid) console.log(`    → Firebase UID correspondente: ${a.firebase_uid}`)
    }
  }

  console.log('\nArquivos gerados:')
  console.log('  migration/exports/auth/firebase-auth-users.json')
  console.log('  migration/exports/auth/firestore-administradores.json')
  console.log('  migration/exports/auth/auth-analysis.json')
  console.log('\nPróximo passo: node scripts/sync-admin-users.mjs\n')
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
