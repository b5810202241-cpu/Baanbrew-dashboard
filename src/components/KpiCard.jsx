// การ์ด KPI: ขนาดตัวเลขย่อ/ขยายตามความกว้างจอ (clamp) เพื่อให้ ฿4,466,821 พอดีการ์ดบนมือถือ 2 คอลัมน์
export default function KpiCard({ label, value, note }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-3.5 sm:p-5">
      <p className="truncate text-xs text-ink-2 sm:text-sm">{label}</p>
      <p className="mt-1.5 text-[clamp(1.125rem,5vw,1.875rem)] leading-tight font-semibold tabular-nums whitespace-nowrap text-ink sm:mt-2">
        {value}
      </p>
      {note && <p className="mt-1 text-[11px] leading-snug text-ink-3 sm:text-xs">{note}</p>}
    </div>
  )
}
