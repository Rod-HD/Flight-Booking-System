// Ô tổng: con số lớn chạy từ 0 tới giá trị thật
import { dinhDangSo } from '@/tien_ich/dinh_dang';
import { dungSoChay } from '@/tien_ich/hook';
import s from './OTong.module.css';

export interface ThuocTinhOTong {
  nhan: string;
  giaTri: number;
  donVi?: string;
  icon?: React.ReactNode;
  /** số màu đỏ (dùng cho tổng doanh thu) */
  nhanManh?: boolean;
  thoiGian?: number;
  className?: string;
}

export function OTong({ nhan, giaTri, donVi, icon, nhanManh, thoiGian = 1000, className }: ThuocTinhOTong) {
  const hienTai = dungSoChay(giaTri, thoiGian);
  return (
    <div className={[s.o, nhanManh ? s.nhanManh : '', className ?? ''].join(' ')}>
      {icon && <span className={s.icon}>{icon}</span>}
      <div>
        <div className={s.nhan}>{nhan}</div>
        <div className={s.so} aria-label={`${dinhDangSo(giaTri)}${donVi ? ' ' + donVi : ''}`}>
          <span aria-hidden>{dinhDangSo(hienTai)}</span>
          {donVi && (
            <span className={s.donVi} aria-hidden>
              {donVi}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
