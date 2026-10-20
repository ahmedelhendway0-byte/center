"""Generate demo center data: fills the Excel template and writes demo/demo-data.js."""
import json
import random
import sys

import openpyxl

random.seed(7)
TEMPLATE, OUT_XLSX, OUT_JS = sys.argv[1:4]

MALE = 'أحمد محمد محمود مصطفى عمر يوسف كريم علي إسلام حسن زياد مازن عبدالرحمن آدم سيف خالد طارق حمزة'.split()
FEMALE = 'سارة نور مريم هدى ملك فاطمة ياسمين دعاء رنا آية جنى حبيبة منة سلمى رحمة شهد لوجين فرح'.split()
FATHERS = 'السيد عبدالله إبراهيم حسين فتحي رمضان عطية سالم منصور جمال زكريا صلاح ناصر عادل ماجد سمير هاني وليد'.split()
FAMILY = 'الشافعي عبدالعزيز النجار الشريف البنا الجمال عثمان سليمان رضوان عيسى'.split()
SCHOOLS = ['مدرسة السلام الثانوية', 'مدرسة النصر', 'مدرسة الشهيد', 'مدرسة الأورمان', 'مدرسة الفاروق']
GRADES = ['3 إعدادي', '1 ثانوي', '2 ثانوي', '3 ثانوي']
PRICE = {'3 إعدادي': 50, '1 ثانوي': 60, '2 ثانوي': 70, '3 ثانوي': 80}
DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
TIMES = ['2:00 م', '4:00 م', '6:00 م', '8:00 م']


def phone():
    return '01' + random.choice('0125') + ''.join(random.choice('0123456789') for _ in range(8))


center = {'name': 'سنتر هنداوي', 'address': 'شارع الجمهورية - المنصورة', 'phone': '0502222333',
          'owner': 'أ/ هنداوي', 'ownerPhone': '01000000001', 'grades': GRADES}

# id, name, subject, phone, agreement, value, assistant, assistant phone, grades taught
T = [
    ('T01', 'أ/ محمد حسن', 'فيزياء', 'نسبة %', 20, 'أحمد علي', ['1 ثانوي', '2 ثانوي', '3 ثانوي']),
    ('T02', 'أ/ سامح فؤاد', 'كيمياء', 'مبلغ على كل طالب', 10, 'كريم سعيد', ['2 ثانوي', '3 ثانوي']),
    ('T03', 'أ/ هبة عادل', 'رياضيات', 'إيجار قاعة للحصة', 300, 'منة خالد', GRADES),
    ('T04', 'أ/ إيهاب نبيل', 'لغة عربية', 'نسبة %', 15, 'محمود طه', GRADES),
    ('T05', 'Mr. أشرف كمال', 'لغة إنجليزية', 'إيجار شهري', 3000, 'سلمى رأفت', ['1 ثانوي', '2 ثانوي', '3 ثانوي']),
    ('T06', 'د/ رانيا سمير', 'أحياء', 'نسبة %', 25, 'يوسف حمدي', ['2 ثانوي', '3 ثانوي']),
]
teachers = [{'id': t[0], 'name': t[1], 'subject': t[2], 'phone': phone(), 'agType': t[3], 'agVal': t[4],
             'assts': [{'user': 'A' + t[0][1:], 'name': t[5], 'phone': phone(), 'pw': '1234'}], 'notes': ''} for t in T]

rooms = [{'name': 'قاعة 1', 'cap': 80, 'notes': 'بروجكتور'}, {'name': 'قاعة 2', 'cap': 60, 'notes': ''},
         {'name': 'قاعة 3', 'cap': 40, 'notes': ''}, {'name': 'قاعة 4', 'cap': 30, 'notes': ''}]

slots = [(d, tm, r['name']) for d in DAYS for tm in TIMES for r in rooms]
random.shuffle(slots)
used = set()


def take_slot(avoid_day=None):
    for s in slots:
        if s in used or s[0] == avoid_day:
            continue
        used.add(s)
        return s
    raise RuntimeError('no slots')


