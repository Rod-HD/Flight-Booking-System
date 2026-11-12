// Danh sách vé: chồng ba tấm vé
import { KhungIcon3D, duongSao, type ThuocTinhIcon } from './khung';
import { DUONG_VE } from './VeSao';

export function IconChongVe(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <g transform="translate(2 -8) rotate(12 32 32) scale(0.9) translate(3.5 3.5)">
            <path d={DUONG_VE} fill={m.url(m.vang)} />
          </g>
          <g transform="translate(0 -2) rotate(-4 32 32) scale(0.94) translate(2 2)">
            <path d={DUONG_VE} fill={m.url(m.doDam)} />
          </g>
          <g transform="translate(0 7) rotate(-14 32 32) scale(0.92) translate(2.6 2.6)">
            <path d={DUONG_VE} fill={m.url(m.doDam)} transform="translate(0 2.6)" />
            <path d={DUONG_VE} fill={m.url(m.do)} />
            <path d="M42 24.5v15" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 4" />
            <path d="M12 20.5h24" stroke={m.url(m.bong)} strokeWidth="2.4" strokeLinecap="round" />
            <rect x="13" y="27" width="20" height="3" rx="1.5" fill="#FFFFFF" opacity="0.85" />
            <rect x="13" y="33" width="14" height="3" rx="1.5" fill="#FFFFFF" opacity="0.6" />
            <path d={duongSao(49.5, 32, 4.6, 2)} fill={m.url(m.vang)} />
          </g>
        </g>
      )}
    />
  );
}
