-- SUPABASE SETUP - Controle Vôlei
-- Modelo: time visualiza sem login; somente admin logado edita.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.app_state (
  id int primary key default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

-- Qualquer pessoa com o link consegue visualizar os dados.
drop policy if exists "app_state_public_read" on public.app_state;
create policy "app_state_public_read"
on public.app_state for select
to anon, authenticated
using (true);

-- Só usuário logado com role admin consegue editar.
drop policy if exists "app_state_update_admin" on public.app_state;
create policy "app_state_update_admin"
on public.app_state for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

insert into public.app_state (id, data)
values (
  1,
  '{
    "players":["ALINE","ANA","ANDREIA","BABI","BRUNA","FLAVIA","HELO","KAWANY","LAIZ","MARI","MARIA","MONIQUE","MORGANA","SOLANGE","THALYNE","EDUARDA","ISABELA","LETICIA","KAYLANE","THAIS","ESTEFANY"],
    "categories":["Técnico","Quadra","Campeonatos","Uniformes","Materiais","Outros"],
    "fees":{"Jan":70,"Fev":70,"Mar":70,"Abr":80,"Mai":80,"Jun":80,"Jul":80,"Ago":80,"Set":80,"Out":80,"Nov":80,"Dez":80},
    "payments":{},
    "expenses":{}
  }'::jsonb
)
on conflict (id) do nothing;

-- Após criar o usuário admin no Supabase Authentication:
-- insert into public.profiles (id, email, role)
-- select id, email, 'admin'
-- from auth.users
-- where email = 'SEU_EMAIL_ADMIN@email.com'
-- on conflict (id) do update set role = 'admin';
