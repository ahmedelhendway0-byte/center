import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule

OUT = sys.argv[1]
N = 1500  # rows prepared for input
F = "Arial"
HDR_FILL = PatternFill("solid", fgColor="4F46E5")
EX_FILL = PatternFill("solid", fgColor="E0E7FF")
IN_FILL = PatternFill("solid", fgColor="FFF9C4")
CALC_FILL = PatternFill("solid", fgColor="EEEEEE")
thin = Side(style="thin", color="C7CCE0")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()


def sheet(title, headers, widths, example, calc_cols=(), first=False):
    ws = wb.active if first else wb.create_sheet()
    ws.title = title
    ws.sheet_view.rightToLeft = True
    for i, (h, w) in enumerate(zip(headers, widths), start=1):
        c = ws.cell(row=1, column=i, value=h)
        c.font = Font(name=F, bold=True, color="FFFFFF", size=11)
        c.fill = HDR_FILL
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDER
        ws.column_dimensions[c.column_letter].width = w
    ws.row_dimensions[1].height = 34
    for i, v in enumerate(example, start=1):
        c = ws.cell(row=2, column=i, value=v)
        c.fill = CALC_FILL if i in calc_cols else EX_FILL
        c.font = Font(name=F, italic=True, color="555555")
        c.border = BORDER
    for r in range(3, 1503):
        for i in range(1, len(headers) + 1):
            c = ws.cell(row=r, column=i)
            c.fill = CALC_FILL if i in calc_cols else IN_FILL
            c.font = Font(name=F)
            c.border = BORDER
    ws.freeze_panes = "A2"
    return ws


def dv(ws, formula, rng, prompt=None):
    d = DataValidation(type="list", formula1=formula, allow_blank=True)
    d.error = "اختار من القائمة"
    d.errorTitle = "قيمة غير صحيحة"
    if prompt:
        d.prompt = prompt
        d.showInputMessage = True
    ws.add_data_validation(d)
    d.add(rng)


def text_cols(ws, cols):
    # phone numbers / codes stored as text so leading zeros are kept
    for col in cols:
        for r in range(2, N + 2):
            ws[f"{col}{r}"].number_format = "@"


# ---------- تعليمات ----------
ws = wb.active
ws.title = "تعليمات"
ws.sheet_view.rightToLeft = True
ws.column_dimensions["A"].width = 4
ws.column_dimensions["B"].width = 95
lines = [
    ("قالب بيانات السنتر", 16, True),
    ("املا الشيتات بالترتيب ده، والسيستم هيتبني ويتملى منها مرة واحدة:", 12, True),
    ("1) السنتر: بيانات السنتر الأساسية.", 11, False),
    ("2) المدرسين: كل مدرس في صف، بكود مختلف (T01, T02...) واتفاقه مع السنتر.", 11, False),
    ("3) الأسيستنتس: صف لكل أسيستنت مع كود مدرسه. المدرس ممكن يبقى ليه أكتر من أسيستنت.", 11, False),
    ("4) القاعات: اسم كل قاعة وسعتها.", 11, False),
    ("5) المجموعات: كل مجموعة في صف بكود مختلف (G01, G02...). اختار نظام الدفع (بالحصة / شهري) وفيه كويز وامتحان ولا لأ.", 11, False),
    ("6) الطلاب: كل طالب في صف واحد بس حتى لو بياخد مع أكتر من مدرس. الكود رقم قصير (1001, 1002...).", 11, False),
    ("7) الاشتراكات: صف لكل (طالب + مجموعة). الطالب اللي مع 3 مدرسين ياخد 3 صفوف.", 11, False),
    ("8) الملخص: بيتحسب لوحده، متكتبش فيه.", 11, False),
    ("", 11, False),
    ("الألوان:", 12, True),
    ("أصفر = خانات إنت بتملاها", 11, False),
    ("أزرق فاتح (الصف 2) = مثال للتوضيح، امسحه أو اكتب عليه بيانات حقيقية", 11, False),
    ("رمادي = بيتحسب لوحده، متكتبش فيه", 11, False),
    ("", 11, False),
    ("ملاحظات:", 12, True),
    ("• أرقام التليفون اكتبها كاملة 11 رقم (01xxxxxxxxx).", 11, False),
    ("• لو معلومة مش موجودة سيبها فاضية، المهم الاسم والكود والتليفون.", 11, False),
    ("• ممكن تنسخ وتلصق من أي شيت قديم عندك، بس خلي كل معلومة في عمودها.", 11, False),
]
for i, (t, s, b) in enumerate(lines, start=2):
    c = ws.cell(row=i, column=2, value=t)
    c.font = Font(name=F, size=s, bold=b)
