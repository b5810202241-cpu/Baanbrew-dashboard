"""
ทำความสะอาด sales_raw.csv  (ขั้นที่ 4)
- ทำงานบน clean = df.copy() เท่านั้น ไม่แก้ df
- ทุกขั้นตอนบันทึก log: (ขั้นตอน, จำนวนแถวที่กระทบ, การตัดสินใจ)

ใช้ใน Colab: วางทั้งเซลล์ (มีบรรทัดอ่านไฟล์อยู่ด้านบนแล้ว)
"""
import re

import pandas as pd

# ------------------------------------------------------------------
# 0) อ่านข้อมูลดิบ: ทุกคอลัมน์เป็น str, ค่าว่างเป็น "", ตัด BOM
#    (ถ้ามี df อยู่แล้วจากเซลล์ก่อน ลบ 2 บรรทัดนี้ได้)
# ------------------------------------------------------------------
if "df" not in globals():
    df = pd.read_csv("sales_raw.csv", dtype=str, keep_default_na=False, encoding="utf-8-sig")

clean = df.copy()
ORIGINAL_COLUMNS = list(df.columns)
rows_before = len(clean)
log = []


def add_log(step, n_rows, decision):
    log.append({"ขั้นตอน": step, "จำนวนแถวที่กระทบ": int(n_rows), "การตัดสินใจ": decision})


# ------------------------------------------------------------------
# 1) ลบแถวที่ซ้ำกันทุกคอลัมน์
#    ใช้ duplicated() ทั้งแถว ไม่ใช่ order_id เพราะ 1 บิลมีหลายแถว
# ------------------------------------------------------------------
dup = clean.duplicated(keep="first")
clean = clean[~dup]
add_log("1. ลบแถวซ้ำทุกคอลัมน์", dup.sum(), "เก็บแถวแรกของแต่ละชุด ลบแถวที่เกินมา")

# ------------------------------------------------------------------
# 2) แปลง datetime เป็น YYYY-MM-DDTHH:MM:SS+07:00 ปี ค.ศ.
#    ไม่ใช้ pd.to_datetime() เพราะ
#      - อาจอ่าน 01/04 เป็น 4 ม.ค. (สลับวัน/เดือน)
#      - อาจแปลงเป็นเวลา UTC ทำให้ชั่วโมงเลื่อน 7 ชม.
#    จึงแยกส่วนด้วย regex แล้วประกอบข้อความใหม่เอง
# ------------------------------------------------------------------
ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?")
DMY = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$")


def to_iso_bangkok(value):
    """คืน (ค่าที่แปลงแล้ว, ชนิด) หรือ (None, 'unparsed') ถ้าอ่านไม่ได้"""
    s = value.strip()
    m = ISO.match(s)
    if m:
        y, mo, d, h, mi, sec = m.groups()
        kind = "iso_ce"
    else:
        m = DMY.match(s)
        if not m:
            return None, "unparsed"
        d, mo, y, h, mi, sec = m.groups()   # DD/MM/YYYY: วันมาก่อนเดือนเสมอ
        kind = "dmy"
    y = int(y)
    if y > 2400:                           # ปี พ.ศ. → ค.ศ.
        y -= 543
        kind += "_be"
    sec = sec or "00"                      # ไม่มีวินาทีให้ใส่ 00
    out = f"{y:04d}-{int(mo):02d}-{int(d):02d}T{int(h):02d}:{mi}:{sec}+07:00"
    pd.Timestamp(out)                      # ตรวจว่าเป็นวันที่มีจริง (error ถ้าไม่มี)
    return out, kind


parsed = clean["datetime"].map(to_iso_bangkok)
new_dt = parsed.map(lambda t: t[0])
kinds = parsed.map(lambda t: t[1])
if new_dt.isna().any():
    raise ValueError(f"มี datetime ที่อ่านไม่ได้: {clean.loc[new_dt.isna(), 'datetime'].head().tolist()}")
changed = new_dt != clean["datetime"]
clean["datetime"] = new_dt
k = kinds.value_counts()
add_log(
    "2. แปลง datetime เป็น ISO ปี ค.ศ. +07:00",
    changed.sum(),
    f"ISO พ.ศ. {k.get('iso_ce_be', 0)} แถว → ลบ 543 | DD/MM/YYYY ค.ศ. {k.get('dmy', 0)} แถว "
    f"| DD/MM/YYYY พ.ศ. {k.get('dmy_be', 0)} แถว | ไม่มีวินาทีใส่ :00",
)

