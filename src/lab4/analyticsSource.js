// Lab 4 · แหล่งข้อมูลผลวิเคราะห์: ล็อกอิน Google เดียวกับ Lab 3 + อ่าน 5 เอกสารใน collection "analytics"
// (pipeline เขียนไว้ล่วงหน้าด้วย scripts/build-analytics.mjs จึงอ่านแค่ 5 ครั้งต่อการเปิดหน้า)
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lab3/firebase.js";

const DOC_IDS = ["meta", "daily", "rfm", "cohort", "abc"];

export const analyticsSource = {
  onAuth: (cb) => onAuthStateChanged(auth, cb),
  signIn: () => signInWithPopup(auth, googleProvider),
  signOut: () => firebaseSignOut(auth),
  async loadAnalytics() {
    const snaps = await Promise.all(DOC_IDS.map((id) => getDoc(doc(db, "analytics", id))));
    const data = Object.fromEntries(DOC_IDS.map((id, i) => [id, snaps[i].data()]));
    return { reads: DOC_IDS.length, ...data };
  },
};
