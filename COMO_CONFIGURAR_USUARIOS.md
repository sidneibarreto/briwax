# Como Configurar o Gerenciamento de Usuários Admin (SEGURO PARA PRODUÇÃO)

Esta solução usa **PostgreSQL Functions** no Supabase, que são executadas no servidor do Supabase com segurança.  
**NÃO requer Service Role Key** - é totalmente seguro para produção! 🔒

## Passo 1: Executar o SQL no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie TODO o conteúdo do arquivo `supabase-admin-functions.sql`
6. Cole no editor
7. **IMPORTANTE**: Na última linha, substitua `'seu-email@exemplo.com'` pelo email que você usa para fazer login no admin
8. Clique em **Run** (ou pressione Ctrl+Enter)

## Passo 2: Verificar se funcionou

Se tudo correu bem, você verá a mensagem de sucesso no SQL Editor.

## Passo 3: Usar o sistema

1. Acesse [http://localhost:3000/admin/users](http://localhost:3000/admin/users)
2. Agora você pode:
   - ✅ Ver todos os usuários admin
   - ✅ Adicionar novos usuários
   - ✅ Excluir usuários (exceto você mesmo)

## Por que esta solução é segura?

1. **Não usa Service Role Key** - Nenhuma chave secreta exposta
2. **Funções SQL com SECURITY DEFINER** - Rodam no servidor do Supabase com permissões controladas
3. **Verificações de autenticação** - Apenas usuários logados podem usar as funções
4. **Validações integradas** - Email único, senha mínima, etc
5. **Proteção contra auto-exclusão** - Você não pode deletar seu próprio usuário
6. **Totalmente seguro para produção** - Pode subir na web sem preocupações! 🚀

## O que as funções fazem?

- `create_admin_user()` - Cria novo usuário com email/senha
- `list_admin_users()` - Lista todos os admins
- `delete_admin_user()` - Remove um admin (com validações)

Todas as funções verificam autenticação e aplicam regras de segurança automaticamente.

## Troubleshooting

**Erro ao criar usuário**: Verifique se executou o SQL no Supabase  
**Não vejo usuários**: Certifique-se de ter substituído o email na última linha do SQL  
**"Não autorizado"**: Faça login novamente no painel admin

