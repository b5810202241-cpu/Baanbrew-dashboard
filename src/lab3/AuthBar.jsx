// ส่วนล็อกอิน Google ที่ใช้ซ้ำได้ (เดิมเขียนอยู่ในตัว LiveTab.jsx โดยตรง — แยกออกมาให้ src/lab4/ui.jsx เรียกใช้ด้วย)
const THAI_AUTH_ERRORS = {
  "auth/unauthorized-domain": "โดเมนนี้ไม่ได้รับอนุญาตให้ล็อกอิน ตรวจการตั้งค่า Authorized domains ใน Firebase Console",
  "auth/operation-not-allowed": "ยังไม่ได้เปิดใช้ Google Sign-In ใน Firebase Console",
  "auth/popup-blocked": "เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปแล้วลองใหม่",
  "auth/popup-closed-by-user": "ปิดหน้าต่างล็อกอินก่อนเข้าสู่ระบบสำเร็จ",
};

export const authErrorText = (err) => THAI_AUTH_ERRORS[err?.code] ?? err?.message ?? String(err);

export function LoginCard({ onSignIn, error }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center ring-1 ring-stone-200">
        <h1 className="text-2xl font-bold" style={{ color: "#6B3E26" }}>เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm text-stone-500">เข้าสู่ระบบด้วย Google เพื่อดูผลวิเคราะห์</p>
        {error && <p className="mt-3 text-sm text-red-700">❌ {error}</p>}
        <button
          onClick={onSignIn}
          className="mt-6 w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </div>
  );
}

export function UserChip({ user, onSignOut }) {
  return (
    <div className="flex items-center gap-3">
      {user.photoURL && (
        <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
      )}
      <span className="text-sm text-stone-700">{user.displayName || user.email}</span>
      <button
        onClick={onSignOut}
        className="rounded-lg bg-white px-3 py-1.5 text-sm text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}
