// Hình đám mây trắng có khối, dùng trong key visual
export function May({ className, style, rong }: { className?: string; style?: React.CSSProperties; rong: number }) {
  return (
    <svg viewBox="0 0 220 96" width={rong} className={className} style={style} aria-hidden focusable="false">
      <defs>
        <linearGradient id="may-khoi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.7" stopColor="#F3F9FE" />
          <stop offset="1" stopColor="#D6E9F7" />
        </linearGradient>
      </defs>
      <path
        d="M24 90c-13 0-22-9-22-20s9-20 21-20c1-17 15-30 32-30 9 0 17 4 23 10 7-15 22-26 40-26 22 0 40 15 44 35 4-2 9-3 14-3 18 0 32 13 32 29 0 1 0 2-.2 3C216 50 220 58 220 66c0 14-11 24-25 24z"
        fill="url(#may-khoi)"
      />
    </svg>
  );
}

/** Dải mây dày ở chân khung */
export function NenMay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="nen-may" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EAF5FD" />
        </linearGradient>
      </defs>
      <path
        d="M0 90c40-30 90-38 130-18 20-40 90-52 130-14 30-30 90-34 120 0 30-44 110-50 150-6 30-24 80-26 110 2 40-40 120-44 160 0 30-30 90-30 120 4 40-30 100-30 130 6 30-14 60-14 90 0v96H0z"
        fill="url(#nen-may)"
      />
    </svg>
  );
}
