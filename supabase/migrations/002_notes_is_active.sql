-- Notes stay in the bitácora when taken off the board.
alter table public.notes
  add column is_active boolean not null default true;

create index idx_notes_user_type_active
  on public.notes (user_id, type, is_active);
