import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatBahtCompact } from '../lib/metrics'
import { productName } from '../lib/products'
import ChartTooltip from './ChartTooltip'
import useIsMobile from '../hooks/useIsMobile'

// ตัดชื่อยาวให้สั้นลงพร้อม "…" นับเป็นตัวอักษรที่มองเห็น (สระ/วรรณยุกต์ไทยไม่นับแยก)
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null
function shorten(text, max) {
  const chars = seg ? [...seg.segment(text)].map((s) => s.segment) : [...text]
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : text
}

// ป้ายชื่อเมนูบนแกน Y: ชิดขวา ตัดชื่อที่ยาวเกิน (ชื่อเต็มดูได้ใน tooltip)
function NameTick({ x, y, payload, maxChars, fontSize }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={fontSize} fill="var(--text-secondary)">
      <title>{payload.value}</title>
      {shorten(payload.value, maxChars)}
    </text>
  )
}

// เมนูขายดี: แท่งแนวนอน เรียงจากมากไปน้อย (ข้อมูลเรียงมาแล้วจาก topProducts ใน metrics.js)
export default function TopProductsChart({ data }) {
  const isMobile = useIsMobile()
  const rows = data.map((d) => ({ ...d, name: productName(d.productId) }))
  const tick = { fill: 'var(--text-muted)', fontSize: isMobile ? 11 : 12 }

  return (
    <div style={{ height: Math.max(240, rows.length * 34 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={formatBahtCompact} />
          <YAxis
            type="category"
            dataKey="name"
            width={isMobile ? 100 : 150}
            tick={<NameTick maxChars={isMobile ? 11 : 20} fontSize={isMobile ? 11 : 13} />}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--grid)', opacity: 0.5 }} />
          <Bar dataKey="revenue" name="ยอดขาย" fill="var(--series-1)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
