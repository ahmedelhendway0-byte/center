// أدوات عامة: تنسيق، تواريخ، بحث عربي، رسائل، نوافذ
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; // نص جوه onclick
const U = {
  esc(x) { return String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
  fmt(n) { return Math.round(n || 0).toLocaleString('en-US'); },
  money(n) { return U.fmt(n) + ' ' + tr('ج', 'EGP'); },
  pct(a, b) { return b ? Math.round(a / b * 100) : 0; },

  // ---- التواريخ (YYYY-MM-DD بالتوقيت المحلي) ----
  dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  today() { return U.dkey(); },
  addDays(key, n) { const [y, m, d] = key.split('-').map(Number); return U.dkey(new Date(y, m - 1, d + n)); },
  parse(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); },
  DAYS: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  WEEK: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
  dayName(key) { return U.DAYS[U.parse(key).getDay()]; }, // عربي دايماً (المواعيد متخزنة بالعربي)
  DAYS_EN: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dayLabel(key) { return I18N.lang === 'en' ? U.DAYS_EN[U.parse(key).getDay()] : U.dayName(key); },
  short(key) { const d = U.parse(key); return d.getDate() + '/' + (d.getMonth() + 1); },
  now() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); },
  // "4:00 م" -> دقائق من بداية اليوم (للترتيب وكشف التعارض)
  mins(t) {
    const m = String(t || '').match(/(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm)?/i);
    if (!m) return 0;
    let h = +m[1]; const mm = +(m[2] || 0), ap = (m[3] || '').toLowerCase();
    if ((ap === 'م' || ap === 'pm') && h < 12) h += 12;
    if (!ap && h < 8) h += 12; // حصص الدروس غالباً بعد الضهر
    return h * 60 + mm;
  },
  // الفترات: اليوم، آخر 7 أيام، الشهر الحالي
  range(p) {
    const t = U.today();
    if (p === 'day') return [t, t];
    if (p === 'week') return [U.addDays(t, -6), t];
    return [t.slice(0, 8) + '01', t];
  },
  inRange(d, r) { return d >= r[0] && d <= r[1]; },
  daysIn(r) { return Math.round((U.parse(r[1]) - U.parse(r[0])) / 864e5) + 1; },

  // ---- بحث عربي: توحيد الحروف ----
  norm(s) {
    return String(s || '').toLowerCase().replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[ًٌٍَُِّْـ]/g, '').replace(/\s+/g, ' ').trim();
  },
  phone(p) {
    let s = String(p ?? '').replace(/\D/g, '');
    if (s.length === 10 && s[0] === '1') s = '0' + s;
    if (s.startsWith('20') && s.length === 12) s = s.slice(1);
    return s;
  },
  wa(phone, text) { return 'https://wa.me/2' + U.phone(phone) + '?text=' + encodeURIComponent(text); },

  // مولد أرقام عشوائية ثابت (للديمو)
  rng(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; },

  // ---- واجهة ----
  toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  },
  modal(html, opts) {
    U.close();
    const w = document.createElement('div');
    w.className = 'mo'; w.id = 'modal';
    w.innerHTML = '<div class="md ' + ((opts && opts.wide) ? 'wide' : '') + '"><button class="x" onclick="U.close()" aria-label="إغلاق">✕</button>' + html + '</div>';
    w.addEventListener('mousedown', e => { if (e.target === w) U.close(); });
    document.body.appendChild(w);
    const f = w.querySelector('[autofocus]'); if (f) f.focus();
  },
  close() { const m = document.getElementById('modal'); if (m) m.remove(); },
  // يقرأ قيم فورم: كل عنصر عنده name
  form(id) {
    const o = {};
    document.querySelectorAll('#' + id + ' [name]').forEach(e => { o[e.name] = e.type === 'checkbox' ? e.checked : e.value.trim(); });
    return o;
  },
  opts(list, sel) { return list.map(x => { const v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + U.esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + U.esc(l) + '</option>'; }).join(''); },
  // أزرار اختيار: fn اسم دالة أو arrow function كنص، بتتنادى بالقيمة
  seg(items, cur, fn) { return '<div class="sg">' + items.map(([v, l]) => '<button type="button" class="' + (v === cur ? 'on' : '') + '" onclick="(' + fn + ')(\'' + v + '\')">' + l + '</button>').join('') + '</div>'; },
  segL(label, items, cur, fn) { return '<div class="sgw"><label>' + label + '</label>' + U.seg(items, cur, fn) + '</div>'; },
  empty(t) { return '<div class="empty">' + (t || tr('مفيش بيانات لسه', 'Nothing here yet')) + '</div>'; },
  bars(vals, labels) {
    const mx = Math.max(1, ...vals);
    return '<div class="bars">' + vals.map((v, i) => '<div title="' + U.fmt(v) + '"><i style="height:' + Math.max(2, Math.round(v / mx * 100)) + 'px;animation-delay:' + i * 40 + 'ms"></i><span>' + labels[i] + '</span></div>').join('') + '</div>';
  },
  // خط الإيراد (زي المشروع القديم)
  line(v, labels) {
    const w = 320, h = 120, m = Math.max(...v, 1) * 1.1, n = Math.max(1, v.length - 1);
    const pts = v.map((x, i) => [10 + i * (w - 20) / n, h - 14 - x / m * (h - 30)]), p = pts.map(a => a[0].toFixed(1) + ',' + a[1].toFixed(1)).join(' ');
    let lb = ''; pts.forEach((a, i) => { if (i % 3 === 0 || i === v.length - 1) lb += '<text x="' + a[0] + '" y="' + (h - 2) + '" text-anchor="middle">' + labels[i] + '</text>'; });
    return '<svg class="line" viewBox="0 0 ' + w + ' ' + h + '" width="100%"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f46e5" stop-opacity=".35"/><stop offset="1" stop-color="#4f46e5" stop-opacity="0"/></linearGradient></defs>' +
      '<polygon points="10,' + (h - 14) + ' ' + p + ' ' + (w - 10) + ',' + (h - 14) + '" fill="url(#lg)"/><polyline class="dl" pathLength="1" points="' + p + '" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round"/>' +
      pts.map(a => '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="3" fill="#06b6d4"/>').join('') + lb + '<text x="10" y="10">' + U.fmt(m / 1.1) + '</text></svg>';
  },
  donut(parts) { // [[value,color,label]]
    const tot = parts.reduce((a, p) => a + p[0], 0) || 1, r = 42, C = 2 * Math.PI * r;
    let off = 0, s = '';
    parts.forEach(p => { const l = p[0] / tot * C; s += '<circle r="' + r + '" cx="60" cy="60" fill="none" stroke="' + p[1] + '" stroke-width="18" stroke-dasharray="' + l + ' ' + (C - l) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 60 60)"/>'; off += l; });
    return '<div class="donut"><svg viewBox="0 0 120 120" width="120">' + s + '</svg><div>' + parts.map(p => '<div class="lg"><i style="background:' + p[1] + '"></i>' + p[2] + ' <b>' + p[0] + '</b></div>').join('') + '</div></div>';
  },
};
