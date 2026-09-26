import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBaht } from '../lib/metrics'
import ChartTooltip from './ChartTooltip'

// แท่งแนวนอน: ชื่อสาขาภาษาไทยอ่านง่าย และเรียงจากมากไปน้อยจากบนลงล่าง (ข้อมูลเรียงมาแล้วจาก metrics.js)
export default function BranchRevenueChart({ data }) {
  return (
    <div style={{ height: Math.max(220, data.length * 52) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 96, bottom: 0, left: 8 }} barCategoryGap={10}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="branch"
            width={96}
            tick={{ fill: 'var(--text-secondary)', fontSize: 14 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          <Bar dataKey="revenue" fill="var(--series-1)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="revenue"
              position="right"
              formatter={(v) => formatBaht(v)}
              style={{ fill: 'var(--text-primary)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
