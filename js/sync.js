// المزامنة مع Supabase: نفس الشاشات بتشتغل، والبيانات بتتحفظ أونلاين.
// - الدخول بيتعمل من السيرفر (كلمات السر متشفّرة هناك).
// - كل تعديل بيتبعت لوحده بعد ثانية (اللي اتغيّر بس)، ولو النت فاصل بيستنى ويتبعت لما يرجع.
// - كل دقيقة بيجيب آخر نسخة عشان كل الأجهزة تشوف نفس البيانات.
// روابط الديمو (#demo-... أو ?demo=1) بتفضل تجريبية على المتصفح ومش بتلمس الداتابيز.
const Sync = (() => {
  const C = window.CENTER_CONFIG || {};
  const live = !!(C.SUPABASE_URL && C.SUPABASE_KEY) && !/[?&]demo=1(&|$)/.test(location.search) && !/^#demo-/.test(location.hash);
  const TK = 'center_live_token', SNAP = 'center_live_snap';
  let snap = null, timer = null, busy = false, state = 'ok', pullTimer = null;

  async function rpc(fn, args) {
    const r = await fetch(C.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      // المفتاح الجديد (sb_publishable_) بيتبعت في apikey بس؛ المفتاح القديم (JWT) محتاج Authorization كمان
      method: 'POST', headers: Object.assign({ apikey: C.SUPABASE_KEY, 'Content-Type': 'application/json' }, /^eyJ/.test(C.SUPABASE_KEY) ? { Authorization: 'Bearer ' + C.SUPABASE_KEY } : {}), body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const token = () => { try { return localStorage.getItem(TK); } catch (e) { return null; } };
  const setToken = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) { } };
  const strip = o => { const x = Object.assign({}, o); delete x.pw; return x; };

  // DB (اللي في الذاكرة) ← صفوف للداتابيز
  function toRows() {
    const out = [], add = (k, i, t, s, d) => out.push({ k, i: String(i), t: t || '', s: s == null ? '' : String(s), d });
    add('center', 'main', '', '', { center: DB.center, owner: { user: DB.owner.user } });
    DB.teachers.forEach(t => add('teacher', t.id, t.id, '', Object.assign(strip(t), { assts: (t.assts || []).map(strip) })));
    DB.rooms.forEach(r => add('room', r.id, '', '', r));
    DB.groups.forEach(g => add('group', g.id, g.teacherId, '', g));
    DB.students.forEach(s => add('student', s.code, '', s.code, strip(s)));
    const gt = id => (Store.I.g[id] || {}).teacherId;
    DB.enroll.forEach(e => add('enroll', e.s + '|' + e.g, gt(e.g), e.s, e));
    DB.att.forEach(a => add('att', a.id, a.t, a.s, a));
    DB.subs.forEach(x => add('sub', x.id, x.t, x.s, x));
    DB.pays.forEach(p => add('pay', p.id, p.t, p.s, p));
    const at = {}; DB.assess.forEach(a => { at[a.id] = a.t; add('assess', a.id, a.t, '', a); });
    Object.keys(DB.scores).forEach(aid => Object.keys(DB.scores[aid]).forEach(code => add('score', aid + '|' + code, at[aid], code, { a: +aid, s: +code, v: DB.scores[aid][code] })));
    Object.keys(DB.closed).forEach(k => add('closed', k, gt(k.split('|')[0]), '', { v: DB.closed[k] }));
    DB.posts.forEach(p => add('post', p.id, p.t, '', p));
    DB.expenses.forEach(e => add('expense', e.id, '', '', e));
    return out;
  }
  // صفوف ← DB
  function fromRows(rows) {
    const d = Store.blank(); d.v = 2;
    rows.forEach(([k, id, , , x]) => {
      if (k === 'center') { Object.assign(d.center, x.center || {}); d.owner.user = (x.owner || {}).user || 'admin'; d.owner.pw = ''; }
      else if (k === 'teacher') d.teachers.push(x);
      else if (k === 'room') d.rooms.push(x);
      else if (k === 'group') d.groups.push(x);
      else if (k === 'student') d.students.push(x);
      else if (k === 'enroll') d.enroll.push(x);
      else if (k === 'att') d.att.push(x);
      else if (k === 'sub') d.subs.push(x);
      else if (k === 'pay') d.pays.push(x);
      else if (k === 'assess') { d.assess.push(x); d.scores[x.id] = d.scores[x.id] || {}; }
      else if (k === 'score') { (d.scores[x.a] = d.scores[x.a] || {})[x.s] = x.v; }
      else if (k === 'closed') d.closed[id] = x.v;
      else if (k === 'post') d.posts.push(x);
      else if (k === 'expense') d.expenses.push(x);
    });
    return d;
  }
  const keyOf = r => r.k + '|' + r.i;
  function snapshot() { const m = {}; toRows().forEach(r => m[keyOf(r)] = JSON.stringify(r)); return m; }
  function saveSnap() { try { localStorage.setItem(SNAP, JSON.stringify(snap)); } catch (e) { } }

  async function push() {
    if (!live || busy || !token() || !DB) return;
    busy = true;
    try {
      const cur = {}, changes = [];
      toRows().forEach(r => { const j = JSON.stringify(r); cur[keyOf(r)] = j; if (!snap || snap[keyOf(r)] !== j) changes.push(r); });
      Object.keys(snap || {}).forEach(k => { if (!cur[k]) { const p = k.indexOf('|'); changes.push({ k: k.slice(0, p), i: k.slice(p + 1), t: JSON.parse(snap[k]).t, del: true }); } });
      for (let i = 0; i < changes.length; i += 400) {
        const res = await rpc('api_push', { p_token: token(), p_changes: changes.slice(i, i + 400) });
        if (res.auth) { state = 'auth'; return Sync.expired(); }
        if (!res.ok) throw new Error(res.error || 'push');
      }
      snap = cur; saveSnap(); state = 'ok';
    } catch (e) { state = 'off'; clearTimeout(timer); timer = setTimeout(push, 30000); }
    finally { busy = false; Sync.paintBadge(); }
  }
  async function pull(quiet) {
    if (!live || !token()) return false;
    if (pending()) { await push(); if (pending()) return false; } // التعديلات المحلية الأول
    try {
      const res = await rpc('api_pull', { p_token: token() });
      if (res.auth) { Sync.expired(); return false; }
      if (!res.ok) return false;
      DB = fromRows(res.rows); Store.ix(); snap = snapshot(); saveSnap(); Store.cache(); state = 'ok';
      if (quiet && !Sync.typing()) App.render();
      return true;
    } catch (e) { state = 'off'; Sync.paintBadge(); return false; }
  }
  function pending() { if (!snap) return false; const cur = snapshot(); const a = Object.keys(cur), b = Object.keys(snap); return a.length !== b.length || a.some(k => cur[k] !== snap[k]); }

  return {
    live,
    on: () => live,
    rpc,
    token,
    changed() { if (!live || !token()) return; state = 'wait'; Sync.paintBadge(); clearTimeout(timer); timer = setTimeout(push, 900); },
    async login(role, u, p) {
      const res = await rpc('api_login', { p_role: role, p_user: role === 'parent' ? U.phone(u) : u, p_pw: p });
      if (!res.ok) return res;
      setToken(res.token);
      if (!await pull()) return { ok: false, error: 'pull' };
      return res;
    },
    async logout() { const t = token(); setToken(null); snap = null; try { localStorage.removeItem(SNAP); } catch (e) { } if (t) rpc('api_logout', { p_token: t }).catch(() => { }); },
    // بداية التشغيل: نسخة الجهاز تظهر على طول، وبعدين آخر نسخة من السيرفر
    boot() {
      if (!live) return;
      try { snap = JSON.parse(localStorage.getItem(SNAP)); } catch (e) { snap = null; }
      if (token()) { pull(true); if (pending()) push(); }
      clearInterval(pullTimer);
      pullTimer = setInterval(() => { if (token() && !pending() && !document.hidden) pull(true); }, (C.PULL_SECONDS || 60) * 1000);
      window.addEventListener('online', () => push());
    },
    expired() { setToken(null); App.setSes(null); U.toast(tr('الجلسة انتهت — ادخل تاني', 'Session expired — sign in again'), 'wa'); App.go(''); },
    async setPw(kind, key, pw) {
      if (!live) return true;
      try { const r = await rpc('api_set_pw', { p_token: token(), p_kind: kind, p_key: key, p_pw: pw }); if (!r.ok) U.toast(tr('مقدرتش أغيّر كلمة السر', 'Could not change the password'), 'bad'); return r.ok; }
      catch (e) { U.toast(tr('مفيش نت — جرّب تاني', 'Offline — try again'), 'bad'); return false; }
    },
    async sheetKey() { const r = await rpc('api_sheet_key', { p_token: token() }); return r.ok ? r.key : null; },
    typing() { const a = document.activeElement; return !!document.getElementById('modal') || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)); },
    badge() {
      if (!live) return '<span class="ic net demo" title="' + tr('وضع تجريبي على الجهاز', 'Local demo mode') + '">🧪</span>';
      const m = { ok: ['☁️', tr('متزامن', 'Synced')], wait: ['⏳', tr('بيتحفظ…', 'Saving…')], off: ['⚠️', tr('بدون نت — هيتبعت لما يرجع', 'Offline — will send later')], auth: ['🔒', ''] }[state] || ['☁️', ''];
      return '<span class="ic net" id="netb" title="' + m[1] + '">' + m[0] + '</span>';
    },
    paintBadge() { const e = document.getElementById('netb'); if (e) e.outerHTML = Sync.badge(); },
    pull,
  };
})();
