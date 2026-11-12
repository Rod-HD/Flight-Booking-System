// Tra cứu: kính lúp đỏ có tay cầm vàng
import { KhungIcon3D, type ThuocTinhIcon } from './khung';

export function IconKinhLup(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <g transform="rotate(45 44 44)">
            <rect x="38.5" y="38" width="22" height="10" rx="5" fill={m.url(m.vangDam)} transform="translate(0 1.6)" />
            <rect x="38.5" y="38" width="22" height="10" rx="5" fill={m.url(m.vang)} />
            <rect x="34" y="39.5" width="7" height="7" rx="2" fill={m.url(m.doDam)} />
            <rect x="44" y="39.8" width="12" height="2.4" rx="1.2" fill="#FFFFFF" opacity="0.7" />
          </g>
          <circle cx="27" cy="28.6" r="19" fill={m.url(m.doDam)} />
          <circle cx="27" cy="26.5" r="19" fill={m.url(m.do)} />
          <circle cx="27" cy="26.5" r="12.6" fill={m.url(m.kinh)} />
          <path d="M18.6 23.5a9 9 0 0 1 7-7" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M14 13.5a17 17 0 0 1 8-5" stroke={m.url(m.bong)} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </g>
      )}
    />
  );
}
