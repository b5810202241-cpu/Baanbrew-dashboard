import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartTooltip from './ChartTooltip'
import useIsMobile from '../hooks/useIsMobile'

// กราฟแท่งแนวตั้งสีเดียว ใช้ซ้ำในแท็บลูกค้า
// formatValue = รูปแบบตัวเลขใน tooltip/ป้าย · formatAxis = รูปแบบตัวเลขบนแกน · showLabels = แสดงตัวเลขบนแท่ง
export default function SimpleBarChart({
  data, xKey, yKey, name, formatValue, formatAxis, formatX, showLabels = false, height = 280,
}) {
  const isMobile = useIsMobile()
  const tick = { fill: 'var(--text-muted)', fontSize: isMobile ? 11 : 12 }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: showLabels ? 22 : 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey={xKey} tick={tick} tickLine={false} axisLine={{ stroke: 'var(--border)' }}
                 tickFormatter={formatX} interval="preserveStartEnd" minTickGap={isMobile ? 6 : 10} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={52} tickFormatter={formatAxis ?? formatValue} />
          <Tooltip
            content={<ChartTooltip labelFormatter={formatX} valueFormatter={formatValue} />}
            cursor={{ fill: 'var(--grid)', opacity: 0.5 }}
          />
          <Bar dataKey={yKey} name={name} fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {showLabels && (
              <LabelList dataKey={yKey} position="top" formatter={formatValue}
                         style={{ fill: 'var(--text-primary)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
