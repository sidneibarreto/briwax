# Relatório de Migração de Usuários
## Firebase Auth ↔ Firestore administradores

> Data de execução: Março 2026
> Projeto Firebase: `worldstagestorebrasil`

---

## Situação Antes da Sincronização

### Firestore `administradores` (estado inicial — UUIDs do Supabase)

Os 4 docs existentes tinham como ID o UUID do Supabase Auth.
**Nenhum deles tinha e-mail armazenado** — o campo `email` estava vazio porque a tabela `admin_users` do Supabase só guardava `user_id` e `created_at`.

| Doc ID (Supabase UUID) | Email | Status |
|---|---|---|
| `396b93dc-e208-42b7-8066-091a811690e5` | (vazio) | ❌ Órfão — removido |
| `74028ca6-5d1c-4ea2-91ba-60faf08a9c60` | (vazio) | ❌ Órfão — removido |
| `bc88041f-5acb-40b4-b345-37c62a8e5138` | (vazio) | ❌ Órfão — removido |
| `ec974492-9314-42ee-969a-b7611eb14303` | (vazio) | ❌ Órfão — removido |

### Firebase Auth (antes)

Nenhum dos 5 admins existia no projeto `worldstagestorebrasil`.
> Nota: os usuários que apareciam na tela de Users eram de **outro projeto Firebase** ou ainda não tinham sido migrados para este projeto.

---

## Ações Executadas

1. **5 usuários criados** no Firebase Auth do projeto `worldstagestorebrasil`
2. **4 docs antigos removidos** do Firestore (UUIDs do Supabase sem utilidade)
3. **5 docs novos criados** no Firestore com os UIDs reais do Firebase Auth
4. **Links de redefinição de senha gerados** para cada admin

---

## Estado Após a Sincronização

### Firestore `administradores` (novo estado — Firebase UIDs)

| Firebase UID | Email | Status |
|---|---|---|
| `UUzRkXCwlNStZgNrk9yb9Qg0GW52` | bruno.barreto@nextredpro.com | ✅ Criado |
| `CsFtOYN6UpNxWY71yLd3I9t9hIw1` | marcio.nicolini@nextredpro.com | ✅ Criado |
| `iJxN7UqE7dRKrDpiIdHMGMdJ6iz2` | sidnei.barreto@nextredpro.com | ✅ Criado |
| `I0Kw1l2smShCQ1UQkQXjD9YS8f73` | sidneibarreto24071982@gmail.com | ✅ Criado |
| `SAP4p7iAq3euGTflWBicmKTeSX73` | tamiris@nextredpro.com | ✅ Criado |

---

## Mapeamento Supabase UUID → Firebase UID

> Salvo também em: `migration/exports/auth/user-id-mapping.json`

Não foi possível estabelecer vínculo direto entre os UUIDs antigos do Supabase e os novos UIDs do Firebase, pois os docs antigos **não tinham e-mail armazenado** — a tabela `admin_users` do Supabase só guardava `user_id` sem e-mail. Portanto o mapeamento é incompleto por limitação dos dados originais.

O que SÃO os 4 UUIDs antigos: registros de quais usuários do Supabase Auth eram admins, mas sem a identidade (e-mail) associada.

---

## Senhas

As senhas originais do Supabase **não podem ser migradas** — diferentes algoritmos de hash (bcrypt vs scrypt com parâmetros proprietários). Cada admin deve definir uma nova senha usando o link abaixo.

### Links de Redefinição de Senha

> ⚠️ **Estes links são de uso único e expiram em 1 hora.**
> Envie cada link para o respectivo admin o quanto antes.
> Para gerar novos links, execute: `node scripts/sync-admin-users.mjs`

**bruno.barreto@nextredpro.com:**
```
https://worldstagestorebrasil.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=6EtpP4XMgDvAfm3jomQ8VbqzllK6uCtPDwtzsX34_qkAAAGdNnpygQ&apiKey=AIzaSyA2l6XhHJMDcw7o27YxcZIM9qkWhcw1-9I&lang=en
```

**marcio.nicolini@nextredpro.com:**
```
https://worldstagestorebrasil.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=l2ON9YNszuP1QBJUxxd_QPrtzjc2Sb_4oIQUUkBUBcMAAAGdNnp6qQ&apiKey=AIzaSyA2l6XhHJMDcw7o27YxcZIM9qkWhcw1-9I&lang=en
```

**sidnei.barreto@nextredpro.com:**
```
https://worldstagestorebrasil.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=uUJ7aslYVIK0aKjCkHm22j4Oe35oTOEToc9rjQfiufIAAAGdNnqCLA&apiKey=AIzaSyA2l6XhHJMDcw7o27YxcZIM9qkWhcw1-9I&lang=en
```

**sidneibarreto24071982@gmail.com:**
```
https://worldstagestorebrasil.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=3eKQ62Fqyl4F2NQuQF-n-KAFQVvdYbLrySfKPAMli-kAAAGdNnqKCw&apiKey=AIzaSyA2l6XhHJMDcw7o27YxcZIM9qkWhcw1-9I&lang=en
```

**tamiris@nextredpro.com:**
```
https://worldstagestorebrasil.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=WKIsmY8fcIgHeD34vUM2ofui0GmiZ8CUy8tfWqnSJNkAAAGdNnqRTw&apiKey=AIzaSyA2l6XhHJMDcw7o27YxcZIM9qkWhcw1-9I&lang=en
```

---

## Como Verificar o Login

Após definir a senha via link acima:

1. Acesse `http://localhost:3000/admin` (local) ou `https://worldstagestore.com/admin` (produção)
2. Faça login com e-mail + nova senha
3. O sistema verifica o UID do Firebase Auth contra a collection `administradores`
4. Se o doc existir → acesso liberado ao painel

---

## Como Regenerar Links Expirados

```bash
cd briwax
node scripts/sync-admin-users.mjs
```

O script detecta usuários que já existem (`already_exists`) e gera novos links sem recriar as contas.

---

## Arquivos Gerados

| Arquivo | Conteúdo |
|---|---|
| `migration/exports/auth/firebase-auth-users.json` | Lista de usuários do Firebase Auth |
| `migration/exports/auth/firestore-administradores.json` | Estado inicial dos docs |
| `migration/exports/auth/auth-analysis.json` | Análise de vínculos |
| `migration/exports/auth/user-id-mapping.json` | Mapeamento UUID antigo → Firebase UID |
| `migration/exports/auth/sync-results.json` | Resultado detalhado do sync |

---

## Limitações Técnicas

| Limitação | Causa | Mitigação |
|---|---|---|
| Senhas não migradas | Algoritmos de hash incompatíveis (bcrypt vs scrypt) | Reset de senha via e-mail |
| Mapeamento UUID incompleto | `admin_users` do Supabase não armazenava e-mail | Usuários recriados com novos UIDs |
| `listUsers` retornou 0 | Service Account pode não ter role `Identity Toolkit Admin` | `getUserByEmail` funciona corretamente |
