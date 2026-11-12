// Đặt vé: lịch đỏ kèm đồng hồ
import { DongHo, KhungIcon3D, type ThuocTinhIcon } from './khung';

export function IconLichDongHo(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <rect x="7" y="14" width="40" height="38" rx="7" fill={m.url(m.doDam)} />
          <rect x="7" y="12" width="40" height="38" rx="7" fill={m.url(m.do)} />
          <rect x="11" y="22" width="32" height="24" rx="4" fill="#FFFFFF" />
          <path d="M11 15.5h24" stroke={m.url(m.bong)} strokeWidth="2.4" strokeLinecap="round" />
          {[0, 1, 2].map((c) =>
            [0, 1].map((h) => (
              <rect key={`${c}${h}`} x={14.5 + c * 9} y={26 + h * 9} width="6" height="5.5" rx="1.6" fill={c === 0 && h === 0 ? '#EC2029' : '#F6C9CB'} />
            )),
          )}
          <rect x="15" y="7" width="5" height="10" rx="2.5" fill={m.url(m.vang)} />
          <rect x="34" y="7" width="5" height="10" rx="2.5" fill={m.url(m.vang)} />
          <DongHo cx={45} cy={44} r={12} m={m} />
        </g>
      )}
    />
  );
}