groups = []
gid = 0
for t, spec in zip(teachers, T):
    for grade in spec[6]:
        n = 2 if grade == '3 ثانوي' else 1
        for k in range(n):
            gid += 1
            d1, tm, room = take_slot()
            d2 = ''
            if grade == '3 ثانوي':
                # second weekly day at the same time and room, if free
                for d in DAYS:
                    if d != d1 and (d, tm, room) not in used:
                        used.add((d, tm, room)); d2 = d; break
            gender = 'مختلط' if n == 1 else ('بنين' if k == 0 else 'بنات')
            groups.append({'id': 'G%02d' % gid, 'teacherId': t['id'], 'grade': grade,
                           'name': 'مجموعة ' + 'أبجد'[k], 'day1': d1, 'day2': d2, 'time': tm, 'room': room,
                           'price': PRICE[grade], 'gender': gender,
                           # الإنجليزي والكيمياء بالاشتراك الشهري، الباقي بالحصة
                           'payMode': 'month' if t['id'] in ('T02', 'T05') else 'session',
                           'monthPrice': PRICE[grade] * 4 - 20, 'qz': True,
                           'ex': grade == '3 ثانوي' and t['id'] in ('T01', 'T06')})

students, enroll = [], []
code = 1000
for i in range(420):
    code += 1
    g = random.choice(['ذكر', 'أنثى'])
    first = random.choice(MALE if g == 'ذكر' else FEMALE)
    father = random.choice(FATHERS)
    grade = random.choices(GRADES, weights=[2, 3, 3, 4])[0]
    s = {'code': code, 'name': '%s %s %s %s' % (first, father, random.choice(MALE), random.choice(FAMILY)),
         'gender': g, 'grade': grade, 'phone': phone(), 'parentName': father + ' ' + random.choice(FAMILY),
         'parentPhone': phone(), 'school': random.choice(SCHOOLS), 'notes': ''}
    students.append(s)
    tchs = [t for t, spec in zip(teachers, T) if grade in spec[6]]
    random.shuffle(tchs)
    for t in tchs[:random.choice([1, 2, 2, 3, 3])]:
        opts = [x for x in groups if x['teacherId'] == t['id'] and x['grade'] == grade and
                x['gender'] in ('مختلط', 'بنين' if g == 'ذكر' else 'بنات')]
        if not opts:
            continue
        x = random.choice(opts)
        debt = x['price'] * random.choice([1, 2]) if random.random() < 0.08 else 0
        enroll.append({'code': code, 'groupId': x['id'], 'debt': debt})

# siblings: a few students share the same parent phone
for a, b in zip(students[0:40:4], students[1:40:4]):
    b['parentPhone'] = a['parentPhone']; b['parentName'] = a['parentName']

data = {'center': center, 'teachers': teachers, 'rooms': rooms, 'groups': groups,
        'students': students, 'enroll': enroll}

with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write('// بيانات ديمو اتولدت أوتوماتيك — نفس محتوى demo/centers-demo-data.xlsx\n')
    f.write('window.DEMO_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')

# ---- fill the Excel template ----
wb = openpyxl.load_workbook(TEMPLATE)
ws = wb['السنتر']
for r, v in enumerate([center['name'], center['address'], center['phone'], center['owner'],
                       center['ownerPhone'], ', '.join(GRADES)], start=1):
    ws.cell(row=r, column=2, value=v)


def fill(name, rows, cols):
    ws = wb[name]
    for r, row in enumerate(rows, start=2):
        for c, v in zip(cols, row):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = openpyxl.styles.Font(name='Arial')


fill('المدرسين', [[t['id'], t['name'], t['subject'], t['phone'], t['agType'], t['agVal'], t['notes']]
                   for t in teachers], range(1, 8))
fill('الأسيستنتس', [[t['id'], a['name'], a['phone']] for t in teachers for a in t['assts']], [1, 3, 4])
fill('القاعات', [[r['name'], r['cap'], r['notes']] for r in rooms], range(1, 4))
fill('المجموعات', [[g['id'], g['teacherId'], g['grade'], g['name'], g['day1'], g['day2'] or None, g['time'],
                    g['room'], g['price'], g['gender'], 'شهري' if g['payMode'] == 'month' else 'بالحصة',
                    g['monthPrice'], 'أيوه' if g['qz'] else 'لأ', 'أيوه' if g['ex'] else 'لأ'] for g in groups],
     [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
fill('الطلاب', [[s['code'], s['name'], s['gender'], s['grade'], s['phone'], s['parentName'], s['parentPhone'],
                 s['school'], None] for s in students], range(1, 10))
fill('الاشتراكات', [[e['code'], e['groupId'], e['debt']] for e in enroll], [1, 2, 6])
# example rows were italic grey; demo rows are real data
wb.save(OUT_XLSX)
print('teachers', len(teachers), 'groups', len(groups), 'students', len(students), 'enroll', len(enroll))
