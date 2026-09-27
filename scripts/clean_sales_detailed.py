import re
import pandas as pd

clean = df.copy()
COLS = list(df.columns)
rows_before = len(clean)
log = []
def add_log(step, n, decision):
    log.append({"ขั้นตอน": step, "จำนวนแถวที่กระทบ": int(n), "การตัดสินใจ": decision})

# 1) แถวซ้ำทุกคอลัมน์
dup = clean.duplicated(keep="first")
clean = clean[~dup]
add_log("1. ลบแถวซ้ำทุกคอลัมน์", dup.sum(), "เทียบทั้งแถว เก็บแถวแรก (ไม่ใช้ order_id เพราะ 1 บิลมีหลายแถว)")

# 2) datetime -> YYYY-MM-DDTHH:MM:SS+07:00 ปี ค.ศ. (ไม่ใช้ pd.to_datetime)
ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(.*)$")
DMY = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$")
def parse_dt(v):
    s = v.strip()
    m = ISO.match(s)
    if m:
        y, mo, d, h, mi, sec, tz = m.groups(); fmt = "iso"
    else:
        m = DMY.match(s)
        if not m:
            return pd.Series([None, "bad", False, False])
        d, mo, y, h, mi, sec = m.groups(); tz = ""; fmt = "dmy"   # วันมาก่อนเดือนเสมอ
    y = int(y); be = y > 2400
    if be:
        y -= 543
    other_tz = tz not in ("", "+07:00")
    out = f"{y:04d}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{mi}:{sec or '00'}+07:00"
    if other_tz:   # แปลงเวลาจาก timezone อื่นเป็นเวลาไทย
        out = pd.Timestamp(f"{y:04d}-{mo}-{d}T{h}:{mi}:{sec or '00'}{tz}").tz_convert("+07:00").strftime("%Y-%m-%dT%H:%M:%S+07:00")
    pd.Timestamp(out)   # ตรวจว่าเป็นวันที่มีจริง
    return pd.Series([out, f"{fmt}_{'be' if be else 'ce'}", sec is None, other_tz])

p = clean["datetime"].apply(parse_dt)
p.columns = ["new", "kind", "no_sec", "other_tz"]
add_log("2.1 datetime ISO ปี ค.ศ.", (p.kind == "iso_ce").sum(), "ปรับรูปแบบเป็น YYYY-MM-DDTHH:MM:SS+07:00")
add_log("2.2 datetime ISO ปี พ.ศ.", (p.kind == "iso_be").sum(), "ลบ 543 ปี แล้วปรับรูปแบบ")
add_log("2.3 datetime DD/MM/YYYY ปี ค.ศ.", (p.kind == "dmy_ce").sum(), "อ่านเป็น วัน/เดือน/ปี แล้วปรับรูปแบบ")
add_log("2.4 datetime DD/MM/YYYY ปี พ.ศ.", (p.kind == "dmy_be").sum(), "อ่านเป็น วัน/เดือน/ปี ลบ 543 ปี แล้วปรับรูปแบบ")
add_log("2.5 datetime ไม่มีวินาที", p.no_sec.sum(), "เติมวินาทีเป็น 00")
add_log("2.6 datetime timezone อื่น", p.other_tz.sum(), "แปลงเป็นเวลาไทย +07:00")
bad_dt = p.kind == "bad"
add_log("2.7 datetime แปลงไม่ได้", bad_dt.sum(), f"ลบแถว (ตัวอย่าง: {clean.loc[bad_dt, 'datetime'].head(3).tolist()})")
clean["datetime"] = p.new
clean = clean[~bad_dt]

# 3) สาขา: strip ก่อน แล้ว map
STANDARD = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"]
BRANCH_ALIASES = {"siam": "สยาม", "สาขาสยาม": "สยาม", "silom": "สีลม", "bangna": "บางนา",
                  "ari": "อารีย์", "อารีย": "อารีย์",          # 'อารีย' ไม่มีไม้ยมก
                  "มหาลัย": "มหาวิทยาลัย", "ม.": "มหาวิทยาลัย"}
before = clean["branch"]
stripped = before.str.strip()                                   # นับก่อน-หลัง strip จาก Series เดิม
mapped = stripped.map(lambda b: BRANCH_ALIASES.get(b.lower(), b))
unmapped = ~mapped.isin(STANDARD)
add_log("3.1 สาขา: ตัดช่องว่างหัว/ท้าย", (stripped != before).sum(), "strip()")
add_log("3.2 สาขา: map ชื่อที่สะกดต่าง", (mapped != stripped).sum(), "map เป็นชื่อมาตรฐาน")
add_log("3.3 สาขา: map ไม่ได้", unmapped.sum(), f"ต้องเพิ่มใน BRANCH_ALIASES (ตัวอย่าง: {mapped[unmapped].value_counts().head(3).to_dict()})")
clean["branch"] = mapped

# 4) unit_price
raw = clean["unit_price"]
text = raw.str.contains(r"[^\d\-.]", regex=True)
num = pd.to_numeric(raw.str.replace(r"บาท|฿|,|\s", "", regex=True), errors="coerce")
bad_price = num.isna()
add_log("4.1 unit_price: ตัด 'บาท' / ฿ / คอมมา", text.sum(), "ลบตัวอักษรที่ไม่ใช่ตัวเลข")
add_log("4.2 unit_price: แปลงเป็นตัวเลขไม่ได้/ว่าง", bad_price.sum(), f"ลบแถว (ตัวอย่าง: {raw[bad_price].head(3).tolist()})")
neg = num < 0
add_log("4.3 unit_price: ติดลบ", neg.sum(), "กลับเป็นค่าบวก (ตรงกับราคาปกติ ถือว่าพิมพ์เครื่องหมายลบผิด)")
num = num.abs()
frac = (num % 1 != 0) & num.notna()
add_log("4.4 unit_price: มีทศนิยม", frac.sum(), "ปัดเป็นจำนวนเต็ม (.5 ปัดขึ้น)")
clean = clean[~bad_price]
clean["unit_price"] = (num[~bad_price] + 0.5).floordiv(1).astype(int)

# 5-6) qty = 0 และ product_id ว่าง
qty0 = pd.to_numeric(clean["qty"].str.strip(), errors="coerce") == 0
clean = clean[~qty0]
add_log("5. ลบแถว qty = 0", qty0.sum(), "ลบแถว (ไม่มีการขายจริง)")
nop = clean["product_id"].str.strip() == ""
clean = clean[~nop]
add_log("6. ลบแถว product_id ว่าง", nop.sum(), "ลบแถว (ระบุสินค้าไม่ได้)")

# 7) แถวที่ซ้ำหลังทำความสะอาด (เดิมต่างกันแค่รูปแบบ)
dup2 = clean.duplicated(keep="first")
clean = clean[~dup2]
add_log("7. ลบแถวที่ซ้ำหลังทำความสะอาด", dup2.sum(), "แถวที่ต่างกันแค่รูปแบบ ถือเป็นรายการเดียวกัน")

clean = clean[COLS].reset_index(drop=True)
cleaning_log = pd.DataFrame(log)
display(cleaning_log) if "display" in globals() else print(cleaning_log.to_string(index=False))
print(f"\nจำนวนแถวก่อน: {rows_before:,}\nจำนวนแถวหลัง: {len(clean):,}\nลบไปทั้งหมด : {rows_before - len(clean):,}")
