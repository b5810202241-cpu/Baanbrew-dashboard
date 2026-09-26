import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBahtCompact, formatThaiDate } from '../lib/metrics'
import ChartTooltip from './ChartTooltip'
import useIsMobile from '../hooks/useIsMobile'


// ความเข้มของเส้นรายวัน: จางมากเพื่อเป็นพื้นหลัง ให้เส้นค่าเฉลี่ย 7 วันเป็นตัวหลัก
const DAILY_OPACITY = 0.2

function LegendItem({ label, opacity = 1, width = 3 }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block w-5 rounded-full"
        style={{ height: width, background: 'var(--series-1)', opacity }}
      />
      {label}
    </span>
  )
}

export default function DailyRevenueChart({ data }) {
  const isMobile = useIsMobile()
  const axisTick = { fill: 'var(--text-muted)', fontSize: isMobile ? 11 : 12 }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        <LegendItem label="เฉลี่ย 7 วัน" />
        <LegendItem label="ยอดรายวัน" opacity={0.35} width={2} />
      </div>
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: isMobile ? 8 : 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              minTickGap={isMobile ? 24 : 40}
              tickFormatter={(d) => formatThaiDate(d, { month: 'short', year: '2-digit' })}
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={formatBahtCompact}
            />
            <Tooltip
              content={
                <ChartTooltip
                  mutedKeys={['revenue']}
                  labelFormatter={(d) =>
                    formatThaiDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                  }
                />
              }
              cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
            />
            {/* เส้นรายวัน: บาง จาง เส้นตรง (linear) ไม่โค้งเกินข้อมูล และไม่มีจุดตอนชี้ */}
            <Line
              type="linear"
              dataKey="revenue"
              name="ยอดรายวัน"
              stroke="var(--series-1)"
              strokeWidth={1}
              strokeOpacity={DAILY_OPACITY}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            {/* เส้นค่าเฉลี่ย 7 วัน: วาดทีหลังจึงทับอยู่ด้านบน หนากว่าและสีเต็ม */}
            <Line
              type="monotone"
              dataKey="ma7"
              name="เฉลี่ย 7 วัน"
              stroke="var(--series-1)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
