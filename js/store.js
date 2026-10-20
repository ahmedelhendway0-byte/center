// طبقة البيانات: كل القراءة والكتابة بتعدي من هنا.
// دلوقتي التخزين في المتصفح (localStorage). في المرحلة الجاية نفس الدوال دي هتكلم Supabase.
// وضع الداتابيز (أونلاين) ليه نسخة جهاز منفصلة عن الديمو عشان مايتخلطوش
const DB_KEY = window.Sync && Sync.live ? 'center_db_live' : 'center_db_v2';
let DB = null;

// أنواع اتفاق المدرس مع السنتر
const AG_AR = { pct: 'نسبة %', perStudent: 'مبلغ على كل طالب', roomSession: 'إيجار قاعة للحصة', monthly: 'إيجار شهري' };
const AG_EN = { pct: 'Percentage', perStudent: 'Per student', roomSession: 'Room rent / session', monthly: 'Monthly rent' };
const AG_FROM_LABEL = Object.fromEntries(Object.entries(AG_AR).map(([k, v]) => [v, k]));
const agName = k => tr(AG_AR[k], AG_EN[k]);
// أجر الأسيستنت (المدرس بيحدده)
const AP_AR = { month: 'مرتب شهري', session: 'على كل حصة', student: 'على كل طالب حاضر' };
const AP_EN = { month: 'Monthly salary', session: 'Per session', student: 'Per present student' };
const apName = k => tr(AP_AR[k], AP_EN[k]);
const assessName = k => ({ quiz: tr('كويز', 'Quiz'), exam: tr('امتحان', 'Exam'), hw: tr('واجب', 'Homework') }[k] || tr('مخصص', 'Custom'));
const expName = k => ({ fixed: tr('ثابتة شهرية', 'Fixed monthly'), salary: tr('مرتبات', 'Salaries'), var: tr('متغيرة', 'Variable') }[k]);
const EXP_KEYS = ['fixed', 'salary', 'var'];