# ------------------------------------------------------------------
# 3) ชื่อสาขา: strip ก่อน แล้วค่อย map (ไม่ strip "สยาม␣" จะไม่ถูกแก้)
# ------------------------------------------------------------------
STANDARD_BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"]
BRANCH_MAP = {
    "siam": "สยาม", "สาขาสยาม": "สยาม",
    "silom": "สีลม",
    "ari": "อารีย์", "อารีย": "อารีย์",
    "bangna": "บางนา",
    "มหาลัย": "มหาวิทยาลัย", "ม.": "มหาวิทยาลัย",
}
before_branch = clean["branch"]
stripped = before_branch.str.strip()
mapped = stripped.map(lambda b: BRANCH_MAP.get(b.lower(), b))
unknown = ~mapped.isin(STANDARD_BRANCHES)
if unknown.any():
    raise ValueError(f"มีชื่อสาขาที่ยังไม่รู้จัก: {mapped[unknown].value_counts().to_dict()}")
changed = mapped != before_branch
clean["branch"] = mapped
add_log(
    "3. ทำชื่อสาขาให้เป็นมาตรฐาน",
    changed.sum(),
    f"strip ช่องว่าง {int((stripped != before_branch).sum())} แถว แล้ว map ชื่ออังกฤษ/ชื่อย่อ "
    f"{int((mapped != stripped).sum())} แถว → เหลือ 5 สาขา",
)

# ------------------------------------------------------------------
# 4) unit_price: ตัด "บาท" → ตัวเลข → ราคาติดลบใช้ค่าสัมบูรณ์ → จำนวนเต็ม
#    เหตุผล: ราคาติดลบทุกแถวเมื่อตัดเครื่องหมายลบแล้ว ตรงกับราคาปกติของสินค้านั้น
#    จึงถือว่าพิมพ์เครื่องหมายลบผิด ไม่ใช่การคืนเงิน
# ------------------------------------------------------------------
raw_price = clean["unit_price"]
has_text = raw_price.str.contains("บาท")
price = pd.to_numeric(raw_price.str.replace("บาท", "", regex=False).str.strip(), errors="coerce")
if price.isna().any():
    raise ValueError(f"unit_price แปลงไม่ได้: {raw_price[price.isna()].head().tolist()}")
negative = price < 0
price = price.abs()
if (price % 1 != 0).any():
    raise ValueError(f"unit_price มีทศนิยม: {price[price % 1 != 0].head().tolist()}")
clean["unit_price"] = price.astype(int)   # ชนิดข้อมูลเป็นจำนวนเต็ม (int64)
add_log("4a. unit_price ตัดคำว่า 'บาท'", has_text.sum(), "ลบ 'บาท' และทศนิยม .00 แล้วแปลงเป็นจำนวนเต็ม")
add_log("4b. unit_price ติดลบ", negative.sum(), "ใช้ค่าสัมบูรณ์ (ถือว่าพิมพ์เครื่องหมายลบผิด)")

# ------------------------------------------------------------------
# 5) ลบแถว qty = 0 และแถว product_id ว่าง
# ------------------------------------------------------------------
qty_zero = pd.to_numeric(clean["qty"].str.strip(), errors="coerce") == 0
clean = clean[~qty_zero]
add_log("5a. ลบแถว qty = 0", qty_zero.sum(), "ไม่มีการขายจริง ลบทิ้ง")

no_product = clean["product_id"].str.strip() == ""
clean = clean[~no_product]
add_log("5b. ลบแถว product_id ว่าง", no_product.sum(), "ไม่รู้ว่าขายสินค้าอะไร ลบทิ้ง")

# ------------------------------------------------------------------
# 6) คอลัมน์และลำดับเหมือนเดิม + รีเซ็ต index
# ------------------------------------------------------------------
clean = clean[ORIGINAL_COLUMNS].reset_index(drop=True)
rows_after = len(clean)

# ------------------------------------------------------------------
# สรุป
# ------------------------------------------------------------------
cleaning_log = pd.DataFrame(log)   # ตัวแปรที่ตัวตรวจต้องการ
pd.set_option("display.max_colwidth", 120)
print(cleaning_log.to_string(index=False))
print(f"\nจำนวนแถว: ก่อน {rows_before:,} → หลัง {rows_after:,} (ลบ {rows_before - rows_after:,})")
print(f"df ยังเหมือนเดิม: {len(df):,} แถว")

# (ไม่บังคับ) บันทึกไฟล์:
# clean.to_csv("sales_clean.csv", index=False, encoding="utf-8-sig")
