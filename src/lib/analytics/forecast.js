// Lab 4.4 · ใช้ Claude Code เขียนฟังก์ชันที่ยังว่าง (Prompt 4.4A ใน PROMPTS_LAB4.md) จนกว่า npm test จะผ่าน · ห้ามแก้ไฟล์ test
// Lab 4.4 · พยากรณ์ยอดขายแบบอธิบายได้ และวัดความแม่นด้วยการย้อนทดสอบ (backtest)
import { addDays } from "../../lab3/time.js";

const dow = (ymd) => new Date(ymd + "T00:00:00Z").getUTCDay(); // 0 = อาทิตย์

/** ค่าเฉลี่ยยอดขายวันเดียวกันของสัปดาห์ K ครั้งล่าสุด (ฤดูกาลรายสัปดาห์) */
export function seasonalForecast(series, horizon, K = 8) {
  const last = series[series.length - 1].date;
  return Array.from({ length: horizon }, (_, i) => {
    const date = addDays(last, i + 1);
    const targetDow = dow(date);
    const matches = [];
    for (let j = series.length - 1; j >= 0 && matches.length < K; j--) {
      if (dow(series[j].date) === targetDow) matches.push(series[j].revenue);
    }
    const forecast = matches.reduce((a, b) => a + b, 0) / matches.length;
    return { date, forecast };
  });
}

/** ค่าเฉลี่ย K วันล่าสุด เส้นตรง (ตัวเปรียบเทียบที่ไม่สนวันในสัปดาห์) */
export function flatForecast(series, horizon, K = 28) {
  const recent = series.slice(-K);
  const avg = recent.reduce((a, s) => a + s.revenue, 0) / recent.length;
  const last = series[series.length - 1].date;
  return Array.from({ length: horizon }, (_, i) => ({ date: addDays(last, i + 1), forecast: avg }));
}

/** Mean Absolute Percentage Error (%) · ข้ามวันที่ยอดจริงเป็น 0 เพราะหารไม่ได้ */
export function mape(actual, forecast) {
  let sum = 0, count = 0;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 0) continue;
    sum += Math.abs((actual[i] - forecast[i]) / actual[i]);
    count++;
  }
  return count ? (sum / count) * 100 : 0;
}

/**
 * ย้อนทดสอบ: ซ่อน horizon วันสุดท้าย พยากรณ์จากข้อมูลก่อนหน้า แล้วเทียบกับของจริง
 * band = ±1.28 × ส่วนเบี่ยงเบนมาตรฐานของ % ความคลาดเคลื่อน (ช่วงประมาณ 80%)
 */
export function backtest(series, horizon = 28, K = 8) {
  const cut = series.length - horizon;
  const train = series.slice(0, cut);
  const holdout = series.slice(cut);

  const seasonal = seasonalForecast(train, horizon, K);
  const flat = flatForecast(train, horizon);

  const actualArr = holdout.map((h) => h.revenue);
  const seasonalArr = seasonal.map((s) => s.forecast);
  const flatArr = flat.map((f) => f.forecast);

  const mapeSeasonal = mape(actualArr, seasonalArr);
  const mapeFlat = mape(actualArr, flatArr);

  const pctErrors = [];
  for (let i = 0; i < actualArr.length; i++) {
    if (actualArr[i] === 0) continue;
    pctErrors.push((actualArr[i] - seasonalArr[i]) / actualArr[i]);
  }
  const n = pctErrors.length || 1;
  const meanErr = pctErrors.reduce((a, b) => a + b, 0) / n;
  const variance = pctErrors.reduce((a, b) => a + (b - meanErr) ** 2, 0) / n;
  const band = 1.28 * Math.sqrt(variance);

  const test = holdout.map((h, i) => ({ date: h.date, actual: h.revenue, seasonal: seasonalArr[i], flat: flatArr[i] }));

  return { mapeSeasonal, mapeFlat, band, test };
}
