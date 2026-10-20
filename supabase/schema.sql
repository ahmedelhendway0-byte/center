-- =====================================================================
-- سيستم السنتر — قاعدة بيانات Supabase
-- الصق الملف ده كله مرة واحدة في Supabase ← SQL Editor ← Run
-- بيعمل: جدول البيانات، كلمات السر (متشفّرة)، الجلسات، والدوال اللي الموقع بيكلمها.
-- الجداول مقفولة تماماً؛ الموقع بيكلم الدوال بس، وكل دالة بتشوف مين داخل وتديله اللي يخصه.
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- كل حاجة في السيستم صف هنا: kind = نوعها، tid = المدرس صاحبها، sid = الطالب صاحبها
create table if not exists public.rows (
  kind text not null,
  id text not null,
  tid text,
  sid text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
create index if not exists rows_kind_tid on public.rows (kind, tid);
create index if not exists rows_kind_sid on public.rows (kind, sid);

create table if not exists public.creds (kind text not null, key text not null, pw_hash text not null, primary key (kind, key));
create table if not exists public.sessions (token text primary key, kind text not null, key text not null, tid text, created_at timestamptz not null default now());
create table if not exists public.login_fail (k text primary key, n int not null default 0, at timestamptz not null default now());
create table if not exists public.app_secrets (name text primary key, value text not null);

alter table public.rows enable row level security;
alter table public.creds enable row level security;
alter table public.sessions enable row level security;
alter table public.login_fail enable row level security;
alter table public.app_secrets enable row level security;
revoke all on public.rows, public.creds, public.sessions, public.login_fail, public.app_secrets from anon, authenticated;

-- ---------------------------------------------------------------------
-- الجلسة الحالية من التوكن (30 يوم)
create or replace function public._ses(p_token text) returns public.sessions
language sql stable security definer set search_path = public as $$
  select * from public.sessions where token = p_token and created_at > now() - interval '30 days';
$$;

-- كلمة السر: لو مفيش كلمة سر متسجلة للحساب يبقى الافتراضي 1234
create or replace function public._pw_ok(p_kind text, p_key text, p_pw text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select pw_hash = extensions.crypt(p_pw, pw_hash) from public.creds where kind = p_kind and key = lower(p_key)), p_pw = '1234');
$$;

