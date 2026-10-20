// شاشات صاحب السنتر (ERP)
V.o_dash = () => {
  const p = App.st.op || 'month', r = U.range(p);
  const rows = DB.teachers.filter(t => t.active !== false).map(t => ({ t, rev: Store.revenue(t.id, r), sh: Store.share(t, r), pr: Store.presentCount(t.id, r), ss: Store.sessionsHeld(t.id, r), st: Store.tStudents(t.id).length, gs: Store.tGroups(t.id).length }));
  const inc = rows.reduce((a, x) => a + x.sh, 0), tot = rows.reduce((a, x) => a + x.rev, 0), exp = Store.expenses(r);
  const days = []; for (let i = 13; i >= 0; i--) days.push(U.addDays(U.today(), -i));
  const tg = Store.todayGroups();
  return '<div class="ctl">' + U.seg([['day', tr('النهارده', 'Today')], ['week', tr('آخر 7 أيام', 'Last 7 days')], ['month', tr('الشهر ده', 'This month')]], p, 'V.op') + '</div>' +
    '<div class="kpis"><div class="k c1"><span>' + tr('دخل السنتر من المدرسين', 'Center income from teachers') + '</span><b>' + U.money(inc) + '</b></div><div class="k c5"><span>' + tr('المصاريف', 'Expenses') + '</span><b>' + U.money(exp) + '</b></div>' +
    '<div class="k c2"><span>' + tr('صافي ربح السنتر', 'Center net profit') + '</span><b>' + U.money(inc - exp) + '</b></div><div class="k c4"><span>' + tr('إجمالي تحصيل المدرسين', 'Total collected by teachers') + '</span><b>' + U.money(tot) + '</b></div>' +
    '<div class="k c3"><span>' + tr('حضور الطلاب', 'Student attendances') + '</span><b>' + U.fmt(rows.reduce((a, x) => a + x.pr, 0)) + '</b></div><div class="k c6"><span>' + tr('طلاب · مجموعات', 'Students · groups') + '</span><b>' + DB.students.length + ' · ' + DB.groups.filter(g => g.active !== false).length + '</b></div></div>' +
    '<div class="card"><h3>📅 ' + tr('حصص النهارده', "Today's sessions") + ' (' + tg.length + ')</h3>' + (tg.map(g => '<div class="l"><span><b>' + g.time + '</b> · ' + U.esc(g.room || '—') + ' · ' + U.esc(Store.teacher(g.teacherId).name) + ' — ' + U.esc(Store.gLabel(g)) + '</span><i class="tag ' + (Store.isClosed(g.id, U.today()) ? 'ok' : 'mu') + '">' + Store.sessAtt(g.id, U.today()).filter(a => a.st === 'p').length + '/' + Store.members(g.id).length + '</i></div>').join('') || U.empty(tr('مفيش حصص النهارده', 'No sessions today'))) + '</div>' +
    '<div class="g2"><div class="card"><h3>' + tr('دخل السنتر آخر 14 يوم', 'Center income, last 14 days') + '</h3>' + U.line(days.map(d => DB.teachers.reduce((a, t) => a + Store.share(t, [d, d]), 0)), days.map(U.short)) + '</div>' +
    '<div class="card"><h3>' + tr('نصيب كل مدرس من دخل السنتر', 'Income share by teacher') + '</h3>' + U.donut(rows.map((x, i) => [Math.round(x.sh), ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#ec4899', '#84cc16'][i % 8], U.esc(x.t.name)])) + '</div></div>' +
    '<div class="card"><h3>' + tr('المدرسين', 'Teachers') + '</h3><div class="tw"><table class="tbl"><tr><th>' + tr('المدرس', 'Teacher') + '</th><th>' + tr('الاتفاق', 'Agreement') + '</th><th>' + tr('مجموعات', 'Groups') + '</th><th>' + tr('طلاب', 'Students') + '</th><th>' + tr('حصص', 'Sessions') + '</th><th>' + tr('حضور', 'Attendances') + '</th><th>' + tr('تحصيله', 'Collected') + '</th><th>' + tr('حق السنتر', 'Center share') + '</th></tr>' +
    rows.map(x => '<tr onclick="App.asTeacher(' + q(x.t.id) + ')"><td><b>' + U.esc(x.t.name) + '</b><br><small class="mu">' + U.esc(x.t.subject) + '</small></td><td>' + U.esc(Store.agText(x.t)) + '</td><td>' + x.gs + '</td><td>' + x.st + '</td><td>' + x.ss + '</td><td>' + x.pr + '</td><td>' + U.money(x.rev) + '</td><td><b>' + U.money(x.sh) + '</b></td></tr>').join('') +
    '<tr class="tot"><td>' + tr('الإجمالي', 'Total') + '</td><td></td><td></td><td></td><td></td><td></td><td>' + U.money(tot) + '</td><td>' + U.money(inc) + '</td></tr></table></div><p class="mu small">' + tr('اضغط على أي مدرس عشان تفتح لوحته.', 'Click a teacher to open their dashboard.') + '</p></div>';
};
V.op = v => { App.st.op = v; App.render(); };

// ---------------- المدرسين ----------------
const TF = {
  open(id) {
    const t = id ? Store.teacher(id) : { id: 'T' + String(DB.teachers.length + 1).padStart(2, '0'), name: '', subject: '', phone: '', agType: 'pct', agVal: 20 };
    U.modal('<h3>' + (id ? tr('تعديل ', 'Edit ') + U.esc(t.name) : '➕ ' + tr('مدرس جديد', 'New teacher')) + '</h3><form id="tf" onsubmit="event.preventDefault();TF.save(' + (id ? q(id) : 'null') + ')">' +
      '<div class="row3"><div><label>' + tr('الكود (للدخول)', 'Code (login)') + '</label><input class="in" name="id" dir="ltr" value="' + U.esc(t.id) + '" ' + (id ? 'disabled' : '') + '></div><div><label>' + tr('الاسم', 'Name') + '</label><input class="in" name="name" required value="' + U.esc(t.name) + '"></div><div><label>' + tr('المادة', 'Subject') + '</label><input class="in" name="subject" value="' + U.esc(t.subject) + '"></div></div>' +
      '<div class="row3"><div><label>' + tr('رقم الموبايل', 'Mobile') + '</label><input class="in" name="phone" dir="ltr" value="' + U.esc(t.phone) + '"></div><div><label>' + tr('نوع الاتفاق', 'Agreement') + '</label><select class="in" name="agType">' + U.opts(Object.keys(AG_AR).map(k => [k, agName(k)]), t.agType) + '</select></div><div><label>' + tr('القيمة (% أو جنيه)', 'Value (% or EGP)') + '</label><input class="in" name="agVal" type="number" min="0" value="' + t.agVal + '"></div></div>' +
      (id ? '' : '<p class="mu small">' + tr('كلمة السر الافتراضية 1234. المدرس بيضيف الأسيستنتس بتوعه من الإعدادات.', 'Default password 1234. The teacher adds assistants from settings.') + '</p>') + '<button class="pri">' + tr('حفظ', 'Save') + '</button></form>');
  },
  save(id) {
    const f = U.form('tf');
    if (id) { const t = Store.teacher(id); Object.assign(t, { name: f.name, subject: f.subject, agType: f.agType, agVal: +f.agVal || 0, phone: U.phone(f.phone) }); }
    else {
      if (!f.id || Store.teacher(f.id)) return U.toast(tr('الكود فاضي أو مستخدم قبل كده', 'Code is empty or taken'), 'bad');
      DB.teachers.push(Store.newTeacher(Object.assign(f, { agVal: +f.agVal || 0, assts: [] })));
    }
    U.close(); U.toast(tr('اتحفظ ✅', 'Saved ✅')); App.refresh();
  },
  toggle(id) { const t = Store.teacher(id); t.active = t.active === false; App.refresh(); },
};
V.o_teachers = () => '<div class="ctl"><button class="b g1" onclick="TF.open()">➕ ' + tr('مدرس جديد', 'New teacher') + '</button></div><div class="g3">' + DB.teachers.map(t =>
  '<div class="card' + (t.active === false ? ' dim' : '') + '"><h3>' + U.esc(t.name) + ' <small class="mu">' + t.id + '</small></h3><div class="l"><span>' + tr('المادة', 'Subject') + '</span><b>' + U.esc(t.subject) + '</b></div>' +
  '<div class="l"><span>' + tr('الاتفاق', 'Agreement') + '</span><b>' + U.esc(Store.agText(t)) + '</b></div><div class="l"><span>' + tr('المجموعات · الطلاب', 'Groups · students') + '</span><b>' + Store.tGroups(t.id).length + ' · ' + Store.tStudents(t.id).length + '</b></div>' +
  '<div class="l"><span>' + tr('الأسيستنتس', 'Assistants') + '</span><b>' + (t.assts.map(a => U.esc(a.name) + ' <small class="mu">(' + a.user + ')</small>').join('، ') || '—') + '</b></div>' +
  '<div class="ctl"><button class="b g1" onclick="App.asTeacher(' + q(t.id) + ')">📂 ' + tr('افتح لوحته', 'Open dashboard') + '</button><button class="b" onclick="TF.open(' + q(t.id) + ')">✏️</button><button class="b" onclick="TF.toggle(' + q(t.id) + ')">' + (t.active === false ? tr('تفعيل', 'Enable') : tr('إيقاف', 'Disable')) + '</button></div></div>').join('') + '</div>' + (DB.teachers.length ? '' : U.empty(tr('ضيف أول مدرس', 'Add the first teacher')));

// ---------------- القاعات والجدول ----------------
const RM = {
  add() { const f = U.form('rf'); if (!f.name) return; DB.rooms.push({ id: Store.nid(), name: f.name, cap: +f.cap || 0, notes: '' }); App.refresh(); },
  del(id) {
    const r = DB.rooms.find(x => x.id === id);
    if (DB.groups.some(g => g.room === r.name && g.active !== false)) return U.toast(tr('فيه مجموعات على القاعة دي — انقلها الأول', 'Groups use this room — move them first'), 'bad');
    DB.rooms = DB.rooms.filter(x => x.id !== id); App.refresh();
  },
};
V.o_rooms = () => {
  const times = [...new Set(DB.groups.filter(g => g.active !== false).map(g => g.time))].sort((a, b) => U.mins(a) - U.mins(b));
  const cell = (d, tm) => DB.groups.filter(g => g.active !== false && g.time === tm && (g.day1 === d || g.day2 === d)).map(g => '<div class="slot' + (Store.conflicts(g).length ? ' clash' : '') + '"><b>' + U.esc(g.room || '؟') + '</b> ' + U.esc(Store.teacher(g.teacherId).subject) + '<small>' + U.esc(Store.gLabel(g)) + '</small></div>').join('');
  return '<div class="card"><h3>' + tr('القاعات', 'Rooms') + '</h3><form id="rf" class="ctl wrap" onsubmit="event.preventDefault();RM.add()"><input class="in" name="name" placeholder="' + tr('اسم القاعة', 'Room name') + '"><input class="in sm" name="cap" type="number" placeholder="' + tr('السعة', 'Capacity') + '"><button class="b g1">➕ ' + tr('إضافة', 'Add') + '</button></form>' +
    '<div class="chips">' + DB.rooms.map(r => { const n = DB.groups.filter(g => g.room === r.name && g.active !== false).length; return '<span class="ch">🏫 ' + U.esc(r.name) + ' · ' + r.cap + ' · ' + n + ' ' + tr('مجموعة', 'groups') + ' <button class="lnk" onclick="RM.del(' + r.id + ')">✕</button></span>'; }).join('') + '</div></div>' +
    '<div class="card"><h3>' + tr('جدول الأسبوع', 'Weekly schedule') + '</h3><p class="mu small">' + tr('الأحمر = تعارض (نفس القاعة في نفس الوقت).', 'Red = clash (same room, same time).') + '</p><div class="tw"><table class="tbl sched"><tr><th>' + tr('الساعة', 'Time') + '</th>' + U.WEEK.slice(0, 6).map(d => '<th>' + d + '</th>').join('') + '</tr>' +
    times.map(tm => '<tr><td><b>' + tm + '</b></td>' + U.WEEK.slice(0, 6).map(d => '<td>' + cell(d, tm) + '</td>').join('') + '</tr>').join('') + '</table></div></div>';
};

// ---------------- كل الطلاب ----------------
V.o_students = () => {
  const qq = (App.st.oq || '').trim(), n = App.st.on || 60;
  const list = DB.students.filter(s => !qq || Att.match(s, qq));
  return '<div class="card"><div class="ctl"><input class="in grow" placeholder="🔎 ' + tr('بحث في كل طلاب السنتر', 'Search all students') + '" value="' + U.esc(qq) + '" oninput="V.oQ(this.value)"></div><p class="mu">' + list.length + ' ' + tr('طالب · كل طالب ليه حساب واحد مع كل المدرسين', 'students · one account across all teachers') + '</p>' +
    '<div class="tw"><table class="tbl"><tr><th>' + tr('الكود', 'Code') + '</th><th>' + tr('الاسم', 'Name') + '</th><th>' + tr('الصف', 'Grade') + '</th><th>' + tr('المدرسين', 'Teachers') + '</th><th>' + tr('رقم ولي الأمر', 'Parent phone') + '</th><th></th></tr>' +
    list.slice(0, n).map(s => '<tr><td>' + s.code + '</td><td><b>' + U.esc(s.name) + '</b></td><td>' + U.esc(s.grade) + '</td><td>' + Store.enrollsOf(s.code).map(e => { const g = Store.group(e.g); return g ? '<i class="tag pr">' + U.esc(Store.teacher(g.teacherId).subject) + '</i>' : ''; }).join(' ') + '</td><td dir="ltr">' + s.parentPhone + '</td><td><button class="b x1" onclick="V.oDel(' + s.code + ')">🗑️</button></td></tr>').join('') +
    '</table></div>' + (list.length > n ? '<button class="b wide" onclick="App.st.on=' + (n + 100) + ';App.render()">' + tr('عرض المزيد', 'Show more') + ' (' + (list.length - n) + ')</button>' : '') + '</div>';
};
V.oQ = v => { App.st.oq = v; App.st.on = 60; App.render(); const e = document.querySelector('.grow'); e.focus(); e.setSelectionRange(v.length, v.length); };
V.oDel = code => U.modal('<h3>' + tr('حذف ', 'Delete ') + U.esc(Store.student(code).name) + tr(' من السنتر كله؟', ' from the whole center?') + '</h3><p>' + tr('هيتمسح من كل المدرسين ومعاه كل الحضور والدرجات والفلوس.', 'Removes them from all teachers with all attendance, grades and payments.') + '</p><button class="pri danger" onclick="Store.deleteStudent(' + code + ');U.close();App.refresh()">' + tr('احذف نهائي', 'Delete permanently') + '</button>');

// ---------------- المصاريف ----------------
const EX = {
  add() { const f = U.form('ef'); if (!f.title || !(+f.amt > 0)) return U.toast(tr('اكتب البند والمبلغ', 'Enter item and amount'), 'bad'); DB.expenses.push({ id: Store.nid(), cat: f.cat, title: f.title, amt: +f.amt, d: f.d || U.today() }); App.refresh(); },
  del(id) { DB.expenses = DB.expenses.filter(e => e.id !== id); App.refresh(); },
  copyLast() { // تكرار المصاريف الثابتة والمرتبات من الشهر اللي فات
    const m0 = U.today().slice(0, 8) + '01', pm = U.addDays(m0, -1).slice(0, 7);
    const prev = DB.expenses.filter(e => e.d.startsWith(pm) && e.cat !== 'var');
    if (!prev.length) return U.toast(tr('مفيش مصاريف ثابتة في الشهر اللي فات', 'No fixed expenses last month'), 'wa');
    prev.forEach(e => DB.expenses.push({ id: Store.nid(), cat: e.cat, title: e.title, amt: e.amt, d: m0 })); App.refresh();
  },
};
V.o_exp = () => {
  const m = App.st.em || U.today().slice(0, 7), list = DB.expenses.filter(e => e.d.startsWith(m)).sort((a, b) => a.cat.localeCompare(b.cat) || b.amt - a.amt);
  const r = [m + '-01', m + '-31'], by = EXP_KEYS.map(k => [list.filter(e => e.cat === k).reduce((a, e) => a + e.amt, 0), k]);
  const inc = DB.teachers.reduce((a, t) => a + Store.share(t, r[1] > U.today() ? [r[0], U.today()] : r), 0), exp = list.reduce((a, e) => a + e.amt, 0);
  return '<div class="card"><div class="ctl wrap"><label>' + tr('الشهر', 'Month') + '</label><input class="in" type="month" value="' + m + '" onchange="App.st.em=this.value;App.render()"><button class="b" onclick="EX.copyLast()">↻ ' + tr('انسخ الثابتة والمرتبات من الشهر اللي فات', 'Copy fixed & salaries from last month') + '</button></div>' +
    '<div class="kpis"><div class="k c1"><span>' + tr('دخل السنتر', 'Center income') + '</span><b>' + U.money(inc) + '</b></div><div class="k c5"><span>' + tr('المصاريف', 'Expenses') + '</span><b>' + U.money(exp) + '</b></div><div class="k c2"><span>' + tr('الصافي', 'Net') + '</span><b>' + U.money(inc - exp) + '</b></div>' +
    by.map(([v, k], i) => '<div class="k c' + (i + 3) + '"><span>' + expName(k) + '</span><b>' + U.money(v) + '</b></div>').join('') + '</div>' +
    '<form id="ef" class="ctl wrap" onsubmit="event.preventDefault();EX.add()"><select class="in" name="cat">' + U.opts(EXP_KEYS.map(k => [k, expName(k)]), 'var') + '</select><input class="in" name="title" placeholder="' + tr('البند (إيجار، كهربا، مرتب...)', 'Item (rent, power, salary...)') + '"><input class="in sm" name="amt" type="number" min="1" placeholder="' + tr('المبلغ', 'Amount') + '"><input class="in" name="d" type="date" value="' + U.today() + '"><button class="b g1">➕ ' + tr('إضافة', 'Add') + '</button></form>' +
    (list.map(e => '<div class="l"><span><i class="tag mu">' + expName(e.cat) + '</i> ' + U.esc(e.title) + ' <small class="mu">' + U.short(e.d) + '</small></span><span><b>' + U.money(e.amt) + '</b> <button class="lnk" onclick="EX.del(' + e.id + ')">✕</button></span></div>').join('') || U.empty(tr('مفيش مصاريف في الشهر ده', 'No expenses this month'))) + '</div>';
};

// ---------------- البيانات ----------------
V.o_data = () => '<div class="g2"><div class="card"><h3>🏢 ' + tr('بيانات السنتر', 'Center details') + '</h3><form id="cf" onsubmit="event.preventDefault();V.oCenter()"><label>' + tr('اسم السنتر', 'Center name') + '</label><input class="in" name="name" value="' + U.esc(DB.center.name) + '"><label>' + tr('العنوان', 'Address') + '</label><input class="in" name="address" value="' + U.esc(DB.center.address) + '">' +
  '<label>' + tr('الصفوف (افصل بفاصلة)', 'Grades (comma separated)') + '</label><input class="in" name="grades" value="' + U.esc(DB.center.grades.join('، ')) + '"><div class="row2"><div><label>' + tr('اسم دخول صاحب السنتر', 'Owner username') + '</label><input class="in" name="user" dir="ltr" value="' + U.esc(DB.owner.user) + '"></div><div><label>' + tr('كلمة سر جديدة', 'New password') + '</label><input class="in" name="pw" type="password"></div></div><button class="pri">' + tr('حفظ', 'Save') + '</button></form></div>' +
  '<div class="card"><h3>💾 ' + tr('نسخ احتياطي واستيراد', 'Backup & import') + '</h3>' + (window.Sync && Sync.on() ? '<p class="okt">☁️ ' + tr('البيانات متزامنة أونلاين مع Supabase، والشيتات بتتحدّث لوحدها.', 'Data syncs online to Supabase and the sheets update automatically.') + '</p>' : '<p class="mu">' + tr('البيانات دلوقتي متخزنة على المتصفح ده بس. نزّل نسخة احتياطية كل يوم.', 'Data is stored in this browser only. Download a backup daily.') + '</p>') +
  '<button class="pri" onclick="IO.backup()">⬇️ ' + tr('تنزيل نسخة احتياطية', 'Download backup') + '</button>' +
  (Sync.live ? '<button class="b wide" onclick="V.oSheet()">🔗 ' + tr('ربط شيت جوجل (مفتاح الشيت)', 'Connect Google Sheet (sheet key)') + '</button>' : '') +
  '<label class="b wide file">⬆️ ' + tr('استرجاع نسخة (.json) أو استيراد إكسل', 'Restore (.json) or import Excel') + '<input type="file" accept=".json,.xlsx,.xls" onchange="App.importFile(this)"></label>' +
  '<hr><button class="b wide" onclick="V.oReset(1)">🧪 ' + tr('إعادة تحميل الديمو', 'Reload demo') + '</button><button class="b wide r1" onclick="V.oReset(0)">🗑️ ' + tr('مسح كل البيانات', 'Erase all data') + '</button></div></div>';
V.oCenter = async () => {
  const f = U.form('cf'); DB.center.name = f.name || DB.center.name; DB.center.address = f.address;
  DB.center.grades = f.grades.split(/[,،]/).map(x => x.trim()).filter(Boolean); if (f.user) DB.owner.user = f.user;
  App.refresh();
  if (f.pw) await Store.setPw('owner', DB.owner.user, f.pw);
  U.toast(tr('اتحفظ ✅', 'Saved ✅'));
};
// الشيتات: مفتاح بيتحط في شيت جوجل عشان يقرا البيانات ويتحدّث لوحده
V.oSheet = async () => {
  if (!Sync.live) return U.toast(tr('الشيتات بتشتغل لما السيستم يتربط بالداتابيز', 'Sheets work once the system is connected to the database'), 'wa');
  const k = await Sync.sheetKey().catch(() => null);
  if (!k) return U.toast(tr('مقدرتش أجيب المفتاح', 'Could not get the key'), 'bad');
  U.modal('<h3>🔗 ' + tr('ربط شيت جوجل', 'Connect Google Sheet') + '</h3><p>' + tr('انسخ المفتاح ده وحطه في تاب «الإعدادات» في شيت السنتر (الخانة B2). الشيت هيتحدّث لوحده كل 10 دقايق.', 'Copy this key into the «الإعدادات» tab of the center sheet (cell B2). The sheet refreshes every 10 minutes.') + '</p>' +
    '<input class="in" id="skey" dir="ltr" readonly value="' + U.esc(k) + '" onclick="this.select()"><button class="pri" onclick="navigator.clipboard.writeText(document.getElementById(\'skey\').value).then(()=>U.toast(\'' + tr('اتنسخ ✅', 'Copied ✅') + '\'),()=>document.getElementById(\'skey\').select())">' + tr('نسخ', 'Copy') + '</button>' +
    '<p class="mu small">' + tr('المفتاح ده بيقرا كل بيانات السنتر — ماتبعتهوش لحد.', 'This key reads all center data — keep it private.') + '</p>');
};
V.oReset = demo => U.modal('<h3>' + (demo ? tr('إعادة تحميل الديمو؟', 'Reload the demo?') : tr('مسح كل البيانات؟', 'Erase all data?')) + '</h3><p>' + tr('كل البيانات الحالية هتتمسح. نزّل نسخة احتياطية الأول لو محتاجها.', 'All current data will be erased. Download a backup first if needed.') + '</p><button class="pri danger" onclick="U.close();' + (demo ? 'App.setSes(null);App.loadDemo()' : 'Store.wipe();App.setSes(null);App.go(\'\')') + '">' + tr('تأكيد', 'Confirm') + '</button>');
