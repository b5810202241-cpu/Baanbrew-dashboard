// ตรรกะคำนวณของแท็บ "ลูกค้า" (customers.csv + ยอดขายที่ผ่าน cleanRows แล้ว)

/**
 * รหัสสาขาประจำ → ชื่อสาขาใน sales.csv
 * ตรงกับตารางสาขาทางการ Lab2/lab2.2-dashboard/public/branches.xlsx ทุกรหัส
 * (ตรวจใน notebooks/Lab2_1_Customers_Profiling.ipynb ขั้นที่ 4)
 */
export const BRANCH_CODE = {
  B01: 'สยาม',
  B02: 'สีลม',
  B03: 'อารีย์',
  B04: 'บางนา',
  B05: 'มหาวิทยาลัย',
}

/** ลำดับช่วงอายุสำหรับแกนกราฟ (เรียงจากน้อยไปมาก ไม่ใช่ตามตัวอักษร) */
export const AGE_ORDER = ['ต่ำกว่า 18', '18-24', '25-34', '35-44', '45-54', '55+']

/** แปลงแถวดิบจาก customers.csv: ตัดช่องว่าง และเติมชื่อสาขาประจำ */
export function cleanCustomers(rawRows) {
  return rawRows
    .map((r) => {
      const homeBranchId = (r.home_branch_id ?? '').trim()
      return {
        customerId: (r.customer_id ?? '').trim(),
        gender: (r.gender ?? '').trim(),
        ageGroup: (r.age_group ?? '').trim(),
        homeBranchId,
        homeBranch: BRANCH_CODE[homeBranchId] ?? homeBranchId,
        joinedDate: (r.joined_date ?? '').trim(),
      }
    })
    .filter((c) => c.customerId)
}

/**
 * สถิติลูกค้าสำหรับแท็บ "ลูกค้า"
 * customers = ผล cleanCustomers · rows = ยอดขายที่กรองตามสาขา/วันที่แล้ว · filter = ตัวกรองเดียวกัน
 */
export function computeCustomerStats(customers, rows, { branch = '', to = '' } = {}) {
  // สมาชิกที่ "มีอยู่" ในช่วงที่เลือก: สมัครไม่เกินวันสิ้นสุด และ (ถ้าเลือกสาขา) สาขาประจำตรงกัน
  const pool = customers.filter((c) => (!to || c.joinedDate <= to) && (!branch || c.homeBranch === branch))

  // ยอดขายของแต่ละสมาชิกในช่วงที่เลือก
  const byMember = new Map()
  let memberRevenue = 0
  const memberOrders = new Set()
  const walkinOrders = new Set()
  let walkinRevenue = 0
  for (const r of rows) {
    if (r.customerId) {
      byMember.set(r.customerId, (byMember.get(r.customerId) ?? 0) + r.revenue)
      memberRevenue += r.revenue
      memberOrders.add(r.orderId)
    } else {
      walkinRevenue += r.revenue
      walkinOrders.add(r.orderId)
    }
  }
  const totalRevenue = memberRevenue + walkinRevenue
  const activeMembers = byMember.size

  // ยอดขายตามช่วงอายุ (เฉพาะสมาชิกที่ซื้อในช่วงนี้)
  const info = new Map(customers.map((c) => [c.customerId, c]))
  const ageMap = new Map(AGE_ORDER.map((a) => [a, { ageGroup: a, revenue: 0, members: 0 }]))
  for (const [id, rev] of byMember) {
    const a = info.get(id)?.ageGroup
    if (!ageMap.has(a)) continue
    const cur = ageMap.get(a)
    cur.revenue += rev
    cur.members += 1
  }
  const byAge = [...ageMap.values()].map((a) => ({ ...a, perMember: a.members ? a.revenue / a.members : 0 }))

  // สมาชิกใหม่รายเดือน (จาก joined_date ของ pool)
  const monthMap = new Map()
  for (const c of pool) {
    const m = c.joinedDate.slice(0, 7)
    monthMap.set(m, (monthMap.get(m) ?? 0) + 1)
  }
  const newByMonth = [...monthMap]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalMembers: pool.length,
    activeMembers,
    inactiveMembers: pool.filter((c) => !byMember.has(c.customerId)).length,
    memberShare: totalRevenue ? memberRevenue / totalRevenue : 0,
    revenuePerActiveMember: activeMembers ? memberRevenue / activeMembers : 0,
    billCompare: [
      { type: 'สมาชิก', perBill: memberOrders.size ? memberRevenue / memberOrders.size : 0, bills: memberOrders.size },
      { type: 'ลูกค้าทั่วไป', perBill: walkinOrders.size ? walkinRevenue / walkinOrders.size : 0, bills: walkinOrders.size },
    ],
    byAge,
    newByMonth,
  }
}
