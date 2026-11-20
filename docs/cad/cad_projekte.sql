-- Spengler Digital CAD: Cloud-Projekte (Tabelle cad_projekte)
-- In Supabase (SQL-Editor) einmal ausführen. Voraussetzung: Funktionen has_permission() und Tabellen profiles/companies der Spengler-Digital-App.
-- Ein CAD-Projekt (.sdcad als JSON) gehört zu einer Firma und optional zu einer Auftragsnummer (= Projekt der App).

create table if not exists public.cad_projekte (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  auftrag       text,                                   -- Auftragsnummer / Projektname der App (optional)
  name          text not null,
  daten         jsonb not null,                         -- komplettes CAD-Projekt
  version       integer not null default 1,             -- optimistische Sperre
  schema_version integer not null default 1,
  geloescht     boolean not null default false,         -- nie endgültig löschen
  besitzer      uuid references auth.users(id),
  erstellt      timestamptz not null default now(),
  geaendert     timestamptz not null default now(),
  geaendert_von uuid references auth.users(id)
);
create index if not exists cad_projekte_firma_idx on public.cad_projekte (company_id, geloescht, geaendert desc);
create index if not exists cad_projekte_auftrag_idx on public.cad_projekte (company_id, auftrag);

create or replace function public.cad_projekte_stempel() returns trigger language plpgsql as $$
begin
  new.geaendert := now(); new.geaendert_von := auth.uid();
  if tg_op = 'INSERT' then new.besitzer := coalesce(new.besitzer, auth.uid()); end if;
  return new;
end $$;
drop trigger if exists cad_projekte_stempel on public.cad_projekte;
create trigger cad_projekte_stempel before insert or update on public.cad_projekte for each row execute function public.cad_projekte_stempel();

alter table public.cad_projekte enable row level security;
-- Lesen: alle der eigenen Firma mit Recht «projects view»; Schreiben: Recht «projects edit»
drop policy if exists cad_projekte_lesen on public.cad_projekte;
create policy cad_projekte_lesen on public.cad_projekte for select to authenticated
  using (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','view'));
drop policy if exists cad_projekte_neu on public.cad_projekte;
create policy cad_projekte_neu on public.cad_projekte for insert to authenticated
  with check (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','edit'));
drop policy if exists cad_projekte_aendern on public.cad_projekte;
create policy cad_projekte_aendern on public.cad_projekte for update to authenticated
  using (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','edit'))
  with check (company_id = (select company_id from public.profiles where id = auth.uid()));
-- kein DELETE-Recht: Löschen = geloescht=true
