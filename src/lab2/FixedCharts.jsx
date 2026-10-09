// Lab 2.2 · กราฟที่ซ่อมแล้ว (เทียบกับ BadCharts.jsx ซ้าย-ขวา)
// ทุกกราฟรับ props { rows, products } ใช้สีหลักสีเดียว และมีข้อความสรุป 1 บรรทัดที่คำนวณจากข้อมูลจริง
import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from "recharts";
import {
  revenueByProduct, monthlyRevenue, branchPerformance, weeklyRevenue, daysInMonth, thaiMonth,
} from "./lab2Metrics.js";

// ---------- รูปแบบร่วม ----------
const COLOR = "var(--series-1, #2a78d6)";         // สีหลักสีเดียว (ใช้สีของธีม ถ้าไม่มีใช้ฟ้า)
const MUTED = "var(--text-muted, #6b6a66)";
const GRID = "var(--grid, #e9e7e1)";
const TEXT = "var(--text-primary, #16130f)";

const nf0 = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const baht = (n) => `฿${nf0.format(n)}`;                                   // ฿1,230,707
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const bahtShort = (n) =>                                                    // แกนกราฟ: ฿20k, ฿1.2M
  Math.abs(n) >= 1e6 ? `฿${+(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `฿${+(n / 1e3).toFixed(1)}k` : `฿${n}`;
const thaiDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

const tick = { fill: MUTED, fontSize: 12 };

/** กรอบกราฟ: ข้อความสรุป 1 บรรทัด + พื้นที่กราฟที่ยืดเต็มความสูงที่เหลือ */
function Frame({ summary, children }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.4, color: TEXT }}>{summary}</p>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

/** tooltip ร่วม: หัวเรื่อง + รายการ label: ค่า */
function Tip({ active, payload, title, lines }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #ddd)", borderRadius: 8,
                  padding: "6px 10px", fontSize: 13, color: TEXT, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
      <div style={{ color: MUTED, marginBottom: 2 }}>{title(d)}</div>
      {lines(d).map(([k, v]) => (
        <div key={k}><span style={{ color: MUTED }}>{k}: </span><b style={{ fontVariantNumeric: "tabular-nums" }}>{v}</b></div>
      ))}
    </div>
  );
}

// =====================================================================
// กราฟ 1: เมนูขายดี 10 อันดับ (แทน pie 40 ชิ้น)
// =====================================================================
const TOP_N = 10;
export function FixedChart1({ rows, products }) {
  const all = useMemo(() => revenueByProduct(rows, products), [rows, products]);
  const top = all.slice(0, TOP_N);
  const topShare = top.reduce((s, d) => s + d.share, 0);
  const summary = all.length
    ? `${TOP_N} เมนูแรกจาก ${all.length} เมนู ทำยอด ${pct(topShare)} ของยอดขายทั้งหมด · อันดับ 1 คือ ${top[0].name} ${baht(top[0].revenue)} (${pct(top[0].share)})`
    : "ไม่มีข้อมูล";
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ top: 0, right: 110, bottom: 0, left: 0 }} barCategoryGap={4}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="name" width={150} tick={{ ...tick, fill: TEXT }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: GRID, opacity: 0.5 }}
                   content={<Tip title={(d) => d.name} lines={(d) => [["ยอดขาย", baht(d.revenue)], ["สัดส่วน", pct(d.share)]]} />} />
          <Bar dataKey="revenue" fill={COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="revenue" position="right" formatter={(v) => baht(v)}
                       style={{ fill: TEXT, fontSize: 12, fontVariantNumeric: "tabular-nums" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// =====================================================================
// กราฟ 2: ยอดขายแยกสาขา แกนเริ่มที่ 0 เรียงมากไปน้อย สีเดียว
// =====================================================================
export function FixedChart2({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.revenue - a.revenue), [rows]);
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const [first, last] = [data[0], data[data.length - 1]];
  const summary = data.length
    ? `${first.branch} ขายได้มากที่สุด ${baht(first.revenue)} (${pct(first.revenue / total)} ของทั้งหมด) · มากกว่า${last.branch} ${(first.revenue / last.revenue).toFixed(1)} เท่า`
    : "ไม่มีข้อมูล";
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="branch" tick={{ ...tick, fill: TEXT }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis domain={[0, "auto"]} tickFormatter={bahtShort} tick={tick} tickLine={false} axisLine={false} width={56} />
          <Tooltip cursor={{ fill: GRID, opacity: 0.5 }}
                   content={<Tip title={(d) => d.branch} lines={(d) => [["ยอดขาย", baht(d.revenue)], ["สัดส่วน", pct(d.revenue / total)]]} />} />
          <Bar dataKey="revenue" fill={COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="revenue" position="top" formatter={(v) => baht(v)}
                       style={{ fill: TEXT, fontSize: 12, fontVariantNumeric: "tabular-nums" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// =====================================================================
// กราฟ 3: ยอดขายรายสัปดาห์ (แทน 538 จุดรายวัน) เส้นบาง ไม่มีจุด วันที่ภาษาไทย
// =====================================================================
export function FixedChart3({ rows }) {
  const data = useMemo(() => weeklyRevenue(rows), [rows]);   // ตัดสัปดาห์ที่ไม่ครบ 7 วันออกแล้ว
  let summary = "ไม่มีข้อมูล";
  if (data.length) {
    const avg = data.reduce((s, w) => s + w.revenue, 0) / data.length;
    const latest = data[data.length - 1];
    const diff = latest.revenue / avg - 1;
    summary = `เฉลี่ยสัปดาห์ละ ${baht(avg)} · สัปดาห์ล่าสุด ${baht(latest.revenue)} (${diff >= 0 ? "สูงกว่า" : "ต่ำกว่า"}ค่าเฉลี่ย ${pct(Math.abs(diff))})`;
  }
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40}
                 tickFormatter={(w) => thaiMonth(w.slice(0, 7))} />
          <YAxis domain={[0, "auto"]} tickFormatter={bahtShort} tick={tick} tickLine={false} axisLine={false} width={56} />
          <Tooltip cursor={{ stroke: MUTED, strokeDasharray: "3 3" }}
                   content={<Tip title={(d) => `สัปดาห์เริ่ม ${thaiDate(d.week)}`} lines={(d) => [["ยอดขาย", baht(d.revenue)]]} />} />
          <Line dataKey="revenue" stroke={COLOR} strokeWidth={2} dot={false}
                activeDot={{ r: 5, stroke: "var(--surface, #fff)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// =====================================================================
// กราฟ 4: ยอดขายเฉลี่ยต่อวันรายเดือน + บอกชัดว่าเดือนไหนข้อมูลไม่ครบ
// =====================================================================
export function FixedChart4({ rows }) {
  const data = useMemo(
    () => monthlyRevenue(rows).map((m) => {
      const dim = daysInMonth(m.month);
      return { ...m, dim, partial: m.days < dim, label: thaiMonth(m.month) };
    }),
    [rows]
  );
  let summary = "ไม่มีข้อมูล";
  if (data.length) {
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    const change = prev ? last.perDay / prev.perDay - 1 : 0;
    summary = last.partial
      ? `${last.label} มีข้อมูล ${last.days}/${last.dim} วัน · เฉลี่ย ${baht(last.perDay)}/วัน ${change >= 0 ? "สูงกว่า" : "ต่ำกว่า"} ${prev.label} ${pct(Math.abs(change))}`
      : `${last.label} ยอดเฉลี่ย ${baht(last.perDay)}/วัน ${change >= 0 ? "สูงกว่า" : "ต่ำกว่า"}เดือนก่อน ${pct(Math.abs(change))}`;
  }
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barCategoryGap="15%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ ...tick, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis domain={[0, "auto"]} tickFormatter={bahtShort} tick={tick} tickLine={false} axisLine={false} width={56} />
          <Tooltip cursor={{ fill: GRID, opacity: 0.5 }}
                   content={<Tip title={(d) => d.label + (d.partial ? " (ข้อมูลไม่ครบ)" : "")}
                                 lines={(d) => [["เฉลี่ยต่อวัน", baht(d.perDay)], ["ยอดรวม", baht(d.revenue)], ["วันที่มีข้อมูล", `${d.days}/${d.dim} วัน`]]} />} />
          <Bar dataKey="perDay" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {/* สีเดียวกัน เดือนไม่ครบใช้สีจาง + เส้นขอบประ แทนการใช้สีแดง */}
            {data.map((d) => (
              <Cell key={d.month} fill={COLOR} fillOpacity={d.partial ? 0.35 : 1}
                    stroke={d.partial ? COLOR : "none"} strokeDasharray={d.partial ? "4 3" : undefined} />
            ))}
            <LabelList dataKey="days" position="top"
                       content={({ x, y, width, index }) => data[index]?.partial ? (
                         <text x={x + width / 2} y={y - 6} textAnchor="middle" fill={MUTED} fontSize={11}>
                           {data[index].days}/{data[index].dim} วัน
                         </text>
                       ) : null} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

// =====================================================================
// กราฟ 5: จัดอันดับสาขาด้วย "ยอดเฉลี่ยต่อวันที่เปิดขาย" (ยุติธรรมกับสาขาที่เพิ่งเปิด)
// =====================================================================
export function FixedChart5({ rows }) {
  const data = useMemo(() => branchPerformance(rows).sort((a, b) => b.perDay - a.perDay), [rows]);
  let summary = "ไม่มีข้อมูล";
  if (data.length) {
    const maxDays = Math.max(...data.map((d) => d.days));
    const byTotal = [...data].sort((a, b) => b.revenue - a.revenue);
    const newest = data.filter((d) => d.days < maxDays * 0.9).sort((a, b) => a.days - b.days)[0];
    const best = data[0], worst = data[data.length - 1];  // best ใช้ในข้อความกรณีทุกสาขาเปิดเท่ากัน
    summary = newest
      ? `${newest.branch} เปิดแค่ ${nf0.format(newest.days)}/${nf0.format(maxDays)} วัน: ยอดรวมอันดับ ${byTotal.indexOf(newest) + 1} แต่ต่อวันอันดับ ${data.indexOf(newest) + 1} · ต่อวันต่ำสุดคือ${worst.branch} ${baht(worst.perDay)}`
      : `ยอดเฉลี่ยต่อวันสูงสุดคือ${best.branch} ${baht(best.perDay)} · ต่ำสุดคือ${worst.branch} ${baht(worst.perDay)}`;
  }
  return (
    <Frame summary={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 150, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="branch" width={96} tick={{ ...tick, fill: TEXT, fontSize: 13 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: GRID, opacity: 0.5 }}
                   content={<Tip title={(d) => d.branch}
                                 lines={(d) => [["เฉลี่ยต่อวัน", baht(d.perDay)], ["ยอดรวม", baht(d.revenue)], ["วันที่เปิดขาย", `${nf0.format(d.days)} วัน`]]} />} />
          <Bar dataKey="perDay" fill={COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="perDay" position="right"
                       content={({ x, y, width, height, index }) => (
                         <text x={x + width + 8} y={y + height / 2 + 4} fill={TEXT} fontSize={12} style={{ fontVariantNumeric: "tabular-nums" }}>
                           {baht(data[index].perDay)}/วัน
                           <tspan fill={MUTED}> · {nf0.format(data[index].days)} วัน</tspan>
                         </text>
                       )} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}
