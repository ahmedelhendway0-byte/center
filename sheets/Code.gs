/* =====================================================================
   سيستم السنتر — نسخة لايف على Google Sheets (للعرض بس)
   الشيت بيقرا البيانات من Supabase كل 10 دقايق ويكتبها في تابات:
   «ملخص» · «المدرسين» · «الطلاب» · وتاب لكل مجموعة (الحضور يوم بيوم + المتوسط + الدفع)
   التعديل بيبقى من السيستم بس؛ أي تعديل هنا هيتمسح مع التحديث الجاي.

   التشغيل أول مرة:
   1) Extensions ← Apps Script ← الصق الملف ده مكان الكود اللي هناك ← Save
   2) شغّل الدالة setup (هيطلب إذن مرة واحدة ← Allow)
   3) في تاب «الإعدادات» الصق مفتاح الشيت في الخانة B2
      (المفتاح بيطلع من السيستم: صاحب السنتر ← البيانات ← ربط شيت جوجل)
   4) شغّل الدالة refresh مرة، وبعد كده هيتحدّث لوحده
   ===================================================================== */
var SUPABASE_URL = "";  // نفس اللي في js/config.js
var SUPABASE_KEY = "";  // المفتاح العام (publishable / anon)
var SETTINGS = "الإعدادات";
var DAYS_BACK = 35;     // كام يوم ورا يظهر في تابات المجموعات

function setup() {
  var ss = SpreadsheetApp.getActive();
  var st = ss.getSheetByName(SETTINGS) || ss.insertSheet(SETTINGS);
  st.setRightToLeft(true);
  st.getRange("A1:B4").setValues([["الإعداد", "القيمة"], ["مفتاح الشيت", st.getRange("B2").getValue() || ""], ["آخر تحديث", ""], ["الحالة", ""]]);
  st.getRange("A1:B1").setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
  st.setColumnWidth(1, 140); st.setColumnWidth(2, 420);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "refresh") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("refresh").timeBased().everyMinutes(10).create();
  SpreadsheetApp.getActive().toast("تمام ✅ حط مفتاح الشيت في B2 وشغّل refresh");
}

function refresh() {
  var ss = SpreadsheetApp.getActive(), st = ss.getSheetByName(SETTINGS);
  var key = st ? String(st.getRange("B2").getValue()).trim() : "";
  if (!SUPABASE_URL || !SUPABASE_KEY || !key) { if (st) st.getRange("B4").setValue("ناقص رابط Supabase أو مفتاح الشيت"); return; }
  var res = UrlFetchApp.fetch(SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/api_export", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    payload: JSON.stringify({ p_key: key })
  });
  var j = JSON.parse(res.getContentText() || "{}");
  if (!j.ok) { st.getRange("B4").setValue("المفتاح غلط أو السيرفر مش متاح (" + res.getResponseCode() + ")"); return; }
  var D = build(j.rows);
  writeSummary(ss, D); writeTeachers(ss, D); writeStudents(ss, D);
  D.groups.forEach(function (g) { writeGroup(ss, D, g); });
  st.getRange("B3").setValue(new Date());
  st.getRange("B4").setValue("تمام · " + D.students.length + " طالب · " + D.groups.length + " مجموعة");
}

// صفوف الداتابيز ← كائنات
function build(rows) {
  var D = { center: {}, teachers: [], groups: [], students: [], enroll: [], att: [], subs: [], pays: [], assess: {}, scores: [], T: {}, G: {}, S: {} };
  rows.forEach(function (r) {
    var k = r[0], x = r[4];
    if (k === "center") D.center = x.center || {};
    else if (k === "teacher") { D.teachers.push(x); D.T[x.id] = x; }
    else if (k === "group") { D.groups.push(x); D.G[x.id] = x; }
    else if (k === "student") { D.students.push(x); D.S[x.code] = x; }
    else if (k === "enroll") D.enroll.push(x);
    else if (k === "att") D.att.push(x);
    else if (k === "sub") D.subs.push(x);
    else if (k === "pay") D.pays.push(x);
    else if (k === "assess") D.assess[x.id] = x;
    else if (k === "score") D.scores.push(x);
  });
  D.groups = D.groups.filter(function (g) { return g.active !== false; }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  return D;
}

function ymd(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); }
function month() { return ymd(new Date()).slice(0, 7); }
function sheet(ss, name) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear(); sh.setRightToLeft(true); return sh;
}
function header(sh, cols) {
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
  sh.setFrozenRows(1);
}
function put(sh, rows, from) { if (rows.length) sh.getRange(from || 2, 1, rows.length, rows[0].length).setValues(rows); }

function revenue(D, tid, from, to) {
  var v = 0, inR = function (d) { return d >= from && d <= to; };
  D.att.forEach(function (a) { if (a.t === tid && inR(a.d)) v += a.paid || 0; });
  D.subs.forEach(function (x) { if (x.t === tid && inR(x.d)) v += x.amt || 0; });
  D.pays.forEach(function (p) { if (p.t === tid && !p.waive && inR(p.d)) v += p.amt || 0; });
  return v;
}

