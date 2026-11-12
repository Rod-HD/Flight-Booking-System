// Phân quyền: khiên đỏ kèm chìa khóa vàng
import { KhungIcon3D, type ThuocTinhIcon } from './khung';

const KHIEN = 'M30 5l20 7v15c0 13.5-8.6 22.6-20 27.6C18.6 49.6 10 40.5 10 27V12z';

export function IconKhienChia(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <path d={KHIEN} fill={m.url(m.doDam)} transform="translate(0 2.6)" />
          <path d={KHIEN} fill={m.url(m.do)} />
          <path d="M30 9.5l15.5 5.4V27c0 10.6-6.4 18-15.5 22.4z" fill="#FFFFFF" opacity="0.14" />
          <path d="M14.5 15.5L28 10.5" stroke={m.url(m.bong)} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="30" cy="24" r="5.5" fill="#FFFFFF" />
          <path d="M20.5 39c1.4-5.4 5-8.2 9.5-8.2s8.1 2.8 9.5 8.2" fill="#FFFFFF" />
          <g transform="rotate(-38 46 44)">
            <rect x="44" y="41.6" width="17" height="5" rx="2" fill={m.url(m.vangDam)} transform="translate(0 1.2)" />
            <rect x="44" y="41.6" width="17" height="5" rx="2" fill={m.url(m.vang)} />
            <rect x="53" y="45" width="3" height="5" rx="1" fill={m.url(m.vang)} />
            <rect x="57.5" y="45" width="3" height="4" rx="1" fill={m.url(m.vang)} />
            <circle cx="41" cy="44.6" r="8" fill={m.url(m.vangDam)} transform="translate(0 1.2)" />
            <circle cx="41" cy="44.6" r="8" fill={m.url(m.vang)} />
            <circle cx="39.6" cy="44.6" r="2.8" fill="#C87700" />
            <path d="M35.6 40.6a6 6 0 0 1 4-2.2" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </g>
        </g>
      )}
    />
  );
}