-- ---------------------------------------------------------------------
-- تسجيل الدخول: owner / teacher / assistant / student / parent
create or replace function public.api_login(p_role text, p_user text, p_pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_key text; v_tid text; v_tok text; v_owner text; f public.login_fail;
begin
  p_user := trim(coalesce(p_user, ''));
  select * into f from public.login_fail where k = p_role || ':' || lower(p_user);
  if found and f.n >= 5 and f.at > now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;
  if p_role = 'owner' then
    select coalesce(data->'owner'->>'user', 'admin') into v_owner from public.rows where kind = 'center' and id = 'main';
    if lower(p_user) = lower(coalesce(v_owner, 'admin')) then v_key := lower(p_user); end if;
  elsif p_role = 'teacher' then
    select id into v_tid from public.rows where kind = 'teacher' and lower(id) = lower(p_user) and coalesce((data->>'active')::boolean, true);
    v_key := v_tid;
  elsif p_role = 'assistant' then
    select r.id, x->>'user' into v_tid, v_key from public.rows r, jsonb_array_elements(coalesce(r.data->'assts', '[]'::jsonb)) x
      where r.kind = 'teacher' and lower(x->>'user') = lower(p_user) and coalesce((r.data->>'active')::boolean, true) limit 1;
  elsif p_role = 'student' then
    select id into v_key from public.rows where kind = 'student' and id = p_user;
  elsif p_role = 'parent' then
    select data->>'parentPhone' into v_key from public.rows where kind = 'student' and data->>'parentPhone' = p_user limit 1;
  end if;
  if v_key is null or not public._pw_ok(p_role, v_key, p_pw) then
    insert into public.login_fail (k, n, at) values (p_role || ':' || lower(p_user), 1, now())
      on conflict (k) do update set n = case when public.login_fail.at < now() - interval '15 minutes' then 1 else public.login_fail.n + 1 end, at = now();
    return jsonb_build_object('ok', false);
  end if;
  delete from public.login_fail where k = p_role || ':' || lower(p_user);
  v_tok := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.sessions (token, kind, key, tid) values (v_tok, p_role, lower(v_key), v_tid);
  return jsonb_build_object('ok', true, 'token', v_tok, 'role', p_role, 'key', v_key, 'tid', v_tid);
end $$;

create or replace function public.api_logout(p_token text) returns jsonb
language sql security definer set search_path = public as $$
  delete from public.sessions where token = p_token returning jsonb_build_object('ok', true);
$$;

-- ---------------------------------------------------------------------
-- تحميل البيانات: كل واحد بياخد اللي يخصه بس
create or replace function public.api_pull(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.sessions; kids text[]; tids text[];
begin
  s := public._ses(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'auth', true); end if;
  if s.kind = 'owner' then
    return jsonb_build_object('ok', true, 'rows', (select coalesce(jsonb_agg(jsonb_build_array(kind, id, tid, sid, data)), '[]'::jsonb) from public.rows));
  elsif s.kind in ('teacher', 'assistant') then
    return jsonb_build_object('ok', true, 'rows', (select coalesce(jsonb_agg(jsonb_build_array(kind, id, tid, sid, data)), '[]'::jsonb) from public.rows
      where kind in ('center', 'teacher', 'room', 'group', 'student', 'enroll')
         or (tid = s.tid and kind in ('att', 'sub', 'pay', 'assess', 'score', 'closed', 'post'))));
  end if;
  kids := case when s.kind = 'student' then array[s.key] else array(select id from public.rows where kind = 'student' and data->>'parentPhone' = s.key) end;
  tids := array(select distinct tid from public.rows where kind = 'enroll' and sid = any(kids));
  return jsonb_build_object('ok', true, 'rows', (select coalesce(jsonb_agg(jsonb_build_array(r.kind, r.id, r.tid, r.sid, r.data)), '[]'::jsonb) from public.rows r
    where r.kind = 'center'
       or (r.kind = 'teacher' and r.id = any(tids))
       or (r.kind = 'group' and r.tid = any(tids))
       or (r.kind = 'student' and r.id = any(kids))
       or (r.kind in ('enroll', 'att', 'sub', 'pay') and r.sid = any(kids))
       or (r.kind = 'assess' and r.tid = any(tids) and coalesce((r.data->>'pub')::boolean, true))
       or (r.kind = 'score' and r.sid = any(kids) and exists (select 1 from public.rows a where a.kind = 'assess' and a.id = r.data->>'a' and coalesce((a.data->>'pub')::boolean, true)))
       or (r.kind = 'post' and r.tid = any(tids))));
end $$;

-- ---------------------------------------------------------------------
-- حفظ التغييرات: [{k,i,t,s,d,del}] — صاحب السنتر يعدّل أي حاجة، المدرس والأسيستنت حاجتهم بس
create or replace function public.api_push(p_token text, p_changes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.sessions; c jsonb; k text; cur jsonb; n int := 0; skipped int := 0;
begin
  s := public._ses(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'auth', true); end if;
  if s.kind in ('student', 'parent') then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  for c in select * from jsonb_array_elements(p_changes) loop
    k := c->>'k';
    if s.kind <> 'owner' then
      if k = 'teacher' then
        if s.kind <> 'teacher' or c->>'i' <> s.tid or (c->>'del') = 'true' then skipped := skipped + 1; continue; end if;
        select data into cur from public.rows where kind = 'teacher' and id = s.tid;
        -- المدرس مايقدرش يغيّر اتفاقه مع السنتر
        c := jsonb_set(c, '{d}', (c->'d') || jsonb_build_object('agType', cur->'agType', 'agVal', cur->'agVal', 'active', cur->'active'));
      elsif k = 'student' then
        if (c->>'del') = 'true' and exists (select 1 from public.rows where kind = 'enroll' and sid = c->>'i' and tid <> s.tid) then skipped := skipped + 1; continue; end if;
      elsif k in ('group', 'enroll', 'att', 'sub', 'pay', 'assess', 'score', 'closed', 'post') then
        if coalesce(c->>'t', '') <> s.tid or exists (select 1 from public.rows where kind = k and id = c->>'i' and tid is distinct from s.tid) then skipped := skipped + 1; continue; end if;
        if s.kind = 'assistant' and k = 'post' then skipped := skipped + 1; continue; end if;
      else
        skipped := skipped + 1; continue;
      end if;
    end if;
    if (c->>'del') = 'true' then
      delete from public.rows where kind = k and id = c->>'i';
    else
      insert into public.rows (kind, id, tid, sid, data, updated_at) values (k, c->>'i', nullif(c->>'t', ''), nullif(c->>'s', ''), c->'d', now())
        on conflict (kind, id) do update set tid = excluded.tid, sid = excluded.sid, data = excluded.data, updated_at = now();
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', n, 'skipped', skipped);
end $$;

-- ---------------------------------------------------------------------
-- تغيير كلمة سر: صاحب السنتر لأي حد، المدرس لنفسه ولأسيستنتسه، الطالب وولي الأمر لنفسهم
create or replace function public.api_set_pw(p_token text, p_kind text, p_key text, p_pw text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s public.sessions; ok boolean := false;
begin
  s := public._ses(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'auth', true); end if;
  p_key := lower(p_key);
  if s.kind = 'owner' then ok := true;
  elsif s.kind = p_kind and s.key = p_key then ok := true;
  elsif s.kind = 'teacher' and p_kind = 'assistant' and exists (select 1 from public.rows r, jsonb_array_elements(coalesce(r.data->'assts', '[]'::jsonb)) x
      where r.kind = 'teacher' and r.id = s.tid and lower(x->>'user') = p_key) then ok := true;
  end if;
  if not ok then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if p_pw is null or p_pw = '1234' then
    delete from public.creds where kind = p_kind and key = p_key;
  else
    if length(p_pw) < 4 then return jsonb_build_object('ok', false, 'error', 'short'); end if;
    insert into public.creds (kind, key, pw_hash) values (p_kind, p_key, extensions.crypt(p_pw, extensions.gen_salt('bf')))
      on conflict (kind, key) do update set pw_hash = excluded.pw_hash;
  end if;
  delete from public.sessions where kind = p_kind and key = p_key and token <> p_token;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- الشيتات: صاحب السنتر بيطلّع مفتاح من جوه السيستم ويحطه في الشيت، والشيت بيقرا بيه كل البيانات
create or replace function public.api_sheet_key(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s public.sessions; v text;
begin
  s := public._ses(p_token);
  if s.token is null or s.kind <> 'owner' then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  select value into v from public.app_secrets where name = 'sheets';
  if v is null then
    v := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.app_secrets (name, value) values ('sheets', v);
  end if;
  return jsonb_build_object('ok', true, 'key', v);
end $$;

create or replace function public.api_export(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from public.app_secrets where name = 'sheets' and value = p_key) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'at', now(), 'rows', (select coalesce(jsonb_agg(jsonb_build_array(kind, id, tid, sid, data)), '[]'::jsonb) from public.rows));
end $$;

-- الموقع يكلم الدوال دي بس
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.api_login(text, text, text), public.api_logout(text), public.api_pull(text), public.api_push(text, jsonb),
  public.api_set_pw(text, text, text, text), public.api_sheet_key(text), public.api_export(text) to anon;