function writeSummary(ss, D) {
  var sh = sheet(ss, "ملخص"), m0 = month() + "-01", today = ymd(new Date());
  sh.getRange("A1").setValue((D.center.name || "السنتر") + " · آخر تحديث " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")).setFontWeight("bold").setFontSize(13);
  sh.getRange(2, 1, 1, 6).setValues([["المدرس", "المادة", "المجموعات", "الطلاب", "حضور الشهر", "تحصيل الشهر (ج)"]]).setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
  var rows = D.teachers.filter(function (t) { return t.active !== false; }).map(function (t) {
    var gs = D.groups.filter(function (g) { return g.teacherId === t.id; }).map(function (g) { return g.id; });
    var st = {}; D.enroll.forEach(function (e) { if (e.st !== "out" && gs.indexOf(e.g) > -1) st[e.s] = 1; });
    var pr = D.att.filter(function (a) { return a.t === t.id && a.st === "p" && a.d >= m0; }).length;
    return [t.name, t.subject, gs.length, Object.keys(st).length, pr, revenue(D, t.id, m0, today)];
  });
  put(sh, rows, 3);
  sh.setFrozenRows(2); sh.autoResizeColumns(1, 6);
}

function writeTeachers(ss, D) {
  var sh = sheet(ss, "المدرسين");
  header(sh, ["الكود", "المدرس", "المادة", "الموبايل", "الأسيستنتس", "المجموعات"]);
  put(sh, D.teachers.map(function (t) {
    return [t.id, t.name, t.subject, t.phone, (t.assts || []).map(function (a) { return a.name + " (" + a.user + ")"; }).join("، "),
      D.groups.filter(function (g) { return g.teacherId === t.id; }).map(function (g) { return g.grade + " " + g.name + " · " + [g.day1, g.day2].filter(String).join(" و ") + " " + g.time; }).join("\n")];
  }));
  sh.autoResizeColumns(1, 6);
}

function writeStudents(ss, D) {
  var sh = sheet(ss, "الطلاب");
  header(sh, ["الكود", "الطالب", "الصف", "النوع", "رقم الطالب", "ولي الأمر", "رقم ولي الأمر", "المدرسين"]);
  put(sh, D.students.slice().sort(function (a, b) { return a.code - b.code; }).map(function (s) {
    var subj = D.enroll.filter(function (e) { return e.s === s.code && e.st !== "out" && D.G[e.g]; }).map(function (e) { var t = D.T[D.G[e.g].teacherId]; return t ? t.subject : ""; });
    return [s.code, s.name, s.grade, s.gender, "'" + (s.phone || ""), s.parentName, "'" + (s.parentPhone || ""), subj.join("، ")];
  }));
  sh.autoResizeColumns(1, 8);
}

// تاب المجموعة: الصفوف = الطلاب، الأعمدة = أيام الحصص (ح / غ) + نسبة الحضور + المتوسط + الدفع
function writeGroup(ss, D, g) {
  var t = D.T[g.teacherId] || {}, name = (g.id + " " + (t.subject || "") + " " + g.grade + " " + g.name).slice(0, 90);
  var sh = sheet(ss, name), from = ymd(new Date(Date.now() - DAYS_BACK * 864e5)), m = month();
  var mem = D.enroll.filter(function (e) { return e.g === g.id && e.st !== "out"; }).map(function (e) { return D.S[e.s]; }).filter(Boolean)
    .sort(function (a, b) { return a.name.localeCompare(b.name); });
  var att = D.att.filter(function (a) { return a.g === g.id; }), days = {};
  att.forEach(function (a) { if (a.d >= from) days[a.d] = 1; });
  days = Object.keys(days).sort();
  var by = {}; att.forEach(function (a) { by[a.s + "|" + a.d] = a; });
  var scoreBy = {}; D.scores.forEach(function (x) { var a = D.assess[x.a]; if (a && a.t === g.teacherId) (scoreBy[x.s] = scoreBy[x.s] || []).push(x.v / a.max * 100); });
  header(sh, ["الكود", "الطالب"].concat(days.map(function (d) { return d.slice(8) + "/" + d.slice(5, 7); })).concat(["نسبة الحضور", "متوسط الدرجات", g.payMode === "month" ? "اشتراك الشهر" : "آجل (ج)"]));
  var rows = mem.map(function (s) {
    var all = D.att.filter(function (a) { return a.s === s.code && a.t === g.teacherId; }), p = all.filter(function (a) { return a.st === "p"; }).length;
    var sc = scoreBy[s.code] || [], avg = sc.length ? Math.round(sc.reduce(function (x, y) { return x + y; }, 0) / sc.length) + "%" : "—";
    var pay;
    if (g.payMode === "month") pay = D.subs.some(function (x) { return x.s === s.code && x.t === g.teacherId && x.m === m; }) ? "مدفوع" : "غير مدفوع";
    else pay = all.reduce(function (v, a) { return v + (a.fee || 0) - (a.paid || 0); }, 0) - D.pays.filter(function (x) { return x.s === s.code && x.t === g.teacherId; }).reduce(function (v, x) { return v + x.amt; }, 0);
    return [s.code, s.name].concat(days.map(function (d) { var a = by[s.code + "|" + d]; return a ? (a.st === "p" ? "ح" : "غ") : ""; }))
      .concat([all.length ? Math.round(p / all.length * 100) + "%" : "—", avg, typeof pay === "number" ? Math.max(0, pay) : pay]);
  });
  put(sh, rows);
  if (rows.length && days.length) {
    var rg = sh.getRange(2, 3, rows.length, days.length);
    var rules = [SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("غ").setBackground("#fde2e1").setFontColor("#b42318").setRanges([rg]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("ح").setFontColor("#067647").setRanges([rg]).build()];
    sh.setConditionalFormatRules(rules);
    sh.setColumnWidths(3, days.length, 46);
  }
  sh.setFrozenColumns(2); sh.autoResizeColumn(2);
}
