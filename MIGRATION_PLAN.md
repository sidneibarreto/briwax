# Plano de Migração: Supabase → Firebase
## Projeto: worldstagestore.com (briwax)

> **Status geral: ✅ CONCLUÍDA**
> Data de execução: Março 2026

---

## Índice

1. [Auditoria do Projeto](#1-auditoria-do-projeto)
2. [Mapeamento de Migração](#2-mapeamento-de-migração)
3. [Exportação do Supabase](#3-exportação-do-supabase)
4. [Dados Migrados para Firestore](#4-dados-migrados-para-firestore)
5. [Imagens / Storage](#5-imagens--storage)
6. [Firebase Auth](#6-firebase-auth)
7. [Ajuste do Frontend](#7-ajuste-do-frontend)
8. [Estado Atual e Gaps Pendentes](#8-estado-atual-e-gaps-pendentes)
9. [Checklist Completo](#9-checklist-completo)
10. [Credenciais Necessárias](#10-credenciais-necessárias)
11. [Avisos de Segurança](#11-avisos-de-segurança)

---

## 1. Auditoria do Projeto

### 1.1 Arquivos que usavam Supabase (antes da migração)

| Arquivo | O que usava |
|---|---|
| `lib/supabase.ts` | `createClient` do `@supabase/supabase-js` |
| `lib/auth.ts` | `supabase.auth.signInWithPassword`, `signOut`, `getUser` |
| `app/admin/page.tsx` | Login via Supabase Auth |
| `app/admin/dashboard/page.tsx` | `supabase.from('equipments').select(...)` |
| `app/admin/categories/page.tsx` | CRUD via Supabase |
| `app/admin/equipments/page.tsx` | CRUD + upload storage Supabase |
| `app/admin/settings/page.tsx` | CRUD + upload storage Supabase |
| `app/admin/users/page.tsx` | Gerenciamento de usuários Supabase Auth |
| `components/Header.tsx` | `supabase.storage.from(...).getPublicUrl('logo.png')` |
| `components/Banner.tsx` | `supabase.storage.from(...).list('banner/')` |
| `components/EquipmentGrid.tsx` | `supabase.from('equipments').select(...)` |
| `components/Footer.tsx` | `supabase.from('site_settings').select(...)` |

### 1.2 Tabelas encontradas no Supabase PostgreSQL

```sql
-- Confirmado por query direta ao banco:
public.categories       -- 11 registros
public.equipments       -- 20 registros
public.site_settings    -- 1 registro
public.admin_users      -- 4 registros (user_id + created_at)

-- NÃO existiam em produção (criadas só no código novo):
-- public.clientes
-- public.cotacoes
-- public.cotacao_items
```

### 1.3 Buckets e caminhos de imagens no Supabase Storage

```
Bucket: equipments
  logo.png                    ← logo circular do site
  banner/
    1770258374625_0.webp
    1770258422806_0.png
    1770258488134_0.png
    1770258499711_0.png
  (raiz)                      ← 25 imagens de equipamentos (.png/.jpeg)
```

### 1.4 Variáveis de ambiente Supabase (antes)

```env
NEXT_PUBLIC_SUPABASE_URL=https://dqwjnyoryvrhwyybrdtz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 2. Mapeamento de Migração

### 2.1 Banco de dados

| Supabase PostgreSQL | Firestore Collection | Observações |
|---|---|---|
| `public.categories` | `categorias` | Mesmos campos, `id` como ID do doc |
| `public.equipments` | `equipamentos` | Mesmos campos + `images[]` |
| `public.site_settings` | `configuracoes_site/principal` | Doc único (não coleção) |
| `public.admin_users` | `administradores` | `user_id` → ID do doc Firebase Auth |
| _(não existia)_ | `cotacoes` | Novo — sistema de cotações |
| _(não existia)_ | `clientes` | Novo — cadastro de clientes |
| _(não existia)_ | `itens_cotacao` | Novo — itens por cotação |

### 2.2 Autenticação

| Supabase Auth | Firebase Auth | Status |
|---|---|---|
| `signInWithPassword` | `signInWithEmailAndPassword` | ✅ substituído |
| `signOut` | `signOut` | ✅ substituído |
| `onAuthStateChange` | `onAuthStateChanged` | ✅ substituído |
| `createUser` (admin) | `adminAuth.createUser` | ✅ substituído |
| Senhas dos admins | **⚠️ NÃO MIGRADAS** | Ver Seção 6 |

### 2.3 Storage

| Supabase Storage | Destino | Status |
|---|---|---|
| `equipments/logo.png` | `/public/logo.png` (local) | ✅ baixado |
| `equipments/banner/*` | `/public/banner/*` (local) | ✅ baixado (4 imagens) |
| `equipments/*.png/jpeg` | `/public/equipamentos/*` (local) | ✅ baixado (25 imagens) |

> **Decisão arquitetural:** As imagens são servidas como arquivos estáticos pelo Next.js
> a partir da pasta `/public/`, sem precisar do Firebase Storage ou Supabase Storage.
> Isso simplifica o deploy na Hostgator e elimina custos de storage em cloud.

---

## 3. Exportação do Supabase

### 3.1 Script de migração de banco

Arquivo: `scripts/migrate.mjs`

Executado com:
```bash
cd briwax
node scripts/migrate.mjs
```

Resultado:
```
✓ 11 categorias → Firestore categorias
✓ 20 equipamentos → Firestore equipamentos
✓ 1 configuração → Firestore configuracoes_site/principal
✓ 4 usuários admin → Firestore administradores
```

### 3.2 Script de download de imagens

Arquivo: `scripts/download-images.mjs`

Executado com:
```bash
node scripts/download-images.mjs
```

Resultado:
```
✓ logo.png → public/logo.png
✓ 4 banners → public/banner/
✓ 25 imagens → public/equipamentos/
✓ Firestore configuracoes_site atualizado com novos caminhos
```

---

## 4. Dados Migrados para Firestore

### Collection `categorias` (11 docs)
```json
{
  "id": "<uuid>",
  "name": "Nome da categoria",
  "slug": "nome-da-categoria",
  "created_at": "2025-..."
}
```

### Collection `equipamentos` (20 docs)
```json
{
  "id": "<uuid>",
  "name": "Nome do equipamento",
  "description": "Descrição",
  "image_url": "/equipamentos/1770259756828_0.png",
  "images": ["/equipamentos/1770259756828_0.png"],
  "category_id": "<uuid>",
  "status": "active",
  "preco": 0,
  "created_at": "2025-..."
}
```

### Doc `configuracoes_site/principal`
```json
{
  "phone": "...",
  "email": "...",
  "address": "...",
  "instagram_url": "...",
  "whatsapp_url": "...",
  "logo_url": "/logo.png",
  "banners": [
    "/banner/1770258374625_0.webp",
    "/banner/1770258422806_0.png",
    "/banner/1770258488134_0.png",
    "/banner/1770258499711_0.png"
  ],
  "updated_at": "2025-..."
}
```

### Collection `administradores` (4 docs)
```json
{
  "user_id": "<uuid-do-supabase>",
  "created_at": "2025-..."
}
```
> ⚠️ Esses `user_id` são UUIDs do Supabase Auth — não correspondem a UIDs do Firebase Auth.
> Ver Seção 6 para o plano de ação.

---

## 5. Imagens / Storage

### Estrutura atual em `/public/`

```
briwax/public/
├── logo.png
├── banner/
│   ├── 1770258374625_0.webp
│   ├── 1770258422806_0.png
│   ├── 1770258488134_0.png
│   └── 1770258499711_0.png
└── equipamentos/
    ├── 1770259756828_0.png
    ├── 1770259768967_0.png
    ├── 1770410347560_0.jpeg
    └── ... (mais 22 imagens)
```

### Como as imagens são servidas

O Next.js serve automaticamente qualquer arquivo dentro de `/public/` como rota pública:

| Arquivo | URL pública |
|---|---|
| `public/logo.png` | `https://worldstagestore.com/logo.png` |
| `public/banner/arquivo.png` | `https://worldstagestore.com/banner/arquivo.png` |
| `public/equipamentos/1234_0.png` | `https://worldstagestore.com/equipamentos/1234_0.png` |

### Upload de novas imagens (pós-migração)

A API route `POST /api/upload` salva arquivos novos em `/public/` automaticamente:

```typescript
// Equipamentos: POST /api/upload com folder=equipamentos
// Banners: POST /api/upload com folder=banner
// Logo: POST /api/upload com folder= e name=logo.png
```

---

## 6. Firebase Auth

### O problema

A tabela `admin_users` do Supabase só armazenava `user_id` (UUID do Supabase Auth) e `created_at`.
Os e-mails e senhas ficavam no Supabase Auth — **inacessíveis via conexão PostgreSQL direta**.

### Por que não é possível migrar senhas

O Supabase Auth usa `bcrypt` para hashear senhas. O Firebase Auth usa um algoritmo próprio (scrypt com parâmetros específicos). Mesmo obtendo os hashes, a importação exigiria o `signerKey` e `saltSeparator` do Supabase Auth — informações que exigem acesso à API de Admin do Supabase com `service_role_key`, e mesmo assim o Firebase precisa que o algoritmo seja declarado explicitamente.

**Conclusão: não é viável migrar senhas de forma segura sem as chaves internas do Supabase Auth.**

### Plano B: Recriar usuários admin no Firebase Auth

Execute o script abaixo para criar os usuários admin no Firebase Auth manualmente:

```bash
node scripts/create-admin-users.mjs
```

O script irá criar cada admin com senha temporária e disparar e-mail de redefinição.

> **Ação manual necessária:** Você precisa fornecer os e-mails dos 4 admins que existiam no Supabase.
> Edite o array `ADMINS` no arquivo `scripts/create-admin-users.mjs` antes de executar.

### Limitações conhecidas do Firebase Auth

| Funcionalidade | Firebase Auth | Observação |
|---|---|---|
| E-mail + senha | ✅ Suportado | |
| Redefinição de senha por e-mail | ✅ Suportado | |
| Importar usuários com hash bcrypt | ❌ Não suportado nativamente | |
| Importar usuários com hash scrypt | ✅ Suportado | Requer parâmetros do Supabase |
| Criar usuário via Admin SDK | ✅ Suportado | Já implementado |

---

## 7. Ajuste do Frontend

### 7.1 Arquivos modificados durante a migração

| Arquivo | Mudança |
|---|---|
| `lib/firebase.ts` | **Criado** — inicialização Firebase Client SDK |
| `lib/firebase-admin.ts` | **Criado** — Firebase Admin SDK (server-side) |
| `lib/auth.ts` | **Reescrito** — Firebase Auth (signIn, signOut, getUser) |
| `lib/supabase.ts` | **Convertido para shim** — re-exporta de `./firebase` |
| `lib/types.ts` | **Atualizado** — tipos compatíveis com Firestore |
| `components/Header.tsx` | Logo via `/logo.png` local (antes: Supabase Storage) |
| `components/AdminHeader.tsx` | Logo via `/logo.png` local |
| `components/Banner.tsx` | Banners via Firestore `configuracoes_site.banners[]` |
| `components/Footer.tsx` | Footer data via Firestore |
| `components/EquipmentGrid.tsx` | Equipamentos via Firestore `equipamentos` |
| `app/admin/page.tsx` | Login via Firebase Auth |
| `app/admin/categories/page.tsx` | CRUD via Firestore |
| `app/admin/equipments/page.tsx` | CRUD + upload via `/api/upload` |
| `app/admin/settings/page.tsx` | Upload via `/api/upload`, dados via Firestore |
| `app/admin/users/page.tsx` | Gerenciamento via Firebase Admin SDK |
| `app/api/upload/route.ts` | **Nova** — API de upload local (`/public/`) |
| `app/api/admin/users/route.ts` | **Nova** — Gerenciamento de usuários via Admin SDK |

### 7.2 Variáveis de ambiente (`.env.local`)

```env
# Firebase Client SDK (público)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=worldstagestorebrasil.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=worldstagestorebrasil
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=worldstagestorebrasil.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# Firebase Admin SDK (servidor — nunca expor no cliente)
FIREBASE_PROJECT_ID=worldstagestorebrasil
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@worldstagestorebrasil.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

---

## 8. Estado Atual e Gaps Pendentes

### ✅ Concluído

- [x] 100% do código frontend migrado de Supabase para Firebase
- [x] 11 categorias migradas para Firestore
- [x] 20 equipamentos migrados para Firestore
- [x] Configurações do site migradas para Firestore
- [x] 4 registros de `admin_users` migrados para Firestore (`administradores`)
- [x] 34 imagens baixadas para `/public/` (logo + banners + equipamentos)
- [x] URLs de imagem no Firestore atualizadas para caminhos locais
- [x] API route `/api/upload` criada para novos uploads
- [x] Firebase Admin SDK configurado para gerenciamento server-side
- [x] Zero dependências do `@supabase/supabase-js` no código de produção

### ⚠️ Pendente

- [ ] **Criar usuários admin no Firebase Auth** — os 4 admins existentes no Supabase precisam ser recriados no Firebase Auth com novos e-mails/senhas. Sem isso, o login no painel `/admin` não funciona em produção.
- [ ] **Configurar regras de segurança do Firestore** — definir rules no Firebase Console para proteger as coleções
- [ ] **Deploy na Hostgator** — preparar o build de produção e fazer o upload

---

## 9. Checklist Completo

### Pré-migração
- [x] Levantamento de tabelas no Supabase
- [x] Levantamento de buckets de storage
- [x] Identificação de fluxos de autenticação
- [x] Criação do projeto Firebase (worldstagestorebrasil)
- [x] Geração do Service Account (firebase-service-account.json)
- [x] Configuração do `.env.local`

### Migração de dados
- [x] Script `migrate.mjs` criado e executado
- [x] Categorias exportadas e importadas (11)
- [x] Equipamentos exportados e importados (20)
- [x] Configurações do site exportadas e importadas
- [x] Registros de admin exportados e importados
- [x] Script `download-images.mjs` criado e executado
- [x] Logo baixada
- [x] Banners baixados (4)
- [x] Imagens de equipamentos baixadas (25)
- [x] Firestore atualizado com novos caminhos de imagem

### Migração do código
- [x] Firebase SDK instalado
- [x] Firebase Admin SDK instalado
- [x] `lib/firebase.ts` criado
- [x] `lib/firebase-admin.ts` criado
- [x] `lib/auth.ts` reescrito com Firebase Auth
- [x] Todos os componentes migrados
- [x] Todas as páginas admin migradas
- [x] API routes criadas
- [x] Zero erros de TypeScript

### Pendente
- [ ] Criar contas admin no Firebase Auth
- [ ] Configurar Firestore Security Rules
- [ ] Testar login do painel admin
- [ ] Testar upload de novas imagens
- [ ] Build de produção (`npm run build`)
- [ ] Deploy na Hostgator

---

## 10. Credenciais Necessárias

### Para rodar os scripts de migração

| Credencial | Onde obter | Usada em |
|---|---|---|
| Supabase PostgreSQL host | Supabase Dashboard → Settings → Database | `migrate.mjs` |
| Supabase PostgreSQL password | Supabase Dashboard → Settings → Database | `migrate.mjs` |
| Supabase Anon Key | Supabase Dashboard → Settings → API | `migrate.mjs`, `download-images.mjs` |
| Firebase Service Account JSON | Firebase Console → Project Settings → Service Accounts | `migrate.mjs` |
| Firebase Storage Bucket name | Firebase Console → Storage | `.env.local` |

### Para o frontend em produção

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web App |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | Service Account JSON |
| `FIREBASE_PRIVATE_KEY` | Service Account JSON |

---

## 11. Avisos de Segurança

### ⚠️ Credenciais hardcoded em scripts

O arquivo `scripts/migrate.mjs` contém credenciais em texto puro:
- Senha do banco Supabase PostgreSQL
- Anon Key do Supabase

**Ação recomendada:**
1. O script já cumpriu seu propósito — a migração está concluída
2. Se o Supabase ainda estiver ativo, altere a senha do banco no dashboard
3. Adicione o script ao `.gitignore` ou remova as credenciais antes de versionar

### ✅ O que está seguro

- `firebase-service-account.json` está no `.gitignore`
- As chaves Firebase no `.env.local` estão no `.gitignore`
- A API `/api/upload` valida tipos de arquivo e previne path traversal
- A API `/api/admin/users` verifica token JWT do Firebase antes de qualquer operação

---

## Ordem de execução (para referência futura)

Se precisar repetir a migração em outro projeto:

```bash
# 1. Instalar dependências
npm install firebase firebase-admin pg

# 2. Configurar credenciais em .env.local
# (copiar .env.local.example e preencher)

# 3. Migrar dados do banco
node scripts/migrate.mjs

# 4. Baixar imagens do storage
node scripts/download-images.mjs

# 5. Criar usuários admin no Firebase Auth
node scripts/create-admin-users.mjs

# 6. Iniciar servidor local para testar
npm run dev

# 7. Build de produção
npm run build

# 8. Deploy
# (ver DEPLOY_PRODUCAO.md)
```
