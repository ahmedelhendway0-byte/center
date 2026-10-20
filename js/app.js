// الهيكل العام: تسجيل الدخول، القوائم، التنقل بين الشاشات
const V = {}; // كل شاشة دالة بترجع HTML (متعرفة في staff.js / owner.js / portal.js)
const SES_KEY = 'center_session_v2';

const App = {
  ses: null,   // {role, id, a?, as?}  role: owner | teacher | assistant | student | parent
  view: '',
  st: {},      // حالة الشاشات (فلاتر، اختيارات)

  init() {
    try { App.ses = JSON.parse(localStorage.getItem(SES_KEY)); } catch (e) { App.ses = null; }
    try { const th = localStorage.getItem('center_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
    Store.load();
    const lr = location.hash.match(/^#login-(owner|teacher|assistant|student|parent)$/); // رابط دخول بدور محدد
    if (lr) { App.st.lr = lr[1]; history.replaceState(null, '', location.pathname + location.search); }
    App.demoLink();
    if (window.Sync) Sync.boot();
    if (App.ses && !App.valid()) App.ses = null;
    App.go(location.hash.slice(1) || '');
    window.addEventListener('hashchange', () => App.go(location.hash.slice(1)));
  },
  valid() {
    const s = App.ses; if (!DB || !s) return false;
    if (s.role === 'owner') return true;
    if (s.role === 'teacher') return !!Store.teacher(s.id);
    if (s.role === 'assistant') return !!Store.asst(s.id, s.a);
    if (s.role === 'student') return !!Store.student(s.id);
    if (s.role === 'parent') return DB.students.some(x => x.parentPhone === s.id);
    return false;
  },
  setSes(s) { App.ses = s; try { s ? localStorage.setItem(SES_KEY, JSON.stringify(s)) : localStorage.removeItem(SES_KEY); } catch (e) { } },
  // المدرس اللي بنشتغل على بياناته (للمدرس والأسيستنت، أو صاحب السنتر وهو فاتح لوحة مدرس)
  tid() { return App.ses && (App.ses.role === 'teacher' || App.ses.role === 'assistant') ? App.ses.id : null; },
  T() { return Store.teacher(App.tid()); },
  isAsst() { return App.ses && App.ses.role === 'assistant'; },
  can(p) { if (!App.isAsst()) return true; const v = App.T().perms[p]; return p === 'mode' ? v !== false : !!v; },

  nav() {
    const r = App.ses && App.ses.role;
    if (r === 'owner') return [['o_dash', '📊 ' + tr('لوحة التحكم', 'Dashboard')], ['o_teachers', '👨‍🏫 ' + tr('المدرسين', 'Teachers')], ['o_rooms', '🏫 ' + tr('القاعات والجدول', 'Rooms & schedule')], ['o_students', '👥 ' + tr('كل الطلاب', 'All students')], ['o_exp', '💸 ' + tr('المصاريف', 'Expenses')], ['o_data', '🗂️ ' + tr('البيانات', 'Data')]];
    if (r === 'teacher' || r === 'assistant') {
      const n = [['att', '✅ ' + tr('تسجيل الحصة', 'Session')], ['students', '👥 ' + tr('الطلاب', 'Students')], ['groups', '📚 ' + tr('المجموعات', 'Groups')]];
      if (App.can('grades')) n.push(['grades', '📝 ' + tr('الدرجات', 'Grades')]);
      if (App.can('msgs')) n.push(['msgs', '📲 ' + tr('الرسايل', 'Messages')]);
      if (App.can('money')) n.unshift(['dash', '📊 ' + (App.isAsst() ? tr('اللوحة', 'Dashboard') : tr('لوحتي', 'My dashboard'))]);
      if (!App.isAsst()) n.push(['posts', '📢 ' + tr('المنشورات', 'Posts')], ['settings', '⚙️ ' + tr('الإعدادات', 'Settings')]);
      return n;
    }
    return [['portal', '🏠 ' + tr('الرئيسية', 'Home')]];
  },

  go(view) {
    U.close();
    if (!App.ses && Sync.live) { App.paint(App.bare(V.login())); return; } // أونلاين: الدخول من السيرفر
    if (!DB) { App.paint(App.bare(V.start())); return; }
    if (!App.ses) { App.paint(App.bare(V.login())); return; }
    const nav = App.nav();
    if (!nav.some(n => n[0] === view)) view = nav[0][0];
    App.view = view;
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
    App.render();
  },
  render() {
    const y = window.scrollY, fn = V[App.view];
    App.paint(App.shell(fn ? fn() : U.empty()));
    window.scrollTo(0, y);
    if (V[App.view + '_after']) V[App.view + '_after']();
  },
  paint(h) { document.getElementById('app').innerHTML = h; },
  tools() { return '<button class="ic" onclick="App.lang()">' + (I18N.lang === 'ar' ? 'EN' : 'عربي') + '</button><button class="ic" onclick="App.theme()" title="🌓">🌓</button>'; },
  bare(body) { return '<div class="ctl end">' + App.tools().replace(/class="ic"/g, 'class="b"') + '</div>' + body; },
  shell(body) {
    const s = App.ses, r = s.role, T = App.T();
    const who = r === 'owner' ? tr('صاحب السنتر', 'Center owner') : r === 'teacher' ? T.name + ' · ' + T.subject
      : r === 'assistant' ? tr('أسيستنت', 'Assistant') + ' · ' + (Store.asst(T.id, s.a) || {}).name + ' · ' + T.name : r === 'student' ? Store.student(s.id).name : tr('ولي أمر', 'Parent');
    const back = s.as ? '<button class="ic" onclick="App.back()">↩ ' + tr('رجوع للوحة السنتر', 'Back to center') + '</button>' : '';
    return '<header class="top"><div><h1>' + U.esc(DB.center.name) + '</h1><small>' + U.esc(who) + '</small></div><div class="ctl">' + back + App.tools() +
      (window.Sync ? Sync.badge() : '') + '<button class="ic" onclick="App.logout()">' + tr('خروج', 'Logout') + '</button></div></header>' +
      '<nav class="tabs">' + App.nav().map(n => '<a href="#' + n[0] + '" class="' + (n[0] === App.view ? 'on' : '') + '">' + n[1] + '</a>').join('') + '</nav>' +
      '<main>' + body + '</main><footer class="pw">POWERED BY <b>HENDAWY</b></footer>';
  },
  refresh() { Store.save(); App.render(); },
  lang() { I18N.toggle(); App.ses ? App.render() : App.go(''); },
  theme() {
    const d = document.documentElement, cur = d.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    d.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('center_theme', d.dataset.theme); } catch (e) { }
  },
  logout() { Sync.logout(); App.setSes(null); App.st = {}; App.go(''); },
  // صاحب السنتر يفتح لوحة مدرس
  asTeacher(id) { App.setSes({ role: 'teacher', id, as: 'owner' }); App.st = {}; location.hash = 'dash'; App.go('dash'); },
  back() { App.setSes({ role: 'owner', id: 'owner' }); App.st = {}; location.hash = 'o_teachers'; App.go('o_teachers'); },

  // روابط الديمو المباشرة (من البريزنتيشن): #demo-<الدور>-<الشاشة> مثلاً #demo-assistant-att
  demoLink() {
    const m = location.hash.match(/^#demo-(owner|teacher|assistant|student|parent)-([a-z_]+)$/);
    if (!m) return;
    if (!DB) { Store.fromData(window.DEMO_DATA); Store.demoHistory(); Store.save(); }
    const r = m[1], s0 = DB.students[0], t0 = DB.teachers[0];
    App.setSes(r === 'owner' ? { role: 'owner', id: 'owner' } : r === 'student' ? { role: 'student', id: s0.code } : r === 'parent' ? { role: 'parent', id: s0.parentPhone }
      : r === 'assistant' ? { role: 'assistant', id: t0.id, a: t0.assts[0].user } : { role: 'teacher', id: t0.id });
    App.st = {};
    if (m[2] === 'att') App.demoFill();
    history.replaceState(null, '', '#' + m[2]);
  },
  // حصة النهارده فيها كام طالب متسجل عشان الشاشة تبان شغالة
  demoFill() {
    const tid = DB.teachers[0].id, g = Store.todayGroups(tid)[0] || Store.tGroups(tid)[0], d = U.today();
    App.st.ag = g.id;
    if (Store.sessAtt(g.id, d).length) return;
    Store.members(g.id).slice(0, 9).forEach((s, i) => { const r = Store.markPresent(s.code, g.id, d); if (r.a) { if (i % 4 === 3) r.a.paid = 0; } });
    Store.save();
  },

  // ================= البداية وتسجيل الدخول =================
  loadDemo() {
    Store.fromData(window.DEMO_DATA); Store.demoHistory(); Store.save();
    U.toast(tr('اتحمّلت بيانات الديمو ✅', 'Demo data loaded ✅')); App.go('');
  },
  startBlank() {
    DB = Store.blank(); DB.center.name = document.getElementById('cname').value.trim() || 'السنتر'; Store.save();
    App.setSes({ role: 'owner', id: 'owner' }); App.go('o_teachers');
  },
  async importFile(inp) {
    const f = inp.files[0]; if (!f) return;
    try {
      if (f.name.endsWith('.json')) { await IO.restore(f); U.toast(tr('اترجعت النسخة الاحتياطية ✅', 'Backup restored ✅')); App.go(''); return; }
      const { data, errs } = await IO.readExcel(f);
      const sum = tr('مدرسين: ', 'Teachers: ') + data.teachers.length + tr(' · أسيستنتس: ', ' · Assistants: ') + data.teachers.reduce((a, t) => a + t.assts.length, 0) + tr(' · مجموعات: ', ' · Groups: ') + data.groups.length + tr(' · طلاب: ', ' · Students: ') + data.students.length + tr(' · اشتراكات: ', ' · Enrolments: ') + data.enroll.length;
      U.modal('<h3>' + tr('مراجعة الملف قبل الاستيراد', 'Review before import') + '</h3><p>' + sum + '</p>' +
        (errs.length ? '<div class="warn"><b>' + errs.length + tr(' ملاحظة (الصفوف الغلط هتتساب):', ' issues (bad rows are skipped):') + '</b><ul>' + errs.slice(0, 15).map(e => '<li>' + U.esc(e) + '</li>').join('') + '</ul></div>' : '<p class="okt">' + tr('الملف سليم ✅', 'File looks good ✅') + '</p>') +
        (DB ? '<p class="badt">⚠️ ' + tr('الاستيراد هيستبدل كل البيانات الحالية. نزّل نسخة احتياطية الأول لو محتاجها.', 'Import replaces all current data. Download a backup first if needed.') + '</p>' : '') +
        '<button class="pri" id="doimp">' + tr('استيراد', 'Import') + '</button>');
      document.getElementById('doimp').onclick = () => {
        const ow = DB && DB.owner; Store.fromData(data); if (ow) DB.owner = ow; Store.save(); U.close(); U.toast(tr('اتستوردت البيانات ✅', 'Imported ✅'));
        if (Sync.live && App.ses) App.go('o_dash'); else { App.setSes(null); App.go(''); }
      };
    } catch (e) { U.toast(e.message, 'bad'); }
    inp.value = '';
  },
  async login() {
    const f = U.form('lf'), r = App.st.lr || 'owner', u = f.u.trim(), p = f.p;
    let s = null;
    if (Sync.live) { // أونلاين: السيرفر بيتحقق وبيبعت البيانات اللي تخص الحساب بس
      const btn = document.querySelector('#lf .pri'); if (btn) { btn.disabled = true; btn.textContent = tr('بيدخل…', 'Signing in…'); }
      let res; try { res = await Sync.login(r, u, p); } catch (e) { res = { ok: false, error: 'net' }; }
      if (!res.ok) { U.toast(res.error === 'locked' ? tr('محاولات كتير غلط — استنى ربع ساعة', 'Too many attempts — wait 15 minutes') : res.error === 'net' ? tr('مفيش اتصال بالنت', 'No internet connection') : tr('اسم المستخدم أو كلمة السر غلط', 'Wrong username or password'), 'bad'); if (btn) { btn.disabled = false; btn.textContent = tr('دخول', 'Sign in'); } return; }
      const a = r === 'assistant' && (Store.teacher(res.tid).assts || []).find(x => x.user.toLowerCase() === String(res.key).toLowerCase());
      s = r === 'owner' ? { role: 'owner', id: 'owner' } : r === 'teacher' ? { role: 'teacher', id: res.tid } : r === 'assistant' ? { role: 'assistant', id: res.tid, a: a ? a.user : res.key }
        : r === 'student' ? { role: 'student', id: +res.key } : { role: 'parent', id: res.key };
      App.setSes(s); App.st = {}; App.go(''); return;
    }
    if (r === 'owner' && u === DB.owner.user && p === DB.owner.pw) s = { role: 'owner', id: 'owner' };
    if (r === 'teacher') { const t = DB.teachers.find(t => t.id.toLowerCase() === u.toLowerCase() && t.pw === p && t.active !== false); if (t) s = { role: 'teacher', id: t.id }; }
    if (r === 'assistant') { const x = Store.asstLogin(u, p); if (x) s = { role: 'assistant', id: x.t.id, a: x.a.user }; }
    if (r === 'student') { const x = Store.student(+u); if (x && x.pw === p) s = { role: 'student', id: x.code }; }
    if (r === 'parent') { const ph = U.phone(u); if (DB.students.some(x => x.parentPhone === ph) && (DB.parents[ph] || '1234') === p) s = { role: 'parent', id: ph }; }
    if (!s) { U.toast(tr('اسم المستخدم أو كلمة السر غلط', 'Wrong username or password'), 'bad'); return; }
    App.setSes(s); App.st = {}; App.go('');
  },
};

V.start = () => '<div class="hero"><h1>🎓 ' + tr('سيستم إدارة السنتر', 'Center management system') + '</h1><p>' + tr('ابدأ بواحدة من دول:', 'Start with one of these:') + '</p>' +
  '<div class="g3"><div class="card"><h3>🧪 ' + tr('جرّب بالديمو', 'Try the demo') + '</h3><p class="mu">' + tr('سنتر فيه 6 مدرسين و24 مجموعة و420 طالب، وتاريخ حضور ودرجات لآخر 4 أسابيع.', 'A center with 6 teachers, 24 groups and 420 students, with 4 weeks of history.') + '</p><button class="pri" onclick="App.loadDemo()">' + tr('تحميل الديمو', 'Load demo') + '</button></div>' +
  '<div class="card"><h3>📥 ' + tr('استيراد من إكسل', 'Import from Excel') + '</h3><p class="mu">' + tr('ارفع ملف القالب بعد ما تملاه. محتاج نت.', 'Upload the filled template. Needs internet.') + '</p><label class="pri file">' + tr('اختار ملف', 'Choose file') + '<input type="file" accept=".xlsx,.xls,.json" onchange="App.importFile(this)"></label></div>' +
  '<div class="card"><h3>✨ ' + tr('ابدأ فاضي', 'Start empty') + '</h3><p class="mu">' + tr('ضيف المدرسين والمجموعات والطلاب بإيدك من جوه السيستم.', 'Add teachers, groups and students from inside the system.') + '</p><input id="cname" class="in" placeholder="' + tr('اسم السنتر', 'Center name') + '"><button class="pri" onclick="App.startBlank()">' + tr('ابدأ', 'Start') + '</button></div></div></div>';

V.login = () => {
  const r = App.st.lr || 'owner';
  const L = { owner: [tr('اسم المستخدم', 'Username'), 'admin'], teacher: [tr('كود المدرس', 'Teacher code'), 'T01'], assistant: [tr('كود الأسيستنت', 'Assistant code'), 'A01'], student: [tr('كود الطالب', 'Student code'), '1001'], parent: [tr('رقم موبايل ولي الأمر', "Parent's mobile"), '01xxxxxxxxx'] };
  const s0 = DB && DB.students[0], cname = DB ? DB.center.name : (window.CENTER_CONFIG || {}).CENTER_NAME || '';
  return '<div class="login card"><h2>' + U.esc(cname) + '</h2><p class="mu">' + tr('تسجيل الدخول', 'Sign in') + '</p>' +
    '<div class="sg wrap">' + [['owner', tr('صاحب السنتر', 'Owner')], ['teacher', tr('مدرس', 'Teacher')], ['assistant', tr('أسيستنت', 'Assistant')], ['student', tr('طالب', 'Student')], ['parent', tr('ولي أمر', 'Parent')]].map(([k, l]) => '<button class="' + (k === r ? 'on' : '') + '" onclick="App.st.lr=\'' + k + '\';App.paint(App.bare(V.login()))">' + l + '</button>').join('') + '</div>' +
    '<form id="lf" onsubmit="event.preventDefault();App.login()"><label>' + L[r][0] + '</label><input class="in" name="u" placeholder="' + L[r][1] + '" autocomplete="username" dir="ltr"><label>' + tr('كلمة السر', 'Password') + '</label><input class="in" name="p" type="password" autocomplete="current-password" dir="ltr"><button class="pri">' + tr('دخول', 'Sign in') + '</button></form>' +
    (window.Sync && Sync.on() ? '' : '<details class="hint"><summary>' + tr('بيانات الدخول التجريبية', 'Demo accounts') + '</summary><p>' + tr('كلمة السر لكل الحسابات: ', 'Password for all: ') + '<b>1234</b><br>' + tr('صاحب السنتر: ', 'Owner: ') + '<b>admin</b> · ' + tr('المدرس: ', 'Teacher: ') + '<b>T01</b>…<b>T0' + (DB ? DB.teachers.length : 6) + '</b> · ' + tr('الأسيستنت: ', 'Assistant: ') + '<b>A01</b>…<br>' + tr('الطالب: ', 'Student: ') + '<b>' + (s0 ? s0.code : 1001) + '</b> · ' + tr('ولي الأمر: ', 'Parent: ') + '<b dir="ltr">' + (s0 ? s0.parentPhone : '') + '</b></p></details>') + '</div>';
};

document.addEventListener('DOMContentLoaded', App.init);
