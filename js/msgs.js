// الرسايل — نفس منطق المشروع القديم (تقرير / تقرير + رسالتي / رسالة المستوى / رسالتي بس، بالدرجات أو من غيرها،
// للطالب أو ولي الأمر أو الاتنين) + غياب وتقرير شهري ورسالة من المدرس.
// الإرسال دلوقتي بيفتح واتساب والرسالة جاهزة؛ الإرسال الأوتوماتيك (API) هيتركّب على نفس الدوال.
const TT = {
  ar: {
    top: ['مبروك يا {n}! مستواك ممتاز ونتمنى تكمل على نفس المستوى 🌟', 'نبشركم بأن {n} من المتفوقين وأداؤه ممتاز، بارك الله فيه 🌟'],
    up: ['ما شاء الله يا {n}، مستواك في تحسن ملحوظ، كمّل 👏', 'نلاحظ تحسناً واضحاً في مستوى {n}، ونشكركم على المتابعة 👏'],
    dn: ['يا {n}، لاحظنا انخفاض مستواك مؤخراً، ركّز معانا وهنساعدك ترجع أقوى', 'نلاحظ انخفاضاً في مستوى {n} مؤخراً، برجاء المتابعة معنا لتحسين المستوى'],
    wk: ['يا {n}، مستواك محتاج مجهود أكتر، تعالى نذاكر سوا ونظبط الموضوع', 'مستوى {n} أقل من المطلوب، نرجو التواصل معنا لوضع خطة مذاكرة'],
    ok: ['يا {n}، مستواك جيد، كمّل واجتهد', 'مستوى {n} جيد، ونشجعه على المزيد من الاجتهاد'],
    all: ['أهلاً يا {n}، نتمنى لك التوفيق والاستمرار في الاجتهاد', 'ولي أمر الطالب {n}، نشكركم على المتابعة ونتمنى له التوفيق'],
  },
  en: {
    top: ['Congrats {n}! Excellent level, keep it up 🌟', 'We are happy to share that {n} is among our top students 🌟'],
    up: ['Well done {n}, your level is clearly improving 👏', "We see a clear improvement in {n}'s level, thank you for following up 👏"],
    dn: ['{n}, we noticed your level dropped lately. Focus with us and we will help', "We noticed {n}'s level has dropped recently, please follow up with us"],
    wk: ['{n}, your level needs more effort. Let us study together', "{n}'s level is below expected. Please contact us for a study plan"],
    ok: ['{n}, your level is good, keep working', "{n}'s level is good, we encourage more effort"],
    all: ['Hi {n}, wishing you continued success', 'Dear parent of {n}, thank you for following up'],
  },
};
const CATS = [['all', () => tr('الكل', 'All')], ['top', () => tr('🏆 المتفوقون', '🏆 Top')], ['up', () => tr('📈 في تحسن', '📈 Improving')], ['dn', () => tr('📉 في تراجع', '📉 Declining')], ['wk', () => tr('⚠️ الأضعف مستوى', '⚠️ Weakest')]];
const catName = c => ({ top: tr('متفوق', 'Top'), up: tr('في تحسن', 'Improving'), dn: tr('في تراجع', 'Declining'), wk: tr('ضعيف', 'Weak'), ok: tr('جيد', 'Good') }[c]);
const catColor = c => ({ top: '#10b981', up: '#4f46e5', dn: '#f59e0b', wk: '#ef4444', ok: '#94a3b8' }[c]);

