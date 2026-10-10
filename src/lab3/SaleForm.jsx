// Lab 3.2 · ฟอร์มบันทึกยอดขายใหม่ลง Firestore (collection "sales")
import { useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { BRANCHES, PAYMENTS, MAX_QTY, validateSaleForm, buildSale } from "./saleModel.js";
import { fmtBaht } from "../lib/metrics.js";

const COFFEE = "#6B3E26";
const EMPTY_FORM = { branch: "", product_id: "", qty: "1", payment_method: "", customer_id: "" };
const inputCls = "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

// products = เอกสารจาก collection "products" ที่หน้าแม่ (LiveTab) โหลดมาครั้งเดียวด้วย getDocs แล้วส่งลงมา
// uid = ผู้ใช้ที่ล็อกอินอยู่ (ส่งมาจาก LiveTab หลังผ่าน onAuthStateChanged)
export default function SaleForm({ products = [], uid = "anonymous" }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { type: "success" | "error", message }

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
    setResult(null);
  };

  const selectedProduct = products.find((p) => p.product_id === form.product_id);
  const previewQty = Number(form.qty);
  const previewTotal = useMemo(
    () => (selectedProduct && Number.isFinite(previewQty) && previewQty > 0 ? previewQty * selectedProduct.price : null),
    [selectedProduct, previewQty],
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateSaleForm(form, products);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setResult(null);
    try {
      const product = products.find((p) => p.product_id === form.product_id);
      const { id, data } = buildSale(form, product, { uid });
      await setDoc(doc(db, "sales", id), { ...data, created_at: serverTimestamp() });
      setResult({ type: "success", message: `บันทึกสำเร็จ · เลขบิล ${data.order_id}` });
      setForm(EMPTY_FORM);
    } catch (err) {
      setResult({
        type: "error",
        message: err.code === "permission-denied" ? "ถูกปฏิเสธโดย Security Rules" : err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!products.length) {
    return <div className="rounded-xl bg-white p-5 text-sm text-stone-400 ring-1 ring-stone-200">กำลังโหลดเมนู…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-stone-200">
      <h2 className="text-lg font-semibold" style={{ color: COFFEE }}>บันทึกยอดขาย</h2>

      <Field label="สาขา" error={errors.branch}>
        <select value={form.branch} onChange={update("branch")} className={inputCls}>
          <option value="">เลือกสาขา</option>
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </Field>

      <Field label="เมนู" error={errors.product_id}>
        <select value={form.product_id} onChange={update("product_id")} className={inputCls}>
          <option value="">เลือกเมนู</option>
          {products.map((p) => (
            <option key={p.product_id} value={p.product_id}>{p.product_name} · {fmtBaht(p.price)}</option>
          ))}
        </select>
      </Field>

      <Field label="จำนวน" error={errors.qty}>
        <input type="number" min="1" max={MAX_QTY} value={form.qty} onChange={update("qty")} className={inputCls} />
      </Field>

      <Field label="วิธีชำระเงิน" error={errors.payment_method}>
        <select value={form.payment_method} onChange={update("payment_method")} className={inputCls}>
          <option value="">เลือกวิธีชำระเงิน</option>
          {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="รหัสสมาชิก (ไม่บังคับ)" error={errors.customer_id}>
        <input type="text" value={form.customer_id} onChange={update("customer_id")} placeholder="เช่น C01234" className={inputCls} />
      </Field>

      <div className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3">
        <span className="text-sm text-stone-500">ยอดรวม</span>
        <span className="text-lg font-semibold tabular-nums">{previewTotal !== null ? fmtBaht(previewTotal) : "—"}</span>
      </div>

      {result && (
        <p className={`text-sm ${result.type === "success" ? "text-green-700" : "text-red-700"}`}>
          {result.type === "success" ? "✅ " : "❌ "}{result.message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก…" : "บันทึกยอดขาย"}
      </button>
    </form>
  );
}
