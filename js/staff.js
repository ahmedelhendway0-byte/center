// شاشات المدرس والأسيستنت — فيها كل اللي كان في المشروع القديم + اللي اتضاف
// (أكتر من مدرس، أسيستنتس، تعويض، طالب جديد من الباب، صلاحيات)

// ======================= تسجيل الحصة (شاشة الأسيستنت القديمة + البحث السريع) =======================
const Att = {
  gid() {
    const T = App.T(), gs = Store.tGroups(T.id);
    if (!gs.length) return null;
    let g = App.st.ag;
    if (!g || !Store.group(g) || Store.group(g).teacherId !== T.id) g = App.st.ag = (Store.todayGroups(T.id)[0] || gs[0]).id;
    return g;
  },
  d() { return App.st.ad || U.today(); },
  match(s, qq) {
    if (/^\d+$/.test(qq)) return String(s.code).startsWith(qq) || (qq.length >= 3 && (s.phone.endsWith(qq) || s.parentPhone.endsWith(qq)));
    const n = U.norm(s.name); return U.norm(qq).split(' ').every(w => n.includes(w));
  },
  // البحث السريع: الطلاب بيدخلوا بأي ترتيب → كود / أول حروف الاسم / آخر أرقام التليفون ثم Enter
  search(v) {
    App.st.aq = v;
    const el = document.getElementById('res'); if (!el) return;
    const qq = v.trim();
    Att.paintRoster();
    if (!qq) { el.innerHTML = ''; Att.res = []; return; }
    const T = App.T(), gid = Att.gid(), d = Att.d(), here = new Set(Store.sessAtt(gid, d).filter(a => a.st === 'p').map(a => a.s));
    const mine = Store.tStudents(T.id).filter(x => Att.match(x.s, qq));
    const rank = x => (here.has(x.s.code) ? 5 : 0) + (String(x.s.code) === qq ? 0 : x.g.id === gid ? 1 : 2);
    mine.sort((a, b) => rank(a) - rank(b) || a.s.name.localeCompare(b.s.name, 'ar'));
    let others = [];
    if (mine.length < 3) { const ids = new Set(mine.map(x => x.s.code)); others = DB.students.filter(s => !ids.has(s.code) && Att.match(s, qq)).slice(0, 4); }
    Att.res = mine.map(x => x.s.code).concat(others.map(s => s.code));
    el.innerHTML = (mine.slice(0, 6).map((x, i) => '<button class="ri' + (i === 0 ? ' first' : '') + '" onclick="Att.pick(' + x.s.code + ')"><span><b>' + U.esc(x.s.name) + '</b><small>' + x.s.code + ' · ' + U.esc(Store.gLabel(x.g)) + '</small></span><span>' +
      (here.has(x.s.code) ? '<i class="tag ok">' + tr('حضر', 'Present') + '</i>' : '') + (x.g.id !== gid ? '<i class="tag wa">' + tr('تعويض', 'Make-up') + '</i>' : '') + '</span></button>').join('') +
      others.map(s => '<button class="ri" onclick="Att.pick(' + s.code + ')"><span><b>' + U.esc(s.name) + '</b><small>' + s.code + ' · ' + U.esc(s.grade) + '</small></span><i class="tag pr">' + tr('مش مشترك — اضغط للإضافة', 'Not enrolled — tap to add') + '</i></button>').join('')) ||
      '<div class="ri none">' + tr('مفيش نتيجة', 'No match') + (App.can('add') ? ' · <button class="lnk" onclick="SF.open(null,{gid:' + q(gid) + ',mark:1,name:' + q(/^\d+$/.test(qq) ? '' : qq) + '})">➕ ' + tr('سجّل طالب جديد', 'Register new student') + '</button>' : '') + '</div>';
  },
  key(e) {
    if (e.key === 'Enter') { e.preventDefault(); if (Att.res && Att.res[0]) Att.pick(Att.res[0]); }
    if (e.key === 'Escape') { e.target.value = ''; Att.search(''); }
  },
  pick(code) {
    const T = App.T(), gid = Att.gid(), d = Att.d(), g = Store.group(gid), s = Store.student(code);
    if (!Store.enrollFor(code, T.id)) {
      U.modal('<h3>' + U.esc(s.name) + '</h3><p>' + tr('الطالب ده مش مشترك مع ', 'This student is not enrolled with ') + U.esc(T.name) + tr('. تضيفه لمجموعة ', '. Add to ') + '<b>' + U.esc(Store.gLabel(g)) + '</b>' + tr(' وتسجله حاضر؟', ' and mark present?') + '</p><button class="pri" onclick="Store.enroll(' + code + ',' + q(gid) + ');U.close();Att.pick(' + code + ')">' + tr('أيوه ضيفه وسجّله', 'Yes, add and mark') + '</button>');
      return;
    }
    const r = Store.markPresent(code, gid, d);
    if (r.dup) { U.toast(tr('متسجل حاضر قبل كده', 'Already marked present'), 'wa'); return; }
    App.st.aq = ''; Store.save();
    U.toast('✅ ' + s.name + (r.a.mk ? tr(' (تعويض)', ' (make-up)') : ''));
    App.render();
  },
  setA(code, v) {
    const gid = Att.gid(), d = Att.d();
    if (v === 'p') { if (!Store.rec(code, gid, d) || Store.rec(code, gid, d).st !== 'p') Store.markPresent(code, gid, d); }
    else Store.markAbsent(code, gid, d);
    App.refresh();
  },
  setPay(code, v) {
    const gid = Att.gid(), d = Att.d(), g = Store.group(gid);
    if (g.payMode === 'month') Store.toggleSub(code, gid, Store.month(d));
    else { const a = Store.rec(code, gid, d); if (!a || a.st !== 'p') return; a.paid = v === 'paid' ? a.fee : 0; }
    App.refresh();
  },
  score(type, code, v) { const a = Store.ensureSessAssess(Att.gid(), Att.d(), type); Store.setScore(a.id, code, v); Store.save(); },
  toggle(k, v) { const g = Store.group(Att.gid()); g[k] = v; App.refresh(); },
  mode(v) { Store.group(Att.gid()).payMode = v; App.refresh(); },
  all(v) { Store.tGroups(App.tid(), true).forEach(g => g.payMode = v); App.refresh(); U.toast(tr('كل المجموعات بقت ', 'All groups are now ') + (v === 'month' ? tr('شهري', 'monthly') : tr('بالحصة', 'per session'))); },
  setG(v) { App.st.ag = v; App.st.aq = ''; App.st.an = 30; App.render(); },
  setGrade(gr) { const g = Store.tGroups(App.tid()).find(x => x.grade === gr); if (g) Att.setG(g.id); },
  setD(v) { App.st.ad = v || U.today(); App.render(); },
  setGx(v) { App.st.gx = v; App.st.an = 30; App.render(); },
  save() {
    const gid = Att.gid(), d = Att.d();
    Store.closeSession(gid, d); Store.save(); App.render();
    U.toast(tr('تم تسجيل بيانات اليوم ✅', "Today's data saved ✅"));
    Msg.session(gid, d);
  },
  reopen() { Store.reopen(Att.gid(), Att.d()); App.refresh(); },
  quickScore(e, type, code) { Att.score(type, code, e.target.value); },
  // صفوف الكشف (زي المشروع القديم): حضر/غاب · الدفع · كويز/20 · امتحان/50
  row(s, g, d) {
    const a = Store.rec(s.code, g.id, d), st = a ? a.st : '', ps = Store.payState(s.code, g.id, d), T = App.T();
    const pay = g.payMode === 'month'
      ? '<button class="b ' + (ps === 'mp' ? 'g1' : 'r1') + '" onclick="Att.setPay(' + s.code + ')">' + Store.payText(ps) + '</button>'
      : (st === 'p' ? '<button class="b ' + (ps === 'paid' ? 'g1' : '') + '" onclick="Att.setPay(' + s.code + ',\'paid\')">' + tr('دفع', 'Paid') + '</button><button class="b ' + (ps === 'df' ? 'o1' : '') + '" onclick="Att.setPay(' + s.code + ',\'df\')">' + tr('آجل', 'Deferred') + '</button>' : '<span class="na">—</span>');
    const inp = (type, mx, on) => on && st === 'p' ? '<span class="qw"><input class="qi" type="number" inputmode="numeric" min="0" max="' + mx + '" placeholder="—" value="' + Store.sessScore(g.id, d, type, s.code) + '" onchange="Att.score(\'' + type + '\',' + s.code + ',this.value)"><em>/' + mx + '</em></span>' : '<span class="na">—</span>';
    const mk = a && a.mk ? '<i class="tag wa">' + tr('تعويض', 'Make-up') + '</i> ' : '';
    return '<div class="r"><div class="nm" onclick="Prof.open(' + s.code + ')"><b>' + mk + U.esc(s.name) + '</b><small>' + s.code + ' · <span dir="ltr">' + (s.phone || s.parentPhone) + '</span>' + (a && a.tm ? ' · ' + a.tm : '') + '</small></div><div class="ctl rc">' +
      '<span class="cl"><button class="b ' + (st === 'p' ? 'g1' : '') + '" onclick="Att.setA(' + s.code + ',\'p\')">' + tr('حضر', 'Present') + '</button><button class="b ' + (st === 'a' ? 'r1' : '') + '" onclick="Att.setA(' + s.code + ',\'a\')">' + tr('غاب', 'Absent') + '</button></span>' +
      '<span class="cl">' + pay + '</span>' + inp('quiz', 20, g.qz) + inp('exam', 50, g.ex) + '</div></div>';
  },
  paintRoster() {
    const el = document.getElementById('roster'); if (!el) return;
    const gid = Att.gid(), d = Att.d(), g = Store.group(gid), qq = (App.st.aq || '').trim(), gx = App.st.gx || 0, n = App.st.an || 30;
    const mem = Store.members(gid), mids = new Set(mem.map(s => s.code));
    const extra = Store.sessAtt(gid, d).filter(a => !mids.has(a.s)).map(a => Store.student(a.s)).filter(Boolean); // تعويض/مش من المجموعة
    let list = mem.concat(extra).filter(s => (!qq || Att.match(s, qq)) && (!gx || (gx === 2) === Store.isGirl(s)));
    list.sort((a, b) => Store.isGirl(a) - Store.isGirl(b) || a.name.localeCompare(b.name, 'ar'));
    const hdr = '<div class="r rh"><div class="nm">' + tr('الطالب', 'Student') + '</div><div class="ctl rc"><span>' + tr('الحضور', 'Attendance') + '</span><span>' + tr('الدفع', 'Payment') + '</span><span>' + tr('الكويز', 'Quiz') + '</span><span>' + tr('الامتحان', 'Exam') + '</span></div></div>';
    let last = null, out = '';
    list.slice(0, n).forEach(s => {
      const girl = Store.isGirl(s);
      if (girl !== last) { out += '<div class="gh">' + (girl ? '👧 ' + tr('بنات', 'Girls') : '👦 ' + tr('بنين', 'Boys')) + ' (' + list.filter(x => Store.isGirl(x) === girl).length + ')</div>'; last = girl; }
      out += Att.row(s, g, d);
    });
    el.innerHTML = hdr + (out || U.empty()) + (list.length > n ? '<button class="pri" onclick="App.st.an=' + (n + 40) + ';Att.paintRoster()">' + tr('عرض المزيد', 'Show more') + ' (' + (list.length - n) + ')</button>' : '');
  },
};

