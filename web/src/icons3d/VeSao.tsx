// Bán vé: tấm vé đỏ có ngôi sao vàng
import { KhungIcon3D, duongSao, type ThuocTinhIcon } from './khung';

export const DUONG_VE =
  'M12 18h26a4 4 0 0 0 8 0h6a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4h-6a4 4 0 0 0-8 0H12a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z';

export function IconVeSao(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g transform="rotate(-10 32 32)">
          <path d={DUONG_VE} fill={m.url(m.doDam)} transform="translate(0 2.6)" />
          <path d={DUONG_VE} fill={m.url(m.do)} />
          <path d="M42 24.5v15" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.1 4" />
          <path d={duongSao(25, 32.5, 9, 4)} fill={m.url(m.vangDam)} transform="translate(0 1.2)" />
          <path d={duongSao(25, 32, 9, 4)} fill={m.url(m.vang)} />
          <path d="M12 20.5h24" stroke={m.url(m.bong)} strokeWidth="2.4" strokeLinecap="round" />
          <rect x="47" y="26" width="5" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.7" />
          <rect x="47" y="31" width="5" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.7" />
          <rect x="47" y="36" width="5" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.7" />
        </g>
      )}
    />
  );
}
