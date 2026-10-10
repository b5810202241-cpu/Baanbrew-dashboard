// Lab 4.4–4.5 · พยากรณ์และวันผิดปกติ
// คำนวณในเบราว์เซอร์จาก analytics/daily (ยอดรายวันแยกสาขา ~2,700 แถว) จึงเปลี่ยนสาขาได้ทันทีโดยไม่อ่าน Firestore เพิ่ม
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { AnalyticsShell, Card, Pending, Insight, MAIN, GREEN, MUTED, INK, thaiDay } from "./ui.jsx";
import { useAnalytics } from "./useAnalytics.js";
import { toSeries } from "../lib/analytics/daily.js";
import { addDays } from "../lab3/time.js";
import { seasonalForecast, backtest, mape } from "../lib/analytics/forecast.js";
import { scoreAnomalies } from "../lib/analytics/anomaly.js";
import { fmtBaht, fmtShortBaht } from "../lib/metrics.js";

const BRANCHES = ["สยาม", "สีลม", "อารีย์", "บางนา", "มหาวิทยาลัย"];
const HORIZON = 28;
const shortDay = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const tryRun = (f) => { try { return { value: f() }; } catch (e) { return { error: e.message }; } };

// Lab 4.4B · รวมผลย้อนทดสอบรายวัน (bt.test) เป็นรายสัปดาห์ (จันทร์–อาทิตย์) แล้วคำนวณ MAPE ด้วยฟังก์ชันเดิม
function weeklyFromTest(test) {
  const weeks = new Map();
  for (const t of test) {
    const d = new Date(t.date + "T00:00:00Z");
    const offset = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1; // จำนวนวันนับจากวันจันทร์
    d.setUTCDate(d.getUTCDate() - offset);
    const weekStart = d.toISOString().slice(0, 10); // สร้างจาก Date ที่เป็น UTC ล้วน จึงไม่เพี้ยนเหมือน toISOString ทั่วไป
    const w = weeks.get(weekStart) ?? { weekStart, actual: 0, seasonal: 0 };
    w.actual += t.actual;
    w.seasonal += t.seasonal;
    weeks.set(weekStart, w);
  }
  return [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function ForecastCard({ daily }) {
  const [branch, setBranch] = useState(null);
  const [view, setView] = useState("daily"); // daily | weekly — Lab 4.4B
  const result = useMemo(() => tryRun(() => {
    const series = toSeries(daily, branch);
    const bt = backtest(series, HORIZON);
    const fc = seasonalForecast(series, HORIZON);
    const recent = series.slice(-56);
    const last = recent[recent.length - 1];
    const chart = [
      ...recent.map((s) => ({ date: s.date, actual: s.revenue })),
      ...fc.map((f) => ({ date: f.date, forecast: f.forecast, band: [f.forecast * (1 - bt.band), f.forecast * (1 + bt.band)] })),
    ];
    chart[recent.length - 1] = { ...chart[recent.length - 1], forecast: last.revenue }; // ต่อเส้นให้ไม่ขาด
    const next7 = fc.slice(0, 7).reduce((s, f) => s + f.forecast, 0);
    return { bt, chart, next7, lastDate: last.date };
  }), [daily, branch]);

  const r = result.value;
  const weekly = useMemo(() => {
    if (!r) return null;
    const weeks = weeklyFromTest(r.bt.test);
    return mape(weeks.map((w) => w.actual), weeks.map((w) => w.seasonal));
  }, [r]);

  return (
    <Card title="พยากรณ์ยอดขาย 28 วัน" sub="ค่าเฉลี่ยวันเดียวกันของสัปดาห์ 8 สัปดาห์ล่าสุด · แถบ = ช่วงที่คาดว่าครอบคลุมราว 80% ของวัน"
          right={<div className="flex flex-wrap gap-1">
            {[null, ...BRANCHES].map((b) => (
              <button key={b ?? "all"} onClick={() => setBranch(b)}
                      className={`rounded-lg px-2.5 py-1 text-sm ${branch === b ? "bg-stone-900 text-white" : "text-stone-600 ring-1 ring-stone-200"}`}>{b ?? "รวม"}</button>
            ))}
          </div>}>
      {result.error ? <Pending lab="Lab 4.4" error={result.error} /> : (
        <>
          <div className="mb-3 flex gap-1">
            {[["daily", "รายวัน"], ["weekly", "รายสัปดาห์"]].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                      className={`rounded-lg px-2.5 py-1 text-sm ${view === id ? "bg-stone-900 text-white" : "text-stone-600 ring-1 ring-stone-200"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="คาดการณ์ 7 วันข้างหน้า" value={fmtBaht(r.next7)} />
            {view === "daily" ? (
              <Stat label="ย้อนทดสอบ 28 วัน: คลาดเคลื่อนเฉลี่ยต่อวัน" value={`${r.bt.mapeSeasonal.toFixed(1)}%`} note="วิธีดูวันในสัปดาห์" />
            ) : (
              <Stat label="ย้อนทดสอบ 4 สัปดาห์: คลาดเคลื่อนเฉลี่ยต่อสัปดาห์" value={`${weekly.toFixed(1)}%`} note={`รายวัน ${r.bt.mapeSeasonal.toFixed(1)}%`} />
            )}
            <Stat label="ถ้าใช้ค่าเฉลี่ย 28 วันเส้นตรง" value={`${r.bt.mapeFlat.toFixed(1)}%`} note="ตัวเปรียบเทียบ" muted />
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={r.chart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={36} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmtShortBaht} width={56} domain={[0, "auto"]} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={thaiDay} formatter={(v, n) => [Array.isArray(v) ? `${fmtBaht(v[0])} – ${fmtBaht(v[1])}` : fmtBaht(v), n]} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <ReferenceLine x={r.lastDate} stroke={MUTED} strokeDasharray="3 3" label={{ value: "ข้อมูลถึง", position: "insideTopLeft", fontSize: 11, fill: INK }} />
                <Area name="ช่วงคาดการณ์" dataKey="band" stroke="none" fill={GREEN[1]} isAnimationActive={false} />
                <Line name="ยอดจริง" dataKey="actual" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line name="คาดการณ์" dataKey="forecast" stroke={MAIN} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Insight>
            {r.bt.mapeFlat > r.bt.mapeSeasonal * 1.5
              ? `${branch ?? "ภาพรวม"}: การดูวันในสัปดาห์ช่วยลดความคลาดเคลื่อนจาก ${r.bt.mapeFlat.toFixed(0)}% เหลือ ${r.bt.mapeSeasonal.toFixed(0)}% เพราะยอดวันธรรมดากับเสาร์-อาทิตย์ต่างกันมาก`
              : `${branch ?? "ภาพรวม"}: สองวิธีแม่นพอ ๆ กัน (${r.bt.mapeSeasonal.toFixed(0)}% กับ ${r.bt.mapeFlat.toFixed(0)}%) ${branch ? "" : "เพราะสาขาออฟฟิศกับห้างขายดีคนละวัน พอรวมกันรูปแบบรายสัปดาห์จึงหักล้างกัน"}`}
            {" "}ใช้วางแผนสต็อกและกะพนักงานรายสัปดาห์ได้ แต่ไม่ควรใช้ตัดสินยอดรายวันของสาขาเดียว
          </Insight>
        </>
      )}
    </Card>
  );
}

function Stat({ label, value, note, muted }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${muted ? "text-stone-500" : ""}`}>{value}</div>
      {note && <div className="text-xs text-stone-400">{note}</div>}
    </div>
  );
}

// Lab 4.5B · คลิกแถวในตารางแล้วซูมดูยอดจริงเทียบค่าปกติ ±28 วันรอบวันที่เลือก
function ZoomChart({ daily, all, focus, onClose }) {
  const data = useMemo(() => {
    const series = toSeries(daily, focus.branch);
    const expectedMap = new Map(all.filter((a) => a.branch === focus.branch).map((a) => [a.date, a.expected]));
    const from = addDays(focus.date, -28);
    const to = addDays(focus.date, 28);
    return series
      .filter((s) => s.date >= from && s.date <= to)
      .map((s) => ({
        date: s.date,
        actual: s.revenue,
        expected: expectedMap.get(s.date),
        highlight: s.date === focus.date ? s.revenue : null,
      }));
  }, [daily, all, focus]);

  const focusColor = focus.change < 0 ? "#b91c1c" : "#b45309"; // แดง = ต่ำกว่าปกติ, ส้ม = สูงกว่าปกติ (สีเดียวกับตาราง)

  return (
    <Card
      title={`ซูม: ${focus.branch} รอบ ${thaiDay(focus.date)}`}
      sub="เส้นทึบ = ยอดจริง · เส้นประ = ค่าปกติ (ค่ากลางวันเดียวกันของสัปดาห์) · จุดสี = วันที่เลือก"
      right={
        <button onClick={onClose} className="rounded-lg bg-white px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100">
          ปิด
        </button>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eee" />
            <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={28} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmtShortBaht} width={56} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={thaiDay} formatter={(v, n) => [v == null ? "–" : fmtBaht(v), n]} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <ReferenceLine x={focus.date} stroke={MUTED} strokeDasharray="3 3" />
            <Line name="ยอดจริง" dataKey="actual" stroke={INK} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line name="ค่าปกติ" dataKey="expected" stroke={MAIN} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
            <Line name="วันที่เลือก" dataKey="highlight" stroke="none" dot={{ r: 5, fill: focusColor }} legendType="none" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function AnomalyCard({ daily, holidays }) {
  const [focus, setFocus] = useState(null);
  const result = useMemo(() => tryRun(() => scoreAnomalies(daily, holidays)), [daily, holidays]);
  if (result.error) return <Card title="วันที่ยอดขายผิดปกติ"><Pending lab="Lab 4.5" error={result.error} /></Card>;
  const all = result.value;
  const top = all.filter((a) => !a.holiday).slice(0, 15);
  const holidayHits = all.filter((a) => a.holiday).slice(0, 5);
  return (
    <>
    <Card title="วันที่ยอดขายผิดปกติ 15 อันดับ"
          sub="เทียบกับค่ากลางของวันเดียวกันของสัปดาห์ใน 8 สัปดาห์ก่อน · ไม่นับวันหยุดราชการ">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm tabular-nums">
          <thead className="text-left text-stone-500">
            <tr><th className="py-1 font-medium">#</th><th className="font-medium">วันที่</th><th className="font-medium">สาขา</th>
              <th className="text-right font-medium">ยอดจริง</th><th className="text-right font-medium">ปกติ</th><th className="pl-4 font-medium">ต่างจากปกติ</th></tr>
          </thead>
          <tbody>
            {top.map((a, i) => {
              const sel = focus && focus.date === a.date && focus.branch === a.branch;
              return (
                <tr key={a.date + a.branch} onClick={() => setFocus(sel ? null : a)}
                    className={`cursor-pointer border-t border-stone-100 hover:bg-stone-50 ${sel ? "bg-emerald-50" : ""}`}>
                  <td className="py-1.5 text-stone-400">{i + 1}</td>
                  <td>{thaiDay(a.date)} <span className="text-stone-400">{new Date(a.date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short" })}</span></td>
                  <td>{a.branch}</td>
                  <td className="text-right">{fmtBaht(a.actual)}</td>
                  <td className="text-right text-stone-500">{fmtBaht(a.expected)}</td>
                  <td className="pl-4">
                    {a.change < 0
                      ? <span className="font-medium text-red-700">▼ ต่ำกว่าปกติ {Math.round(-a.change * 100)}%</span>
                      : <span className="font-medium text-amber-700">▲ สูงกว่าปกติ {Math.round(a.change * 100)}%</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Insight>
        อันดับต้น ๆ คือวันที่ควรโทรถามผู้จัดการสาขาว่าเกิดอะไรขึ้น · ระบบบอกได้ว่า “ผิดปกติ” แต่บอกไม่ได้ว่า “เพราะอะไร”
        {holidayHits.length > 0 && <> · วันหยุดที่ยอดเปลี่ยนมากแต่ไม่นับ เช่น {holidayHits.slice(0, 3).map((h) => `${h.holiday} (${h.branch})`).join(", ")}</>}
      </Insight>
    </Card>
    {focus && <ZoomChart daily={daily} all={all} focus={focus} onClose={() => setFocus(null)} />}
    </>
  );
}

export default function ForecastTab({ source }) {
  const state = useAnalytics(source);
  return (
    <AnalyticsShell source={source} state={state} title="พยากรณ์และวันผิดปกติ">
      {(d) => d.daily.error ? <Pending lab="pipeline" error={d.daily.error} /> : (
        <div className="space-y-6">
          {d.meta.alerts?.length > 0 && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              🚨 ยอดวันล่าสุดผิดปกติ: {d.meta.alerts.map((a) => `${a.branch} ${fmtBaht(a.actual)} (ปกติ ${fmtBaht(a.expected)})`).join(", ")}
            </p>
          )}
          <ForecastCard daily={d.daily.rows} />
          <AnomalyCard daily={d.daily.rows} holidays={d.meta.holidays ?? {}} />
        </div>
      )}
    </AnalyticsShell>
  );
}
