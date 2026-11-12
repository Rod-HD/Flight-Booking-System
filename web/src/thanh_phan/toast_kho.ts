// Kho toast toàn cục: hienToast.thanhCong('Đã lưu chuyến bay CB245')
export type LoaiToast = 'thanh-cong' | 'loi' | 'canh-bao' | 'thong-tin';

export interface MucToast {
  id: number;
  loai: LoaiToast;
  noiDung: string;
  thoiGian: number;
}

type NguoiNghe = (ds: MucToast[]) => void;

let danhSach: MucToast[] = [];
let demId = 0;
const nguoiNghe = new Set<NguoiNghe>();
const phat = () => nguoiNghe.forEach((n) => n(danhSach));

export function ngheToast(n: NguoiNghe) {
  nguoiNghe.add(n);
  n(danhSach);
  return () => {
    nguoiNghe.delete(n);
  };
}

export function anToast(id: number) {
  danhSach = danhSach.filter((t) => t.id !== id);
  phat();
}

function them(loai: LoaiToast, noiDung: string, thoiGian = 4000) {
  demId += 1;
  danhSach = [...danhSach.slice(-3), { id: demId, loai, noiDung, thoiGian }];
  phat();
  return demId;
}

export const hienToast = {
  thanhCong: (noiDung: string, thoiGian?: number) => them('thanh-cong', noiDung, thoiGian),
  loi: (noiDung: string, thoiGian?: number) => them('loi', noiDung, thoiGian),
  canhBao: (noiDung: string, thoiGian?: number) => them('canh-bao', noiDung, thoiGian),
  thongTin: (noiDung: string, thoiGian?: number) => them('thong-tin', noiDung, thoiGian),
};
