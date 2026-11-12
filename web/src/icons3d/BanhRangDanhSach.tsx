// Quy định: danh sách có dấu tích kèm bánh răng
import { KhungIcon3D, duongBanhRang, type ThuocTinhIcon } from './khung';

export function IconBanhRangDanhSach(p: ThuocTinhIcon) {
  const rang = duongBanhRang(42, 40, 16, 12.5, 8);
  return (
    <KhungIcon3D
      {...p}
      ve={(m) => (
        <g>
          <rect x="6" y="8" width="32" height="42" rx="6" fill="#FFFFFF" stroke="#F3D3D4" strokeWidth="1.5" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="11" y={15 + i * 10} width="6.5" height="6.5" rx="2" fill={m.url(m.vang)} />
              <path d={`M12.6 ${18.4 + i * 10}l1.6 1.6 2.6-3`} stroke="#B3141B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <rect x="20.5" y={16.5 + i * 10} width="12" height="3.2" rx="1.6" fill={i === 0 ? '#EC2029' : '#F6C9CB'} />
            </g>
          ))}
          <path d={rang} fill={m.url(m.doDam)} transform="translate(0 2.6)" />
          <path d={rang} fill={m.url(m.do)} />
          <circle cx="42" cy="40" r="6.4" fill={m.url(m.vangDam)} />
          <circle cx="42" cy="39.4" r="5.4" fill={m.url(m.vang)} />
          <circle cx="42" cy="39.4" r="2.2" fill="#FFFFFF" />
          <path d="M31.5 33a12 12 0 0 1 7-6.2" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      )}
    />
  );
}
