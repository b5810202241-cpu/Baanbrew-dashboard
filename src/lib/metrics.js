// ตรรกะคำนวณทั้งหมดของ Dashboard
// รับ "rows" = อาร์เรย์ของอ็อบเจกต์ที่ PapaParse อ่านจาก sales.csv (header: true)

/** แปลงแถวดิบจาก CSV ให้เป็นตัวเลข/ข้อความที่พร้อมคำนวณ และตัดแถวที่ใช้ไม่ได้ทิ้ง */
export function cleanRows(rawRows) {
  return rawRows
    .map((r) => ({
      orderId: (r.order_id ?? '').trim(),
      datetime: (r.datetime ?? '').trim(),
      branch: (r.branch ?? '').trim(),
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
  return {
    rowCount: rows.length,
    totalRevenue: totalRevenue(rows),
    orderCount: orderCount(rows),
    averageOrderValue: averageOrderValue(rows),
    uniqueMembers: uniqueMemberCount(rows),
    daily: withMovingAverage(dailyRevenue(rows)),
    byBranch: revenueByBranch(rows),
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

/** แปลง "2025-04-01" เป็นวันที่ภาษาไทย (ไม่ผ่าน timezone ของเครื่อง) */
export function formatThaiDate(dateKey, options = { day: 'numeric', month: 'short', year: '2-digit' }) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('th-TH', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
}
