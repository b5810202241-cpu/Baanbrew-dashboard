// ตรรกะคำนวณทั้งหมดของ Dashboard
// รับ "rows" = อาร์เรย์ของอ็อบเจกต์ที่ PapaParse อ่านจาก sales.csv (header: true)

/** แปลงแถวดิบจาก CSV ให้เป็นตัวเลข/ข้อความที่พร้อมคำนวณ และตัดแถวที่ใช้ไม่ได้ทิ้ง */
export function cleanRows(rawRows) {
  return rawRows
    .map((r) => ({
      orderId: (r.order_id ?? '').trim(),
      datetime: (r.datetime ?? '').trim(),
      branch: (r.branch ?? '').trim(),
      productId: (r.product_id ?? '').trim(),
      qty: Number(r.qty),
      unitPrice: Number(r.unit_price),
      customerId: (r.customer_id ?? '').trim(), // '' = ลูกค้าทั่วไป
    }))
    .filter(
      (r) =>
        r.orderId &&
        r.datetime.length >= 10 &&
        Number.isFinite(r.qty) &&
        Number.isFinite(r.unitPrice),
    )
}

/** ยอดขายของ 1 แถว = qty × unit_price */
export function lineRevenue(row) {
  return row.qty * row.unitPrice
}

/** ยอดขายรวม = ผลรวมของ qty × unit_price ทุกแถว */
export function totalRevenue(rows) {
  return rows.reduce((sum, r) => sum + lineRevenue(r), 0)
}

/** จำนวนบิล = จำนวน order_id ที่ไม่ซ้ำ (บิลเดียวมีหลายแถวได้) */
export function orderCount(rows) {
  return new Set(rows.map((r) => r.orderId)).size
}

/** ยอดเฉลี่ยต่อบิล = ยอดขายรวม ÷ จำนวนบิล (ไม่ใช่ค่าเฉลี่ยต่อแถว) */
export function averageOrderValue(rows) {
  const orders = orderCount(rows)
  return orders === 0 ? 0 : totalRevenue(rows) / orders
}

/** จำนวนลูกค้าสมาชิกที่ไม่ซ้ำ = customer_id ที่ไม่ว่างและไม่ซ้ำกัน */
export function uniqueMemberCount(rows) {
  return new Set(rows.map((r) => r.customerId).filter(Boolean)).size
}

/**
 * วันที่ตามเวลาไทย "YYYY-MM-DD"
 * ตัด 10 ตัวอักษรแรกของ datetime ตรง ๆ เพราะข้อมูลเป็นเวลาไทย (+07:00) อยู่แล้ว
 * ไม่ใช้ new Date() เพื่อไม่ให้วันเลื่อนเมื่อเครื่องที่เปิดตั้ง timezone อื่น
 */
export function thaiDateKey(datetime) {
  return datetime.slice(0, 10)
}

/** ยอดขายรายวัน: รวมยอดตามวันที่ แล้วเรียงวันจากเก่าไปใหม่ → [{ date, revenue }] */
export function dailyRevenue(rows) {
  const byDay = new Map()
  for (const r of rows) {
    const day = thaiDateKey(r.datetime)
    byDay.set(day, (byDay.get(day) ?? 0) + lineRevenue(r))
  }
  return [...byDay]
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** เติมค่าเฉลี่ยเคลื่อนที่ 7 วัน (ma7) ลงในผลลัพธ์ของ dailyRevenue */
export function withMovingAverage(daily, window = 7) {
  return daily.map((d, i) => {
    const slice = daily.slice(Math.max(0, i - window + 1), i + 1)
    const avg = slice.reduce((sum, r) => sum + r.revenue, 0) / slice.length
    return { ...d, ma7: avg }
  })
}

/** จำนวนสินค้าที่ขายได้ (แก้ว/ชิ้น) = ผลรวม qty ทุกแถว */
export function totalQuantity(rows) {
  return rows.reduce((sum, r) => sum + r.qty, 0)
}

/** ยอดขายเฉลี่ยต่อวัน = ยอดขายรวม ÷ จำนวนวันที่มียอดขาย */
export function averageDailyRevenue(daily) {
  if (daily.length === 0) return 0
  return daily.reduce((sum, d) => sum + d.revenue, 0) / daily.length
}

/** วันที่ขายดีที่สุด = วันที่มี revenue สูงสุดใน dailyRevenue → { date, revenue } */
export function bestDay(daily) {
  return daily.reduce((best, d) => (best === null || d.revenue > best.revenue ? d : best), null)
}

/** สินค้าขายดี n อันดับ: รวมยอดตาม product_id เรียงมากไปน้อย แล้วตัดเอา n ตัวแรก → [{ productId, revenue, qty }] */
export function topProducts(rows, n = 8) {
  const byProduct = new Map()
  for (const r of rows) {
    const cur = byProduct.get(r.productId) ?? { productId: r.productId, revenue: 0, qty: 0 }
    cur.revenue += lineRevenue(r)
    cur.qty += r.qty
    byProduct.set(r.productId, cur)
  }
  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, n)
}

