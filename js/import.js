// استيراد من قالب الإكسل + نسخ احتياطي
const IO = {
  // بيقرا ملف الإكسل (نفس شكل القالب) ويرجع بيانات جاهزة لـ Store.fromData
  async readExcel(file) {
    if (!window.XLSX) throw new Error('مكتبة الإكسل ما اتحملتش — اتأكد إن النت شغال');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = name => {
      const ws = wb.Sheets[name]; if (!ws) return [];
      return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
    };
    const col = (r, ...names) => { for (const n of names) if (r[n] !== undefined && r[n] !== '') return r[n]; return ''; };
    const str = v => String(v ?? '').trim();
    const center = {};
    const cs = wb.Sheets['السنتر'];
    if (cs) {
      const kv = {}; XLSX.utils.sheet_to_json(cs, { header: 1, defval: '' }).forEach(r => { if (r[0]) kv[str(r[0])] = str(r[1]); });
      Object.assign(center, { name: kv['اسم السنتر'] || 'السنتر', address: kv['العنوان'] || '', phone: kv['رقم السنتر'] || '', owner: kv['اسم صاحب السنتر'] || '', ownerPhone: kv['رقم صاحب السنتر'] || '' });
      if (kv['الصفوف الدراسية (افصل بفاصلة)']) center.grades = kv['الصفوف الدراسية (افصل بفاصلة)'].split(/[,،]/).map(x => x.trim()).filter(Boolean);
    }
    const teachers = rows('المدرسين').filter(r => str(col(r, 'كود المدرس')) && str(col(r, 'اسم المدرس'))).map(r => ({
      id: str(col(r, 'كود المدرس')), name: str(col(r, 'اسم المدرس')), subject: str(col(r, 'المادة')), phone: str(col(r, 'رقم الموبايل')),
      agType: str(col(r, 'نوع الاتفاق مع السنتر')), agVal: +col(r, 'قيمة الاتفاق') || 0, assts: [],
    }));
    // الأسيستنتس: شيت لوحده (أكتر من واحد لكل مدرس). النسخ القديمة من القالب كان الأسيستنت في شيت المدرسين
    const byT = Object.fromEntries(teachers.map(t => [t.id, t]));
    let an = 0;
    const addA = (tid, name, ph) => { if (byT[tid] && name) byT[tid].assts.push({ user: 'A' + String(++an).padStart(2, '0'), name, phone: str(ph), pw: '1234' }); };
    rows('الأسيستنتس').forEach(r => addA(str(col(r, 'كود المدرس')), str(col(r, 'اسم الأسيستنت')), col(r, 'رقم الأسيستنت')));
    rows('المدرسين').forEach(r => addA(str(col(r, 'كود المدرس')), str(col(r, 'اسم الأسيستنت')), col(r, 'رقم الأسيستنت')));
    const rooms = rows('القاعات').filter(r => str(col(r, 'اسم القاعة'))).map(r => ({ name: str(col(r, 'اسم القاعة')), cap: +col(r, 'السعة (عدد الطلاب)') || 0, notes: str(col(r, 'ملاحظات')) }));
    const groups = rows('المجموعات').filter(r => str(col(r, 'كود المجموعة')) && str(col(r, 'كود المدرس'))).map(r => ({
      id: str(col(r, 'كود المجموعة')), teacherId: str(col(r, 'كود المدرس')), grade: str(col(r, 'الصف')), name: str(col(r, 'اسم المجموعة')) || 'مجموعة',
      day1: str(col(r, 'اليوم')), day2: str(col(r, 'اليوم التاني (لو فيه)')), time: str(col(r, 'الساعة')), room: str(col(r, 'القاعة')),
      price: +col(r, 'سعر الحصة (ج)') || 0, gender: str(col(r, 'بنين / بنات')) || 'مختلط',
      payMode: str(col(r, 'نظام الدفع')) === 'شهري' ? 'month' : 'session', monthPrice: +col(r, 'الاشتراك الشهري (ج)') || 0,
      qz: str(col(r, 'كويز')) !== 'لأ', ex: str(col(r, 'امتحان')) === 'أيوه',
    }));
    const students = rows('الطلاب').filter(r => col(r, 'كود الطالب') !== '' && str(col(r, 'اسم الطالب (رباعي)'))).map(r => ({
      code: +col(r, 'كود الطالب'), name: str(col(r, 'اسم الطالب (رباعي)')), gender: str(col(r, 'النوع')) || 'ذكر', grade: str(col(r, 'الصف')),
      phone: str(col(r, 'رقم الطالب')), parentName: str(col(r, 'اسم ولي الأمر')), parentPhone: str(col(r, 'رقم ولي الأمر')), school: str(col(r, 'المدرسة')), notes: str(col(r, 'ملاحظات')),
    }));
    const enroll = rows('الاشتراكات').filter(r => col(r, 'كود الطالب') !== '' && str(col(r, 'كود المجموعة'))).map(r => ({ code: +col(r, 'كود الطالب'), groupId: str(col(r, 'كود المجموعة')), debt: +col(r, 'دين قديم (ج)') || 0 }));

    // مراجعة الأخطاء قبل الاستيراد
    const errs = [], T = new Set(teachers.map(t => t.id)), G = new Set(groups.map(g => g.id)), S = new Set();
    students.forEach(s => { if (S.has(s.code)) errs.push('كود طالب مكرر: ' + s.code); S.add(s.code); });
    groups.forEach(g => { if (!T.has(g.teacherId)) errs.push('المجموعة ' + g.id + ' كود مدرسها غلط: ' + g.teacherId); });
    enroll.forEach(e => { if (!S.has(e.code)) errs.push('اشتراك لطالب مش موجود: ' + e.code); if (!G.has(e.groupId)) errs.push('اشتراك في مجموعة مش موجودة: ' + e.groupId); });
    return { data: { center, teachers, rooms, groups, students, enroll: enroll.filter(e => S.has(e.code) && G.has(e.groupId)) }, errs };
  },

  backup() {
    const blob = new Blob([JSON.stringify(DB)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'نسخة-احتياطية-' + U.today() + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  async restore(file) {
    const d = JSON.parse(await file.text());
    if (!d || !d.students || !d.teachers) throw new Error('الملف ده مش نسخة احتياطية من السيستم');
    DB = d; Store.save();
  },
};
