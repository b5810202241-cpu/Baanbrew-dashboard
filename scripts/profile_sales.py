"""
Data profiling ของ sales_raw.csv (รายงานอย่างเดียว ไม่แก้ข้อมูล)

วิธีรัน:  python profile_sales.py public/sales_raw.csv
"""
import sys

import pandas as pd

path = sys.argv[1] if len(sys.argv) > 1 else "public/sales_raw.csv"

# อ่านทุกคอลัมน์เป็น str และให้ค่าว่างเป็น "" (ไม่แปลงเป็น NaN)
# utf-8-sig = ตัด BOM ต้นไฟล์ออก ไม่งั้นชื่อคอลัมน์แรกจะเป็น "﻿order_id"
df = pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8-sig")

# สาขาที่ถูกต้อง (ชื่อทางการ 5 สาขา)
VALID_BRANCHES = {"สยาม", "สีลม", "บางนา", "มหาวิทยาลัย", "อารีย์"}

pd.set_option("display.width", 200)
pd.set_option("display.max_colwidth", 60)


def section(title):
    print(f"\n{'=' * 8} {title} {'=' * 8}")


print(f"ไฟล์: {path}")
print(f"จำนวนแถว: {len(df):,}  จำนวนคอลัมน์: {df.shape[1]}")
print(f"คอลัมน์: {list(df.columns)}")

# 1) ค่าว่างและค่าไม่ซ้ำของแต่ละคอลัมน์
#    นับ "ว่าง" รวมค่าที่มีแต่ช่องว่าง เช่น "  " ด้วย
section("1) ค่าว่าง / ค่าไม่ซ้ำ ต่อคอลัมน์")
summary = pd.DataFrame(
    {
        "ค่าว่าง": (df.apply(lambda s: s.str.strip() == "")).sum(),
        "ค่าไม่ซ้ำ": df.nunique(),
    }
)
print(summary.to_string())

# 2) แถวที่ซ้ำกันทุกคอลัมน์ (นับเฉพาะแถวที่ซ้ำ ไม่นับแถวแรกของกลุ่ม)
section("2) แถวซ้ำทุกคอลัมน์")
dup_mask = df.duplicated(keep="first")
n_dup = int(dup_mask.sum())
print(f"n_dup = {n_dup:,}")
if n_dup:
    print(df[df.duplicated(keep=False)].sort_values(list(df.columns)).head(6).to_string())

# 3) datetime ที่ไม่ใช่รูปแบบ YYYY-MM-DDT... ที่เป็นปี ค.ศ. (19xx/20xx)
#    เช่น ปี พ.ศ. 2568-..., รูปแบบ 01/04/2025, หรือค่าว่าง จะนับเป็นผิด
section("3) datetime ผิดรูปแบบ")
dt_ok = df["datetime"].str.match(r"^(19|20)\d{2}-\d{2}-\d{2}T")
bad_dt = df.loc[~dt_ok, "datetime"]
n_bad_dt = int((~dt_ok).sum())
print(f"n_bad_dt = {n_bad_dt:,}")
if n_bad_dt:
    print("ตัวอย่าง (ค่าที่พบบ่อยสุด):")
    print(bad_dt.value_counts().head(10).to_string())

# 4) ชื่อสาขาทั้งหมดพร้อมจำนวนแถว
#    ใช้ repr() เพื่อให้เห็นช่องว่างหัว/ท้ายที่มองไม่เห็น
section("4) ชื่อสาขา")
branch_counts = df["branch"].value_counts()
for name, count in branch_counts.items():
    flag = "" if name in VALID_BRANCHES else "   <-- ไม่ตรงชื่อทางการ"
    print(f"{name!r:<22} {count:>7,}{flag}")
n_bad_branch = int((~df["branch"].isin(VALID_BRANCHES)).sum())
print(f"n_bad_branch = {n_bad_branch:,}")

# 5) unit_price ที่แปลงเป็นตัวเลขไม่ได้ และที่ติดลบ
section("5) unit_price")
price_num = pd.to_numeric(df["unit_price"], errors="coerce")
price_text_mask = price_num.isna()  # รวมค่าว่างด้วย
n_price_text = int(price_text_mask.sum())
n_price_neg = int((price_num < 0).sum())
print(f"n_price_text = {n_price_text:,}")
if n_price_text:
    print("ตัวอย่าง:")
    print(df.loc[price_text_mask, "unit_price"].map(repr).value_counts().head(10).to_string())
print(f"n_price_neg  = {n_price_neg:,}")
if n_price_neg:
    print("ตัวอย่าง:")
    print(df.loc[price_num < 0, ["order_id", "product_id", "qty", "unit_price"]].head(5).to_string())

# 6) qty = 0 และ product_id ว่าง
section("6) qty = 0 / product_id ว่าง")
qty_num = pd.to_numeric(df["qty"], errors="coerce")
n_qty_zero = int((qty_num == 0).sum())
n_missing_product = int((df["product_id"].str.strip() == "").sum())
print(f"n_qty_zero        = {n_qty_zero:,}")
print(f"n_missing_product = {n_missing_product:,}")
n_qty_text = int(qty_num.isna().sum())
if n_qty_text:
    print(f"(เพิ่มเติม) qty ที่แปลงเป็นตัวเลขไม่ได้ = {n_qty_text:,}:",
          df.loc[qty_num.isna(), "qty"].map(repr).value_counts().head(5).to_dict())

# สรุป
section("สรุป")
results = {
    "n_dup": n_dup,
    "n_bad_dt": n_bad_dt,
    "n_bad_branch": n_bad_branch,
    "n_price_text": n_price_text,
    "n_price_neg": n_price_neg,
    "n_qty_zero": n_qty_zero,
    "n_missing_product": n_missing_product,
}
for k, v in results.items():
    print(f"{k:<18} {v:>7,}")
