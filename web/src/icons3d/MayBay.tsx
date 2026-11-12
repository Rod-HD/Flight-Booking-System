// Chuyến bay: máy bay đỏ bóng, đuôi vàng
import { KhungIcon3D, type ThuocTinhIcon } from './khung';

const THAN =
  'M54 32c0 2.2-2.4 4-5.5 4H38l-11 17h-5l5-17h-9l-4 6h-4l2.5-10L10 22h4l4 6h9l-5-17h5l11 17h10.5c3.1 0 5.5 1.8 5.5 4z';

export function IconMayBay(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g transform="rotate(-32 32 32)">
          <path d={THAN} fill={m.url(m.doDam)} transform="translate(0 2.6)" />
          <path d={THAN} fill={m.url(m.do)} />
          <path d="M18 28l-4-6h-4l2.5 10L10 42h4l4-6z" fill={m.url(m.vang)} />
          <path d="M40 29.2h8.6c2.4 0 4.2.8 4.9 1.9" stroke={m.url(m.bong)} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M24.5 13h1.6l9 14" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="44" cy="32" r="1.3" fill="#FFFFFF" opacity="0.9" />
          <circle cx="40" cy="32" r="1.3" fill="#FFFFFF" opacity="0.9" />
          <circle cx="36" cy="32" r="1.3" fill="#FFFFFF" opacity="0.9" />
        </g>
      )}
    />
  );
}
