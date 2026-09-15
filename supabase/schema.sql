-- BabyBanking - schema iniziale per Supabase
-- Incolla ed esegui tutto questo file nell'SQL Editor di Supabase (una volta sola).

create table if not exists accounts (
  id text primary key,
  name text not null,
  avatar text not null,
  color text not null
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references accounts(id),
  type text not null check (type in ('deposit', 'withdraw')),
  amount numeric(10, 2) not null check (amount > 0),
  description text not null,
  date timestamptz not null,
  balance_after numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_account_id_idx on transactions(account_id);

create table if not exists app_settings (
  id int primary key default 1,
  kids_pin_hash text not null,
  parent_pin_hash text not null,
  constraint app_settings_singleton check (id = 1)
);

-- Blocca l'accesso diretto dal browser: solo il server dell'app (che usa la
-- "service role key", mai esposta pubblicamente) potrà leggere/scrivere.
alter table accounts enable row level security;
alter table transactions enable row level security;
alter table app_settings enable row level security;

-- I tre conti di partenza.
insert into accounts (id, name, avatar, color) values
  ('arturo', 'Arturo', '🦁', '#3B82F6'),
  ('santiago', 'Santiago', '🐯', '#F97316'),
  ('sofia', 'Sofia', '🦄', '#EC4899')
on conflict (id) do nothing;

-- Password di partenza: "1234" per i bambini, "2026" per i genitori.
-- Sono già cifrate (bcrypt), non compaiono mai in chiaro. Cambiale subito
-- dopo il primo avvio con lo script "npm run set-pins" (vedi README).
insert into app_settings (id, kids_pin_hash, parent_pin_hash) values (
  1,
  '$2a$10$7bHKzzl646YTSv/oRCGs..eRFG1qevukdTM.UBABGshNM8gfcsb9e',
  '$2a$10$PLTavhMZMwyECabtZLpxX.l7/wd/LB/NOviiWfHxZhdTMtDeizml.'
)
on conflict (id) do nothing;
