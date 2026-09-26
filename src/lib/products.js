// ชื่อเมนูของแต่ละ product_id
// sales.csv มีแค่รหัสสินค้า ถ้าต้องการให้กราฟ "เมนูขายดี" แสดงชื่อ ให้เติมชื่อที่นี่ เช่น
//   P004: 'อเมริกาโน่',
// รหัสที่ยังไม่ได้ใส่ชื่อจะแสดงเป็นรหัสเดิม (เช่น P004)
export const PRODUCT_NAMES = {
  // P004: 'อเมริกาโน่',
  // P016: 'ลาเต้',
}

export function productName(productId) {
  return PRODUCT_NAMES[productId] ?? productId
}
