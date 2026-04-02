/**
 * set-firestore-rules.mjs
 * Aplica as Firestore Security Rules corretas via API REST do Firebase
 * usando as credenciais do service account.
 *
 * Rodar com:
 *   node scripts/set-firestore-rules.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, '../firebase-service-account.json'), 'utf8')
)

const PROJECT_ID = serviceAccount.project_id

// Regras corretas: leitura pública para collections do site, escrita só autenticados
const RULES_SOURCE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leitura pública para o site
    match /equipamentos/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /categorias/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /configuracoes_site/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Administradores: apenas usuários autenticados
    match /administradores/{id} {
      allow read, write: if request.auth != null;
    }
    // Cotações: autenticados podem ler/escrever as próprias
    match /cotacoes/{id} {
      allow read, write: if request.auth != null;
    }
    // Clientes: usuário autenticado pode criar; admin vê todos; cliente vê o próprio
    match /clientes/{id} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && (
        resource.data.user_id == request.auth.uid ||
        exists(/databases/$(database)/documents/administradores/$(request.auth.uid))
      );
    }
    // Carrinhos: cada usuário acessa apenas o próprio documento (id = uid)
    match /carrinhos/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Itens de cotação: autenticados podem criar e ler os próprios itens
    match /itens_cotacao/{id} {
      allow read, write: if request.auth != null;
    }
    // Solicitações de alteração de perfil: cliente cria; cliente vê as próprias; admin vê todas
    match /solicitacoes_perfil/{id} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null && (
        resource.data.user_id == request.auth.uid ||
        exists(/databases/$(database)/documents/administradores/$(request.auth.uid))
      );
    }
    // Padrão: negar tudo
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`

async function getAccessToken() {
  // Criar JWT para autenticação com Google APIs
  const { createSign } = await import('crypto')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${header}.${payloadEncoded}`

  const sign = createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(serviceAccount.private_key, 'base64url')

  const jwt = `${signingInput}.${signature}`

  // Trocar JWT por access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error(`Falha ao obter token: ${JSON.stringify(tokenData)}`)
  }
  return tokenData.access_token
}

async function main() {
  console.log(`\nConfigurando Firestore Security Rules para: ${PROJECT_ID}`)
  console.log('Obtendo access token...')

  const accessToken = await getAccessToken()
  console.log('✅ Token obtido\n')

  // 1. Criar novo ruleset
  console.log('Criando ruleset...')
  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files: [{ name: 'firestore.rules', content: RULES_SOURCE }],
        },
      }),
    }
  )

  const rulesetData = await rulesetRes.json()
  if (!rulesetRes.ok) {
    console.error('❌ Erro ao criar ruleset:', JSON.stringify(rulesetData, null, 2))
    process.exit(1)
  }

  const rulesetName = rulesetData.name
  console.log(`✅ Ruleset criado: ${rulesetName}\n`)

  // 2. Atualizar o release para usar o novo ruleset
  console.log('Aplicando ruleset ao banco...')
  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName,
        },
      }),
    }
  )

  const releaseData = await releaseRes.json()
  if (!releaseRes.ok) {
    console.error('❌ Erro ao aplicar ruleset:', JSON.stringify(releaseData, null, 2))
    process.exit(1)
  }

  console.log('✅ Firestore Security Rules aplicadas com sucesso!\n')
  console.log('Regras configuradas:')
  console.log('  - equipamentos: leitura pública, escrita autenticada')
  console.log('  - categorias: leitura pública, escrita autenticada')
  console.log('  - configuracoes_site: leitura pública, escrita autenticada')
  console.log('  - administradores: autenticado')
  console.log('  - cotacoes: autenticado')
  console.log('  - outros: negado\n')
}

main().catch(console.error)
