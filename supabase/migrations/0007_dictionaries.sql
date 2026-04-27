-- 0007_dictionaries.sql
-- Dictionary registry. The actual word list lives in src/dictionary/default-list.txt
-- (or operator-supplied files). This table only enumerates available dictionary IDs so
-- the game settings UI can offer them.

create table public.dictionaries (
  id           text primary key,
  display_name text not null,
  source_url   text null,
  added_at     timestamptz not null default now()
);

alter table public.dictionaries enable row level security;

create policy dictionaries_select_authenticated on public.dictionaries
  for select using (auth.role() = 'authenticated');

insert into public.dictionaries (id, display_name, source_url) values
  ('enable-default',
   'ENABLE (English, public domain)',
   'https://github.com/dolph/dictionary/blob/master/enable1.txt');
