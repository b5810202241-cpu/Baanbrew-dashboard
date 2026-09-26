import { useCallback, useEffect, useState } from 'react'
import Papa from 'papaparse'
import {
  computeDashboard,
  formatBaht,
  formatNumber,
  formatThaiDate,
  missingColumns,
} from './lib/metrics'
import KpiCard from './components/KpiCard'
import DailyRevenueChart from './components/DailyRevenueChart'
import BranchRevenueChart from './components/BranchRevenueChart'
import TopProductsChart from './components/TopProductsChart'
import HourlyRevenueChart from './components/HourlyRevenueChart'

const DEFAULT_FILE = 'sales.csv' // ไฟล์ใน public/ โหลดอัตโนมัติตอนเปิดหน้า

function Panel({ title, subtitle, children }) {
  return (
    <section className="min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mb-4 text-sm text-ink-3">{subtitle}</p>}
      {children}
    </section>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [fileName, setFileName] = useState(DEFAULT_FILE)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  // อ่าน CSV (จาก URL หรือจากไฟล์ที่ผู้ใช้เลือก) → ตรวจคอลัมน์ → คำนวณด้วย metrics.js
  const load = useCallback((source, name) => {
    setLoading(true)
    setError(null)
    Papa.parse(source, {
      download: typeof source === 'string',
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const missing = missingColumns(result.meta.fields)
        if (missing.length) {
          setError(`ไฟล์ ${name} ไม่มีคอลัมน์: ${missing.join(', ')}`)
        } else {
          const computed = computeDashboard(result.data)
          if (computed.rowCount === 0) setError(`ไฟล์ ${name} ไม่มีแถวข้อมูลที่ใช้ได้`)
          else {
            setData(computed)
            setFileName(name)
          }
        }
        setLoading(false)
      },
      error: (err) => {
        setError(`อ่านไฟล์ ${name} ไม่ได้: ${err.message}`)
        setLoading(false)
      },
    })
  }, [])

  useEffect(() => {
    load(`${import.meta.env.BASE_URL}${DEFAULT_FILE}`, DEFAULT_FILE)
  }, [load])

  const onUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) load(file, file.name)
    e.target.value = '' // เลือกไฟล์เดิมซ้ำได้
  }

  const first = data?.daily[0]?.date
  const last = data?.daily.at(-1)?.date
  const longDate = { day: 'numeric', month: 'short', year: 'numeric' }

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <div>
            <h1 className="text-xl font-bold text-brand sm:text-2xl">บ้านบรู Dashboard</h1>
            <p className="text-xs text-ink-3 sm:text-sm">สรุปยอดขายจากไฟล์ CSV</p>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-xs text-ink-2 sm:text-sm" title={fileName}>
              {fileName}
            </span>
            <label className="shrink-0 cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm hover:border-ink-3 focus-within:outline-2 focus-within:outline-series">
              อัปโหลดไฟล์ใหม่
              <input id="csv-upload" type="file" accept=".csv,text/csv" className="sr-only" onChange={onUpload} />
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:space-y-6 sm:py-6">
        {error && (
          <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink">
            {error} · ไฟล์ต้องเป็น CSV UTF-8 ที่มีคอลัมน์ order_id, datetime, branch, product_id, qty, unit_price,
            customer_id
          </p>
        )}
        {loading && !data && <p className="text-sm text-ink-2">กำลังโหลดข้อมูล…</p>}

        {data && (
          <>
            <p className="text-xs text-ink-3 sm:text-sm">
              ข้อมูลวันที่ {formatThaiDate(first, longDate)} – {formatThaiDate(last, longDate)} ·{' '}
              {formatNumber(data.rowCount)} รายการ · สมาชิก {formatNumber(data.uniqueMembers)} คน
              {loading && ' · กำลังโหลดไฟล์ใหม่…'}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <KpiCard
                label="ยอดขายรวม"
                value={formatBaht(data.totalRevenue)}
                note={`เฉลี่ย ${formatBaht(data.averageDailyRevenue)} / วัน`}
              />
              <KpiCard
                label="จำนวนออเดอร์"
                value={formatNumber(data.orderCount)}
                note={`ขายได้ ${formatNumber(data.totalQuantity)} แก้ว/ชิ้น`}
              />
              <KpiCard
                label="ยอดเฉลี่ยต่อบิล"
                value={formatBaht(data.averageOrderValue, true)}
                note="ยอดขายรวม ÷ จำนวนบิล"
              />
              <KpiCard
                label="วันที่ขายดีที่สุด"
                value={formatThaiDate(data.bestDay.date)}
                note={formatBaht(data.bestDay.revenue)}
              />
            </div>

            <Panel title="ยอดขายรายวัน" subtitle="บาท ตามเวลาไทย">
              <DailyRevenueChart data={data.daily} />
            </Panel>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <Panel title={`เมนูขายดี ${data.topProducts.length} อันดับ`} subtitle="เรียงตามยอดขาย (บาท)">
                <TopProductsChart data={data.topProducts} />
              </Panel>
              <Panel title="ยอดขายตามช่วงเวลา" subtitle="รวมทุกวัน (บาท)">
                <HourlyRevenueChart data={data.byHour} />
              </Panel>
            </div>

            <Panel title="ยอดขายแยกสาขา" subtitle="เรียงจากมากไปน้อย">
              <BranchRevenueChart data={data.byBranch} />
            </Panel>
          </>
        )}
      </main>
    </div>
  )
}
