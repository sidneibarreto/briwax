/**
 * create-admin-users.mjs
 *
 * Cria as contas de admin no Firebase Authentication.
 *
 * COMO USAR:
 * 1. Preencha o array ADMINS abaixo com os e-mails dos administradores
 * 2. Execute: node scripts/create-admin-users.mjs
 * 3. Cada admin receberá um e-mail de redefinição de senha
 *
 * Pré-requisito: firebase-service-account.json salvo na raiz do projeto
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SERVICE_ACCOUNT_PATH = resolve(__dirname, '../firebase-service-account.json')

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ firebase-service-account.json não encontrado')
  process.exit(1)
}

// ─── PREENCHA AQUI OS E-MAILS DOS ADMINS ──────────────────────────────────
// Estes são os usuários que terão acesso ao painel /admin
const ADMINS = [
  // { email: 'admin@worldstagestore.com' },
  // { email: 'outro@worldstagestore.com' },
]
// ──────────────────────────────────────────────────────────────────────────

if (ADMINS.length === 0) {
  console.error('\n❌ Nenhum admin configurado.')
  console.error('   Edite o array ADMINS no arquivo scripts/create-admin-users.mjs')
  console.error('   e adicione os e-mails dos administradores.\n')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })
const adminAuth = getAuth()
const db = getFirestore()

async function main() {
  console.log('\n══════════════════════════════════════════')
  console.log('  👤 Criação de usuários admin no Firebase')
  console.log('══════════════════════════════════════════\n')

  for (const admin of ADMINS) {
    const { email } = admin
    console.log(`\n📧 Processando: ${email}`)

    try {
      // 1. Verifica se já existe
      let user
      try {
        user = await adminAuth.getUserByEmail(email)
        console.log(`   ℹ️  Usuário já existe no Firebase Auth (uid: ${user.uid})`)
      } catch {
        // Cria com senha temporária aleatória
        const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-4).toUpperCase() + '!'
        user = await adminAuth.createUser({ email, password: tempPassword })
        console.log(`   ✓ Usuário criado (uid: ${user.uid})`)
      }

      // 2. Salva/atualiza no Firestore (administradores)
      await db.collection('administradores').doc(user.uid).set({
        email: user.email || email,
        user_id: user.uid,
        created_at: new Date().toISOString(),
        last_sign_in_at: '',
      })
      console.log(`   ✓ Registrado em Firestore administradores/${user.uid}`)

      // 3. Dispara e-mail de redefinição de senha
      const resetLink = await adminAuth.generatePasswordResetLink(email)
      console.log(`   ✓ Link de redefinição de senha:`)
      console.log(`      ${resetLink}`)
      console.log(`   💡 Envie este link para ${email} para que defina nova senha`)

    } catch (err) {
      console.error(`   ❌ Erro para ${email}: ${err.message}`)
    }
  }

  console.log('\n══════════════════════════════════════════')
  console.log('  ✅ Concluído. Envie os links de reset por e-mail.')
  console.log('══════════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
