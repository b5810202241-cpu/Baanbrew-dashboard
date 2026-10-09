// ตัวกรอง สาขา / ตั้งแต่วันที่ / ถึงวันที่ / ล้างตัวกรอง (ใช้ร่วมกันทุกแท็บที่กรองได้)
const field =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-series focus:outline-none'

export default function FilterBar({ branches, minDate, maxDate, filter, onChange }) {
  const set = (key) => (e) => onChange({ ...filter, [key]: e.target.value })
  const active = filter.branch || filter.from || filter.to

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:gap-4">
        <label className="col-span-2 flex flex-col gap-1.5 text-xs text-ink-2 sm:w-44">
          สาขา
          <select id="filter-branch" className={field} value={filter.branch} onChange={set('branch')}>
            <option value="">ทุกสาขา</option>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-ink-2 sm:w-44">
          ตั้งแต่วันที่
          <input id="filter-from" type="date" className={field} value={filter.from} onChange={set('from')}
                 min={minDate} max={filter.to || maxDate} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-ink-2 sm:w-44">
          ถึงวันที่
          <input id="filter-to" type="date" className={field} value={filter.to} onChange={set('to')}
                 min={filter.from || minDate} max={maxDate} />
        </label>
        <button
          type="button"
          disabled={!active}
          onClick={() => onChange({ branch: '', from: '', to: '' })}
          className="col-span-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-line/50 disabled:cursor-not-allowed disabled:text-ink-3 disabled:hover:bg-transparent sm:col-span-1"
        >
          ล้างตัวกรอง
        </button>
      </div>
    </section>
  )
}
