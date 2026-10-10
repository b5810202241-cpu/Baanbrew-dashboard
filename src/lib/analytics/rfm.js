// Lab 4.1 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.1A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.1 · RFM: แบ่งกลุ่มลูกค้าสมาชิกด้วย Recency, Frequency, Monetary
// rows = ผลจาก prepareRows() (มี order_id, date, revenue, customer_id)
import { daysBetween } from "../../lab3/time.js";

/**
 * คะแนน 1–5 ตามตำแหน่งเปอร์เซ็นไทล์ (ค่ามาก = คะแนนสูง)
 * ค่าที่เท่ากันต้องได้คะแนนเท่ากันเสมอ: score = 1 + floor(5 × จำนวนค่าที่ "น้อยกว่า" / n)
 */
export function percentileScores(values) {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const countLess = (v) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < v) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  return values.map((v) => 1 + Math.floor((5 * countLess(v)) / n));
}

/** กติกาตั้งชื่อกลุ่ม ตรวจจากบนลงล่าง ข้อแรกที่ตรงคือคำตอบ */
export function segmentOf(r, f) {
  if (r >= 4 && f >= 4) return "Champions";
  if (r >= 3 && f >= 4) return "Loyal";
  if (r >= 4 && f <= 2) return "New";
  if (r <= 2 && f >= 3) return "At Risk";
  if (r <= 2) return "Lost";
  return "Need Attention";
}

export const SEGMENTS = [
  { id: "Champions", th: "ลูกค้าชั้นยอด", action: "ให้สิทธิพิเศษ ชวนลองเมนูใหม่ก่อนใคร" },
  { id: "Loyal", th: "ลูกค้าประจำ", action: "สะสมแต้ม/ขยับขึ้นเป็นชั้นยอด" },
  { id: "New", th: "ลูกค้าใหม่", action: "คูปองครั้งที่ 2 ภายใน 14 วัน" },
  { id: "Need Attention", th: "ต้องดูแล", action: "โปรฯ ตามเมนูที่เคยซื้อ" },
  { id: "At Risk", th: "เสี่ยงหาย", action: "ดึงกลับด่วน: เคยซื้อบ่อยแต่หายไปนาน" },
  { id: "Lost", th: "หายไปแล้ว", action: "ใช้งบน้อย ส่งข้อความครั้งเดียว" },
];

/**
 * @param rows   แถวยอดขาย (ไม่นับแถวที่ customer_id ว่าง)
 * @param asOf   วันที่วิเคราะห์ YYYY-MM-DD (ใช้วันล่าสุดของข้อมูล ไม่ใช่วันนี้)
 * @returns {{ customers: object[], segments: object[], asOf: string }}
 *   customers: { id, R (วันที่ไม่ได้มา), F (จำนวนบิล), M (ยอดซื้อรวม), r, f, m, segment }
 *   segments:  { segment, customers, revenue, revenueShare, customerShare } เรียงตาม SEGMENTS
 */
export function computeRfm(rows, asOf) {
  const byCustomer = new Map();
  for (const row of rows) {
    if (!row.customer_id) continue;
    let c = byCustomer.get(row.customer_id);
    if (!c) {
      c = { id: row.customer_id, lastDate: row.date, orderIds: new Set(), M: 0 };
      byCustomer.set(row.customer_id, c);
    }
    if (row.date > c.lastDate) c.lastDate = row.date;
    c.orderIds.add(row.order_id);
    c.M += row.revenue;
  }

  const customers = [...byCustomer.values()].map((c) => ({
    id: c.id,
    R: daysBetween(c.lastDate, asOf),
    F: c.orderIds.size,
    M: c.M,
  }));

  const rScores = percentileScores(customers.map((c) => -c.R));
  const fScores = percentileScores(customers.map((c) => c.F));
  const mScores = percentileScores(customers.map((c) => c.M));
  customers.forEach((c, i) => {
    c.r = rScores[i];
    c.f = fScores[i];
    c.m = mScores[i];
    c.segment = segmentOf(c.r, c.f);
  });

  const totalRevenue = customers.reduce((s, c) => s + c.M, 0);
  const segments = SEGMENTS.map((s) => {
    const members = customers.filter((c) => c.segment === s.id);
    const revenue = members.reduce((sum, c) => sum + c.M, 0);
    return {
      segment: s.id,
      customers: members.length,
      revenue,
      revenueShare: totalRevenue ? revenue / totalRevenue : 0,
      customerShare: customers.length ? members.length / customers.length : 0,
    };
  });

  return { customers, segments, asOf };
}