// إرسال جماعي لكل أولياء أمور المجموعة (كارت المشروع القديم: التقرير فقط / رسالتي فقط)
const BK = {
  st() { return App.st.bk = App.st.bk || { ty: 'rep', rc: 'b', tx: '' }; },
  card(g) {
    const b = BK.st(), n = Store.members(g.id).length;
    return '<div class="card flat"><h3>📣 ' + tr('إرسال للكل', 'Send to all') + ' (' + n + ')</h3><div class="tb">' +
      U.segL(tr('نوع الرسالة', 'Message type'), [['rep', tr('التقرير فقط', 'Report only')], ['cus', tr('رسالتي فقط', 'My note only')]], b.ty, "v=>{BK.st().ty=v;App.render()}") +
      U.segL(tr('إرسال إلى', 'Send to'), [['p', tr('ولي الأمر', 'Parent')], ['s', tr('الطالب', 'Student')], ['b', tr('الاتنين', 'Both')]], b.rc, "v=>{BK.st().rc=v;App.render()}") + '</div>' +
      (b.ty === 'cus' ? '<textarea class="in" rows="3" placeholder="' + tr('اكتب رسالتك هنا...', 'Write your message...') + '" oninput="BK.st().tx=this.value">' + U.esc(b.tx) + '</textarea>' : '') +
      '<button class="pri" onclick="BK.send(' + q(g.id) + ')">' + tr('إرسال', 'Send') + ' (' + n + ')</button></div>';
  },
  send(gid) {
    const b = BK.st(), g = Store.group(gid), d = Att.d(), T = Store.teacher(g.teacherId);
    if (b.ty === 'cus' && !b.tx.trim()) return U.toast(tr('اكتب الرسالة', 'Write the message'), 'bad');
    Msg.bulk(Store.gLabel(g), Store.members(gid).map(s => s.code), T.id, b.rc,
      (c, k) => b.ty === 'cus' ? Msg.custom(c, b.tx.trim(), k) : Msg.report(c, T.id, { to: k, g: gid, d, grades: T.notif.grades !== false }), b.ty === 'cus' ? 'custom' : 'report');
  },
};

V.att = () => {
  const T = App.T(), gid = Att.gid();
  if (!gid) return U.empty(tr('مفيش مجموعات لسه', 'No groups yet') + (App.isAsst() ? '' : ' — <a href="#groups">' + tr('ضيف مجموعة', 'Add a group') + '</a>'));
  const d = Att.d(), g = Store.group(gid), rows = Store.sessAtt(gid, d), pres = rows.filter(a => a.st === 'p'), abs = rows.filter(a => a.st === 'a'), mem = Store.members(gid);
  const closed = Store.isClosed(gid, d), at = Store.closedAt(gid, d), todayIds = Store.todayGroups(T.id).map(x => x.id), grades = Store.tGrades(T.id);
  const paid = pres.reduce((x, a) => x + a.paid, 0) + DB.subs.filter(x => x.g === gid && x.d === d).reduce((s, x) => s + x.amt, 0), def = pres.reduce((x, a) => x + a.fee - a.paid, 0);
  const subs = g.payMode === 'month' ? mem.filter(s => Store.sub(s.code, T.id, Store.month(d))).length : 0;
  const bar = '<div class="sv"><span>' + (closed ? '✅ ' + tr('تم التسجيل', 'Saved') + (at ? ' · ' + at : '') : '⏳ ' + tr('لم يتم التسجيل بعد', 'Not saved yet')) + '</span><span class="ctl">' +
    (closed ? '<button class="b" onclick="Msg.session(' + q(gid) + ',' + q(d) + ')">📲 ' + tr('رسايل الحصة', 'Session messages') + '</button>' : '') + '<button class="pri sm" onclick="Att.save()">💾 ' + tr('تسجيل اليوم', 'Save today') + '</button></span></div>';
  let h = (App.can('mode') ? '<div class="ctl"><span class="mu small">' + tr('كل المجموعات:', 'All groups:') + '</span><button class="b" onclick="Att.all(\'month\')">' + tr('شهري', 'Monthly') + '</button><button class="b" onclick="Att.all(\'session\')">' + tr('بالحصة', 'Per session') + '</button></div>' : '') +
    '<div class="tabs2">' + grades.map(gr => '<button class="' + (gr === g.grade ? 'on' : '') + '" onclick="Att.setGrade(' + q(gr) + ')">' + U.esc(gr) + '</button>').join('') + '</div>' +
    '<div class="tabs2 sub">' + Store.tGroups(T.id).filter(x => x.grade === g.grade).map(x => '<button class="' + (x.id === gid ? 'on' : '') + '" onclick="Att.setG(' + q(x.id) + ')">' + (todayIds.includes(x.id) ? '⭐ ' : '') + U.esc(x.name) + '</button>').join('') + '</div>';
  h += '<div class="card"><div class="ctl sp"><h3>' + U.esc(Store.gLabel(g)) + ' · ' + U.esc(Store.gTime(g)) + ' <span class="tag pr">' + U.money(Store.gPrice(g)) + (g.payMode === 'month' ? tr(' / شهر', ' / month') : '') + '</span></h3>' +
    '<input class="in dt" type="date" value="' + d + '" max="' + U.today() + '" onchange="Att.setD(this.value)"></div>' +
    (Store.meets(g, d) ? '' : '<div class="warn">' + tr('المجموعة مالهاش ميعاد يوم ', 'This group does not meet on ') + U.dayLabel(d) + '</div>') +
    (App.can('mode') ? '<div class="tb">' + U.segL(tr('نظام الدفع', 'Payment mode'), [['month', tr('شهري', 'Monthly')], ['session', tr('بالحصة', 'Per session')]], g.payMode, 'Att.mode') +
      U.segL(tr('كويز', 'Quiz today'), [['1', tr('موجود', 'Yes')], ['0', tr('مش موجود', 'No')]], g.qz ? '1' : '0', "v=>Att.toggle('qz',v==='1')") +
      U.segL(tr('امتحان', 'Exam'), [['1', tr('موجود', 'Yes')], ['0', tr('مش موجود', 'No')]], g.ex ? '1' : '0', "v=>Att.toggle('ex',v==='1')") + '</div>' : '') +
    bar +
    '<div class="chips"><span class="ch">👥 ' + mem.length + ' ' + tr('طالب', 'students') + '</span><span class="ch">✅ ' + tr('حاضرون', 'Present') + ': ' + pres.length + '</span><span class="ch">❌ ' + tr('غائبون', 'Absent') + ': ' + abs.length + '</span>' +
    (App.can('money') ? '<span class="ch">💰 ' + tr('محصّل اليوم', 'Collected today') + ': ' + U.money(paid) + '</span>' : '') +
    (g.payMode === 'month' ? '<span class="ch">' + tr('اشتراك الشهر', 'Month subs paid') + ': ' + subs + '/' + mem.length + '</span>' : '<span class="ch">' + tr('آجل', 'Deferred') + ': ' + U.fmt(def) + '</span>') + '</div>' +
    '<div class="srch"><input id="q" class="in big" placeholder="🔎 ' + tr('الكود أو الاسم أو آخر أرقام التليفون ثم Enter', 'Code, name or last phone digits, then Enter') + '" autocomplete="off" value="' + U.esc(App.st.aq || '') + '" oninput="Att.search(this.value)" onkeydown="Att.key(event)">' +
    (App.can('add') ? '<button class="b" onclick="SF.open(null,{gid:' + q(gid) + ',mark:1})">➕ ' + tr('طالب جديد', 'New student') + '</button>' : '') + '</div><div id="res" class="res"></div>' +
    '<div class="ctl">' + U.seg([['0', tr('الكل', 'All')], ['1', tr('بنين', 'Boys')], ['2', tr('بنات', 'Girls')]], String(App.st.gx || 0), 'v=>Att.setGx(+v)') + (closed ? '<button class="b" onclick="Att.reopen()">' + tr('فتح الحصة تاني', 'Reopen session') + '</button>' : '') + '</div>' +
    '<div id="roster"></div>' + bar + (App.can('msgs') ? BK.card(g) : '') + '</div>';
  return h;
};
V.att_after = () => { Att.paintRoster(); const i = document.getElementById('q'); if (i) { i.focus(); if (App.st.aq) Att.search(App.st.aq); } };

