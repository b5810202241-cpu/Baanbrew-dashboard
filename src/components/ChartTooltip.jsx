import { formatBaht } from '../lib/metrics'

// กล่อง tooltip ร่วมของกราฟ: ชื่อ (วันที่/สาขา) + ยอดขายของแต่ละเส้น
// mutedKeys = dataKey ของเส้นที่แสดงแบบจาง (เช่น ยอดรายวัน) ให้จุดสีใน tooltip จางตาม
export default function ChartTooltip({ active, payload, label, labelFormatter, mutedKeys = [] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="text-ink-2">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((entry) => {
        const muted = mutedKeys.includes(entry.dataKey)
        return (
          <p
            key={entry.dataKey}
            className={`flex items-center gap-2 tabular-nums text-ink ${muted ? 'font-normal' : 'font-semibold'}`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: entry.stroke ?? entry.color ?? 'var(--series-1)', opacity: muted ? 0.35 : 1 }}
            />
            {entry.name ? `${entry.name}: ` : ''}
            {formatBaht(entry.value)}
          </p>
        )
      })}
    </div>
  )
}
