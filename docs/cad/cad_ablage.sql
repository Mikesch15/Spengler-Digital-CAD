-- Spengler Digital CAD: Cloud-Ablage (Tabellen cad_ordner und cad_dateien)
-- In Supabase (SQL-Editor) einmal ausführen. Voraussetzung: Funktion has_permission() und Tabellen profiles/companies der Spengler-Digital-App.
-- Struktur: Projekte / <Jahr> / <Projekt> / { Modelle, Exporte, Pläne } – Ordner sind Pfade; das CAD legt sie automatisch an,
-- sobald ein Modell einem Projekt zugeordnet wird (nur wenn es sie noch nicht gibt).

create table if not exists public.cad_ordner (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  pfad        text not null,                         -- z. B. «Projekte/2026/2026-114 Dach Müller/Modelle»
  project_id  text,                                  -- Projekt der App (nur am Projektordner)
  erstellt    timestamptz not null default now(),
  erstellt_von uuid references auth.users(id) default auth.uid(),
  unique (company_id, pfad)
);
create index if not exists cad_ordner_firma_idx on public.cad_ordner (company_id, pfad);

create table if not exists public.cad_dateien (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  ordner      text not null,                         -- Pfad des Ordners
  name        text not null,                         -- Dateiname mit Endung
  art         text not null check (art in ('modell','export','plan')),
  mime        text,
  kodierung   text not null default 'text',          -- 'text' (JSON, DXF, SVG, STEP …) oder 'base64' (Binärdateien)
  inhalt      text not null,
  groesse     integer not null default 0,
  version     integer not null default 1,            -- optimistische Sperre
  geloescht   boolean not null default false,        -- nie endgültig löschen
  besitzer    uuid references auth.users(id),
  erstellt    timestamptz not null default now(),
  geaendert   timestamptz not null default now(),
  geaendert_von uuid references auth.users(id),
  unique (company_id, ordner, name)
);
create index if not exists cad_dateien_firma_idx on public.cad_dateien (company_id, ordner, geloescht);

create or replace function public.cad_dateien_stempel() returns trigger language plpgsql as $$
begin
  new.geaendert := now(); new.geaendert_von := auth.uid(); new.groesse := coalesce(length(new.inhalt), 0);
  if tg_op = 'INSERT' then new.besitzer := coalesce(new.besitzer, auth.uid()); end if;
  return new;
end $$;
drop trigger if exists cad_dateien_stempel on public.cad_dateien;
create trigger cad_dateien_stempel before insert or update on public.cad_dateien for each row execute function public.cad_dateien_stempel();

alter table public.cad_ordner enable row level security;
alter table public.cad_dateien enable row level security;
-- Lesen: eigene Firma mit Recht «projects view»; Schreiben: Recht «projects edit»
drop policy if exists cad_ordner_lesen on public.cad_ordner;
create policy cad_ordner_lesen on public.cad_ordner for select to authenticated
  using (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','view'));
drop policy if exists cad_ordner_neu on public.cad_ordner;
create policy cad_ordner_neu on public.cad_ordner for insert to authenticated
  with check (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','edit'));
drop policy if exists cad_dateien_lesen on public.cad_dateien;
create policy cad_dateien_lesen on public.cad_dateien for select to authenticated
  using (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','view'));
drop policy if exists cad_dateien_neu on public.cad_dateien;
create policy cad_dateien_neu on public.cad_dateien for insert to authenticated
  with check (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','edit'));
drop policy if exists cad_dateien_aendern on public.cad_dateien;
create policy cad_dateien_aendern on public.cad_dateien for update to authenticated
  using (company_id = (select company_id from public.profiles where id = auth.uid()) and public.has_permission('projects','edit'))
  with check (company_id = (select company_id from public.profiles where id = auth.uid()));
-- kein DELETE-Recht: Löschen = geloescht=true
