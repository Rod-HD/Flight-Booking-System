// Trợ giúp: tai nghe đỏ có micro vàng
import { KhungIcon3D, type ThuocTinhIcon } from './khung';

export function IconTaiNghe(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <path d="M12 36V31a20 20 0 0 1 40 0v5" stroke={m.url(m.doDam)} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M12 34V30a20 20 0 0 1 40 0v4" stroke={m.url(m.do)} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M18 18a17 17 0 0 1 12-6" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <rect x="6" y="30" width="14" height="22" rx="7" fill={m.url(m.doDam)} transform="translate(0 2)" />
          <rect x="6" y="30" width="14" height="22" rx="7" fill={m.url(m.do)} />
          <rect x="44" y="30" width="14" height="22" rx="7" fill={m.url(m.doDam)} transform="translate(0 2)" />
          <rect x="44" y="30" width="14" height="22" rx="7" fill={m.url(m.do)} />
          <rect x="9" y="33" width="3" height="10" rx="1.5" fill="#FFFFFF" opacity="0.6" />
          <rect x="47" y="33" width="3" height="10" rx="1.5" fill="#FFFFFF" opacity="0.6" />
          <path d="M51 51c0 5-5 7-12 7" stroke={m.url(m.vangDam)} strokeWidth="3" strokeLinecap="round" fill="none" />
          <rect x="30" y="54" width="11" height="7" rx="3.5" fill={m.url(m.vang)} />
        </g>
      )}
    />
  );
}
