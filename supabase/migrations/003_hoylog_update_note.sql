-- MCP: edit an existing note (progress or evergreen) owned by the token user.
-- Omitted arguments keep the current value. Empty title clears it.

create or replace function public.hoylog_update_note(
  p_token text,
  p_id uuid,
  p_body text default null,
  p_title text default null,
  p_touch_title boolean default false,
  p_color text default null,
  p_occurred_on date default null,
  p_is_active boolean default null
)
returns public.notes
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  uid uuid;
  rec public.notes;
begin
  uid := public.hoylog_user_id_from_token(p_token);
  if uid is null then
    raise exception 'invalid token';
  end if;

  if p_body is not null and btrim(p_body) = '' then
    raise exception 'body is required';
  end if;

  select n.* into rec
  from public.notes n
  where n.id = p_id
    and n.user_id = uid;

  if rec.id is null then
    raise exception 'note not found';
  end if;

  if p_occurred_on is not null and rec.type <> 'progress' then
    raise exception 'occurred_on only applies to progress notes';
  end if;

  update public.api_tokens
    set last_used_at = now()
    where token_hash = encode(extensions.digest(convert_to(p_token, 'utf8'), 'sha256'), 'hex')
      and revoked_at is null;

  update public.notes n
    set
      body = case when p_body is not null then btrim(p_body) else n.body end,
      title = case
        when p_touch_title then nullif(btrim(coalesce(p_title, '')), '')
        else n.title
      end,
      color = coalesce(p_color, n.color),
      occurred_on = coalesce(p_occurred_on, n.occurred_on),
      is_active = coalesce(p_is_active, n.is_active)
    where n.id = p_id
      and n.user_id = uid
  returning * into rec;

  return rec;
end;
$function$;

revoke all on function public.hoylog_update_note(text, uuid, text, text, boolean, text, date, boolean) from public;
grant execute on function public.hoylog_update_note(text, uuid, text, text, boolean, text, date, boolean) to anon, authenticated;
