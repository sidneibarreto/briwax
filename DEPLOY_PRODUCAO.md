# 🚀 DEPLOY EM PRODUÇÃO - BRIWAX

## ✅ SETUP COMPLETO

### Banco de Dados (Supabase)
- ✅ Tabelas criadas (categories, equipments, site_settings, admin_users)
- ✅ Políticas RLS configuradas
- ✅ Funções PostgreSQL criadas (SECURITY DEFINER)
- ✅ Storage bucket 'equipments' configurado
- ✅ Usuário admin criado: sidnei.barreto@nextredpro.com

### Código
- ✅ Sistema de login funcionando
- ✅ Gerenciamento de usuários funcionando
- ✅ Upload de imagens funcionando
- ✅ Configurações do rodapé funcionando
- ✅ Sem dependência de Service Role Key (seguro para produção)

---

## 📋 PRÓXIMOS PASSOS PARA DEPLOY

### 1. ESCOLHER PLATAFORMA DE DEPLOY

**Recomendado: Vercel** (otimizado para Next.js)

#### Outras opções:
- **Netlify** (fácil setup)
- **Railway** (deploy rápido)
- **Render** (opção gratuita)
- **AWS Amplify**

---

### 2. PREPARAR VARIÁVEIS DE AMBIENTE

No painel da plataforma de deploy, adicione estas variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

⚠️ **IMPORTANTE**: 
- NÃO adicione o Service Role Key
- Use apenas as variáveis com `NEXT_PUBLIC_`
- Essas são as mesmas do arquivo `.env.local`

---

### 3. DEPLOY NO VERCEL (RECOMENDADO)

#### Opção A: Via Dashboard Vercel
1. Acesse: https://vercel.com
2. Clique em "Add New Project"
3. Importe o repositório GitHub (ou faça upload)
4. Configure as variáveis de ambiente
5. Clique em "Deploy"

#### Opção B: Via Terminal
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Adicionar variáveis de ambiente
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy em produção
vercel --prod
```

---

### 4. VERIFICAR APÓS DEPLOY

#### ✅ Checklist de Verificação:
- [ ] Site abre sem erros
- [ ] Banner carrega imagens
- [ ] Menu de categorias funciona
- [ ] Rodapé exibe informações corretas
- [ ] Login admin funciona (`/admin`)
- [ ] Painel admin carrega corretamente
- [ ] Pode criar/editar equipamentos
- [ ] Pode adicionar/remover usuários
- [ ] Configurações salvam corretamente

---

### 5. CONFIGURAÇÕES PÓS-DEPLOY

#### Domínio Personalizado (Opcional)
No Vercel:
1. Settings → Domains
2. Adicione seu domínio
3. Configure DNS conforme instruções

#### SSL/HTTPS
- ✅ Vercel adiciona SSL automaticamente
- Nenhuma configuração necessária

#### Supabase Auth Redirect
No Supabase Dashboard:
1. Authentication → URL Configuration
2. Adicione sua URL de produção em "Site URL"
3. Adicione em "Redirect URLs": 
   - `https://seudominio.com/admin`
   - `https://seudominio.com/admin/dashboard`

---

## 🔒 SEGURANÇA

### ✅ Implementado:
- Row Level Security (RLS) em todas as tabelas
- Autenticação via Supabase Auth
- Funções PostgreSQL com SECURITY DEFINER
- Sem exposição de Service Role Key
- Storage público apenas para leitura

### 🚨 Recomendações Adicionais:
- Ative 2FA na conta Supabase
- Configure backup automático do banco
- Monitore logs de acesso
- Mantenha dependências atualizadas

---

## 📊 MONITORAMENTO

### Vercel Analytics
```bash
# Opcional: Adicionar analytics
npm install @vercel/analytics
```

### Supabase Logs
- Acesse: Projeto → Logs
- Monitore: API requests, autenticação, storage

---

## 🐛 TROUBLESHOOTING

### Erro: "Cannot read properties of undefined"
- Verifique variáveis de ambiente
- Confirme que começam com `NEXT_PUBLIC_`

### Erro: "Failed to fetch"
- Verifique URL do Supabase
- Confirme RLS policies

### Imagens não carregam
- Verifique bucket 'equipments' existe
- Confirme políticas de storage

### Login não funciona
- Adicione URL de produção no Supabase Auth
- Verifique redirect URLs

---

## 📝 COMANDOS ÚTEIS

```bash
# Build local (testar antes do deploy)
npm run build
npm start

# Verificar erros de TypeScript
npx tsc --noEmit

# Limpar cache
rm -rf .next
npm run build
```

---

## 🎯 RESULTADO ESPERADO

Após deploy bem-sucedido:
- ✅ Site público acessível em qualquer dispositivo
- ✅ Admin panel funcionando em `/admin`
- ✅ Banco de dados seguro e escalável
- ✅ Upload de imagens funcionando
- ✅ Performance otimizada (Next.js + Vercel)

---

## 📞 SUPORTE

- Documentação Next.js: https://nextjs.org/docs
- Documentação Supabase: https://supabase.com/docs
- Documentação Vercel: https://vercel.com/docs

---

**Data de Deploy**: _____________________  
**URL Produção**: _____________________  
**Versão**: 1.0.0
