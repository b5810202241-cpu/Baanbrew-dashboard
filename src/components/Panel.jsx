// กล่องกราฟ: หัวข้อ + คำอธิบายสั้น + เนื้อหา
export default function Panel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mb-4 text-sm text-ink-3">{subtitle}</p>}
      {children}
    </section>
  )
}
