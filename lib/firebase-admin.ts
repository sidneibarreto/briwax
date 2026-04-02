// Firebase Admin SDK — usado exclusivamente em API routes (server-side)
// Nunca importar este arquivo em componentes client-side

import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // A chave privada vem de variável de ambiente com escapes de \n
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })
}

export const adminAuth = admin.auth()
export const adminDb = admin.firestore()
export default admin