const Store = {
  // ================= تحميل وحفظ =================
  load() {
    try { DB = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { DB = null; }
    if (DB) Store.ix();
    return !!DB;
  },
  save() { Store.cache(); if (window.Sync) Sync.changed(); },
  // نسخة على الجهاز (بتفتح على طول حتى من غير نت)
  cache() {
    Store.ix();
    try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
    catch (e) { U.toast(tr('مساحة التخزين في المتصفح خلصت — نزّل نسخة احتياطية', 'Browser storage is full — download a backup'), 'bad'); }
  },
  // كلمات السر: في الديمو بتتحفظ هنا، وفي الأونلاين بتتشفّر على السيرفر
  async setPw(kind, key, pw) {
    if (kind === 'owner') DB.owner.pw = pw;
    if (kind === 'teacher') Store.teacher(key).pw = pw;
    if (kind === 'assistant') DB.teachers.forEach(t => (t.assts || []).forEach(a => { if (a.user.toLowerCase() === key.toLowerCase()) a.pw = pw; }));
    if (kind === 'student') Store.student(+key).pw = pw;
    if (kind === 'parent') DB.parents[key] = pw;
    Store.cache();
    return window.Sync ? Sync.setPw(kind, key, pw) : true;
  },
  wipe() { localStorage.removeItem(DB_KEY); DB = null; },
  blank() {
    return {
      v: 2, center: { name: 'السنتر', address: '', phone: '', owner: '', ownerPhone: '', grades: ['3 إعدادي', '1 ثانوي', '2 ثانوي', '3 ثانوي'] },
      owner: { user: 'admin', pw: '1234' }, teachers: [], rooms: [], groups: [], students: [], enroll: [], att: [], subs: [],
      closed: {}, pays: [], assess: [], scores: {}, posts: [], expenses: [], msgs: [], parents: {}, seq: 1,
    };
  },
  // رقم فريد حتى لو أكتر من جهاز بيسجّل في نفس الوقت
  nid() { Store._last = Math.max((Store._last || 0) + 1, Date.now() * 1000 + Math.floor(Math.random() * 1000)); return Store._last; },

  // فهارس للسرعة (بتتبني بعد كل حفظ)
  ix() {
    const I = { s: {}, g: {}, t: {}, enS: {}, enG: {}, attST: {}, attSess: {}, sub: {} };
    DB.students.forEach(s => I.s[s.code] = s);
    DB.groups.forEach(g => I.g[g.id] = g);
    DB.teachers.forEach(t => I.t[t.id] = t);
    DB.enroll.forEach(e => { (I.enS[e.s] = I.enS[e.s] || []).push(e); (I.enG[e.g] = I.enG[e.g] || []).push(e); });
    DB.att.forEach(a => { const k = a.s + '|' + a.t; (I.attST[k] = I.attST[k] || []).push(a); const q = a.g + '|' + a.d; (I.attSess[q] = I.attSess[q] || []).push(a); });
    (DB.subs || (DB.subs = [])).forEach(x => I.sub[x.s + '|' + x.t + '|' + x.m] = x);
    Store.I = I;
  },

  // ================= قراءة =================
  teacher: id => Store.I.t[id],
  group: id => Store.I.g[id],
  student: code => Store.I.s[code],
  tGroups(tid, all) { return DB.groups.filter(g => g.teacherId === tid && (all || g.active !== false)).sort((a, b) => DB.center.grades.indexOf(b.grade) - DB.center.grades.indexOf(a.grade) || a.name.localeCompare(b.name)); },
  tGrades(tid) { return [...new Set(Store.tGroups(tid).map(g => g.grade))]; },
  gLabel(g) { return g ? g.grade + ' · ' + g.name : '—'; },
  gTime(g) { return [g.day1, g.day2].filter(Boolean).join(tr(' و ', ' & ')) + ' ' + g.time; },
  meets(g, d) { const n = U.dayName(d); return g.day1 === n || g.day2 === n; },
  todayGroups(tid) { const d = U.today(); return DB.groups.filter(g => g.active !== false && (!tid || g.teacherId === tid) && Store.meets(g, d)).sort((a, b) => U.mins(a.time) - U.mins(b.time)); },
  members(gid) { return (Store.I.enG[gid] || []).filter(e => e.st !== 'out').map(e => Store.I.s[e.s]).filter(Boolean); },
  // اشتراك الطالب مع مدرس معين (مجموعة واحدة نشطة)
  enrollFor(code, tid) { return (Store.I.enS[code] || []).find(e => e.st !== 'out' && Store.I.g[e.g] && Store.I.g[e.g].teacherId === tid); },
  enrollsOf(code, all) { return (Store.I.enS[code] || []).filter(e => all || e.st !== 'out'); },
  tStudents(tid, includeOut) {
    const gs = new Set(Store.tGroups(tid, true).map(g => g.id)), seen = {}, out = [];
    DB.enroll.forEach(e => {
      if (!gs.has(e.g) || seen[e.s] || (!includeOut && e.st === 'out')) return;
      const s = Store.I.s[e.s]; if (!s) return;
      seen[e.s] = 1; out.push({ s, e, g: Store.I.g[e.g] });
    });
    return out;
  },
  isGirl: s => s.gender === 'أنثى',
  sessAtt(gid, d) { return (Store.I.attSess[gid + '|' + d] || []); },
  rec(code, gid, d) { return Store.sessAtt(gid, d).find(a => a.s === code); },
  stAtt(code, tid) { return Store.I.attST[code + '|' + tid] || []; },
  isClosed(gid, d) { return !!DB.closed[gid + '|' + d]; },
  closedAt(gid, d) { const v = DB.closed[gid + '|' + d]; return typeof v === 'string' ? v : ''; },

  // دين جانبي: حصص اتسجلت "آجل" ولسه ما اتدفعتش
  debt(code, tid) {
    let d = 0;
    (Store.I.enS[code] || []).forEach(e => { const g = Store.I.g[e.g]; if (g && g.teacherId === tid) d += +e.debt0 || 0; });
    Store.stAtt(code, tid).forEach(a => d += (a.fee || 0) - (a.paid || 0));
    DB.pays.forEach(p => { if (p.s === code && p.t === tid) d -= p.amt; });
    return Math.max(0, d);
  },
  attRate(code, tid) { const a = Store.stAtt(code, tid); return a.length ? U.pct(a.filter(x => x.st === 'p').length, a.length) : null; },
  absences(code, tid) { return Store.stAtt(code, tid).filter(x => x.st === 'a').length; },
  scoresOf(code, tid, onlyPub) {
    return DB.assess.filter(a => a.t === tid && (!onlyPub || a.pub) && DB.scores[a.id] && DB.scores[a.id][code] !== undefined && DB.scores[a.id][code] !== '')
      .sort((a, b) => a.d.localeCompare(b.d)).map(a => ({ a, v: +DB.scores[a.id][code] }));
  },
  avg(code, tid, onlyPub) { const s = Store.scoresOf(code, tid, onlyPub); return s.length ? Math.round(s.reduce((x, y) => x + y.v / y.a.max * 100, 0) / s.length) : null; },
  lastQuizzes(code, tid, n) { return Store.scoresOf(code, tid).filter(x => x.a.type === 'quiz').slice(-(n || 5)); },
  trend(code, tid) { // فرق آخر كويزين (بالنسبة)
    const s = Store.lastQuizzes(code, tid, 2); if (s.length < 2) return 0;
    return Math.round(s[1].v / s[1].a.max * 100 - s[0].v / s[0].a.max * 100);
  },
  level(p) { return p === null ? ['—', 'mu'] : p >= 85 ? [tr('ممتاز', 'Excellent'), 'ok'] : p >= 65 ? [tr('جيد', 'Good'), 'pr'] : p >= 50 ? [tr('مقبول', 'Fair'), 'wa'] : [tr('ضعيف', 'Weak'), 'bad']; },
  // فئة الطالب زي المشروع القديم: متفوق / في تحسن / في تراجع / ضعيف / جيد
  cat(code, tid) {
    const p = Store.avg(code, tid), t = Store.trend(code, tid);
    if (p === null) return 'ok';
    return p >= 80 ? 'top' : t <= -20 ? 'dn' : t >= 20 ? 'up' : p < 50 ? 'wk' : 'ok';
  },

  // ================= الاشتراك الشهري =================
  month: d => (d || U.today()).slice(0, 7),
  sub(code, tid, m) { return Store.I.sub[code + '|' + tid + '|' + (m || Store.month())]; },
  toggleSub(code, gid, m) {
    const g = Store.group(gid), k = code + '|' + g.teacherId + '|' + (m || Store.month()), x = Store.I.sub[k];
    if (x) DB.subs = DB.subs.filter(y => y !== x);
    else DB.subs.push({ id: Store.nid(), s: code, t: g.teacherId, g: gid, m: m || Store.month(), amt: g.monthPrice || 0, d: U.today() });
    Store.ix();
  },
  // حالة الدفع للعرض: شهري ← الشهر مدفوع/غير مدفوع، بالحصة ← دفع/آجل
  payState(code, gid, d) {
    const g = Store.group(gid);
    if (g.payMode === 'month') return Store.sub(code, g.teacherId, Store.month(d)) ? 'mp' : 'up';
    const a = Store.rec(code, gid, d);
    return !a || a.st !== 'p' ? '' : a.paid >= a.fee ? 'paid' : 'df';
  },
  payText(st) { return { mp: tr('الشهر مدفوع', 'Month paid'), up: tr('غير مدفوع', 'Unpaid'), paid: tr('دفع', 'Paid'), df: tr('آجل', 'Deferred') }[st] || '—'; },

  // ================= فلوس =================
  revenue(tid, r) {
    let v = 0;
    DB.att.forEach(a => { if ((!tid || a.t === tid) && U.inRange(a.d, r)) v += a.paid || 0; });
    DB.subs.forEach(x => { if ((!tid || x.t === tid) && U.inRange(x.d, r)) v += x.amt; });
    DB.pays.forEach(p => { if ((!tid || p.t === tid) && !p.waive && U.inRange(p.d, r)) v += p.amt; });
    return v;
  },
  groupRevenue(gid, r) {
    let v = 0;
    DB.att.forEach(a => { if (a.g === gid && U.inRange(a.d, r)) v += a.paid || 0; });
    DB.subs.forEach(x => { if (x.g === gid && U.inRange(x.d, r)) v += x.amt; });
    return v;
  },
  deferred(tid, r) { let v = 0; DB.att.forEach(a => { if (a.t === tid && (!r || U.inRange(a.d, r))) v += (a.fee || 0) - (a.paid || 0); }); return v; },
  sessionsHeld(tid, r) { const s = new Set(); DB.att.forEach(a => { if (a.t === tid && a.st === 'p' && U.inRange(a.d, r)) s.add(a.g + '|' + a.d); }); return s.size; },
  presentCount(tid, r) { let n = 0; DB.att.forEach(a => { if ((!tid || a.t === tid) && a.st === 'p' && U.inRange(a.d, r)) n++; }); return n; },
  share(t, r) { // حق السنتر من المدرس في الفترة
    const v = +t.agVal || 0;
    if (t.agType === 'pct') return Store.revenue(t.id, r) * v / 100;
    if (t.agType === 'perStudent') return Store.presentCount(t.id, r) * v;
    if (t.agType === 'roomSession') return Store.sessionsHeld(t.id, r) * v;
    return v * U.daysIn(r) / 30; // إيجار شهري موزع على الأيام
  },
  asstPay(t, r) { // أجر الأسيستنتس في الفترة
    const p = t.asstPay || {}, v = +p.val || 0, n = (t.assts || []).length || 1;
    if (p.type === 'session') return Store.sessionsHeld(t.id, r) * v;
    if (p.type === 'student') return Store.presentCount(t.id, r) * v;
    return v * n * U.daysIn(r) / 30;
  },
  agText(t) { return agName(t.agType) + ': ' + (t.agType === 'pct' ? t.agVal + '%' : U.money(t.agVal)); },
  expenses(r) { return DB.expenses.filter(e => U.inRange(e.d, r)).reduce((a, e) => a + e.amt, 0); },

  // ================= طلاب =================
  nextCode() { return DB.students.reduce((m, s) => Math.max(m, +s.code), 1000) + 1; },
  findByPhone(ph) { ph = U.phone(ph); return ph ? DB.students.find(s => s.phone === ph) : null; },
  addStudent(d) {
    const s = { code: Store.nextCode(), name: d.name, gender: d.gender || 'ذكر', grade: d.grade, phone: U.phone(d.phone), parentName: d.parentName || '', parentPhone: U.phone(d.parentPhone), school: d.school || '', notes: d.notes || '', pw: '1234', created: U.today() };
    DB.students.push(s); Store.ix(); return s;
  },
  updateStudent(code, d) { const s = Store.student(code); ['name', 'gender', 'grade', 'school', 'notes', 'parentName'].forEach(k => { if (d[k] !== undefined) s[k] = d[k]; }); if (d.phone !== undefined) s.phone = U.phone(d.phone); if (d.parentPhone !== undefined) s.parentPhone = U.phone(d.parentPhone); },
  enroll(code, gid, debt0) {
    const g = Store.group(gid), old = Store.enrollFor(code, g.teacherId);
    let e = old || (Store.I.enS[code] || []).find(x => x.g === gid);
    if (e) { e.g = gid; e.st = 'on'; } // مع نفس المدرس = نقل أو رجوع
    else { e = { s: code, g: gid, debt0: +debt0 || 0, st: 'on', since: U.today() }; DB.enroll.push(e); }
    Store.ix(); return e;
  },
  withdraw(code, tid) { (Store.I.enS[code] || []).forEach(e => { if (Store.I.g[e.g] && Store.I.g[e.g].teacherId === tid) e.st = 'out'; }); },
  // حذف نهائي من عند المدرس (اتسجل غلط). لو مالوش مدرسين تانيين يتمسح من السنتر كله
  removeFromTeacher(code, tid) {
    const gs = new Set(DB.groups.filter(g => g.teacherId === tid).map(g => g.id));
    DB.enroll = DB.enroll.filter(e => !(e.s === code && gs.has(e.g)));
    DB.att = DB.att.filter(a => !(a.s === code && a.t === tid));
    DB.pays = DB.pays.filter(p => !(p.s === code && p.t === tid));
    DB.subs = DB.subs.filter(p => !(p.s === code && p.t === tid));
    DB.assess.filter(a => a.t === tid).forEach(a => { if (DB.scores[a.id]) delete DB.scores[a.id][code]; });
    if (!DB.enroll.some(e => e.s === code)) Store.deleteStudent(code);
  },
  deleteStudent(code) {
    DB.students = DB.students.filter(s => s.code !== code);
    DB.enroll = DB.enroll.filter(e => e.s !== code); DB.att = DB.att.filter(a => a.s !== code); DB.pays = DB.pays.filter(p => p.s !== code); DB.subs = DB.subs.filter(p => p.s !== code);
    Object.values(DB.scores).forEach(m => delete m[code]);
  },

  // ================= حضور =================
  // حضر: بالحصة = دفع تلقائي (وممكن يتحول آجل)، شهري = مفيش رسوم على الحصة
  markPresent(code, gid, d) {
    const g = Store.group(gid);
    if (Store.sessAtt(gid, d).some(a => a.s === code && a.st === 'p')) return { dup: true };
    DB.att = DB.att.filter(a => !(a.g === gid && a.d === d && a.s === code)); // لو كان متسجل غياب
    const e = Store.enrollFor(code, g.teacherId), fee = g.payMode === 'month' ? 0 : g.price;
    const a = { id: Store.nid(), s: code, g: gid, t: g.teacherId, d, st: 'p', fee, paid: fee, mk: !!(e && e.g !== gid), tm: U.now() };
    DB.att.push(a); Store.ix(); return { a };
  },
  markAbsent(code, gid, d) {
    const g = Store.group(gid);
    DB.att = DB.att.filter(a => !(a.g === gid && a.d === d && a.s === code));
    DB.att.push({ id: Store.nid(), s: code, g: gid, t: g.teacherId, d, st: 'a', fee: 0, paid: 0, mk: false, tm: '' });
    const q = Store.sessAssess(gid, d, 'quiz'), x = Store.sessAssess(gid, d, 'exam');
    [q, x].forEach(a => { if (a && DB.scores[a.id]) delete DB.scores[a.id][code]; });
    Store.ix();
  },
  att(id) { return DB.att.find(a => a.id === id); },
  removeAtt(id) { DB.att = DB.att.filter(a => a.id !== id); Store.ix(); },
  closeSession(gid, d) { // "تسجيل اليوم": اللي ماجوش يتسجلوا غياب
    const here = new Set(Store.sessAtt(gid, d).map(a => a.s)), g = Store.group(gid), abs = [];
    Store.members(gid).forEach(s => { if (!here.has(s.code)) { DB.att.push({ id: Store.nid(), s: s.code, g: gid, t: g.teacherId, d, st: 'a', fee: 0, paid: 0, mk: false, tm: '' }); abs.push(s); } });
    DB.closed[gid + '|' + d] = U.now(); Store.ix(); return abs;
  },
  reopen(gid, d) { DB.att = DB.att.filter(a => !(a.g === gid && a.d === d && a.st === 'a')); delete DB.closed[gid + '|' + d]; Store.ix(); },
  pay(code, tid, amt, waive, note) { DB.pays.push({ id: Store.nid(), s: code, t: tid, amt: +amt, d: U.today(), waive: !!waive, note: note || '' }); },

  // ================= درجات =================
  addAssess(o) { const a = Object.assign({ id: Store.nid(), d: U.today(), pub: true }, o); a.max = +a.max || 20; DB.assess.push(a); DB.scores[a.id] = {}; return a; },
  sessAssess(gid, d, type) { return DB.assess.find(a => a.g === gid && a.d === d && a.type === type); },
  // كويز/امتحان الحصة بيتعمل لوحده أول ما تتكتب درجة (لو مفعّل في المجموعة)
  ensureSessAssess(gid, d, type) {
    const g = Store.group(gid);
    return Store.sessAssess(gid, d, type) || Store.addAssess({ t: g.teacherId, g: gid, type, d, max: type === 'exam' ? 50 : 20, title: (type === 'exam' ? tr('امتحان ', 'Exam ') : tr('كويز ', 'Quiz ')) + U.short(d) });
  },
  sessScore(gid, d, type, code) { const a = Store.sessAssess(gid, d, type); return a && DB.scores[a.id] && DB.scores[a.id][code] !== undefined ? DB.scores[a.id][code] : ''; },
  setScore(aid, code, v) { const a = DB.assess.find(x => x.id === aid); DB.scores[aid] = DB.scores[aid] || {}; if (v === '' || v === null) delete DB.scores[aid][code]; else DB.scores[aid][code] = Math.max(0, Math.min(a.max, +v)); },
  delAssess(id) { DB.assess = DB.assess.filter(a => a.id !== id); delete DB.scores[id]; },

  // ================= مجموعات وقاعات =================
  nextGroupId() { return 'G' + String(DB.groups.reduce((m, g) => Math.max(m, +String(g.id).replace(/\D/g, '') || 0), 0) + 1).padStart(2, '0'); },
  conflicts(g) { // نفس القاعة + نفس اليوم + الفرق أقل من ساعتين
    const days = [g.day1, g.day2].filter(Boolean), m = U.mins(g.time);
    return DB.groups.filter(x => x.id !== g.id && x.active !== false && x.room && x.room === g.room &&
      [x.day1, x.day2].some(d => d && days.includes(d)) && Math.abs(U.mins(x.time) - m) < 120);
  },
  gPrice(g) { return g.payMode === 'month' ? g.monthPrice : g.price; },

  // ================= أسيستنتس =================
  asstLogin(u, p) {
    for (const t of DB.teachers) { if (t.active === false) continue; const a = (t.assts || []).find(a => a.user.toLowerCase() === u.toLowerCase() && a.pw === p); if (a) return { t, a }; }
    return null;
  },
  asst(tid, user) { const t = Store.teacher(tid); return t && (t.assts || []).find(a => a.user === user); },
  nextAsstUser() { let n = 1; const all = new Set(DB.teachers.flatMap(t => (t.assts || []).map(a => a.user.toUpperCase()))); while (all.has('A' + String(n).padStart(2, '0'))) n++; return 'A' + String(n).padStart(2, '0'); },
  logMsg(o) { DB.msgs.push(Object.assign({ d: U.today(), tm: U.now() }, o)); if (DB.msgs.length > 3000) DB.msgs.splice(0, 500); },

  // ================= استيراد =================
  fromData(data) {
    DB = Store.blank();
    Object.assign(DB.center, data.center || {});
    (data.teachers || []).forEach((t, i) => DB.teachers.push(Store.newTeacher(t, i)));
    (data.rooms || []).forEach(r => DB.rooms.push({ id: Store.nid(), name: r.name, cap: +r.cap || 0, notes: r.notes || '' }));
    (data.groups || []).forEach(g => DB.groups.push(Store.newGroup(g)));
    (data.students || []).forEach(s => DB.students.push({ code: +s.code, name: s.name, gender: s.gender || 'ذكر', grade: s.grade || '', phone: U.phone(s.phone), parentName: s.parentName || '', parentPhone: U.phone(s.parentPhone), school: s.school || '', notes: s.notes || '', pw: '1234', created: U.today() }));
    (data.enroll || []).forEach(e => DB.enroll.push({ s: +e.code, g: e.groupId, debt0: +e.debt || 0, st: 'on', since: U.today() }));
    Store.ix();
  },
  newGroup(g) {
    const pm = g.payMode === 'month' || g.payMode === 'شهري' ? 'month' : 'session';
    return { id: g.id, teacherId: g.teacherId, grade: g.grade, name: g.name, day1: g.day1, day2: g.day2 || '', time: g.time, room: g.room || '', price: +g.price || 0, monthPrice: +g.monthPrice || (+g.price || 0) * 4, payMode: pm, gender: g.gender || 'مختلط', qz: g.qz !== undefined ? !!g.qz : true, ex: !!g.ex, active: true };
  },
  newTeacher(t) {
    const num = String(t.id).replace(/\D/g, '');
    const assts = t.assts || (t.assistant ? [{ user: 'A' + num, name: t.assistant, phone: U.phone(t.assistantPhone), pw: '1234' }] : []);
    return {
      id: t.id, name: t.name, subject: t.subject || '', phone: U.phone(t.phone), agType: AG_AR[t.agType] ? t.agType : (AG_FROM_LABEL[t.agType] || 'pct'), agVal: +t.agVal || 0,
      assts, asstPay: t.asstPay || { type: 'month', val: 1500 }, pw: '1234', active: true,
      notif: { on: true, to: 'b', absence: true, report: true, monthly: true, debt: false, grades: true },
      perms: { money: false, add: true, del: false, grades: true, msgs: true, mode: true },
    };
  },

  // تاريخ وهمي لآخر 4 أسابيع (للديمو بس)
  demoHistory() {
    const R = U.rng(42), today = U.today(), lvl = {}, rate = {};
    DB.students.forEach(s => { lvl[s.code] = 0.35 + R() * 0.62; rate[s.code] = 0.68 + R() * 0.3; });
    // تاني أسيستنت لأول مدرسين (أكتر من أسيستنت)
    DB.teachers.slice(0, 2).forEach((t, i) => t.assts.push({ user: Store.nextAsstUser(), name: ['منة الله صبري', 'عمر جمال'][i], phone: '0100000000' + (i + 2), pw: '1234' }));
    const m0 = today.slice(0, 8) + '01', pm = U.addDays(m0, -1).slice(0, 8) + '01';
    DB.groups.forEach(g => {
      let n = 0;
      // الاشتراك الشهري: أغلب الطلاب دافعين الشهر اللي فات، وجزء دافع الشهر ده
      if (g.payMode === 'month') Store.members(g.id).forEach(s => {
        if (R() < 0.92) DB.subs.push({ id: Store.nid(), s: s.code, t: g.teacherId, g: g.id, m: pm.slice(0, 7), amt: g.monthPrice, d: U.addDays(pm, Math.floor(R() * 6)) });
        if (R() < 0.7) DB.subs.push({ id: Store.nid(), s: s.code, t: g.teacherId, g: g.id, m: m0.slice(0, 7), amt: g.monthPrice, d: U.addDays(m0, Math.min(Math.floor(R() * 6), Math.max(0, +today.slice(8) - 1))) });
      });
      for (let k = 28; k >= 1; k--) {
        const d = U.addDays(today, -k); if (!Store.meets(g, d)) continue; n++;
        const mem = Store.members(g.id), quiz = g.qz && R() < 0.85 ? Store.addAssess({ t: g.teacherId, g: g.id, type: 'quiz', title: 'كويز ' + U.short(d), max: 20, d }) : null;
        const exam = n % 4 === 0 ? Store.addAssess({ t: g.teacherId, g: g.id, type: 'exam', title: 'امتحان ' + U.short(d), max: 50, d }) : null;
        const hw = n % 2 === 1 ? Store.addAssess({ t: g.teacherId, g: g.id, type: 'hw', title: 'واجب ' + U.short(d), max: 10, d, pub: false }) : null;
        const base = U.mins(g.time), fee = g.payMode === 'month' ? 0 : g.price;
        mem.forEach(s => {
          const p = R() < rate[s.code], m = base - 10 + Math.floor(R() * 25);
          DB.att.push({ id: Store.nid(), s: s.code, g: g.id, t: g.teacherId, d, st: p ? 'p' : 'a', fee: p ? fee : 0, paid: p && R() < 0.93 ? fee : 0, mk: false, tm: p ? String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') : '' });
          if (!p) return;
          const L = Math.min(1, Math.max(0.05, lvl[s.code] + (R() - 0.5) * 0.3 + (n / 8) * (lvl[s.code] - 0.6) * 0.35));
          [quiz, exam, hw].forEach(a => { if (a) DB.scores[a.id][s.code] = Math.round(L * a.max); });
        });
        DB.closed[g.id + '|' + d] = String(Math.floor((base + 95) / 60)).padStart(2, '0') + ':' + String((base + 95) % 60).padStart(2, '0');
      }
    });
    Store.ix();
    // تسديد جزء من الآجل
    DB.students.forEach(s => (Store.I.enS[s.code] || []).forEach(e => {
      const t = Store.group(e.g).teacherId, d = Store.debt(s.code, t);
      if (d > 0 && R() < 0.5) DB.pays.push({ id: Store.nid(), s: s.code, t, amt: d, d: U.addDays(today, -Math.floor(R() * 10) - 1), waive: false, note: 'تسديد' });
    }));
    [m0, pm].forEach(m => {
      [['fixed', 'إيجار المكان', 8000], ['fixed', 'كهرباء', 1500], ['fixed', 'إنترنت', 500], ['salary', 'مرتب الريسيبشن', 4000], ['salary', 'عامل النظافة', 2500], ['var', 'طباعة وورق', 650], ['var', 'صيانة تكييف', 900]]
        .forEach(([cat, title, amt]) => DB.expenses.push({ id: Store.nid(), cat, title, amt, d: m }));
    });
    DB.teachers.forEach((t, i) => {
      DB.posts.push({ id: Store.nid(), t: t.id, type: 'ann', title: 'امتحان شامل الأسبوع الجاي', body: 'هيكون على الباب الأول والتاني، ذاكروا كويس 💪', url: '', d: U.addDays(today, -2) });
      DB.posts.push({ id: Store.nid(), t: t.id, type: 'file', title: 'مذكرة المراجعة', body: 'مذكرة الباب الأول PDF', url: 'https://drive.google.com/', d: U.addDays(today, -6) });
      if (i % 2 === 0) DB.posts.push({ id: Store.nid(), t: t.id, type: 'video', title: 'شرح فيديو: أهم الأسئلة', body: '', url: 'https://www.youtube.com/', d: U.addDays(today, -9) });
    });
    Store.ix();
  },
};
