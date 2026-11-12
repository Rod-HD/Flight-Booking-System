// Đăng nhập: chìa khóa đỏ bóng có vòng vàng
import { KhungIcon3D, duongSao, type ThuocTinhIcon } from './khung';

const CHIA =
  'M28 28h26a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2v5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-5h-2v3a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-3h-8z';

export function IconChiaKhoa(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <g transform="rotate(32 32 32) translate(2 0)">
            <path d={CHIA} fill={m.url(m.doDam)} transform="translate(0 2.4)" />
            <path d={CHIA} fill={m.url(m.do)} />
            <path d="M31 30h22" stroke={m.url(m.bong)} strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="17" cy="34.4" r="13" fill={m.url(m.doDam)} />
            <circle cx="17" cy="32" r="13" fill={m.url(m.do)} />
            <circle cx="17" cy="32" r="7.2" fill={m.url(m.vang)} />
            <circle cx="17" cy="32" r="4" fill="#FFF7E0" />
            <path d="M8 26a10 10 0 0 1 6-5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.85" />
          </g>
          <path d={duongSao(50, 13, 5.5, 2.2)} fill={m.url(m.vang)} />
        </g>
      )}
    />
  );
}
