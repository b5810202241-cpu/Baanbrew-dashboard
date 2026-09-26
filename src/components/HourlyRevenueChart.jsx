import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBahtCompact } from '../lib/metrics'
import ChartTooltip from './ChartTooltip'
import useIsMobile from '../hooks/useIsMobile'

// ยอดขายตามช่วงเวลา: แท่งแนวตั้ง 1 แท่ง = 1 ชั่วโมง รวมทุกวัน
export default function HourlyRevenueChart({ data }) {
  const isMobile = useIsMobile()
  const tick = { fill: 'var(--text-muted)', fontSize: isMobile ? 11 : 12 }

  return (
    <div style={{ height: 302 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={isMobile ? 2 : 1}
          />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={52} tickFormatter={formatBahtCompact} />
          <Tooltip
            content={<ChartTooltip labelFormatter={(l) => `ช่วง ${l} น.`} />}
            cursor={{ fill: 'var(--grid)', opacity: 0.5 }}
          />
          <Bar dataKey="revenue" name="ยอดขาย" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
