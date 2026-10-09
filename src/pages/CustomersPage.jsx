import { useMemo } from 'react'
import { filterRows, formatBaht, formatBahtCompact, formatNumber, formatThaiDate } from '../lib/metrics'
import { computeCustomerStats } from '../lib/customers'
import FilterBar from '../components/FilterBar'
import KpiCard from '../components/KpiCard'
import Panel from '../components/Panel'
import SimpleBarChart from '../components/SimpleBarChart'

const pct = (x) => `${(x * 100).toFixed(1)}%`
const monthLabel = (m) => (m ? formatThaiDate(`${m}-01`, { month: 'short', year: '2-digit' }) : m)

// แท็บ "ลูกค้า": ข้อมูลสมาชิกจาก customers.csv คู่กับยอดขาย กรองตามสาขา/ช่วงวันที่ได้
export default function CustomersPage({ rows, customers, filter, onFilterChange, branches, minDate, maxDate, header }) {
  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter])
  const stats = useMemo(
    () => (customers ? computeCustomerStats(customers, filtered, filter) : null),
    [customers, filtered, filter],
  )

  return (
    <>
      {header}
      <FilterBar branches={branches} minDate={minDate} maxDate={maxDate} filter={filter} onChange={onFilterChange} />

      {!customers ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-2">
          ไม่พบไฟล์ <code>public/customers.csv</code> ให้วางไฟล์ไว้ในโฟลเดอร์ public แล้วรีเฟรช
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard label="สมาชิกทั้งหมด" value={formatNumber(stats.totalMembers)}
                     note={filter.branch ? `สาขาประจำ ${filter.branch}` : 'สมัครถึงวันสิ้นสุดที่เลือก'} />
            <KpiCard label="สมาชิกที่ซื้อในช่วงนี้" value={formatNumber(stats.activeMembers)}
                     note={`ไม่ได้ซื้อ ${formatNumber(stats.inactiveMembers)} คน`} />
            <KpiCard label="สัดส่วนยอดขายจากสมาชิก" value={pct(stats.memberShare)} note="ที่เหลือเป็นลูกค้าทั่วไป" />
            <KpiCard label="ยอดซื้อต่อสมาชิก" value={formatBaht(stats.revenuePerActiveMember)} note="เฉพาะคนที่ซื้อในช่วงนี้" />
          </div>

          <Panel title="สมาชิกใหม่รายเดือน" subtitle="นับจากวันสมัคร (joined_date) · เดือนล่าสุดอาจยังไม่ครบเดือน">
            <SimpleBarChart data={stats.newByMonth} xKey="month" yKey="count" name="สมาชิกใหม่"
                            formatValue={(v) => `${formatNumber(v)} คน`} formatAxis={formatNumber} formatX={monthLabel} />
          </Panel>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <Panel title="ยอดซื้อเฉลี่ยต่อสมาชิก ตามช่วงอายุ" subtitle="บาทต่อคน เฉพาะสมาชิกที่ซื้อในช่วงนี้">
              <SimpleBarChart data={stats.byAge} xKey="ageGroup" yKey="perMember" name="ต่อสมาชิก"
                              formatValue={(v) => formatBaht(v)} formatAxis={formatBahtCompact} showLabels />
            </Panel>
            <Panel title="ยอดเฉลี่ยต่อบิล: สมาชิก vs ลูกค้าทั่วไป" subtitle="ลูกค้าทั่วไป = customer_id ว่าง">
              <SimpleBarChart data={stats.billCompare} xKey="type" yKey="perBill" name="ต่อบิล"
                              formatValue={(v) => formatBaht(v, true)} formatAxis={formatBahtCompact} showLabels />
            </Panel>
          </div>
        </>
      )}
    </>
  )
}
