// Khung chung cho icon 3D: dải màu đỏ bóng, vàng nhấn, lớp bóng sáng và bóng đổ mềm.
// Mỗi icon tự vẽ hình bên trong và dùng các id màu do khung cấp (không trùng giữa các lần dùng).
import { useId } from 'react';

export interface MaMau {
  do: string;
  doDam: string;
  vang: string;
  vangDam: string;
  bong: string;
  kinh: string;
  xanh: string;
  locBong: string;
}

export interface ThuocTinhIcon {
  kichThuoc?: number;
  className?: string;
  /** chữ cho trình đọc màn hình; bỏ trống thì icon chỉ để trang trí */
  nhan?: string;
}

interface ThuocTinhKhung extends ThuocTinhIcon {
  ve: (m: MaMau & { url: (id: string) => string }) => React.ReactNode;
}

export function KhungIcon3D({ kichThuoc = 56, className, nhan, ve }: ThuocTinhKhung) {
  const goc = useId().replace(/:/g, '');
  const m: MaMau = {
    do: `${goc}-do`,
    doDam: `${goc}-dd`,
    vang: `${goc}-v`,
    vangDam: `${goc}-vd`,
    bong: `${goc}-b`,
    kinh: `${goc}-k`,
    xanh: `${goc}-x`,
    locBong: `${goc}-lb`,
  };
  const url = (id: string) => `url(#${id})`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={kichThuoc}
      height={kichThuoc}
      className={className}
      role={nhan ? 'img' : undefined}
      aria-label={nhan}
      aria-hidden={nhan ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={m.do} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#FF6A6F" />
          <stop offset="0.35" stopColor="#FF4B52" />
          <stop offset="1" stopColor="#D5141C" />
        </linearGradient>
        <linearGradient id={m.doDam} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C0121A" />
          <stop offset="1" stopColor="#8E0B11" />
        </linearGradient>
        <linearGradient id={m.vang} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFF07A" />
          <stop offset="0.4" stopColor="#FFE14A" />
          <stop offset="1" stopColor="#F9A51A" />
        </linearGradient>
        <linearGradient id={m.vangDam} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E89412" />
          <stop offset="1" stopColor="#C87700" />
        </linearGradient>
        <linearGradient id={m.bong} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={m.kinh} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#FDECEC" />
          <stop offset="1" stopColor="#F6C9CB" />
        </radialGradient>
        <linearGradient id={m.xanh} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3CCB7F" />
          <stop offset="1" stopColor="#168A4C" />
        </linearGradient>
        <filter id={m.locBong} x="-25%" y="-25%" width="150%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#8A0F14" floodOpacity="0.28" />
        </filter>
      </defs>
      <ellipse cx="32" cy="59" rx="17" ry="2.6" fill="#6F0000" opacity="0.14" />
      <g filter={url(m.locBong)}>{ve({ ...m, url })}</g>
    </svg>
  );
}

/** Đường ngôi sao năm cánh */
export function duongSao(cx: number, cy: number, R: number, r: number, xoay = -90): string {
  const diem: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const ban = i % 2 === 0 ? R : r;
    const goc = ((xoay + i * 36) * Math.PI) / 180;
    diem.push(`${(cx + ban * Math.cos(goc)).toFixed(2)} ${(cy + ban * Math.sin(goc)).toFixed(2)}`);
  }
  return `M${diem.join(' L')} Z`;
}

/** Đường bánh răng: soRang răng, bán kính ngoài R, trong r */
export function duongBanhRang(cx: number, cy: number, R: number, r: number, soRang: number): string {
  const diem: string[] = [];
  const buoc = 360 / soRang;
  for (let i = 0; i < soRang; i += 1) {
    const g = i * buoc;
    const goc = [g - buoc * 0.18, g + buoc * 0.18, g + buoc * 0.32, g + buoc * 0.68];
    const ban = [R, R, r, r];
    goc.forEach((a, k) => {
      const rad = (a * Math.PI) / 180;
      diem.push(`${(cx + ban[k] * Math.cos(rad)).toFixed(2)} ${(cy + ban[k] * Math.sin(rad)).toFixed(2)}`);
    });
  }
  return `M${diem.join(' L')} Z`;
}

/** Đồng hồ tròn vàng, dùng chung cho các icon có đồng hồ */
export function DongHo({ cx, cy, r, m }: { cx: number; cy: number; r: number; m: MaMau & { url: (id: string) => string } }) {
  return (
    <g>
      <circle cx={cx} cy={cy + 1.6} r={r} fill={m.url(m.vangDam)} />
      <circle cx={cx} cy={cy} r={r} fill={m.url(m.vang)} />
      <circle cx={cx} cy={cy} r={r * 0.74} fill="#FFFFFF" />
      <path d={`M${cx} ${cy - r * 0.5} V${cy} L${cx + r * 0.38} ${cy + r * 0.24}`} stroke="#D5141C" strokeWidth={r * 0.17} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={cx} cy={cy} r={r * 0.11} fill="#D5141C" />
      <path d={`M${cx - r * 0.62} ${cy - r * 0.35} A${r * 0.72} ${r * 0.72} 0 0 1 ${cx - r * 0.1} ${cy - r * 0.72}`} stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth={r * 0.12} strokeLinecap="round" fill="none" />
    </g>
  );
}
