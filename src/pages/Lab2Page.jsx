import * as Bad from '../lab2/BadCharts.jsx'
import * as Fixed from '../lab2/FixedCharts.jsx'

// แท็บ "Lab 2.2 · ซ่อมกราฟ": วางกราฟแย่ (ซ้าย) เทียบกับกราฟที่ซ่อมแล้ว (ขวา)
// ใช้ข้อมูลทั้งหมด ไม่ผ่านตัวกรอง เพื่อให้ทั้งสองฝั่งเห็นข้อมูลชุดเดียวกัน
const CASES = [
  { n: 1, title: 'สัดส่วนยอดขายแต่ละเมนู', problem: 'pie 40 ชิ้น สีรุ้ง ป้าย % ทับกันจนอ่านไม่ออก' },
  { n: 2, title: 'ยอดขายแยกสาขา', problem: 'แกน Y เริ่มที่ 500,000 ทำให้ความต่างดูเกินจริง สีรุ้ง เรียงตามตัวอักษร' },
  { n: 3, title: 'ยอดขายรายวัน', problem: '538 จุด เส้นหนา วันที่ ISO เบียดกันจนอ่านไม่ได้' },
  { n: 4, title: 'ยอดขายรายเดือน', problem: 'เดือนสุดท้ายมีข้อมูลไม่ครบ แต่ติดป้ายว่ายอดตก' },
  { n: 5, title: 'จัดอันดับผลงานสาขา', problem: 'ใช้ยอดรวม ไม่คำนึงว่าแต่ละสาขาเปิดขายกี่วัน' },
]

function Box({ label, tone, children }) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-line bg-surface p-3">
      <p className={`mb-2 text-xs font-semibold tracking-wide ${tone}`}>{label}</p>
      <div className="h-96 min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

export default function Lab2Page({ rows, products }) {
  const done = CASES.filter((c) => Fixed[`FixedChart${c.n}`]).length
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Lab 2.2 · ซ่อมกราฟ</h1>
          <p className="text-sm text-ink-3">ซ้าย: กราฟที่ตั้งใจทำให้แย่ (BadCharts.jsx) · ขวา: กราฟที่ซ่อมแล้ว (FixedCharts.jsx)</p>
        </div>
        <p className="text-sm text-ink-2">ซ่อมแล้ว <b className="text-ink">{done}/{CASES.length}</b> กราฟ</p>
      </header>

      {CASES.map(({ n, title, problem }) => {
        const BadChart = Bad[`BadChart${n}`]
        const FixedChart = Fixed[`FixedChart${n}`]
        return (
          <section key={n} className="rounded-xl border border-line bg-page/40 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-ink">{n}. {title}</h2>
            <p className="mb-3 text-sm text-ink-3">ปัญหา: {problem}</p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Box label="ก่อนซ่อม" tone="text-ink-3">
                <BadChart rows={rows} products={products} />
              </Box>
              <Box label="หลังซ่อม" tone="text-series">
                {FixedChart ? (
                  <FixedChart rows={rows} products={products} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-3">
                    ยังไม่ได้ซ่อม · สร้าง FixedChart{n} ใน src/lab2/FixedCharts.jsx
                  </div>
                )}
              </Box>
            </div>
          </section>
        )
      })}
    </>
  )
}