// ======================= فورم الطالب =======================
const SF = {
  open(code, opt) {
    opt = opt || {}; SF.opt = opt;
    const T = App.T(), s = code ? Store.student(code) : { name: opt.name || '', gender: 'ذكر', grade: '', phone: '', parentName: '', parentPhone: '', school: '' };
    const e = code && Store.enrollFor(code, T.id), gid = (e && e.g) || opt.gid || '', g = Store.group(gid);
    if (!s.grade && g) s.grade = g.grade;
    U.modal('<h3>' + (code ? tr('تعديل بيانات الطالب ', 'Edit student ') + code : '➕ ' + tr('طالب جديد', 'New student')) + '</h3><form id="sf" onsubmit="event.preventDefault();SF.save(' + (code || 0) + ')">' +
      '<label>' + tr('اسم الطالب (رباعي)', 'Full name') + '</label><input class="in" name="name" required autofocus value="' + U.esc(s.name) + '">' +
      '<div class="row2"><div><label>' + tr('النوع', 'Gender') + '</label><select class="in" name="gender">' + U.opts([['ذكر', tr('ذكر', 'Male')], ['أنثى', tr('أنثى', 'Female')]], s.gender) + '</select></div><div><label>' + tr('الصف', 'Grade') + '</label><select class="in" name="grade">' + U.opts(DB.center.grades, s.grade) + '</select></div></div>' +
      '<div class="row2"><div><label>' + tr('رقم الطالب', 'Student phone') + '</label><input class="in" name="phone" inputmode="tel" dir="ltr" value="' + U.esc(s.phone) + '" onblur="SF.check(this.value,' + (code || 0) + ')"></div><div><label>' + tr('رقم ولي الأمر', 'Parent phone') + '</label><input class="in" name="parentPhone" inputmode="tel" dir="ltr" value="' + U.esc(s.parentPhone) + '"></div></div>' +
      '<div id="dup"></div>' +
      '<div class="row2"><div><label>' + tr('اسم ولي الأمر', 'Parent name') + '</label><input class="in" name="parentName" value="' + U.esc(s.parentName) + '"></div><div><label>' + tr('المدرسة', 'School') + '</label><input class="in" name="school" value="' + U.esc(s.school) + '"></div></div>' +
      '<label>' + tr('المجموعة', 'Group') + '</label><select class="in" name="g">' + U.opts(Store.tGroups(T.id).map(x => [x.id, Store.gLabel(x) + ' — ' + Store.gTime(x)]), gid) + '</select>' +
      (opt.mark ? '<p class="mu small">' + tr('هيتسجل حاضر في الحصة دي على طول بعد الحفظ.', 'Will be marked present right after saving.') + '</p>' : '') +
      '<button class="pri">' + tr('حفظ', 'Save') + '</button></form>');
  },
  check(ph, code) { // الحساب الموحد: لو الرقم موجود نربط بدل ما نكرر
    const s = Store.findByPhone(ph), el = document.getElementById('dup'); if (!el) return;
    el.innerHTML = s && s.code !== code ? '<div class="warn">' + tr('الرقم ده لطالب موجود: ', 'This number belongs to: ') + '<b>' + U.esc(s.name) + '</b> (' + s.code + ')' + (code ? '' : ' <button type="button" class="b g1" onclick="SF.link(' + s.code + ')">' + tr('ضيفه للمجموعة بدل حساب جديد', 'Add to group instead') + '</button>') + '</div>' : '';
  },
  link(code) {
    const f = U.form('sf'); Store.enroll(code, f.g, 0);
    if (SF.opt.mark) Store.markPresent(code, Att.gid(), Att.d());
    U.close(); U.toast(tr('اتضاف للمجموعة ✅', 'Added to group ✅')); App.refresh();
  },
  save(code) {
    const f = U.form('sf');
    if (!f.name) return U.toast(tr('اكتب اسم الطالب', 'Enter the name'), 'bad');
    if (f.phone && U.phone(f.phone).length !== 11) return U.toast(tr('رقم الطالب لازم يكون 11 رقم', 'Phone must be 11 digits'), 'bad');
    if (f.parentPhone && U.phone(f.parentPhone).length !== 11) return U.toast(tr('رقم ولي الأمر لازم يكون 11 رقم', 'Parent phone must be 11 digits'), 'bad');
    if (!f.g) return U.toast(tr('اختار مجموعة', 'Choose a group'), 'bad');
    if (code) { Store.updateStudent(code, f); Store.enroll(code, f.g); U.toast(tr('اتحفظ ✅', 'Saved ✅')); }
    else {
      const s = Store.addStudent(f); Store.enroll(s.code, f.g, 0);
      if (SF.opt.mark) Store.markPresent(s.code, Att.gid(), Att.d());
      U.toast(tr('اتسجل الطالب بكود ', 'Registered with code ') + s.code + ' ✅'); App.st.aq = '';
    }
    U.close(); App.refresh();
  },
};

