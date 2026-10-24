-- Aggiunge la colonna usata dal ping giornaliero (scrittura, non più solo
-- lettura) per tenere sveglio il progetto Supabase. Esegui questo file
-- nell'SQL Editor di Supabase se il tuo progetto esiste già da prima di
-- questa modifica (su un progetto nuovo basta supabase/schema.sql).

alter table app_settings add column if not exists last_heartbeat_at timestamptz;
