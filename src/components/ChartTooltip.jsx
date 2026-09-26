import { formatBaht } from '../lib/metrics'

// กล่อง tooltip ร่วมของกราฟ: ชื่อ (วันที่/สาขา) + ยอดขาย
export default function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-md">
      <p className="text-ink-2">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 font-semibold tabular-nums text-ink">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: entry.stroke ?? entry.color }} />
          {entry.name ? `${entry.name}: ` : ''}
          {formatBaht(entry.value)}
        </p>
      ))}
    </div>
  )
}
