# Guia de Configuração do Supabase

## 1. Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Crie uma conta ou faça login
3. Clique em "New Project"
4. Preencha os dados:
   - **Name**: Briwax
   - **Database Password**: (escolha uma senha forte)
   - **Region**: escolha a mais próxima (Brazil - São Paulo se disponível)
5. Clique em "Create new project"

## 2. Copiar Credenciais

Após o projeto ser criado:

1. Vá em **Settings** > **API**
2. Copie:
   - **Project URL** (algo como: https://xxxxx.supabase.co)
   - **anon/public key** (chave pública para client-side)

## 3. Configurar Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e substitua pelos valores reais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

## 4. Criar Tabelas no Banco de Dados

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em "New Query"
3. Copie e cole todo o conteúdo do arquivo `supabase-schema.sql`
4. Clique em "Run" para executar
5. Verifique se as tabelas foram criadas em **Database** > **Tables**

Você deve ver:
- `categories`
- `equipments`

## 5. Configurar Storage para Imagens

1. Vá em **Storage** no menu lateral
2. Clique em "Create a new bucket"
3. Preencha:
   - **Name**: `equipments`
   - **Public bucket**: ✅ Marque como público
4. Clique em "Create bucket"

### Configurar Políticas de Storage

1. Clique no bucket `equipments`
2. Vá na aba **Policies**
3. Clique em "New Policy" e adicione as seguintes políticas:

**Política 1 - Leitura Pública:**
- Policy name: `Public read access`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `true`

**Política 2 - Upload Autenticado:**
- Policy name: `Authenticated upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `true`

**Política 3 - Delete Autenticado:**
- Policy name: `Authenticated delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `true`

## 6. Criar Usuário Admin

1. Vá em **Authentication** > **Users**
2. Clique em "Add user" > "Create new user"
3. Preencha:
   - **Email**: seu-admin@email.com
   - **Password**: escolha uma senha forte
   - **Auto Confirm User**: ✅ Marque
4. Clique em "Create user"

## 7. Verificar Configuração

Execute no projeto:

```bash
npm install
npm run dev
```

Acesse:
- **Home**: http://localhost:3000
- **Admin**: http://localhost:3000/admin

## Estrutura Criada

### Tabelas:
- ✅ `categories` (id, name, slug, created_at)
- ✅ `equipments` (id, name, description, image_url, category_id, status, created_at)

### Políticas RLS:
- ✅ Leitura pública de categorias
- ✅ Leitura pública de equipamentos **published**
- ✅ CRUD completo para usuários autenticados

### Storage:
- ✅ Bucket `equipments` público
- ✅ Upload/delete apenas para autenticados

## Próximos Passos

Após configurar tudo acima, responda "finalizado" para prosseguir com o Passo 3:
- Implementação da autenticação no /admin
- Gestão de categorias (CRUD)
