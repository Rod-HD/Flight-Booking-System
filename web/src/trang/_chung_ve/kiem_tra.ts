// Kiểm tra thông tin hành khách theo giả định 9, 10 của báo cáo và các tiện ích dùng chung cho vé, phiếu đặt chỗ
import type { QueryClient } from '@tanstack/react-query';
import { khoaTruyVan } from '@/api/dich_vu';
import type { HanhKhach, LoaiGiayTo } from '@/kieu/api';

export type TruongHanhKhach = keyof HanhKhach;
export type LoiHanhKhach = Partial<Record<TruongHanhKhach, string>>;

export const HANH_KHACH_TRONG: HanhKhach = { hoTen: '', loaiGiayTo: 'CCCD', soGiayTo: '', dienThoai: '' };

export const LUA_CHON_GIAY_TO: { giaTri: LoaiGiayTo; nhan: string }[] = [
  { giaTri: 'CCCD', nhan: 'CCCD' },
  { giaTri: 'HoChieu', nhan: 'Hộ chiếu' },
];

/** Căn cước: đúng 12 chữ số. Hộ chiếu: 6 đến 20 ký tự chữ in hoa và chữ số (giả định 9) */
export function loiSoGiayTo(loai: LoaiGiayTo, so: string): string | undefined {
  const x = so.trim();
  if (!x) return 'Vui lòng nhập số giấy tờ.';
  if (loai === 'CCCD' && !/^\d{12}$/.test(x)) return 'Số CCCD gồm đúng 12 chữ số.';
  if (loai === 'HoChieu' && !/^[A-Z0-9]{6,20}$/.test(x)) return 'Số hộ chiếu gồm 6 đến 20 ký tự là chữ in hoa và chữ số.';
  return undefined;
}

/** Điện thoại: 8 đến 15 chữ số, có thể có dấu + ở đầu (giả định 10) */
export function loiDienThoai(dt: string): string | undefined {
  const x = dt.trim();
  if (!x) return 'Vui lòng nhập số điện thoại.';
  if (!/^\+?\d{8,15}$/.test(x)) return 'Điện thoại gồm 8 đến 15 chữ số, có thể có dấu + ở đầu (ví dụ +84).';
  return undefined;
}

export function loiHoTen(ten: string): string | undefined {
  const x = ten.trim();
  if (!x) return 'Vui lòng nhập họ tên hành khách.';
  if (x.length > 50) return 'Họ tên tối đa 50 ký tự.';
  return undefined;
}

export function kiemTraHanhKhach(hk: HanhKhach): LoiHanhKhach {
  const loi: LoiHanhKhach = {};
  const t = loiHoTen(hk.hoTen);
  if (t) loi.hoTen = t;
  const g = loiSoGiayTo(hk.loaiGiayTo, hk.soGiayTo);
  if (g) loi.soGiayTo = g;
  const d = loiDienThoai(hk.dienThoai);
  if (d) loi.dienThoai = d;
  return loi;
}

/** Chuẩn hóa chữ người dùng gõ vào ô số giấy tờ */
export function chuanHoaSoGiayTo(loai: LoaiGiayTo, so: string): string {
  return loai === 'CCCD' ? so.replace(/\D/g, '').slice(0, 12) : so.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

export function chuanHoaHanhKhach(hk: HanhKhach): HanhKhach {
  return { ...hk, hoTen: hk.hoTen.trim().replace(/\s+/g, ' '), soGiayTo: hk.soGiayTo.trim(), dienThoai: hk.dienThoai.trim() };
}

/** Lỗi 400 của máy chủ trả chiTiet theo tên trường (có thể có tiền tố hanhKhach.) */
export function loiTuMayChu(chiTiet?: Record<string, string>): LoiHanhKhach {
  const kq: LoiHanhKhach = {};
  if (!chiTiet) return kq;
  for (const [k, v] of Object.entries(chiTiet)) {
    const ten = k.replace(/^hanhKhach\./, '') as TruongHanhKhach;
    if (ten === 'hoTen' || ten === 'soGiayTo' || ten === 'dienThoai' || ten === 'loaiGiayTo') kq[ten] = v;
  }
  return kq;
}

/** Sau mỗi lần ghi vé, phiếu: làm mới danh sách vé, phiếu, chuyến bay (kể cả hai bảng ở trang chính), báo cáo, thông báo */
export function lamMoiSauGhi(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['ve'] }),
    qc.invalidateQueries({ queryKey: ['phieu-dat'] }),
    qc.invalidateQueries({ queryKey: ['chuyen-bay'] }),
    qc.invalidateQueries({ queryKey: ['bao-cao'] }),
    qc.invalidateQueries({ queryKey: khoaTruyVan.thongBao }),
  ]);
}

export const tenMucDich = {
  banVe: { dongTu: 'bán vé', DongTu: 'Bán vé', doiTuong: 'vé', DoiTuong: 'Vé' },
  datVe: { dongTu: 'đặt vé', DongTu: 'Đặt vé', doiTuong: 'phiếu đặt chỗ', DoiTuong: 'Phiếu đặt chỗ' },
} as const;