// ======================= ملف الطالب (مودال المشروع القديم + الإجراءات الجديدة) =======================
const Prof = {
  open(code) {
    App.st.pm = { code, tab: 's', mode: 'report', grades: true, edited: { p: null, s: null }, note: { p: '', s: '' }, ds: '' };
    U.modal('<div id="pmb"></div>', { wide: true }); Prof.paint();
  },
  set(k, v) { const m = App.st.pm; m[k] = v; if (k === 'mode' || k === 'grades') m.edited = { p: null, s: null }; Prof.paint(); },
  c() { const m = App.st.pm, T = App.T(), e = Store.enrollFor(m.code, T.id); return { mode: m.mode, grades: m.grades, edited: m.edited, note: m.note, g: e && e.g, d: Att.d() }; },
  pv() { const m = App.st.pm, el = document.getElementById('pv'); if (el) el.textContent = Msg.compose(m.code, App.tid(), m.tab, Prof.c()); },
  dtl(k) { // التفاصيل اللي بتفتح تحت كل سطر
    const m = App.st.pm, T = App.T(), code = m.code, row = (a, b, c) => '<div class="l"><span>' + a + '</span><i class="tag ' + c + '">' + b + '</i></div>';
    if (k === 'a') { const A = Store.stAtt(code, T.id).slice().sort((x, y) => y.d.localeCompare(x.d)), ab = A.filter(x => x.st === 'a').length; return '<b>' + tr('حاضر', 'Present') + ': ' + (A.length - ab) + ' · ' + tr('غائب', 'Absent') + ': ' + ab + '</b>' + A.map(x => row(U.dayLabel(x.d) + ' ' + U.short(x.d) + (x.mk ? ' · ' + tr('تعويض', 'make-up') : ''), x.st === 'p' ? tr('حضر', 'Present') : tr('غاب', 'Absent'), x.st === 'p' ? 'ok' : 'bad')).join(''); }
    if (k === 'q') { const S = Store.scoresOf(code, T.id).reverse(); return S.map(x => row(U.esc(x.a.title), x.v + '/' + x.a.max, Store.level(x.v / x.a.max * 100)[1])).join('') || U.empty(); }
    if (k === 'p') {
      const ms = []; for (let i = 0; i < 6; i++) { const dd = new Date(); dd.setDate(1); dd.setMonth(dd.getMonth() - i); const key = U.dkey(dd).slice(0, 7); ms.push([dd.toLocaleDateString(I18N.lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' }), Store.sub(code, T.id, key)]); }
      const ps = Store.stAtt(code, T.id).filter(x => x.st === 'p' && x.fee > 0).sort((x, y) => y.d.localeCompare(x.d));
      return '<b>' + tr('شهري', 'Monthly') + '</b>' + ms.map(x => row(x[0], x[1] ? tr('مدفوع', 'Paid') : tr('غير مدفوع', 'Unpaid'), x[1] ? 'ok' : 'mu')).join('') +
        '<b>' + tr('بالحصة', 'Per session') + '</b>' + (ps.map(x => row(U.short(x.d), x.paid >= x.fee ? tr('دفع', 'Paid') : tr('آجل', 'Deferred'), x.paid >= x.fee ? 'ok' : 'wa')).join('') || U.empty());
    }
    return '';
  },
  paint() {
    const m = App.st.pm, T = App.T(), code = m.code, s = Store.student(code), el = document.getElementById('pmb'); if (!el) return;
    const e = Store.enrollFor(code, T.id) || Store.enrollsOf(code, true).find(x => Store.group(x.g) && Store.group(x.g).teacherId === T.id);
    const g = e && Store.group(e.g), out = e && e.st === 'out', c = Store.cat(code, T.id), db = Store.debt(code, T.id), lq = Store.lastQuizzes(code, T.id, 5);
    const others = Store.enrollsOf(code).map(x => Store.group(x.g)).filter(x => x && x.teacherId !== T.id).map(x => Store.teacher(x.teacherId).subject);
    const lk = (k, lb, v) => '<div class="l lnk" onclick="Prof.set(\'ds\',App.st.pm.ds===\'' + k + '\'?\'\':\'' + k + '\')"><span>' + lb + ' ▾</span><b>' + v + '</b></div>' + (m.ds === k ? '<div class="dt">' + Prof.dtl(k) + '</div>' : '');
    const pt = g ? Store.payText(Store.payState(code, g.id, Att.d())) : '—';
    let body = m.tab === 's'
      ? '<div class="l"><span>' + tr('الكود', 'Code') + '</span><b>' + s.code + '</b></div><div class="l"><span>' + tr('المستوى', 'Level') + '</span><span class="tag" style="background:' + catColor(c) + '">' + catName(c) + '</span></div>' +
      lk('a', tr('نسبة الحضور', 'Attendance rate'), (Store.attRate(code, T.id) ?? '—') + '%') + lk('q', tr('متوسط الدرجات', 'Average score'), (Store.avg(code, T.id) ?? '—') + '%') + lk('p', tr('حالة الدفع', 'Payment'), pt) +
      (db ? '<div class="l"><span class="mu">' + tr('عليه (آجل)', 'Owes (deferred)') + '</span><span>' + U.money(db) + ' <button class="lnk" onclick="Prof.pay(' + code + ')">' + tr('سدّد', 'Settle') + '</button></span></div>' : '') +
      (others.length ? '<div class="l"><span>' + tr('بياخد كمان', 'Also takes') + '</span><b>' + U.esc(others.join('، ')) + '</b></div>' : '') +
      '<h4>' + tr('درجات آخر 5 كويزات', 'Last 5 quiz scores') + '</h4><div class="bars sm">' + (lq.map((x, i) => '<div><i style="height:' + (x.v / x.a.max * 80) + 'px;animation-delay:' + i * 90 + 'ms"></i><span>' + x.v + '</span></div>').join('') || U.empty()) + '</div>'
      : '<div class="l"><span>' + tr('ولي الأمر', 'Parent') + '</span><b>' + U.esc(s.parentName || '—') + '</b></div><div class="l"><span>' + tr('رقم ولي الأمر', 'Parent phone') + '</span><b dir="ltr">' + (s.parentPhone || '—') + '</b></div><div class="l"><span>' + tr('الطالب', 'Student') + '</span><b>' + U.esc(s.name) + '</b></div><div class="l"><span>' + tr('رقم الطالب', 'Student phone') + '</span><b dir="ltr">' + (s.phone || '—') + '</b></div>';
    const modes = [['report', tr('التقرير فقط', 'Report only')], ['both', tr('التقرير + رسالتي', 'Report + my note')], ['lvl', tr('رسالة المستوى', 'Level message')], ['custom', tr('رسالتي فقط', 'My note only')]];
    const r = m.tab, base = m.edited[r] != null ? m.edited[r] : (m.mode === 'lvl' ? Msg.level(code, T.id, r) : Msg.report(code, T.id, { to: r, g: e && e.g, d: Att.d(), grades: m.grades }));
    const txt = Msg.compose(code, T.id, r, Prof.c()), ph = r === 's' ? s.phone : s.parentPhone;
    const both = Msg.targets(s, 'b').map(([k, l, p]) => Msg.link(code, k, l, p, Msg.compose(code, T.id, k, Prof.c()), m.mode)).join('');
    el.innerHTML = '<h3>' + U.esc(s.name) + ' <small class="mu">' + s.code + ' · ' + U.esc(Store.gLabel(g)) + '</small> ' + (out ? '<i class="tag bad">' + tr('منسحب', 'Withdrawn') + '</i>' : '') + '</h3>' +
      U.seg([['s', '👤 ' + tr('الطالب', 'Student')], ['p', '👪 ' + tr('ولي الأمر', 'Parent')]], m.tab, "v=>Prof.set('tab',v)") + body +
      '<div class="ctl wrap" style="margin:12px 0">' + (App.can('add') ? '<button class="b" onclick="SF.open(' + code + ')">✏️ ' + tr('تعديل / نقل', 'Edit / move') + '</button>' : '') +
      (App.can('add') ? (out ? '<button class="b g1" onclick="Prof.back(' + code + ')">↩ ' + tr('رجوع للمجموعة', 'Re-enroll') + '</button>' : '<button class="b o1" onclick="Prof.out(' + code + ')">🚪 ' + tr('انسحاب', 'Withdraw') + '</button>') : '') +
      (App.can('del') ? '<button class="b r1" onclick="Prof.del(' + code + ')">🗑️ ' + tr('حذف', 'Delete') + '</button>' : '') + '</div>' +
      (App.can('msgs') || true ? '<h3>✉️ ' + tr('رسالة لـ', 'Message to ') + (r === 's' ? tr('الطالب', 'student') : tr('ولي الأمر', 'parent')) + '</h3><div class="tb">' +
        U.segL(tr('الدرجات', 'Grades'), [['1', tr('مع الدرجات', 'With grades')], ['0', tr('بدون درجات', 'No grades')]], m.grades ? '1' : '0', "v=>Prof.set('grades',v==='1')") +
        U.segL(tr('نوع الرسالة', 'Message type'), modes, m.mode, "v=>Prof.set('mode',v)") + '</div>' +
        '<div class="card flat">' + (m.mode !== 'custom' ? '<label>' + tr('عدّل التقرير (اختياري)', 'Edit the report (optional)') + '</label><textarea class="in" rows="6" oninput="App.st.pm.edited[\'' + r + '\']=this.value;Prof.pv()">' + U.esc(base) + '</textarea>' : '') +
        (m.mode === 'both' || m.mode === 'custom' ? '<label>' + tr('رسالتك', 'Your message') + '</label><textarea class="in" rows="3" placeholder="' + tr('اكتب رسالتك هنا...', 'Write your message...') + '" oninput="App.st.pm.note[\'' + r + '\']=this.value;Prof.pv()">' + U.esc(m.note[r]) + '</textarea>' : '') +
        '<div class="msg" id="pv">' + U.esc(txt) + '</div></div>' +
        '<div class="ctl wrap">' + (ph ? '<a class="pri a" target="_blank" rel="noopener" href="' + U.wa(ph, txt) + '" onclick="Msg.sent(this,' + code + ',\'' + m.mode + '\',\'' + r + '\')">📲 ' + tr('إرسال (واتساب)', 'Send (WhatsApp)') + '</a>' : '<span class="mu">' + tr('مفيش رقم', 'No number') + '</span>') + '</div>' +
        '<h4>📲 ' + tr('إرسال للولي والطالب معاً', 'Send to parent & student') + '</h4><div class="ctl">' + both + '</div>' : '');
  },
  pay(code) {
    const T = App.T(), db = Store.debt(code, T.id);
    if (!db) return U.toast(tr('مفيش عليه فلوس ✅', 'Nothing owed ✅'));
    U.modal('<h3>' + tr('تسديد — ', 'Settle — ') + U.esc(Store.student(code).name) + '</h3><p>' + tr('عليه ', 'Owes ') + '<b>' + U.money(db) + '</b></p><form id="pf" onsubmit="event.preventDefault();Prof.doPay(' + code + ')"><label>' + tr('المبلغ', 'Amount') + '</label><input class="in" name="amt" type="number" min="1" max="' + db + '" value="' + db + '" autofocus>' +
      (App.isAsst() ? '' : '<label class="chk"><input type="checkbox" name="waive"> ' + tr('إعفاء (يتشال من غير ما يتحسب إيراد)', 'Waive (not counted as revenue)') + '</label>') + '<button class="pri">' + tr('تأكيد', 'Confirm') + '</button></form>');
  },
  doPay(code) { const f = U.form('pf'), a = +f.amt; if (!(a > 0)) return; Store.pay(code, App.tid(), a, f.waive, f.waive ? 'إعفاء' : 'تسديد'); U.close(); U.toast(tr('اتسجل ✅', 'Recorded ✅')); App.refresh(); },
  out(code) { Store.withdraw(code, App.tid()); U.close(); U.toast(tr('اتسجل انسحاب — بياناته القديمة محفوظة', 'Withdrawn — history kept')); App.refresh(); },
  back(code) { Store.enrollsOf(code, true).forEach(e => { if (Store.group(e.g).teacherId === App.tid()) e.st = 'on'; }); U.close(); App.refresh(); },
  del(code) {
    U.modal('<h3>' + tr('حذف نهائي؟', 'Delete permanently?') + '</h3><p>' + tr('هيتمسح ', 'This removes ') + '<b>' + U.esc(Store.student(code).name) + '</b>' + tr(' وكل حضوره ودرجاته وفلوسه مع المدرس ده. استخدم ده بس لو اتسجل غلط — غير كده استخدم "انسحاب".', ' and all attendance, grades and payments with this teacher. Use only for mistakes — otherwise use "Withdraw".') + '</p><button class="pri danger" onclick="Store.removeFromTeacher(' + code + ',' + q(App.tid()) + ');U.close();App.refresh();U.toast(\'' + tr('اتحذف', 'Deleted') + '\')">' + tr('أيوه احذف', 'Yes, delete') + '</button>');
  },
};

// ======================= الطلاب (كل الطلاب — جدول المشروع القديم + إضافة/حذف/نقل) =======================
V.students = () => {
  const T = App.T(), st = App.st, fg = st.sg || '', fs = st.ss || 'on', qq = (st.sq || '').trim(), today = U.today();
  let list = Store.tStudents(T.id, true).filter(x => (fs === 'out' ? x.e.st === 'out' : x.e.st !== 'out') && (!fg || x.g.id === fg) && (!qq || Att.match(x.s, qq)));
  list.sort((a, b) => a.g.id.localeCompare(b.g.id) || (Store.avg(b.s.code, T.id) || 0) - (Store.avg(a.s.code, T.id) || 0));
  const n = st.sn || 60;
  return '<div class="card"><div class="ctl wrap"><input class="in grow" placeholder="🔎 ' + tr('بحث بالاسم أو الكود أو الرقم', 'Search by name, code or phone') + '" value="' + U.esc(qq) + '" oninput="V.stQ(this.value)">' +
    '<select class="in" onchange="App.st.sg=this.value;App.render()"><option value="">' + tr('كل المجموعات', 'All groups') + '</option>' + U.opts(Store.tGroups(T.id).map(g => [g.id, Store.gLabel(g)]), fg) + '</select>' +
    U.seg([['on', tr('نشط', 'Active')], ['out', tr('منسحب', 'Withdrawn')]], fs, 'V.stSt') + (App.can('add') ? '<button class="b g1" onclick="SF.open(null,{gid:' + q(fg) + '})">➕ ' + tr('طالب جديد', 'New student') + '</button>' : '') + '</div>' +
    '<p class="mu">' + list.length + ' ' + tr('طالب', 'students') + '</p><div class="tw"><table class="tbl"><tr><th>' + tr('الكود', 'Code') + '</th><th>' + tr('الطالب', 'Student') + '</th><th>' + tr('المجموعة', 'Group') + '</th><th>' + tr('نسبة الحضور', 'Attendance') + '</th><th>' + tr('الغياب', 'Absences') + '</th><th>' + tr('المتوسط', 'Average') + '</th><th>' + tr('الدفع', 'Payment') + '</th><th>' + tr('المستوى', 'Level') + '</th></tr>' +
    list.slice(0, n).map(x => { const c = Store.cat(x.s.code, T.id), ps = Store.payState(x.s.code, x.g.id, today); return '<tr onclick="Prof.open(' + x.s.code + ')"><td>' + x.s.code + '</td><td><b>' + U.esc(x.s.name) + '</b></td><td>' + U.esc(Store.gLabel(x.g)) + '</td><td>' + (Store.attRate(x.s.code, T.id) ?? '—') + '%</td><td>' + Store.absences(x.s.code, T.id) + '</td><td>' + (Store.avg(x.s.code, T.id) ?? '—') + '%</td><td>' + (ps === 'mp' || ps === 'paid' ? '✅' : ps === 'df' ? '⏳' : ps === 'up' ? '❌' : '—') + '</td><td><span class="tag" style="background:' + catColor(c) + '">' + catName(c) + '</span></td></tr>'; }).join('') + '</table></div>' +
    (list.length > n ? '<button class="b wide" onclick="App.st.sn=' + (n + 100) + ';App.render()">' + tr('عرض المزيد', 'Show more') + ' (' + (list.length - n) + ')</button>' : '') + '</div>';
};
V.stSt = v => { App.st.ss = v; App.render(); };
V.stQ = v => { App.st.sq = v; App.st.sn = 60; App.render(); const e = document.querySelector('.grow'); e.focus(); e.setSelectionRange(v.length, v.length); };

// ======================= المجموعات =======================
const GF = {
  open(id) {
    const g = id ? Store.group(id) : { grade: DB.center.grades[0], name: tr('مجموعة ', 'Group '), day1: 'السبت', day2: '', time: '4:00 م', room: '', price: 60, monthPrice: 220, payMode: 'session', gender: 'مختلط', qz: true, ex: false };
    U.modal('<h3>' + (id ? tr('تعديل ', 'Edit ') + U.esc(Store.gLabel(g)) : '➕ ' + tr('مجموعة جديدة', 'New group')) + '</h3><form id="gf" onsubmit="event.preventDefault();GF.save(' + (id ? q(id) : 'null') + ')">' +
      '<div class="row2"><div><label>' + tr('الصف', 'Grade') + '</label><select class="in" name="grade">' + U.opts(DB.center.grades, g.grade) + '</select></div><div><label>' + tr('اسم المجموعة', 'Group name') + '</label><input class="in" name="name" required value="' + U.esc(g.name) + '"></div></div>' +
      '<div class="row3"><div><label>' + tr('اليوم', 'Day') + '</label><select class="in" name="day1">' + U.opts(U.WEEK, g.day1) + '</select></div><div><label>' + tr('يوم تاني', 'Second day') + '</label><select class="in" name="day2"><option value="">—</option>' + U.opts(U.WEEK, g.day2) + '</select></div><div><label>' + tr('الساعة', 'Time') + '</label><input class="in" name="time" value="' + U.esc(g.time) + '" placeholder="4:00 م"></div></div>' +
      '<div class="row3"><div><label>' + tr('نظام الدفع', 'Payment mode') + '</label><select class="in" name="payMode">' + U.opts([['session', tr('بالحصة', 'Per session')], ['month', tr('شهري', 'Monthly')]], g.payMode) + '</select></div><div><label>' + tr('سعر الحصة', 'Session price') + '</label><input class="in" name="price" type="number" min="0" value="' + g.price + '"></div><div><label>' + tr('الاشتراك الشهري', 'Monthly fee') + '</label><input class="in" name="monthPrice" type="number" min="0" value="' + (g.monthPrice || 0) + '"></div></div>' +
      '<div class="row3"><div><label>' + tr('القاعة', 'Room') + '</label><select class="in" name="room"><option value="">—</option>' + U.opts(DB.rooms.map(r => r.name), g.room) + '</select></div><div><label>' + tr('بنين / بنات', 'Boys / girls') + '</label><select class="in" name="gender">' + U.opts([['مختلط', tr('مختلط', 'Mixed')], ['بنين', tr('بنين', 'Boys')], ['بنات', tr('بنات', 'Girls')]], g.gender) + '</select></div>' +
      '<div><label class="chk"><input type="checkbox" name="qz" ' + (g.qz ? 'checked' : '') + '> ' + tr('فيه كويز', 'Has quiz') + '</label><label class="chk"><input type="checkbox" name="ex" ' + (g.ex ? 'checked' : '') + '> ' + tr('فيه امتحان', 'Has exam') + '</label></div></div>' +
      '<div id="cf"></div><button class="pri">' + tr('حفظ', 'Save') + '</button></form>');
  },
  save(id) {
    const f = U.form('gf'), T = App.T();
    const g = Object.assign({ id: id || Store.nextGroupId(), teacherId: T.id, active: true }, id ? Store.group(id) : {}, f, { price: +f.price || 0, monthPrice: +f.monthPrice || 0 });
    const c = Store.conflicts(g);
    if (c.length) { document.getElementById('cf').innerHTML = '<div class="warn">' + tr('القاعة دي محجوزة في نفس الوقت لـ: ', 'Room is booked at that time by: ') + c.map(x => U.esc(Store.teacher(x.teacherId).name + ' (' + Store.gLabel(x) + ' ' + x.time + ')')).join('، ') + '</div>'; return; }
    if (id) Object.assign(Store.group(id), g); else DB.groups.push(g);
    U.close(); U.toast(tr('اتحفظت ✅', 'Saved ✅')); App.refresh();
  },
  toggle(id) { const g = Store.group(id); g.active = g.active === false; App.refresh(); },
};
V.groups = () => {
  const T = App.T(), all = Store.tGroups(T.id, true), ro = App.isAsst();
  return (ro ? '' : '<div class="ctl"><button class="b g1" onclick="GF.open()">➕ ' + tr('مجموعة جديدة', 'New group') + '</button></div>') + '<div class="g3">' + all.map(g => {
    const n = Store.members(g.id).length, room = DB.rooms.find(r => r.name === g.room);
    return '<div class="card' + (g.active === false ? ' dim' : '') + '"><h3>' + U.esc(Store.gLabel(g)) + ' <small class="mu">' + g.id + '</small></h3>' +
      '<div class="l"><span>' + tr('الميعاد', 'Schedule') + '</span><b>' + U.esc(Store.gTime(g)) + '</b></div><div class="l"><span>' + tr('القاعة', 'Room') + '</span><b>' + U.esc(g.room || '—') + (room ? ' (' + n + '/' + room.cap + ')' : '') + '</b></div>' +
      '<div class="l"><span>' + tr('الطلاب', 'Students') + '</span><b>' + n + '</b></div><div class="l"><span>' + tr('الدفع', 'Payment') + '</span><b>' + (g.payMode === 'month' ? tr('شهري ', 'Monthly ') + U.money(g.monthPrice) : tr('بالحصة ', 'Per session ') + U.money(g.price)) + '</b></div>' +
      '<div class="l"><span>' + tr('كويز · امتحان', 'Quiz · exam') + '</span><b>' + (g.qz ? '✅' : '—') + ' · ' + (g.ex ? '✅' : '—') + '</b></div>' +
      '<div class="ctl"><button class="b" onclick="App.st.ag=' + q(g.id) + ';location.hash=\'att\'">✅ ' + tr('تسجيل', 'Register') + '</button><button class="b" onclick="App.st.sg=' + q(g.id) + ';location.hash=\'students\'">👥</button>' +
      (ro ? '' : '<button class="b" onclick="GF.open(' + q(g.id) + ')">✏️</button><button class="b" onclick="GF.toggle(' + q(g.id) + ')">' + (g.active === false ? tr('تفعيل', 'Enable') : tr('قفل', 'Close')) + '</button>') + '</div></div>';
  }).join('') + '</div>' + (all.length ? '' : U.empty(tr('مفيش مجموعات لسه', 'No groups yet')));
};

// ======================= الدرجات =======================
const GR = {
  add() {
    const f = U.form('af'), g = Store.group(App.st.grg);
    if (f.type === 'custom' && !f.title) return U.toast(tr('اكتب اسم التقييم', 'Name the assessment'), 'bad');
    const a = Store.addAssess({ t: g.teacherId, g: g.id, type: f.type, title: f.title || assessName(f.type) + ' ' + U.short(f.d || U.today()), max: +f.max || 20, d: f.d || U.today(), pub: true });
    App.st.ga = a.id; App.refresh();
  },
  pub(id) { const a = DB.assess.find(x => x.id === id); a.pub = !a.pub; App.refresh(); },
  del(id) { Store.delAssess(id); App.st.ga = null; App.refresh(); },
};
V.grades = () => {
  const T = App.T(), gs = Store.tGroups(T.id); if (!gs.length) return U.empty();
  const gid = App.st.grg && Store.group(App.st.grg) ? App.st.grg : (App.st.grg = gs[0].id), list = DB.assess.filter(a => a.g === gid).sort((a, b) => b.d.localeCompare(a.d) || b.id - a.id), mem = Store.members(gid);
  const cur = list.find(a => a.id === App.st.ga);
  let h = '<div class="card"><div class="ctl wrap"><select class="in" onchange="App.st.grg=this.value;App.st.ga=null;App.render()">' + U.opts(gs.map(g => [g.id, Store.gLabel(g)]), gid) + '</select></div>' +
    '<form id="af" class="ctl wrap" onsubmit="event.preventDefault();GR.add()"><select class="in" name="type">' + U.opts([['quiz', assessName('quiz')], ['exam', assessName('exam')], ['hw', assessName('hw')], ['custom', tr('نوع تاني...', 'Other...')]], 'quiz') + '</select>' +
    '<input class="in" name="title" placeholder="' + tr('الاسم (اختياري)', 'Name (optional)') + '"><input class="in sm" name="max" type="number" min="1" value="20" title="' + tr('الدرجة النهائية', 'Max score') + '"><input class="in" name="d" type="date" value="' + U.today() + '"><button class="b g1">➕ ' + tr('تقييم جديد', 'New assessment') + '</button></form></div>';
  if (cur) {
    const S = DB.scores[cur.id] || {};
    h += '<div class="card"><h3>' + U.esc(cur.title) + ' <small class="mu">/' + cur.max + ' · ' + U.short(cur.d) + '</small></h3><div class="ctl"><button class="b" onclick="App.st.ga=null;App.render()">↩</button><button class="b ' + (cur.pub ? 'g1' : '') + '" onclick="GR.pub(' + cur.id + ')">' + (cur.pub ? '👁️ ' + tr('ظاهر للطلاب', 'Visible to students') : '🙈 ' + tr('مخفي عن الطلاب', 'Hidden from students')) + '</button><button class="b r1" onclick="GR.del(' + cur.id + ')">🗑️</button></div>' +
      mem.sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(s => '<div class="ar"><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + s.code + '</small></div><span class="qw"><input class="qi" type="number" min="0" max="' + cur.max + '" value="' + (S[s.code] ?? '') + '" placeholder="—" onchange="Store.setScore(' + cur.id + ',' + s.code + ',this.value);Store.save()"><em>/' + cur.max + '</em></span></div>').join('') + '</div>';
  } else {
    h += '<div class="card"><h3>' + tr('التقييمات', 'Assessments') + ' (' + list.length + ')</h3>' + (list.map(a => {
      const v = Object.values(DB.scores[a.id] || {}), av = v.length ? Math.round(v.reduce((x, y) => x + y, 0) / v.length / a.max * 100) : null;
      return '<div class="ar lnk" onclick="App.st.ga=' + a.id + ';App.render()"><div class="nm"><b>' + U.esc(a.title) + '</b><small>' + assessName(a.type) + ' · ' + U.short(a.d) + ' · /' + a.max + '</small></div><div class="ctl"><span class="ch">' + v.length + '</span>' + (av !== null ? '<i class="tag ' + Store.level(av)[1] + '">' + av + '%</i>' : '') + (a.pub ? '' : '<i class="tag mu">' + tr('مخفي', 'Hidden') + '</i>') + '</div></div>';
    }).join('') || U.empty()) + '</div>';
  }
  return h;
};

// ======================= الرسايل: رسالة من المدرس + إرسال حسب الفئة (زي القديم) =======================
const TM = { // كارت "رسالة من المدرس"
  st() { return App.st.tm = App.st.tm || { name: App.T().name, to: 'p', tx: '' }; },
  card(codes) {
    const t = TM.st();
    return '<div class="card"><h3>✉️ ' + tr('رسالة من المدرس', 'Message from teacher') + '</h3><div class="tb"><div class="sgw"><label>' + tr('اسم المدرس', 'Teacher name') + '</label><input class="in" value="' + U.esc(t.name) + '" oninput="TM.st().name=this.value;TM.pv()"></div>' +
      U.segL(tr('إرسال إلى', 'Send to'), [['p', tr('ولي الأمر', 'Parent')], ['s', tr('الطالب', 'Student')], ['b', tr('الاتنين', 'Both')]], t.to, "v=>{TM.st().to=v;App.render()}") + '</div>' +
      '<textarea class="in" rows="3" placeholder="' + tr('اكتب رسالتك هنا...', 'Write your message...') + '" oninput="TM.st().tx=this.value;TM.pv()">' + U.esc(t.tx) + '</textarea><div class="msg" id="tpv">' + U.esc(Msg.teacher(t.name, t.tx)) + '</div>' +
      '<button class="pri" onclick="TM.send()">' + tr('إرسال', 'Send') + ' (' + codes.length + ' ' + tr('طالب', 'students') + ')</button></div>';
  },
  pv() { const t = TM.st(), e = document.getElementById('tpv'); if (e) e.textContent = Msg.teacher(t.name, t.tx); },
  send() {
    const t = TM.st(); if (!t.tx.trim() || !t.name.trim()) return U.toast(tr('اكتب اسم المدرس والرسالة', 'Enter teacher name and message'), 'bad');
    Msg.bulk(tr('رسالة من المدرس', 'Message from teacher'), TM.codes || [], App.tid(), t.to, () => Msg.teacher(t.name, t.tx.trim()), 'teacher', Msg.teacher(t.name, t.tx.trim()));
  },
};
const BX = { // "إرسال للكل" حسب الفئة: متفوقين / تحسن / تراجع / ضعاف
  st(gid) { App.st.bx = App.st.bx || {}; return App.st.bx[gid] = App.st.bx[gid] || { seg: 'all', rc: 'b', ty: 'fix', tx: '' }; },
  list(gid, seg) {
    const T = App.T(), today = U.today(), mem = gid === '*' ? Store.tStudents(T.id).map(x => x.s) : Store.members(gid);
    if (seg === 'abs') return mem.filter(s => Store.stAtt(s.code, T.id).some(a => a.d === today && a.st === 'a'));
    if (seg === 'df') return mem.filter(s => Store.debt(s.code, T.id) > 0);
    return mem.filter(s => seg === 'all' || Store.cat(s.code, T.id) === seg);
  },
  card(gid) {
    const b = BX.st(gid), T = App.T(), n = BX.list(gid, b.seg).length, ph = tr('اسم الطالب', 'student name');
    const segs = CATS.map(([k, f]) => [k, f()]).concat([['abs', tr('❌ غابوا النهارده', '❌ Absent today')]]).concat(T.notif.debt ? [['df', tr('⏳ عليهم آجل', '⏳ Deferred')]] : []);
    const types = [['fix', tr('رسالة ثابتة', 'Fixed message')], ['new', tr('رسالة جديدة', 'New message')], ['monthly', tr('تقرير شهري', 'Monthly report')]];
    const fixed = r => (TT[I18N.lang][b.seg] || TT[I18N.lang].all)[r === 's' ? 0 : 1].replace('{n}', ph) + '\n\n' + Msg.sig();
    const pr = b.ty === 'fix' ? '<div class="msg">' + U.esc(b.rc === 'b' ? tr('الطالب', 'Student') + ':\n' + fixed('s') + '\n\n' + tr('ولي الأمر', 'Parent') + ':\n' + fixed('p') : fixed(b.rc)) + '</div>'
      : b.ty === 'new' ? '<textarea class="in" rows="3" placeholder="' + tr('اكتب رسالتك هنا...', 'Write your message...') + '" oninput="BX.st(' + q(gid) + ').tx=this.value">' + U.esc(b.tx) + '</textarea>' : '';
    return '<div class="card flat"><h3>📣 ' + tr('إرسال للكل', 'Send to all') + ' · ' + n + ' ' + tr('طالب', 'students') + '</h3><div class="tb">' +
      U.segL(tr('الفئة', 'Segment'), segs, b.seg, "v=>{BX.st(" + q(gid) + ").seg=v;App.render()}") +
      U.segL(tr('إرسال إلى', 'Send to'), [['p', tr('ولي الأمر', 'Parent')], ['s', tr('الطالب', 'Student')], ['b', tr('الاتنين', 'Both')]], b.rc, "v=>{BX.st(" + q(gid) + ").rc=v;App.render()}") +
      U.segL(tr('نوع الرسالة', 'Message type'), types, b.ty, "v=>{BX.st(" + q(gid) + ").ty=v;App.render()}") + '</div>' + pr +
      '<button class="pri" onclick="BX.send(' + q(gid) + ')">' + tr('إرسال', 'Send') + ' (' + n + ')</button></div>';
  },
  send(gid) {
    const b = BX.st(gid), T = App.T(), codes = BX.list(gid, b.seg).map(s => s.code);
    if (b.ty === 'new' && !b.tx.trim()) return U.toast(tr('اكتب الرسالة', 'Write the message'), 'bad');
    const f = (c, k) => b.ty === 'new' ? Msg.custom(c, b.tx.trim(), k) : b.ty === 'monthly' ? Msg.monthly(c, T.id, { to: k }) : Msg.level(c, T.id, k, b.seg === 'all' || b.seg === 'abs' || b.seg === 'df' ? 'all' : b.seg);
    Msg.bulk(gid === '*' ? tr('كل الطلاب', 'All students') : Store.gLabel(Store.group(gid)), codes, T.id, b.rc, f, b.ty);
  },
};
V.msgs = () => {
  const T = App.T(), gid = App.st.mg || '*';
  TM.codes = (gid === '*' ? Store.tStudents(T.id).map(x => x.s) : Store.members(gid)).map(s => s.code);
  return '<div class="card">' + Msg.banner(T) + '<div class="ctl wrap"><label>' + tr('المجموعة', 'Group') + '</label><select class="in" onchange="App.st.mg=this.value;App.render()"><option value="*">' + tr('كل المجموعات', 'All groups') + '</option>' + U.opts(Store.tGroups(T.id).map(g => [g.id, Store.gLabel(g)]), gid) + '</select></div></div>' +
    TM.card(TM.codes) + BX.card(gid);
};

// ======================= لوحة المدرس (لوحة المشروع القديم + حق السنتر حسب الاتفاق) =======================
V.dash = () => {
  const T = App.T(), st = App.st, grades = Store.tGrades(T.id), f = grades.includes(st.df) ? st.df : (st.df = grades[0]), fg = st.dfg || '';
  const gl = Store.tGroups(T.id).filter(g => g.grade === f && (!fg || g.id === fg)), p = st.dp || 'day', r = U.range(p), today = U.today();
  const rev = Store.revenue(T.id, r), sh = Store.share(T, r), ap = Store.asstPay(T, r), def = Store.deferred(T.id, r);
  const SS = gl.flatMap(g => Store.members(g.id)), lv = [0, 0, 0];
  SS.forEach(s => { const v = Store.avg(s.code, T.id); if (v === null) return; lv[v >= 75 ? 0 : v >= 50 ? 1 : 2]++; });
  const tAtt = gl.flatMap(g => Store.sessAtt(g.id, today)), pr = tAtt.filter(a => a.st === 'p').length, ab = tAtt.filter(a => a.st === 'a').length;
  const days = []; for (let i = 13; i >= 0; i--) days.push(U.addDays(today, -i));
  const gs = gl.map(g => { const m = Store.members(g.id), av = m.map(s => Store.avg(s.code, T.id)).filter(x => x !== null); return { g, t: Store.groupRevenue(g.id, r), av: av.length ? av.reduce((a, b) => a + b, 0) / av.length : 0 }; });
  const mx = Math.max(1, ...gs.map(x => x.t));
  TM.codes = SS.map(s => s.code);
  const lst = (tt, c, arr, fn) => '<div class="card"><h3>' + tt + '</h3>' + (arr.length ? arr.map(s => '<div class="l lnk" onclick="Prof.open(' + s.code + ')"><span>' + U.esc(s.name) + '</span><span class="tag" style="background:' + c + '">' + fn(s) + '</span></div>').join('') : U.empty()) + '</div>';
  let h = '<div class="tabs2">' + grades.map(gr => '<button class="' + (gr === f ? 'on' : '') + '" onclick="App.st.df=' + q(gr) + ';App.st.dfg=\'\';App.render()">' + U.esc(gr) + '</button>').join('') + '</div>' +
    '<div class="ctl wrap"><div class="sg">' + '<button class="' + (fg ? '' : 'on') + '" onclick="App.st.dfg=\'\';App.render()">' + tr('كل المجموعات (كل مجموعة لوحدها)', 'All groups (each separate)') + '</button>' + Store.tGroups(T.id).filter(g => g.grade === f).map(g => '<button class="' + (fg === g.id ? 'on' : '') + '" onclick="App.st.dfg=' + q(g.id) + ';App.render()">' + U.esc(g.name) + '</button>').join('') + '</div>' +
    '<button class="b g1" onclick="App.st.tc=!App.st.tc;App.render()">✉️ ' + tr('رسالة من المدرس', 'Message from teacher') + '</button>' + U.seg([['day', tr('النهارده', 'Today')], ['week', tr('آخر 7 أيام', 'Last 7 days')], ['month', tr('الشهر ده', 'This month')]], p, 'v=>{App.st.dp=v;App.render()}') + '</div>' +
    (st.tc ? TM.card(TM.codes) : '');
  h += '<div class="kpis"><div class="k c1"><span>' + tr('الإيراد', 'Revenue') + '</span><b>' + U.money(rev) + '</b></div><div class="k c4"><span>' + tr('حق السنتر', 'Center share') + ' <small>(' + U.esc(Store.agText(T)) + ')</small></span><b>' + U.money(sh) + '</b></div>' +
    '<div class="k c3"><span>' + tr('أجر الأسيستنت', 'Assistant pay') + '</span><b>' + U.money(ap) + '</b></div><div class="k c2"><span>' + tr('صافي المدرس', 'Teacher net') + '</span><b>' + U.money(rev - sh - ap) + '</b></div>' +
    '<div class="k c5"><span>' + tr('آجل لم يُحصَّل', 'Deferred (uncollected)') + '</span><b>' + U.money(def) + '</b></div></div>';
  h += '<div class="g2"><div class="card"><h3>' + tr('الإيراد آخر 14 يوم', 'Revenue, last 14 days') + '</h3>' + U.line(days.map(d => gl.reduce((a, g) => a + Store.groupRevenue(g.id, [d, d]), 0)), days.map(U.short)) + '</div>' +
    '<div class="card"><h3>' + tr('الإيراد لكل مجموعة', 'Revenue by group') + '</h3>' + U.bars(gs.map(x => x.t), gs.map(x => U.esc(x.g.name.replace('مجموعة ', '')))) + '</div>' +
    '<div class="card"><h3>' + tr('مستوى الطلاب', 'Student levels') + ' (' + SS.length + ')</h3>' + U.donut([[lv[0], '#10b981', tr('ممتاز', 'Excellent')], [lv[1], '#f59e0b', tr('جيد', 'Good')], [lv[2], '#ef4444', tr('ضعيف', 'Weak')]]) + '</div>' +
    '<div class="card"><h3>' + tr('حاضرون / غائبون النهارده', 'Present / absent today') + '</h3>' + U.donut([[pr, '#10b981', tr('حاضرون', 'Present')], [ab, '#ef4444', tr('غائبون', 'Absent')], [Math.max(0, SS.length - pr - ab), '#94a3b8', '—']]) + '</div>' +
    '<div class="card"><h3>' + tr('المجموعات حسب المستوى', 'Groups by performance') + '</h3>' + gs.slice().sort((a, b) => b.av - a.av).map(x => '<div class="l"><span>' + U.esc(Store.gLabel(x.g)) + '</span><span class="tag pr">' + Math.round(x.av) + '%</span></div>').join('') + '</div></div>';
  gl.forEach(g => {
    const ss = Store.members(g.id), so = ss.filter(s => Store.avg(s.code, T.id) !== null).sort((a, b) => Store.avg(b.code, T.id) - Store.avg(a.code, T.id));
    h += '<h3 class="gt">' + U.esc(Store.gLabel(g)) + ' · ' + ss.length + ' ' + tr('طالب', 'students') + '</h3><div class="g2">' +
      lst(tr('🏆 المتفوقون', '🏆 Top students'), '#10b981', so.slice(0, 5), s => Store.avg(s.code, T.id) + '%') + lst(tr('⚠️ الأضعف مستوى', '⚠️ Lowest performers'), '#ef4444', so.slice(-5).reverse(), s => Store.avg(s.code, T.id) + '%') +
      lst(tr('📈 في تحسن', '📈 Improving'), '#4f46e5', ss.filter(s => Store.trend(s.code, T.id) >= 20).slice(0, 5), s => '+' + Store.trend(s.code, T.id) + '%') + lst(tr('📉 في تراجع', '📉 Declining'), '#f59e0b', ss.filter(s => Store.trend(s.code, T.id) <= -20).slice(0, 5), s => Store.trend(s.code, T.id) + '%') + '</div>' +
      (App.can('msgs') ? BX.card(g.id) : '') +
      '<details class="card" ' + (st.ol && st.ol[g.id] ? 'open' : '') + ' ontoggle="(App.st.ol=App.st.ol||{})[' + q(g.id) + ']=this.open"><summary><h3>👥 ' + tr('كل الطلاب', 'All students') + ' (' + ss.length + ')</h3></summary><div class="tw"><table class="tbl"><tr><th>' + tr('الطالب', 'Student') + '</th><th>' + tr('نسبة الحضور', 'Attendance') + '</th><th>' + tr('الغياب', 'Absences') + '</th><th>' + tr('المتوسط', 'Average') + '</th><th>' + tr('الدفع', 'Payment') + '</th><th>' + tr('المستوى', 'Level') + '</th></tr>' +
      ss.slice().sort((a, b) => (Store.avg(b.code, T.id) || 0) - (Store.avg(a.code, T.id) || 0)).map(s => { const c = Store.cat(s.code, T.id), ps = Store.payState(s.code, g.id, today); return '<tr onclick="Prof.open(' + s.code + ')"><td>' + U.esc(s.name) + '</td><td>' + (Store.attRate(s.code, T.id) ?? '—') + '%</td><td>' + Store.absences(s.code, T.id) + '</td><td>' + (Store.avg(s.code, T.id) ?? '—') + '%</td><td>' + (ps === 'mp' || ps === 'paid' ? '✅' : ps === 'df' ? '⏳' : ps === 'up' ? '❌' : '—') + '</td><td><span class="tag" style="background:' + catColor(c) + '">' + catName(c) + '</span></td></tr>'; }).join('') + '</table></div></details>';
  });
  return h;
};

// ======================= المنشورات =======================
const PO = {
  add() { const f = U.form('pof'); if (!f.title) return U.toast(tr('اكتب عنوان', 'Enter a title'), 'bad'); DB.posts.push({ id: Store.nid(), t: App.tid(), type: f.type, title: f.title, body: f.body, url: f.url, d: U.today() }); App.refresh(); },
  del(id) { DB.posts = DB.posts.filter(p => p.id !== id); App.refresh(); },
  icon: { ann: '📢', file: '📄', video: '🎬' },
};
V.posts = () => {
  const list = DB.posts.filter(p => p.t === App.tid()).sort((a, b) => b.d.localeCompare(a.d));
  return '<div class="card"><h3>' + tr('منشور جديد — بيظهر لطلابك وأولياء أمورهم', 'New post — visible to your students and parents') + '</h3><form id="pof" onsubmit="event.preventDefault();PO.add()"><div class="row2"><select class="in" name="type">' + U.opts([['ann', '📢 ' + tr('إعلان / ميعاد', 'Announcement')], ['file', '📄 ' + tr('ملف / مذكرة (لينك)', 'File (link)')], ['video', '🎬 ' + tr('فيديو (لينك)', 'Video (link)')]], 'ann') + '</select><input class="in" name="title" placeholder="' + tr('العنوان', 'Title') + '"></div>' +
    '<textarea class="in" name="body" rows="2" placeholder="' + tr('التفاصيل', 'Details') + '"></textarea><input class="in" name="url" dir="ltr" placeholder="https://..."><button class="pri">' + tr('نشر', 'Publish') + '</button></form></div>' +
    '<div class="card"><h3>' + tr('المنشورات', 'Posts') + ' (' + list.length + ')</h3>' + (list.map(p => '<div class="ar"><div class="nm"><b>' + PO.icon[p.type] + ' ' + U.esc(p.title) + '</b><small>' + U.short(p.d) + ' · ' + U.esc(p.body) + '</small></div><div class="ctl">' + (p.url ? '<a class="b" target="_blank" rel="noopener" href="' + U.esc(p.url) + '">' + tr('فتح', 'Open') + '</a>' : '') + '<button class="b x1" onclick="PO.del(' + p.id + ')">✕</button></div></div>').join('') || U.empty()) + '</div>';
};

// ======================= الإعدادات (المدرس) =======================
const SET = {
  n(k, v) { App.T().notif[k] = v; App.refresh(); },
  p(k, v) { App.T().perms[k] = v; App.refresh(); },
  ap() { const f = U.form('apf'), T = App.T(); T.asstPay = { type: f.type, val: +f.val || 0 }; App.refresh(); U.toast(tr('اتحفظ ✅', 'Saved ✅')); },
  addA() {
    const f = U.form('naf'), T = App.T(); if (!f.name) return U.toast(tr('اكتب اسم الأسيستنت', 'Enter a name'), 'bad');
    const user = Store.nextAsstUser(); T.assts.push({ user, name: f.name, phone: U.phone(f.phone), pw: '1234' });
    App.refresh(); U.toast(tr('اتضاف — كود الدخول ', 'Added — login ') + user + tr(' وكلمة السر 1234', ', password 1234'));
  },
  delA(user) { const T = App.T(); T.assts = T.assts.filter(a => a.user !== user); App.refresh(); },
  async resetA(user) { if (await Store.setPw('assistant', user, '1234')) U.toast(tr('كلمة السر رجعت 1234', 'Password reset to 1234')); },
  async pw() { const f = U.form('pwf'); if (f.pw && f.pw.length >= 4 && await Store.setPw('teacher', App.tid(), f.pw)) { App.render(); U.toast(tr('اتغيرت ✅', 'Changed ✅')); } },
};
V.settings = () => {
  const T = App.T(), n = T.notif, p = T.perms, a = T.asstPay || { type: 'month', val: 0 };
  const tg = (on, fn, label, sub) => '<label class="tgl"><input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="(' + fn + ')(this.checked)"><span></span><div><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></label>';
  return '<div class="g2"><div class="card"><h3>📲 ' + tr('الرسايل', 'Messages') + '</h3>' +
    tg(n.on, "v=>SET.n('on',v)", tr('الرسايل شغالة', 'Messages on'), tr('اقفلها في أي وقت (إجازة، امتحانات...) وافتحها تاني', 'Pause any time (holidays, exams...) and resume later')) +
    '<label>' + tr('بتتبعت لمين افتراضياً', 'Default recipients') + '</label>' + U.seg([['p', tr('ولي الأمر', 'Parent')], ['s', tr('الطالب', 'Student')], ['b', tr('الاتنين', 'Both')]], n.to, "v=>SET.n('to',v)") +
    tg(n.absence, "v=>SET.n('absence',v)", tr('رسالة غياب', 'Absence message'), tr('بعد تسجيل اليوم', 'After saving the day')) + tg(n.report, "v=>SET.n('report',v)", tr('تقرير بعد كل حصة', 'Report after each session')) +
    tg(n.grades !== false, "v=>SET.n('grades',v)", tr('التقرير فيه الدرجات', 'Reports include grades')) + tg(n.monthly, "v=>SET.n('monthly',v)", tr('تقرير شهري', 'Monthly report')) +
    tg(n.debt, "v=>SET.n('debt',v)", '⚙️ ' + tr('تذكير بالآجل (متقدم)', 'Deferred reminders (advanced)'), tr('مقفول افتراضياً', 'Off by default')) + '</div>' +
    '<div class="card"><h3>🧑‍💼 ' + tr('الأسيستنتس', 'Assistants') + ' (' + T.assts.length + ')</h3>' +
    T.assts.map(x => '<div class="ar"><div class="nm"><b>' + U.esc(x.name) + '</b><small>' + tr('الدخول: ', 'Login: ') + x.user + ' · <span dir="ltr">' + (x.phone || '—') + '</span></small></div><div class="ctl"><button class="b" onclick="SET.resetA(' + q(x.user) + ')">🔑 1234</button><button class="b x1" onclick="SET.delA(' + q(x.user) + ')">✕</button></div></div>').join('') +
    '<form id="naf" class="ctl wrap" onsubmit="event.preventDefault();SET.addA()"><input class="in" name="name" placeholder="' + tr('اسم الأسيستنت', 'Assistant name') + '"><input class="in" name="phone" dir="ltr" placeholder="01xxxxxxxxx"><button class="b g1">➕ ' + tr('إضافة', 'Add') + '</button></form>' +
    '<h4>' + tr('أجر الأسيستنت', 'Assistant pay') + '</h4><form id="apf" class="ctl wrap" onsubmit="event.preventDefault();SET.ap()"><select class="in" name="type">' + U.opts(['month', 'session', 'student'].map(k => [k, apName(k)]), a.type) + '</select><input class="in sm" name="val" type="number" min="0" value="' + a.val + '"><button class="b">' + tr('حفظ', 'Save') + '</button></form>' +
    '<h4>' + tr('صلاحيات الأسيستنتس', 'Assistant permissions') + '</h4>' +
    tg(p.money, "v=>SET.p('money',v)", tr('يشوف الفلوس والتقارير', 'See money and reports')) + tg(p.add, "v=>SET.p('add',v)", tr('يضيف ويعدّل وينقل طلاب', 'Add / edit / move students')) +
    tg(p.del, "v=>SET.p('del',v)", tr('يحذف طلاب نهائي', 'Delete students')) + tg(p.grades, "v=>SET.p('grades',v)", tr('شاشة الدرجات', 'Grades screen')) + tg(p.msgs, "v=>SET.p('msgs',v)", tr('يبعت رسايل', 'Send messages')) +
    tg(p.mode !== false, "v=>SET.p('mode',v)", tr('يغيّر نظام الدفع والكويز والامتحان', 'Change payment mode / quiz / exam')) + '</div></div>' +
    '<div class="card"><h3>🔑 ' + tr('كلمة سر المدرس', 'Teacher password') + ' <small class="mu">(' + tr('كود الدخول: ', 'login: ') + T.id + ')</small></h3><form id="pwf" class="ctl" onsubmit="event.preventDefault();SET.pw()"><input class="in" name="pw" type="password" placeholder="' + tr('كلمة سر جديدة', 'New password') + '"><button class="b g1">' + tr('حفظ', 'Save') + '</button></form></div>';
};