/**
 * ยอดขายตามช่วงเวลา (รายชั่วโมง รวมทุกวัน)
 * ชั่วโมง = ตัวอักษรตำแหน่ง 11–12 ของ datetime (เช่น "2025-04-01T18:48:40+07:00" → 18) เป็นเวลาไทยอยู่แล้ว
 * เติมชั่วโมงที่ไม่มียอดเป็น 0 ระหว่างชั่วโมงแรกถึงชั่วโมงสุดท้าย → [{ hour, label: "08:00", revenue }]
 */
export function revenueByHour(rows) {
  const byHour = new Map()
  for (const r of rows) {
    const hour = Number(r.datetime.slice(11, 13))
    if (!Number.isInteger(hour)) continue
    byHour.set(hour, (byHour.get(hour) ?? 0) + lineRevenue(r))
  }
  if (byHour.size === 0) return []
  const hours = [...byHour.keys()]
  const result = []
  for (let h = Math.min(...hours); h <= Math.max(...hours); h++) {
    result.push({ hour: h, label: `${String(h).padStart(2, '0')}:00`, revenue: byHour.get(h) ?? 0 })
  }
  return result
}

/** คอลัมน์ที่ไฟล์ CSV ต้องมี ใช้ตรวจไฟล์ที่ผู้ใช้อัปโหลด */
export const REQUIRED_COLUMNS = ['order_id', 'datetime', 'branch', 'product_id', 'qty', 'unit_price', 'customer_id']

/** คืนรายชื่อคอลัมน์ที่ขาดไป (อาร์เรย์ว่าง = ครบ) */
export function missingColumns(fields = []) {
  return REQUIRED_COLUMNS.filter((c) => !fields.includes(c))
}

/** ยอดขายแยกสาขา: รวมยอดตาม branch แล้วเรียงจากมากไปน้อย → [{ branch, revenue }] */
export function revenueByBranch(rows) {
  const byBranch = new Map()
  for (const r of rows) {
    const key = r.branch || 'ไม่ระบุสาขา'
    byBranch.set(key, (byBranch.get(key) ?? 0) + lineRevenue(r))
  }
  return [...byBranch]
    .map(([branch, revenue]) => ({ branch, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

/** คำนวณทุกค่าที่ Dashboard ใช้ในครั้งเดียว */
export function computeDashboard(rawRows) {
  const rows = cleanRows(rawRows)
  const daily = dailyRevenue(rows)
  return {
    rowCount: rows.length,
    totalRevenue: totalRevenue(rows),
    orderCount: orderCount(rows),
    averageOrderValue: averageOrderValue(rows),
    uniqueMembers: uniqueMemberCount(rows),
    totalQuantity: totalQuantity(rows),
    averageDailyRevenue: averageDailyRevenue(daily),
    bestDay: bestDay(daily),
    daily: withMovingAverage(daily),
    byBranch: revenueByBranch(rows),
    topProducts: topProducts(rows, 8),
    byHour: revenueByHour(rows),
  }
}

// ---------- การจัดรูปแบบตัวเลข/วันที่ ----------

const intFmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })
const moneyFmt = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** ตัวเลขมีจุลภาค เช่น 34,791 */
export const formatNumber = (n) => intFmt.format(n)

/** เงินบาท เช่น ฿4,466,821 หรือ ฿128.39 เมื่อ decimals = true */
export const formatBaht = (n, decimals = false) =>
  `฿${(decimals ? moneyFmt : intFmt).format(n)}`

/** เงินบาทแบบย่อสำหรับแกนกราฟ เช่น ฿7.5k, ฿1.2M */
export function formatBahtCompact(n) {
  if (Math.abs(n) >= 1_000_000) return `฿${+(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `฿${+(n / 1_000).toFixed(1)}k`
  return `฿${n}`
}

/** แปลง "2025-04-01" เป็นวันที่ภาษาไทย (ไม่ผ่าน timezone ของเครื่อง) */
export function formatThaiDate(dateKey, options = { day: 'numeric', month: 'short', year: '2-digit' }) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('th-TH', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}
