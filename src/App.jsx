import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { cleanRows, formatThaiDate } from './lib/metrics'
import { cleanCustomers } from './lib/customers'
import { PRODUCT_NAMES } from './lib/products'
import TabNav from './components/TabNav'
import OverviewPage from './pages/OverviewPage'
import CustomersPage from './pages/CustomersPage'
import Lab2Page from './pages/Lab2Page'

const TABS = [
  { id: 'overview', label: 'ภาพรวม' },
  { id: 'customers', label: 'ลูกค้า' },
  { id: 'lab2', label: 'Lab 2.2 · ซ่อมกราฟ' },
]
const BRANCHES = ['สยาม', 'สีลม', 'บางนา', 'มหาวิทยาลัย', 'อารีย์']
const EMPTY_FILTER = { branch: '', from: '', to: '' }
const csvUrl = (name) => `${import.meta.env.BASE_URL}${name}`

// อ่าน CSV จาก public/ → อาร์เรย์ของแถว (resolve null ถ้าไม่มีไฟล์)
const loadCsv = (name) =>
  new Promise((resolve, reject) =>
    Papa.parse(csvUrl(name), {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (r) => resolve(r.meta.fields?.length > 1 ? r.data : null),
      error: (err) => reject(err),
    }),
  )

// แท็บปัจจุบันเก็บใน URL (#overview, #customers, #lab2) รีเฟรชแล้วยังอยู่แท็บเดิม
const tabFromHash = () => {
  const id = window.location.hash.slice(1)
  return TABS.some((t) => t.id === id) ? id : 'overview'
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [rows, setRows] = useState(null)
  const [customers, setCustomers] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState(EMPTY_FILTER)

  useEffect(() => {
    loadCsv('sales.csv')
      .then((data) => (data ? setRows(cleanRows(data)) : setError('ไม่พบ public/sales.csv')))
      .catch((e) => setError(e.message))
    loadCsv('customers.csv')
      .then((data) => setCustomers(data ? cleanCustomers(data) : null))
      .catch(() => setCustomers(null))
  }, [])

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const changeTab = (id) => {
    window.history.replaceState(null, '', `#${id}`)
    setTab(id)
    window.scrollTo({ top: 0 })
  }

  const range = useMemo(() => {
    if (!rows?.length) return { min: '', max: '' }
    let min = rows[0].date, max = rows[0].date
    for (const r of rows) {
      if (r.date < min) min = r.date
      if (r.date > max) max = r.date
    }
    return { min, max }
  }, [rows])

  const products = useMemo(
    () => Object.entries(PRODUCT_NAMES).map(([product_id, product_name]) => ({ product_id, product_name })),
    [],
  )

  // ช่วงวันที่ที่แสดงมุมขวา = ตามตัวกรอง ถ้าไม่ได้กรองใช้ทั้งชุดข้อมูล
  const shownFrom = filter.from || range.min
  const shownTo = filter.to || range.max
  const longDate = { day: 'numeric', month: 'short', year: '2-digit' }
  const header = (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <h1 className="text-xl font-bold text-ink sm:text-2xl">บ้านบรู Dashboard</h1>
      {shownFrom && (
        <p className="text-sm text-ink-2">
          ข้อมูลวันที่{' '}
          <b className="text-ink">{formatThaiDate(shownFrom, longDate)} – {formatThaiDate(shownTo, longDate)}</b>
          {filter.branch && <> · สาขา<b className="text-ink">{filter.branch}</b></>}
        </p>
      )}
    </header>
  )

  const pageProps = {
    rows, filter, onFilterChange: setFilter, branches: BRANCHES, minDate: range.min, maxDate: range.max, header,
  }

  return (
    <div className="min-h-screen bg-page">
      <TabNav tabs={TABS} active={tab} onChange={changeTab} />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:space-y-6 sm:py-6">
        {error && <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink">โหลดข้อมูลไม่สำเร็จ: {error}</p>}
        {!rows && !error && <p className="text-sm text-ink-2">กำลังโหลดข้อมูล…</p>}
        {rows && tab === 'overview' && <OverviewPage {...pageProps} />}
        {rows && tab === 'customers' && <CustomersPage {...pageProps} customers={customers} />}
        {rows && tab === 'lab2' && <Lab2Page rows={rows} products={products} />}
      </main>
    </div>
  )
}
