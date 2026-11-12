// Trạng thái rỗng (có linh vật) và khối xương khi đang tải
import { LinhVat, type TuTheLinhVat } from './LinhVat';
import s from './TrangThaiRong.module.css';

export interface ThuocTinhTrangThaiRong {
  tieuDe: string;
  goiY?: React.ReactNode;
  linhVat?: TuTheLinhVat;
  kichThuocHinh?: number;
  hanhDong?: React.ReactNode;
  className?: string;
}

export function TrangThaiRong({ tieuDe, goiY, linhVat = 'ngu', kichThuocHinh = 112, hanhDong, className }: ThuocTinhTrangThaiRong) {
  return (
    <div className={`${s.rong} ${className ?? ''}`} role="status">
      <LinhVat tuThe={linhVat} kichThuoc={kichThuocHinh} className={s.hinh} />
      <p className={s.tieuDe}>{tieuDe}</p>
      {goiY && <p className={s.goiY}>{goiY}</p>}
      {hanhDong && <div className={s.hanhDong}>{hanhDong}</div>}
    </div>
  );
}

/** Thanh xương nhấp nháy giữ chỗ khi dữ liệu đang tải */
export function KhungXuong({ rong = '100%', cao = 14, boGoc = 8, className }: { rong?: number | string; cao?: number; boGoc?: number; className?: string }) {
  return <span className={`${s.xuong} ${className ?? ''}`} style={{ width: rong, height: cao, borderRadius: boGoc }} aria-hidden />;
}
