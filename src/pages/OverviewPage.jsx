import { useMemo } from 'react'
import { computeFromRows, filterRows, formatBaht, formatNumber } from '../lib/metrics'
import FilterBar from '../components/FilterBar'
import KpiCard from '../components/KpiCard'
import Panel from '../components/Panel'
import DailyRevenueChart from '../components/DailyRevenueChart'
import TopProductsChart from '../components/TopProductsChart'
import HourlyRevenueChart from '../components/HourlyRevenueChart'
import BranchRevenueChart from '../components/BranchRevenueChart'

// แท็บ "ภาพรวม": KPI + กราฟยอดขาย กรองตามสาขา/ช่วงวันที่ได้
export default function OverviewPage({ rows, filter, onFilterChange, branches, minDate, maxDate, header }) {
  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter])
  const data = useMemo(() => (filtered.length ? computeFromRows(filtered) : null), [filtered])

  return (
    <>
      {header}
      <FilterBar branches={branches} minDate={minDate} maxDate={maxDate} filter={filter} onChange={onFilterChange} />

      {!data ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-2">
          ไม่มียอดขายในสาขาและช่วงวันที่ที่เลือก ลองเปลี่ยนตัวกรอง หรือกด "ล้างตัวกรอง"
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <KpiCard label="ยอดขายรวม" value={formatBaht(data.totalRevenue)}
                     note={`เฉลี่ย ${formatBaht(data.averageDailyRevenue)} / วัน`} />
            <KpiCard label="จำนวนบิล" value={formatNumber(data.orderCount)}
                     note={`ขายได้ ${formatNumber(data.totalQuantity)} แก้ว/ชิ้น`} />
            <KpiCard label="ยอดเฉลี่ยต่อบิล" value={formatBaht(data.averageOrderValue)} note="ยอดขายรวม ÷ จำนวนบิล" />
            <KpiCard label="ลูกค้าสมาชิก (ไม่ซ้ำ)" value={formatNumber(data.uniqueMembers)} note="ที่ซื้อในช่วงนี้" />
          </div>

          <Panel title="ยอดขายรายวัน" subtitle="บาท ตามเวลาไทย">
            <DailyRevenueChart data={data.daily} />
          </Panel>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <Panel title={`เมนูขายดี ${data.topProducts.length} อันดับ`} subtitle="เรียงตามยอดขาย (บาท)">
              <TopProductsChart data={data.topProducts} />
            </Panel>
            <Panel title="ยอดขายตามช่วงเวลา" subtitle="รวมทุกวันในช่วงที่เลือก (บาท)">
              <HourlyRevenueChart data={data.byHour} />
            </Panel>
          </div>

          {!filter.branch && (
            <Panel title="ยอดขายแยกสาขา" subtitle="เรียงจากมากไปน้อย">
              <BranchRevenueChart data={data.byBranch} />
            </Panel>
          )}
        </>
      )}
    </>
  )
}
