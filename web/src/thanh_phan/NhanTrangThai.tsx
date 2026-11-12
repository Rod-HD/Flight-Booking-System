// Nhãn trạng thái dạng viên thuốc và các nhãn dựng sẵn theo nghiệp vụ
import type { NhomQuyen, TinhTrangPhieu, TinhTrangVe, TrangThaiTaiKhoan } from '@/kieu/api';
import { tenNhomQuyen, tenTinhTrangPhieu, tenTinhTrangVe, tenTrangThaiTaiKhoan } from '@/tien_ich/dinh_dang';
import s from './NhanTrangThai.module.css';

export type LoaiNhan = 'thanh-cong' | 'canh-bao' | 'trung-tinh' | 'do' | 'vang';

const lop: Record<LoaiNhan, string> = {
  'thanh-cong': s.thanhCong,
  'canh-bao': s.canhBao,
  'trung-tinh': s.trungTinh,
  do: s.do,
  vang: s.vang,
};

export interface ThuocTinhNhan {
  loai: LoaiNhan;
  children: React.ReactNode;
  coCham?: boolean;
  nho?: boolean;
  className?: string;
}

export function NhanTrangThai({ loai, children, coCham = true, nho, className }: ThuocTinhNhan) {
  return (
    <span className={[s.nhan, lop[loai], nho ? s.nho : '', className ?? ''].join(' ')}>
      {coCham && <span className={s.cham} aria-hidden />}
      {children}
    </span>
  );
}

export function NhanTinhTrangVe({ giaTri }: { giaTri: TinhTrangVe }) {
  return <NhanTrangThai loai={giaTri === 'DaBan' ? 'thanh-cong' : 'trung-tinh'}>{tenTinhTrangVe[giaTri]}</NhanTrangThai>;
}

export function NhanTinhTrangPhieu({ giaTri }: { giaTri: TinhTrangPhieu }) {
  return <NhanTrangThai loai={giaTri === 'ChoThanhToan' ? 'canh-bao' : 'trung-tinh'}>{tenTinhTrangPhieu[giaTri]}</NhanTrangThai>;
}

export function NhanTrangThaiTaiKhoan({ giaTri }: { giaTri: TrangThaiTaiKhoan }) {
  return <NhanTrangThai loai={giaTri === 'HoatDong' ? 'thanh-cong' : 'trung-tinh'}>{tenTrangThaiTaiKhoan[giaTri]}</NhanTrangThai>;
}

export function NhanNhomQuyen({ giaTri }: { giaTri: NhomQuyen }) {
  return (
    <NhanTrangThai loai={giaTri === 'QuanLy' ? 'do' : 'trung-tinh'} coCham={false}>
      {tenNhomQuyen[giaTri]}
    </NhanTrangThai>
  );
}

/** Số ghế trống: xanh khi còn nhiều, vàng khi sắp hết, đỏ khi hết */
export function NhanGheTrong({ soGhe }: { soGhe: number }) {
  const loai: LoaiNhan = soGhe <= 0 ? 'do' : soGhe <= 10 ? 'canh-bao' : 'thanh-cong';
  return <NhanTrangThai loai={loai}>{soGhe <= 0 ? 'Hết chỗ' : `${soGhe} ghế trống`}</NhanTrangThai>;
}
