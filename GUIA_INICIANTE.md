# 🚀 GUIA COMPLETO PASSO A PASSO - BRIWAX

## PARTE 1: INSTALAR NODE.JS (OBRIGATÓRIO)

### Passo 1.1 - Baixar Node.js
1. Abra o navegador
2. Acesse: https://nodejs.org
3. Clique no botão verde grande escrito **"Download Node.js (LTS)"**
4. Espere o download terminar

### Passo 1.2 - Instalar Node.js
1. Abra o arquivo baixado (deve estar na pasta Downloads)
2. Clique em **"Continuar"** em todas as telas
3. Clique em **"Instalar"**
4. Digite a senha do seu Mac quando pedir
5. Espere a instalação terminar
6. Clique em **"Fechar"**

### Passo 1.3 - Verificar se instalou corretamente
1. Volte para o VS Code
2. Copie e cole este comando no terminal abaixo:
```bash
node --version
```
3. Aperte ENTER
4. Deve aparecer algo como: `v20.11.0` ou `v18.19.0`

---

## PARTE 2: CRIAR CONTA NO SUPABASE

### Passo 2.1 - Criar conta
1. Abra o navegador
2. Acesse: https://supabase.com
3. Clique em **"Start your project"** (botão verde)
4. Escolha **"Sign in with GitHub"** (mais fácil) OU **"Sign up now"** para criar com email
5. Se escolheu GitHub: autorize o acesso
6. Se escolheu email: digite seu email, crie uma senha e confirme no email

### Passo 2.2 - Criar novo projeto
1. Você verá a tela inicial do Supabase
2. Clique em **"New Project"** (botão verde)
3. Preencha:
   - **Name**: `briwax` (pode ser qualquer nome)
   - **Database Password**: Clique no ícone de **"Generate a password"** (vai criar uma senha automática)
   - **Region**: Escolha **"South America (São Paulo)"** se tiver, ou **"East US"**
4. Clique em **"Create new project"**
5. ⏳ Espere 2-3 minutos (vai aparecer uma barrinha de progresso)

### Passo 2.3 - Copiar as credenciais (IMPORTANTE!)
1. Quando o projeto terminar de criar, você verá o dashboard
2. No menu lateral esquerdo, clique em **⚙️ Settings** (última opção)
3. No submenu que abrir, clique em **API**
4. Você verá duas caixas de texto:
   - **Project URL**: algo como `https://abc123xyz.supabase.co`
   - **Project API keys** > **anon/public**: uma chave longa que começa com `eyJ...`
5. **DEIXE ESSA ABA ABERTA** - você vai precisar dessas informações

---

## PARTE 3: CONFIGURAR O BANCO DE DADOS

### Passo 3.1 - Abrir o Editor SQL
1. Na mesma tela do Supabase
2. No menu lateral esquerdo, clique em **🗄️ SQL Editor**
3. Clique no botão **"New Query"** (botão azul)
4. Vai abrir um editor de texto grande

### Passo 3.2 - Executar o código SQL
1. Volte para o VS Code
2. Abra o arquivo: `supabase-schema.sql` (está na lista de arquivos à esquerda)
3. Aperte `Cmd + A` (seleciona tudo)
4. Aperte `Cmd + C` (copia tudo)
5. Volte para o Supabase no navegador
6. Clique dentro do editor de texto (onde está escrito "Start typing your query...")
7. Aperte `Cmd + V` (cola o código)
8. Clique no botão **"Run"** (canto inferior direito, botão verde)
9. ✅ Deve aparecer "Success. No rows returned"

### Passo 3.3 - Verificar se as tabelas foram criadas
1. No menu lateral esquerdo, clique em **📊 Database** (ou **Table Editor**)
2. Você deve ver 2 tabelas:
   - **categories** 
   - **equipments**
3. Se aparecer essas duas, está certo! ✅

---

## PARTE 4: CONFIGURAR UPLOAD DE IMAGENS (STORAGE)

