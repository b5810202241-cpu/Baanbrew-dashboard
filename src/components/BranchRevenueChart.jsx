import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBaht } from '../lib/metrics'
import ChartTooltip from './ChartTooltip'
import useIsMobile from '../hooks/useIsMobile'

// แท่งแนวนอน: ชื่อสาขาภาษาไทยอ่านง่าย และเรียงจากมากไปน้อยจากบนลงล่าง (ข้อมูลเรียงมาแล้วจาก metrics.js)
// บนมือถือ: ย่อชื่อสาขาและย้ายตัวเลขเข้าไปไว้ในปลายแท่ง เพื่อให้แท่งยาวขึ้น
export default function BranchRevenueChart({ data }) {
  const isMobile = useIsMobile()
  const rowHeight = isMobile ? 44 : 52

  return (
    <div style={{ height: Math.max(200, data.length * rowHeight) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: isMobile ? 4 : 96, bottom: 0, left: 0 }}
          barCategoryGap={isMobile ? 8 : 10}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="branch"
            width={isMobile ? 76 : 104}
            tick={{ fill: 'var(--text-secondary)', fontSize: isMobile ? 12 : 14 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          <Bar dataKey="revenue" name="ยอดขาย" fill="var(--series-1)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="revenue"
              position={isMobile ? 'insideRight' : 'right'}
              offset={isMobile ? 8 : 5}
              formatter={(v) => formatBaht(v)}
              style={{
                fill: isMobile ? '#ffffff' : 'var(--text-primary)',
                fontSize: isMobile ? 12 : 13,
                fontWeight: isMobile ? 600 : 400,
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
