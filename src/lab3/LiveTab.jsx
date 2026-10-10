// Lab 3.2 · Dashboard ยอดขายแบบ real-time จาก Firestore (collection "sales")
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { auth, db, googleProvider } from "./firebase.js";
import { todayBangkok, addDays } from "./time.js";
import { BRANCHES } from "./saleModel.js";
import {
  prepareRows, computeKpis, dailyRevenue, revenueByBranch,
  fmtBaht, fmtBaht2, fmtNum, fmtShortBaht,
} from "../lib/metrics.js";
import KpiCard from "../components/KpiCard.jsx";
import SaleForm from "./SaleForm.jsx";

const COFFEE = "#6B3E26";
const LEAF = "#2F7D5B";

const RANGES = [
  { id: "today", label: "วันนี้", days: 1 },
  { id: "7", label: "7 วัน", days: 7 },
  { id: "30", label: "30 วัน", days: 30 },
];

const THAI_ERRORS = {
  "permission-denied": "ไม่มีสิทธิ์อ่านข้อมูลนี้ (Security Rules ปฏิเสธ)",
  unavailable: "เชื่อมต่อ Firestore ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่",
  "failed-precondition": "ต้องสร้าง Index ก่อน ดูลิงก์สร้าง Index ใน Console",
};

const THAI_AUTH_ERRORS = {
  "auth/unauthorized-domain": "โดเมนนี้ไม่ได้รับอนุญาตให้ล็อกอิน ตรวจการตั้งค่า Authorized domains ใน Firebase Console",
  "auth/operation-not-allowed": "ยังไม่ได้เปิดใช้ Google Sign-In ใน Firebase Console",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปแล้วลองใหม่",
  "auth/popup-closed-by-user": "ปิดหน้าต่างล็อกอินก่อนเข้าสู่ระบบสำเร็จ",
};

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
// จัดรูปแบบจากสตริง YYYY-MM-DD/datetime ตรง ๆ ไม่ผ่าน new Date() เพื่อไม่ให้ timezone ของเครื่องมาเกี่ยว
const dateLabel = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${String(y).slice(2)}`;
};
const timeLabel = (iso) => iso.slice(11, 19);

/** ยอดขายรวมรายชั่วโมง (0-23) ใช้ค่า revenue ที่ prepareRows คำนวณไว้แล้ว ไม่คิดใหม่ */
function hourlyRevenue(rows) {
  const map = new Map();
  for (const r of rows) map.set(r.hour, (map.get(r.hour) ?? 0) + r.revenue);
  return Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: map.get(hour) ?? 0 }));
}

export default function LiveTab() {
  const [authStatus, setAuthStatus] = useState("checking"); // checking | signedOut | signedIn
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [range, setRange] = useState("7");
  const [branch, setBranch] = useState("");
  const [docs, setDocs] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [errorMsg, setErrorMsg] = useState("");
  const [readCount, setReadCount] = useState(0);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!auth) {
      setAuthStatus("signedOut");
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthStatus(u ? "signedIn" : "signedOut");
    });
  }, []);

  const handleSignIn = () => {
    setAuthError("");
    signInWithPopup(auth, googleProvider).catch((err) => {
      setAuthError(THAI_AUTH_ERRORS[err.code] ?? err.message);
    });
  };
  const handleSignOut = () => signOut(auth);

  // เมนูไม่ได้เปลี่ยนบ่อย โหลดครั้งเดียวด้วย getDocs แล้วส่งลง SaleForm เป็น props แทน onSnapshot
  useEffect(() => {
    if (!db || !user) return;
    getDocs(collection(db, "products"))
      .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setProducts([]));
  }, [user]);

  const { start, end } = useMemo(() => {
    const end = todayBangkok();
    const days = RANGES.find((r) => r.id === range).days;
    return { start: addDays(end, -(days - 1)), end };
  }, [range]);

  useEffect(() => {
    if (!db) {
      setStatus("error");
      setErrorMsg("ยังไม่ได้ตั้งค่า Firebase (.env)");
      return;
    }
    if (!user) return; // ยังไม่ล็อกอิน ห้ามเริ่มฟังข้อมูล

    setStatus("loading");
    setDocs([]);
    setReadCount(0);
    setHighlighted(new Set());

    let isFirst = true;
    const timers = [];
    const q = query(
      collection(db, "sales"),
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const changes = snap.docChanges();
        setReadCount((c) => c + changes.length);

        if (!isFirst) {
          const addedIds = changes.filter((c) => c.type === "added").map((c) => c.doc.id);
          if (addedIds.length) {
            setHighlighted((prev) => new Set([...prev, ...addedIds]));
            timers.push(
              setTimeout(() => {
                setHighlighted((prev) => {
                  const next = new Set(prev);
                  addedIds.forEach((id) => next.delete(id));
                  return next;
                });
              }, 4000),
            );
          }
        }
        isFirst = false;

        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setStatus("ok");
      },
      (err) => {
        setStatus("error");
        setErrorMsg(THAI_ERRORS[err.code] ?? err.message);
      },
    );

    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [start, end, user]);

  const prepared = useMemo(() => prepareRows(docs), [docs]);
  const filtered = useMemo(
    () => (branch ? prepared.filter((r) => r.branch === branch) : prepared),
    [prepared, branch],
  );
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const daily = useMemo(() => dailyRevenue(filtered), [filtered]);
  const hourly = useMemo(() => hourlyRevenue(filtered), [filtered]);
  const branches = useMemo(() => revenueByBranch(filtered), [filtered]);
  const recent = useMemo(
    () => [...filtered].sort((a, b) => (a.datetime < b.datetime ? 1 : -1)).slice(0, 8),
    [filtered],
  );

  if (authStatus === "checking") {
    return <p className="text-stone-500">กำลังตรวจสอบการเข้าสู่ระบบ…</p>;
  }

  if (authStatus === "signedOut") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center ring-1 ring-stone-200">
          <h1 className="text-2xl font-bold" style={{ color: COFFEE }}>ยอดขายสด</h1>
          <p className="mt-2 text-sm text-stone-500">เข้าสู่ระบบเพื่อดู Dashboard และบันทึกยอดขาย</p>
          {authError && <p className="mt-3 text-sm text-red-700">❌ {authError}</p>}
          <button
            onClick={handleSignIn}
            className="mt-6 w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
          >
            เข้าสู่ระบบด้วย Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
          )}
          <span className="text-sm text-stone-700">{user.displayName || user.email}</span>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-white px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: COFFEE }}>ยอดขายสด</h1>
          <p className="text-sm text-stone-500">อัปเดตอัตโนมัติจาก Firestore · อ่านไปแล้ว {fmtNum(readCount)} เอกสาร</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                range === r.id ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              {r.label}
            </button>
          ))}
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm text-stone-700 ring-1 ring-stone-200"
          >
            <option value="">ทุกสาขา</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </header>

      {status === "error" && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">❌ {errorMsg}</p>}
      {status === "loading" && <p className="mb-4 text-stone-500">กำลังเชื่อมต่อ…</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="ยอดขายรวม" value={fmtBaht(kpis.revenue)} />
            <KpiCard label="จำนวนบิล" value={fmtNum(kpis.bills)} />
            <KpiCard label="ยอดเฉลี่ยต่อบิล" value={fmtBaht2(kpis.avgPerBill)} />
            <KpiCard label="ลูกค้าสมาชิก" value={fmtNum(kpis.customers)} note="ไม่นับลูกค้า walk-in" />
          </section>

          <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
            <h2 className="text-lg font-semibold">{range === "today" ? "ยอดขายรายชั่วโมง" : "ยอดขายรายวัน"}</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {range === "today" ? (
                  <BarChart data={hourly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid stroke="#eee" vertical={false} />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={fmtShortBaht} width={60} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [fmtBaht(v), "ยอดขาย"]} labelFormatter={(h) => `${h}:00 น.`} />
                    <Bar dataKey="revenue" fill={COFFEE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid stroke="#eee" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={40} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={fmtShortBaht} width={60} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={dateLabel} formatter={(v) => [fmtBaht(v), "ยอดขาย"]} />
                    <Line dataKey="revenue" stroke={COFFEE} dot={false} strokeWidth={2.5} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
            <h2 className="text-lg font-semibold">ยอดขายแยกสาขา</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branches} layout="vertical" margin={{ top: 5, right: 80, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#eee" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtShortBaht} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="branch" width={90} tick={{ fontSize: 14 }} />
                  <Tooltip formatter={(v) => [fmtBaht(v), "ยอดขาย"]} />
                  <Bar dataKey="revenue" fill={LEAF} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200">
            <h2 className="text-lg font-semibold">รายการล่าสุด</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-stone-500">
                    <th className="py-2 pr-3">เวลา</th>
                    <th className="py-2 pr-3">สาขา</th>
                    <th className="py-2 pr-3">รหัสเมนู</th>
                    <th className="py-2 pr-3 text-right">จำนวน</th>
                    <th className="py-2 pr-3 text-right">ยอดขาย</th>
                    <th className="py-2 pr-3">ลูกค้า</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b border-stone-100 transition-colors duration-1000 ${
                        highlighted.has(r.id) ? "bg-amber-100" : ""
                      }`}
                    >
                      <td className="py-2 pr-3 tabular-nums">{timeLabel(r.datetime)}</td>
                      <td className="py-2 pr-3">{r.branch}</td>
                      <td className="py-2 pr-3">{r.product_id}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.qty)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtBaht(r.revenue)}</td>
                      <td className="py-2 pr-3">{r.customer_id ?? "—"}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400">ยังไม่มีรายการในช่วงนี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div>
          <SaleForm products={products} uid={user.uid} />
        </div>
      </div>
    </div>
  );
}
