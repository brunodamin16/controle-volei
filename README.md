# Controle Vôlei App — Sem login para o time

Modelo final:
- O time abre o link e visualiza sem login.
- Só o admin faz login para editar.
- Dados ficam salvos no Supabase.
- Hospedagem grátis na Vercel ou Netlify.

## 1. Supabase

1. Acesse https://supabase.com
2. Crie um projeto
3. Vá em SQL Editor
4. Cole e rode `supabase.sql`

## 2. Criar seu admin

No Supabase:
1. Authentication > Users
2. Add user
3. Crie seu email e senha

Depois rode no SQL Editor, trocando pelo seu email:

```sql
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'SEU_EMAIL_ADMIN@email.com'
on conflict (id) do update set role = 'admin';
```

Pronto. Só esse usuário consegue editar.

## 3. Variáveis de ambiente

No Supabase:
- Project Settings > API
- Copie Project URL
- Copie anon public key

Crie `.env`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
```

## 4. Rodar no PC

```bash
npm install
npm run dev
```

## 5. Publicar na Vercel

1. Suba essa pasta no GitHub
2. Acesse https://vercel.com
3. New Project
4. Importe o repositório
5. Em Environment Variables adicione:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
6. Deploy

Depois mande o link para o time. Elas visualizam sem senha.

No celular:
- Android: Chrome > Adicionar à tela inicial
- iPhone: Safari > Compartilhar > Adicionar à Tela de Início
