// Báo cáo: biểu đồ cột đỏ kèm đồng xu vàng
import { KhungIcon3D, type ThuocTinhIcon } from './khung';

const COT = [
  { x: 8, cao: 16 },
  { x: 21, cao: 26 },
  { x: 34, cao: 36 },
];

export function IconBieuDoXu(p: ThuocTinhIcon) {
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          {COT.map((c) => {
            const y = 54 - c.cao;
            return (
              <g key={c.x}>
                <path d={`M${c.x + 10} ${y + 2} l4 -3 v${c.cao} l-4 3 z`} fill={m.url(m.doDam)} />
                <path d={`M${c.x} ${y + 2} l4 -3 h10 l-4 3 z`} fill="#FF8A8F" />
                <rect x={c.x} y={y + 2} width="10" height={c.cao} rx="1.5" fill={m.url(m.do)} />
                <rect x={c.x + 2} y={y + 4} width="2.2" height={c.cao - 6} rx="1.1" fill="#FFFFFF" opacity="0.45" />
              </g>
            );
          })}
          <g>
            <ellipse cx="49" cy="18.6" rx="11" ry="11" fill={m.url(m.vangDam)} />
            <circle cx="49" cy="17" r="11" fill={m.url(m.vang)} />
            <circle cx="49" cy="17" r="7.6" fill="none" stroke="#E89412" strokeWidth="1.6" />
            <path d="M49 12v10M46.2 14.6c0-1.3 1.2-2.1 2.8-2.1s2.8.8 2.8 2.1-1.2 1.9-2.8 2.4-2.8 1.1-2.8 2.4 1.2 2.1 2.8 2.1 2.8-.8 2.8-2.1" stroke="#C87700" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M42 13a8 8 0 0 1 5-4.6" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9" />
          </g>
          <rect x="6" y="54" width="44" height="3" rx="1.5" fill={m.url(m.doDam)} />
        </g>
      )}
    />
  );
}
