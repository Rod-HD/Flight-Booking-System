// Phiếu đặt chỗ: bìa kẹp hồ sơ kèm đồng hồ
import { DongHo, KhungIcon3D, type ThuocTinhIcon } from './khung';

export function IconBiaKepDongHo(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <rect x="10" y="12" width="36" height="44" rx="7" fill={m.url(m.doDam)} />
          <rect x="10" y="10" width="36" height="44" rx="7" fill={m.url(m.do)} />
          <rect x="15" y="17" width="26" height="32" rx="3" fill="#FFFFFF" />
          <path d="M14 13.5h20" stroke={m.url(m.bong)} strokeWidth="2.4" strokeLinecap="round" />
          <rect x="20" y="24" width="16" height="3" rx="1.5" fill="#EC2029" />
          <rect x="20" y="30.5" width="16" height="3" rx="1.5" fill="#F6C9CB" />
          <rect x="20" y="37" width="10" height="3" rx="1.5" fill="#F6C9CB" />
          <rect x="21" y="6" width="14" height="8" rx="3" fill={m.url(m.vangDam)} transform="translate(0 1.4)" />
          <rect x="21" y="6" width="14" height="8" rx="3" fill={m.url(m.vang)} />
          <circle cx="28" cy="9.6" r="1.6" fill="#C87700" />
          <DongHo cx={45} cy={45} r={11.5} m={m} />
        </g>
      )}
    />
  );
}
