import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { computeDashboard, formatBaht, formatNumber, formatThaiDate } from './lib/metrics'
import KpiCard from './components/KpiCard'
import DailyRevenueChart from './components/DailyRevenueChart'
import BranchRevenueChart from './components/BranchRevenueChart'

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mb-4 text-sm text-ink-3">{subtitle}</p>}
      {children}
    </section>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // อ่าน public/sales.csv (ไฟล์ใน public/ เรียกได้ที่ /sales.csv)
    Papa.parse('/sales.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => setData(computeDashboard(result.data)),
      error: (err) => setError(err.message),
    })
  }, [])

  if (error) return <p className="p-8 text-ink">โหลดข้อมูลไม่สำเร็จ: {error}</p>
  if (!data) return <p className="p-8 text-ink-2">กำลังโหลดข้อมูล…</p>

  const first = data.daily[0]?.date
  const last = data.daily.at(-1)?.date
  const range = first ? `${formatThaiDate(first)} – ${formatThaiDate(last)}` : ''

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">บ้านบรู Dashboard</h1>
        <p className="text-sm text-ink-3">
          {range} · {formatNumber(data.rowCount)} รายการสินค้า
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="ยอดขายรวม" value={formatBaht(data.totalRevenue)} />
        <KpiCard label="จำนวนบิล" value={formatNumber(data.orderCount)} note="นับ order_id ไม่ซ้ำ" />
        <KpiCard label="ยอดเฉลี่ยต่อบิล" value={formatBaht(data.averageOrderValue, true)} />
        <KpiCard label="ลูกค้าสมาชิก (ไม่ซ้ำ)" value={formatNumber(data.uniqueMembers)} note="ไม่นับลูกค้าทั่วไป" />
      </div>

      <Panel title="ยอดขายรายวัน" subtitle="บาทต่อวัน ตามเวลาไทย">
        <DailyRevenueChart data={data.daily} />
      </Panel>

      <Panel title="ยอดขายแยกสาขา" subtitle="เรียงจากมากไปน้อย">
        <BranchRevenueChart data={data.byBranch} />
      </Panel>
    </main>
  )
}
