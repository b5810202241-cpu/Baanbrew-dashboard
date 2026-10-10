// Lab 4.2 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.2A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.2 · Cohort retention รายเดือน
// cohort = เดือนแรกที่ลูกค้าสมาชิกซื้อ · retention[k] = สัดส่วนลูกค้าใน cohort ที่กลับมาซื้อในเดือนที่ k (k=0 คือเดือนแรก = 100%)

/** จำนวนเดือนจาก a ถึง b เช่น monthIndex("2025-11", "2026-02") = 3 */
export function monthIndex(a, b) {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

function addMonths(ym, k) {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + k;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  return `${ty}-${String(tm).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * @param rows  แถวยอดขาย (ไม่นับ customer_id ว่าง)
 * @param asOf  วันสุดท้ายของข้อมูล YYYY-MM-DD ใช้บอกว่าเดือนสุดท้ายข้อมูลไม่ครบหรือไม่
 * @returns {{ cohorts: {cohort, size, retention: number[]}[], lastMonth, lastMonthPartial, daysInLastMonth }}
 *   retention ยาวเท่าจำนวนเดือนที่สังเกตได้ของ cohort นั้น (ถึง lastMonth)
 */
export function computeCohorts(rows, asOf) {
  const monthsByCustomer = new Map();
  for (const row of rows) {
    if (!row.customer_id) continue;
    const month = row.date.slice(0, 7);
    let months = monthsByCustomer.get(row.customer_id);
    if (!months) { months = new Set(); monthsByCustomer.set(row.customer_id, months); }
    months.add(month);
  }

  const [y, m, d] = asOf.split("-").map(Number);
  const lastMonth = `${y}-${String(m).padStart(2, "0")}`;
  const daysInLastMonth = d;
  const lastMonthPartial = d < daysInMonth(y, m);

  const cohortGroups = new Map();
  for (const [id, months] of monthsByCustomer) {
    const cohort = [...months].sort()[0];
    if (!cohortGroups.has(cohort)) cohortGroups.set(cohort, []);
    cohortGroups.get(cohort).push(id);
  }

  const cohorts = [...cohortGroups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cohort, ids]) => {
      const size = ids.length;
      const maxK = monthIndex(cohort, lastMonth);
      const retention = [];
      for (let k = 0; k <= maxK; k++) {
        const targetMonth = addMonths(cohort, k);
        const count = ids.filter((id) => monthsByCustomer.get(id).has(targetMonth)).length;
        retention.push(count / size);
      }
      return { cohort, size, retention };
    });

  return { cohorts, lastMonth, lastMonthPartial, daysInLastMonth };
}
