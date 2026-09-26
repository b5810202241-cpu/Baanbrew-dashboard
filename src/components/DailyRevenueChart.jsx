import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBaht, formatThaiDate } from '../lib/metrics'
import ChartTooltip from './ChartTooltip'

const axisTick = { fill: 'var(--text-muted)', fontSize: 12 }

export default function DailyRevenueChart({ data }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={40}
            tickFormatter={(d) => formatThaiDate(d, { month: 'short', year: '2-digit' })}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={80}
            tickFormatter={(v) => formatBaht(v)}
          />
          <Tooltip
            content={<ChartTooltip labelFormatter={(d) => formatThaiDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />}
            cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="รายวัน"
            stroke="var(--series-1)"
            strokeWidth={1}
            strokeOpacity={0.35}
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="ma7"
            name="เฉลี่ย 7 วัน"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