const Msg = {
  sig() { return tr('تيم ', 'Team ') + DB.center.name; },
  first: s => s.name.split(' ')[0],
  // تقرير الحصة (زي msg() في القديم)
  report(code, tid, o) {
    o = o || {};
    const s = Store.student(code), t = Store.teacher(tid), P = o.to !== 's', e = Store.enrollFor(code, tid);
    const g = Store.group(o.g || (e && e.g)), d = o.d || U.today(), a = g && Store.rec(code, g.id, d), ar = I18N.lang === 'ar';
    const L = [(P ? (ar ? 'السلام عليكم أ/ ' + (s.parentName || 'ولي الأمر') + '\nتقرير الطالب: ' + s.name : 'Dear ' + (s.parentName || 'parent') + ',\nReport for ' + s.name)
      : (ar ? 'أهلاً ' + s.name + '\nتقريرك اليوم' : 'Hi ' + s.name + ',\nYour report today')) + ' (' + t.subject + (g ? ' · ' + Store.gLabel(g) : '') + ')'];
    L.push('• ' + tr('اليوم: ', 'Today: ') + (a ? (a.st === 'p' ? tr('حضر', 'Present') : tr('غاب', 'Absent')) : '—'));
    if (o.grades !== false && g) {
      if (g.qz) { const v = Store.sessScore(g.id, d, 'quiz', code); L.push('• ' + tr('كويز اليوم: ', 'Quiz today: ') + (v !== '' ? v + '/20' : tr('لا يوجد', 'none'))); }
      if (g.ex) { const v = Store.sessScore(g.id, d, 'exam', code); if (v !== '') L.push('• ' + tr('الامتحان: ', 'Exam: ') + v + '/50'); }
      const r = Store.attRate(code, tid), av = Store.avg(code, tid);
      if (r !== null) L.push('• ' + tr('نسبة الحضور: ', 'Attendance: ') + r + '%');
      if (av !== null) L.push('• ' + tr('متوسط الدرجات: ', 'Average: ') + av + '%');
    }
    if (P && g) L.push('• ' + tr('الدفع: ', 'Payment: ') + Store.payText(Store.payState(code, g.id, d)));
    L.push(Msg.sig());
    return L.join('\n');
  },
  level(code, tid, to, cat) {
    const s = Store.student(code), c = cat || Store.cat(code, tid);
    return TT[I18N.lang][c][to === 's' ? 0 : 1].replace('{n}', s.name) + '\n\n' + Msg.sig();
  },
  absence(code, tid, o) {
    o = o || {}; const s = Store.student(code), t = Store.teacher(tid), d = o.d || U.today(), P = o.to !== 's';
    return (P ? tr('السلام عليكم أ/ ', 'Dear ') + (s.parentName || tr('ولي الأمر', 'parent')) + '\n' + tr('نحيطكم علماً بغياب الطالب ', 'Please note that ') + s.name
      : tr('أهلاً يا ', 'Hi ') + Msg.first(s) + '\n' + tr('إنت غبت', 'You were absent')) + tr(' اليوم ', ' today ') + U.dayName(d) + ' ' + U.short(d) + tr(' عن حصة ', ' from ') + t.subject + tr(' مع ', ' with ') + t.name + '.\n' + Msg.sig();
  },
  monthly(code, tid, o) {
    o = o || {}; const s = Store.student(code), t = Store.teacher(tid), P = o.to !== 's', r = U.range('month'), list = Store.stAtt(code, tid).filter(x => U.inRange(x.d, r));
    const e = Store.enrollFor(code, tid), g = e && Store.group(e.g), av = Store.avg(code, tid);
    const L = [(P ? tr('السلام عليكم أ/ ', 'Dear ') + (s.parentName || tr('ولي الأمر', 'parent')) + '\n' + tr('التقرير الشهري للطالب: ', 'Monthly report for ') + s.name : tr('أهلاً ', 'Hi ') + s.name + '\n' + tr('تقريرك الشهري', 'Your monthly report')) + ' (' + t.subject + ')'];
    L.push('• ' + tr('حضر ', 'Attended ') + list.filter(x => x.st === 'p').length + tr(' من ', ' of ') + list.length + tr(' حصة', ' sessions'));
    if (av !== null) L.push('• ' + tr('متوسط الدرجات: ', 'Average: ') + av + '% (' + Store.level(av)[0] + ')');
    const lq = Store.lastQuizzes(code, tid, 4); if (lq.length) L.push('• ' + tr('آخر الكويزات: ', 'Last quizzes: ') + lq.map(x => x.v).join(' · '));
    if (P && g && g.payMode === 'month') L.push('• ' + tr('اشتراك الشهر: ', 'Month: ') + Store.payText(Store.payState(code, g.id)));
    L.push(Msg.sig()); return L.join('\n');
  },
  debt(code, tid, o) {
    const s = Store.student(code), t = Store.teacher(tid), P = (o || {}).to !== 's';
    return (P ? tr('السلام عليكم أ/ ', 'Dear ') + (s.parentName || '') + '\n' + tr('تذكير: على الطالب ', 'Reminder: ') + s.name : tr('أهلاً يا ', 'Hi ') + Msg.first(s) + '\n' + tr('تذكير: عليك', 'Reminder: you owe')) + ' ' + U.money(Store.debt(code, tid)) + tr(' لحصص ', ' for ') + t.subject + '.\n' + Msg.sig();
  },
  teacher(name, text) { return tr('من المدرس: ', 'From teacher: ') + (name || '—') + '\n\n' + text + '\n\n' + Msg.sig(); },
  custom(code, text, to) { const s = Store.student(code); return (to === 's' ? tr('أهلاً يا ', 'Hi ') + Msg.first(s) : tr('السلام عليكم أ/ ', 'Dear ') + (s.parentName || '')) + '\n' + text + '\n\n' + Msg.sig(); },
  // تركيب الرسالة النهائية زي fm() في القديم: report / both / lvl / custom
  compose(code, tid, to, c) {
    const base = c.edited && c.edited[to] != null ? c.edited[to] : (c.mode === 'lvl' ? Msg.level(code, tid, to) : Msg.report(code, tid, { to, g: c.g, d: c.d, grades: c.grades }));
    const note = ((c.note && c.note[to]) || '').trim();
    if (c.mode === 'custom') return note ? note + '\n\n' + Msg.sig() : '';
    if (c.mode === 'both') return (note ? note + '\n\n' : '') + base;
    return base;
  },
  make(kind, code, tid, o) { return kind === 'lvl' ? Msg.level(code, tid, o.to, o.cat) : Msg[kind](code, tid, o); },

  // ---------------- واجهة ----------------
  targets(s, to) { const r = []; if (to !== 's' && s.parentPhone) r.push(['p', tr('ولي الأمر', 'Parent'), s.parentPhone]); if (to !== 'p' && s.phone) r.push(['s', tr('الطالب', 'Student'), s.phone]); return r; },
  link(code, toKey, label, phone, text, kind) {
    return '<a class="b wa" target="_blank" rel="noopener" href="' + U.wa(phone, text) + '" onclick="Msg.sent(this,' + code + ',' + q(kind) + ',' + q(toKey) + ')">📲 ' + label + '</a>';
  },
  btns(code, to, textFor, kind) { const s = Store.student(code); return Msg.targets(s, to).map(([k, l, ph]) => Msg.link(code, k, l, ph, textFor(k), kind)).join(''); },
  sent(el, code, kind, to) { el.classList.add('done'); Store.logMsg({ t: App.tid(), s: code, to, kind }); Store.save(); },
  banner(T) {
    return (T && !T.notif.on ? '<div class="warn">⏸️ ' + tr('الرسايل متوقفة من الإعدادات — الزراير شغالة يدوي بس.', 'Messages are paused in settings — buttons still work manually.') + '</div>' : '') +
      '<p class="mu small">' + tr('كل زرار بيفتح واتساب والرسالة مكتوبة جاهزة. الإرسال الأوتوماتيك بدوسة واحدة هيشتغل لما نربط WhatsApp API.', 'Each button opens WhatsApp with the message ready. One-tap automatic sending comes with the WhatsApp API.') + '</p>';
  },
  // إرسال جماعي: قايمة بالطلاب وكل واحد ليه زراير
  bulk(title, codes, tid, to, textFor, kind, preview) {
    const T = Store.teacher(tid);
    U.modal('<h3>📣 ' + U.esc(title) + ' · ' + codes.length + ' ' + tr('طالب', 'students') + '</h3>' + Msg.banner(T) + (preview ? '<div class="msg">' + U.esc(preview) + '</div>' : '') +
      (codes.map(c => { const s = Store.student(c); return '<div class="ar"><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + s.code + '</small></div><div class="ctl">' + Msg.btns(c, to, k => textFor(c, k), kind) + '</div></div>'; }).join('') || U.empty()), { wide: true });
  },
  // رسايل الحصة بعد "تسجيل اليوم": غياب + تقرير الحاضرين
  session(gid, d) {
    const g = Store.group(gid), T = Store.teacher(g.teacherId), rows = Store.sessAtt(gid, d), abs = rows.filter(a => a.st === 'a'), pres = rows.filter(a => a.st === 'p'), to = T.notif.to;
    const sec = (title, list, kind) => '<h4>' + title + ' (' + list.length + ')</h4>' + (list.map(a => { const s = Store.student(a.s); return '<div class="ar"><div class="nm"><b>' + U.esc(s.name) + '</b><small>' + s.code + '</small></div><div class="ctl">' + Msg.btns(a.s, to, k => Msg[kind](a.s, T.id, { to: k, g: gid, d, grades: T.notif.grades !== false }), kind) + '</div></div>'; }).join('') || U.empty());
    U.modal('<h3>📲 ' + tr('رسايل حصة ', 'Session messages · ') + U.esc(Store.gLabel(g)) + ' · ' + U.short(d) + '</h3>' + Msg.banner(T) +
      (T.notif.absence ? sec(tr('❌ الغياب', '❌ Absent'), abs, 'absence') : '') + (T.notif.report ? sec(tr('📋 تقرير الحاضرين', '📋 Present — report'), pres, 'report') : '') +
      (!T.notif.absence && !T.notif.report ? U.empty(tr('رسايل الغياب والتقارير مقفولة من الإعدادات', 'Absence and report messages are off in settings')) : ''), { wide: true });
  },
};
