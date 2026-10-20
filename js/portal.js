// بوابة الطالب وولي الأمر: كل واحد يشوف اللي يخصه بس + اللي المدرس سمح بنشره
V.portal = () => {
  const s = App.ses, parent = s.role === 'parent';
  const kids = parent ? DB.students.filter(x => x.parentPhone === s.id) : [Store.student(s.id)];
  const kid = kids.find(k => k.code === App.st.pk) || kids[0];
  let h = parent && kids.length > 1 ? '<div class="sg wrap">' + kids.map(k => '<button class="' + (k === kid ? 'on' : '') + '" onclick="App.st.pk=' + k.code + ';App.render()">' + U.esc(k.name.split(' ').slice(0, 2).join(' ')) + '</button>').join('') + '</div>' : '';
  const ens = Store.enrollsOf(kid.code).map(e => Store.group(e.g)).filter(Boolean);
  h += '<div class="card hello"><h2>' + (parent ? tr('ولي أمر ', 'Parent of ') : tr('أهلاً يا ', 'Hi ')) + U.esc(parent ? kid.name : kid.name.split(' ')[0]) + ' 👋</h2><p class="mu">' + tr('كود الطالب: ', 'Student code: ') + '<b>' + kid.code + '</b> · ' + U.esc(kid.grade) + '</p></div>';
  if (!ens.length) return h + U.empty(tr('مش مشترك مع أي مدرس دلوقتي', 'Not enrolled with any teacher'));
  const tids = ens.map(g => g.teacherId);
  const posts = DB.posts.filter(p => tids.includes(p.t)).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 8);
  if (posts.length) h += '<div class="card"><h3>📢 ' + tr('آخر الأخبار', 'Latest news') + '</h3>' + posts.map(p => '<div class="ar"><div class="nm"><b>' + PO.icon[p.type] + ' ' + U.esc(p.title) + '</b><small>' + U.esc(Store.teacher(p.t).name) + ' · ' + U.short(p.d) + (p.body ? ' · ' + U.esc(p.body) : '') + '</small></div>' + (p.url ? '<a class="b" target="_blank" rel="noopener" href="' + U.esc(p.url) + '">' + tr('فتح', 'Open') + '</a>' : '') + '</div>').join('') + '</div>';
  h += '<div class="g2">' + ens.map(g => {
    const T = Store.teacher(g.teacherId), at = Store.stAtt(kid.code, T.id).slice().sort((a, b) => b.d.localeCompare(a.d)), sc = Store.scoresOf(kid.code, T.id, true).reverse();
    const av = Store.avg(kid.code, T.id, true), lv = Store.level(av), ps = Store.payState(kid.code, g.id, U.today());
    return '<div class="card"><h3>' + U.esc(T.subject) + ' — ' + U.esc(T.name) + '</h3><p class="mu small">' + U.esc(Store.gLabel(g)) + ' · ' + U.esc(Store.gTime(g)) + ' · ' + U.esc(g.room) + '</p>' +
      '<div class="kp"><div><b>' + (Store.attRate(kid.code, T.id) ?? '—') + '%</b>' + tr('الحضور', 'Attendance') + '</div><div><b>' + (av ?? '—') + '%</b>' + tr('المتوسط', 'Average') + '</div><div><b><i class="tag ' + lv[1] + '">' + lv[0] + '</i></b>' + tr('المستوى', 'Level') + '</div>' +
      (parent && g.payMode === 'month' ? '<div><b><i class="tag ' + (ps === 'mp' ? 'ok' : 'bad') + '">' + Store.payText(ps) + '</i></b>' + tr('اشتراك الشهر', 'This month') + '</div>' : '') + '</div>' +
      '<h4>' + tr('آخر الدرجات', 'Latest grades') + '</h4>' + (sc.slice(0, 6).map(x => '<div class="l"><span>' + U.esc(x.a.title) + '</span><i class="tag ' + Store.level(x.v / x.a.max * 100)[1] + '">' + x.v + '/' + x.a.max + '</i></div>').join('') || U.empty(tr('لسه مفيش درجات منشورة', 'No published grades yet'))) +
      '<h4>' + tr('آخر الحصص', 'Recent sessions') + '</h4><div class="chips">' + at.slice(0, 8).map(a => '<span class="ch ' + (a.st === 'p' ? 'ok' : 'bad') + '">' + U.short(a.d) + ' ' + (a.st === 'p' ? '✓' : '✗') + '</span>').join('') + '</div></div>';
  }).join('') + '</div>';
  h += '<details class="card"><summary><h3>🔑 ' + tr('تغيير كلمة السر', 'Change password') + '</h3></summary><form id="ppf" class="ctl" onsubmit="event.preventDefault();V.ppw()"><input class="in" name="pw" type="password" placeholder="' + tr('كلمة السر الجديدة', 'New password') + '" minlength="4"><button class="b g1">' + tr('حفظ', 'Save') + '</button></form></details>';
  return h;
};
V.ppw = async () => {
  const p = U.form('ppf').pw; if (!p || p.length < 4) return U.toast(tr('4 حروف على الأقل', 'At least 4 characters'), 'bad');
  if (await Store.setPw(App.ses.role, String(App.ses.id), p)) { App.render(); U.toast(tr('اتغيرت ✅', 'Changed ✅')); }
};
