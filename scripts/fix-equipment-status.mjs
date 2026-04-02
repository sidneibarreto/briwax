/**
 * fix-equipment-status.mjs
 * Atualiza todos os equipamentos no Firestore para status: 'published'
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, '../firebase-service-account.json'), 'utf8')
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function main() {
  const snap = await db.collection('equipamentos').get()
  console.log(`\nTotal de equipamentos encontrados: ${snap.size}`)

  let updated = 0
  let alreadyPublished = 0

  const batch = db.batch()
  for (const doc of snap.docs) {
    const data = doc.data()
    console.log(`  ${doc.id} → status: "${data.status}"`)
    if (data.status !== 'published') {
      batch.update(doc.ref, { status: 'published' })
      updated++
    } else {
      alreadyPublished++
    }
  }

  if (updated > 0) {
    await batch.commit()
    console.log(`\n✅ ${updated} equipamentos atualizados para status: 'published'`)
  } else {
    console.log(`\n✅ Todos os ${alreadyPublished} equipamentos já estão com status: 'published'`)
  }
  if (alreadyPublished > 0 && updated > 0) {
    console.log(`ℹ️  ${alreadyPublished} já estavam como 'published'`)
  }
}

main().catch(console.error)
