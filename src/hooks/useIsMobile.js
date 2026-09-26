import { useEffect, useState } from 'react'

// true เมื่อจอแคบกว่า 640px (ขนาดเดียวกับ breakpoint `sm` ของ Tailwind)
// ใช้กับกราฟ Recharts ซึ่งตั้งค่าด้วย props ไม่ใช่ class ของ Tailwind
const QUERY = '(max-width: 639px)'

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