for r, fill in ((14, IN_FILL), (15, EX_FILL), (16, CALC_FILL)):
    ws.cell(row=r, column=1).fill = fill

# ---------- السنتر ----------
ws = wb.create_sheet("السنتر")
ws.sheet_view.rightToLeft = True
ws.column_dimensions["A"].width = 28
ws.column_dimensions["B"].width = 40
rows = [("اسم السنتر", "سنتر هنداوي"), ("العنوان", ""), ("رقم السنتر", ""),
        ("اسم صاحب السنتر", ""), ("رقم صاحب السنتر", ""),
        ("الصفوف الدراسية (افصل بفاصلة)", "1 إعدادي, 2 إعدادي, 3 إعدادي, 1 ثانوي, 2 ثانوي, 3 ثانوي")]
for i, (k, v) in enumerate(rows, start=1):
    a = ws.cell(row=i, column=1, value=k); a.font = Font(name=F, bold=True, color="FFFFFF"); a.fill = HDR_FILL; a.border = BORDER
    b = ws.cell(row=i, column=2, value=v or None); b.font = Font(name=F); b.fill = IN_FILL; b.border = BORDER
ws["B3"].number_format = "@"; ws["B5"].number_format = "@"

# ---------- المدرسين ----------
ws = sheet("المدرسين",
           ["كود المدرس", "اسم المدرس", "المادة", "رقم الموبايل", "نوع الاتفاق مع السنتر",
            "قيمة الاتفاق", "ملاحظات"],
           [12, 24, 16, 16, 22, 14, 24],
           ["T01", "أ/ محمد حسن", "فيزياء", "01012345678", "نسبة %", 20, "النسبة 20%"])
dv(ws, '"نسبة %,مبلغ على كل طالب,إيجار قاعة للحصة,إيجار شهري"', "E2:E1502",
   "نسبة: اكتب الرقم (20 يعني 20%). باقي الأنواع: اكتب المبلغ بالجنيه")
text_cols(ws, ["D"])

# ---------- الأسيستنتس (أكتر من واحد لكل مدرس) ----------
ws = sheet("الأسيستنتس", ["كود المدرس", "اسم المدرس", "اسم الأسيستنت", "رقم الأسيستنت"], [12, 22, 24, 16],
           ["T01", None, "أحمد علي", "01198765432"], calc_cols=(2,))
for r in range(2, 1503):
    ws[f"B{r}"] = f'=IF(A{r}="","",IFERROR(INDEX(\'المدرسين\'!$B:$B,MATCH(A{r},\'المدرسين\'!$A:$A,0)),"كود غلط"))'
dv(ws, "='المدرسين'!$A$2:$A$1502", "A2:A1502")
text_cols(ws, ["D"])

# ---------- القاعات ----------
ws = sheet("القاعات", ["اسم القاعة", "السعة (عدد الطلاب)", "ملاحظات"], [20, 18, 30],
           ["قاعة 1", 60, "فيها بروجكتور"])

# ---------- المجموعات ----------
ws = sheet("المجموعات",
           ["كود المجموعة", "كود المدرس", "اسم المدرس", "الصف", "اسم المجموعة", "اليوم",
            "اليوم التاني (لو فيه)", "الساعة", "القاعة", "سعر الحصة (ج)", "بنين / بنات",
            "نظام الدفع", "الاشتراك الشهري (ج)", "كويز", "امتحان", "عدد الطلاب"],
           [13, 12, 22, 12, 16, 12, 16, 10, 12, 13, 12, 12, 14, 8, 8, 11],
           ["G01", "T01", None, "3 ثانوي", "مجموعة أ", "السبت", "الثلاثاء", "4:00 م", "قاعة 1", 60, "مختلط", "بالحصة", 240, "أيوه", "لأ", None],
           calc_cols=(3, 16))
for r in range(2, 1503):
    ws[f"C{r}"] = f'=IF(B{r}="","",IFERROR(INDEX(\'المدرسين\'!$B:$B,MATCH(B{r},\'المدرسين\'!$A:$A,0)),"كود غلط"))'
    ws[f"P{r}"] = f'=IF(A{r}="","",COUNTIF(\'الاشتراكات\'!$B:$B,A{r}))'
dv(ws, '"بالحصة,شهري"', "L2:L1502")
dv(ws, '"أيوه,لأ"', "N2:N1502"); dv(ws, '"أيوه,لأ"', "O2:O1502")
dv(ws, "='المدرسين'!$A$2:$A$1502", "B2:B1502")
dv(ws, "='القاعات'!$A$2:$A$1502", "I2:I1502")
days = '"السبت,الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس,الجمعة"'
dv(ws, days, "F2:F1502"); dv(ws, days, "G2:G1502")
dv(ws, '"1 إعدادي,2 إعدادي,3 إعدادي,1 ثانوي,2 ثانوي,3 ثانوي"', "D2:D1502")
dv(ws, '"بنين,بنات,مختلط"', "K2:K1502")

