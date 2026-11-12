// Nhập Excel: thư mục đỏ có bảng tính xanh
import { KhungIcon3D, type ThuocTinhIcon } from './khung';

export function IconThuMucBang(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <path d="M6 18a5 5 0 0 1 5-5h12l5 5h25a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z" fill={m.url(m.doDam)} />
          <g transform="rotate(-8 34 24)">
            <rect x="20" y="8" width="28" height="30" rx="3" fill={m.url(m.xanh)} />
            <rect x="23.5" y="12" width="21" height="22" rx="1.5" fill="#FFFFFF" opacity="0.95" />
            <path d="M23.5 19h21M23.5 26h21M30.5 12v22M37.5 12v22" stroke="#1E9E5A" strokeWidth="1.3" />
            <rect x="23.5" y="12" width="21" height="7" fill="#C8EED9" />
          </g>
          <path d="M4 29a4 4 0 0 1 4-4h48a4 4 0 0 1 4 4.6l-3 20.4a5 5 0 0 1-5 4.2H12a5 5 0 0 1-5-4.2z" fill={m.url(m.do)} />
          <path d="M9 30h44" stroke={m.url(m.bong)} strokeWidth="2.4" strokeLinecap="round" />
          <rect x="24" y="37" width="16" height="5" rx="2.5" fill={m.url(m.vang)} />
        </g>
      )}
    />
  );
}