### Passo 4.1 - Criar bucket de imagens
1. No menu lateral do Supabase, clique em **📦 Storage**
2. Clique em **"Create a new bucket"** (botão verde)
3. Preencha:
   - **Name**: `equipments` (exatamente assim, sem acento)
   - **Public bucket**: ✅ **MARQUE essa caixinha** (muito importante!)
4. Clique em **"Create bucket"**

### Passo 4.2 - Configurar permissões do bucket
1. Você verá o bucket "equipments" criado
2. Clique no bucket **equipments**
3. Clique na aba **"Policies"** (no topo)
4. Clique em **"New Policy"**
5. Clique em **"Get started quickly"**
6. Escolha a opção: **"Allow public read access"** (primeira opção)
7. Clique em **"Review"**
8. Clique em **"Save policy"**

---

## PARTE 5: CRIAR USUÁRIO ADMINISTRADOR

### Passo 5.1 - Criar usuário
1. No menu lateral, clique em **👤 Authentication**
2. Clique em **"Add user"** (botão verde, canto superior direito)
3. Escolha **"Create new user"**
4. Preencha:
   - **Email**: seu email (anote!)
   - **Password**: crie uma senha (anote!)
   - **Auto Confirm User**: ✅ **MARQUE essa caixinha**
5. Clique em **"Create user"**

✅ Pronto! Agora anote essas informações:
- Email do admin: _______________
- Senha do admin: _______________

---

## PARTE 6: CONFIGURAR O PROJETO NO VS CODE

### Passo 6.1 - Criar arquivo de configuração
1. Volte para o VS Code
2. No terminal (parte de baixo), cole este comando e aperte ENTER:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EOF
```

### Passo 6.2 - Editar arquivo com suas credenciais
1. Na lista de arquivos à esquerda, clique em `.env.local` (vai abrir o arquivo)
2. Volte para o Supabase no navegador (lembra da aba aberta?)
3. Settings > API
4. **Copie** o **Project URL** (a URL completa)
5. Volte para o VS Code, cole na frente de `NEXT_PUBLIC_SUPABASE_URL=`
6. Volte para o Supabase
7. **Copie** a chave **anon/public** (a chave longa)
8. Volte para o VS Code, cole na frente de `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
9. Salve o arquivo: `Cmd + S`

**Exemplo de como deve ficar:**
```
NEXT_PUBLIC_SUPABASE_URL=https://abc123xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...resto.da.chave.aqui
```

---

## PARTE 7: RODAR O PROJETO

### Passo 7.1 - Instalar dependências
No terminal do VS Code, cole este comando:
```bash
npm install
```
⏳ Espere terminar (pode demorar 1-2 minutos)

### Passo 7.2 - Iniciar o servidor
Cole este comando:
```bash
npm run dev
```

✅ Deve aparecer: **"Ready in X seconds"** e **"Local: http://localhost:3000"**

### Passo 7.3 - Abrir no navegador
1. Segure `Cmd` e clique em: `http://localhost:3000`
2. Ou abra o navegador e digite: `http://localhost:3000`

---

## 🎉 TESTANDO

### Teste 1 - Ver a home
- Acesse: http://localhost:3000
- Deve ver a página branca com header e grid

### Teste 2 - Ver o admin
- Acesse: http://localhost:3000/admin
- Deve ver a tela de login
- Digite o email e senha que você criou no Passo 5

---

## ❌ SE DER ERRO

### Se o comando `npm install` não funcionar:
- Volte para a PARTE 1 e instale o Node.js

### Se aparecer "Cannot find module '@supabase/supabase-js'":
- Execute: `npm install @supabase/supabase-js`

### Se a página não carregar:
- Verifique se copiou corretamente a URL e a chave no arquivo `.env.local`
- As chaves NÃO podem ter espaços ou quebras de linha

---

## 📞 QUANDO TUDO ESTIVER FUNCIONANDO

Digite no chat: **"finalizado"** 

Vou continuar com o Passo 3: implementar o login funcionando e a área de gerenciamento de categorias e equipamentos.