# ---------- الطلاب ----------
ws = sheet("الطلاب",
           ["كود الطالب", "اسم الطالب (رباعي)", "النوع", "الصف", "رقم الطالب", "اسم ولي الأمر",
            "رقم ولي الأمر", "المدرسة", "ملاحظات", "عدد المجموعات"],
           [12, 28, 9, 12, 16, 22, 16, 20, 22, 13],
           [1001, "يوسف أحمد محمود السيد", "ذكر", "3 ثانوي", "01012345678", "أحمد محمود", "01198765432", "", "", None],
           calc_cols=(10,))
for r in range(2, 1503):
    ws[f"J{r}"] = f'=IF(A{r}="","",COUNTIF(\'الاشتراكات\'!$A:$A,A{r}))'
dv(ws, '"ذكر,أنثى"', "C2:C1502")
dv(ws, '"1 إعدادي,2 إعدادي,3 إعدادي,1 ثانوي,2 ثانوي,3 ثانوي"', "D2:D1502")
text_cols(ws, ["E", "G"])
# highlight duplicate student codes
ws.conditional_formatting.add("A2:A1502", FormulaRule(formula=['AND(A2<>"",COUNTIF($A$2:$A$1502,A2)>1)'],
                                                     fill=PatternFill("solid", fgColor="FCA5A5")))

# ---------- الاشتراكات ----------
ws = sheet("الاشتراكات",
           ["كود الطالب", "كود المجموعة", "اسم الطالب", "المدرس", "المجموعة", "دين قديم (ج)"],
           [12, 13, 28, 22, 26, 13],
           [1001, "G01", None, None, None, 0],
           calc_cols=(3, 4, 5))
for r in range(2, 1503):
    ws[f"C{r}"] = f'=IF(A{r}="","",IFERROR(INDEX(\'الطلاب\'!$B:$B,MATCH(A{r},\'الطلاب\'!$A:$A,0)),"كود غلط"))'
    ws[f"D{r}"] = f'=IF(B{r}="","",IFERROR(INDEX(\'المجموعات\'!$C:$C,MATCH(B{r},\'المجموعات\'!$A:$A,0)),"كود غلط"))'
    ws[f"E{r}"] = (f'=IF(B{r}="","",IFERROR(INDEX(\'المجموعات\'!$D:$D,MATCH(B{r},\'المجموعات\'!$A:$A,0))'
                   f'&" - "&INDEX(\'المجموعات\'!$E:$E,MATCH(B{r},\'المجموعات\'!$A:$A,0)),"كود غلط"))')
dv(ws, "='المجموعات'!$A$2:$A$1502", "B2:B1502")

# ---------- الملخص ----------
ws = wb.create_sheet("الملخص")
ws.sheet_view.rightToLeft = True
ws.column_dimensions["A"].width = 30
ws.column_dimensions["B"].width = 14
summ = [("عدد المدرسين", "=COUNTA('المدرسين'!A2:A1502)"),
        ("عدد القاعات", "=COUNTA('القاعات'!A2:A1502)"),
        ("عدد المجموعات", "=COUNTA('المجموعات'!A2:A1502)"),
        ("عدد الطلاب", "=COUNTA('الطلاب'!A2:A1502)"),
        ("عدد الاشتراكات", "=COUNTA('الاشتراكات'!A2:A1502)"),
        ("طلاب من غير مجموعة", "=COUNTIFS('الطلاب'!A2:A1502,\"<>\",'الطلاب'!J2:J1502,0)"),
        ("أكواد طلاب مكررة", "=SUMPRODUCT(('الطلاب'!A2:A1502<>\"\")*(COUNTIF('الطلاب'!A2:A1502,'الطلاب'!A2:A1502)>1))"),
        ("أكواد غلط في الاشتراكات", "=COUNTIF('الاشتراكات'!C2:E1502,\"كود غلط\")")]
for i, (k, f) in enumerate(summ, start=1):
    a = ws.cell(row=i, column=1, value=k); a.font = Font(name=F, bold=True, color="FFFFFF"); a.fill = HDR_FILL; a.border = BORDER
    b = ws.cell(row=i, column=2, value=f); b.font = Font(name=F, bold=True); b.fill = CALC_FILL; b.border = BORDER
    b.alignment = Alignment(horizontal="center")

wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print("saved", OUT)
