// แถบแท็บด้านบน: แท็บที่เลือกเป็นปุ่มสีเข้ม แท็บอื่นเป็นข้อความเฉย ๆ
export default function TabNav({ tabs, active, onChange }) {
  return (
    <nav className="sticky top-0 z-10 border-b border-line bg-header" aria-label="เมนูหลัก">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2.5">
        {tabs.map((t) => {
          const selected = t.id === active
          return (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={(e) => {
                e.preventDefault()
                onChange(t.id)
              }}
              aria-current={selected ? 'page' : undefined}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-series ${
                selected ? 'bg-ink text-page' : 'text-ink-2 hover:bg-line/60 hover:text-ink'
              }`}
            >
              {t.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
