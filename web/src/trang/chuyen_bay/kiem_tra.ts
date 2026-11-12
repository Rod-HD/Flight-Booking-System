// Kiểm tra biểu mẫu lịch chuyến bay ngay trên trình duyệt: giả định 12 và QĐ1 với tham số hiện hành.
// Máy chủ vẫn kiểm tra lại, ở đây chỉ để báo lỗi sớm ngay dưới từng ô.
import type { ChuyenBayChiTiet, HangVe, ThamSoQuyDinh, YeuCauLuuChuyenBay } from '@/kieu/api';
import { docIso } from '@/tien_ich/thoi_gian';

export type CheDoBieuMau = 'them' | 'sua';

export interface DongTrungGian {
  id: string;
  maSanBay: string | null;
  thoiGianDung: string;
  ghiChu: string;
}

export interface DuLieuBieuMau {
  maChuyenBay: string;
  /** chỉ chứa chữ số */
  giaVe: string;
  maSanBayDi: string | null;
  maSanBayDen: string | null;
  /** dạng 2026-11-12T14:30 của ô datetime-local */
  ngayGioKhoiHanh: string;
  thoiGianBay: string;
  /** số ghế theo mã hạng vé */
  ghe: Record<string, string>;
  trungGian: DongTrungGian[];
}

export type BangLoi = Record<string, string>;

const GIA_VE_TOI_DA = 999_999_999_999;
let demId = 0;
export const taoIdDong = () => `tg${(demId += 1)}`;

export function bieuMauTrong(hangVe: HangVe[]): DuLieuBieuMau {
  return {
    maChuyenBay: '',
    giaVe: '',
    maSanBayDi: null,
    maSanBayDen: null,
    ngayGioKhoiHanh: '',
    thoiGianBay: '',
    ghe: Object.fromEntries(hangVe.map((h) => [h.maHangVe, '0'])),
    trungGian: [],
  };
}

export function bieuMauTuChiTiet(cb: ChuyenBayChiTiet, hangVe: HangVe[]): DuLieuBieuMau {
  return {
    maChuyenBay: cb.maChuyenBay,
    giaVe: String(cb.giaVe),
    maSanBayDi: cb.maSanBayDi,
    maSanBayDen: cb.maSanBayDen,
    ngayGioKhoiHanh: cb.ngayGioKhoiHanh.slice(0, 16),
    thoiGianBay: String(cb.thoiGianBay),
    ghe: Object.fromEntries(hangVe.map((h) => [h.maHangVe, String(cb.gheTheoHang.find((g) => g.maHangVe === h.maHangVe)?.soLuongGhe ?? 0)])),
    trungGian: [...cb.trungGian]
      .sort((a, b) => a.thuTu - b.thuTu)
      .map((t) => ({ id: taoIdDong(), maSanBay: t.maSanBay, thoiGianDung: String(t.thoiGianDung), ghiChu: t.ghiChu ?? '' })),
  };
}

const laSoNguyen = (s: string) => /^\d+$/.test(s.trim());

export interface NguCanhKiemTra {
  cheDo: CheDoBieuMau;
  thamSo: ThamSoQuyDinh;
  hangVe: HangVe[];
  /** số vé Đã bán cộng số phiếu Chờ thanh toán của từng hạng (khi sửa) */
  daDung: Record<string, number>;
  bayGio: Date;
}

export function kiemTraBieuMau(f: DuLieuBieuMau, nc: NguCanhKiemTra): BangLoi {
  const loi: BangLoi = {};
  const ts = nc.thamSo;

  if (nc.cheDo === 'them') {
    const ma = f.maChuyenBay.trim();
    if (!ma) loi.maChuyenBay = 'Chưa nhập mã chuyến bay.';
    else if (!/^[A-Z0-9]{1,10}$/.test(ma)) loi.maChuyenBay = 'Mã chuyến bay tối đa 10 ký tự, chỉ gồm chữ in hoa và số.';
  }

  if (!f.giaVe) loi.giaVe = 'Chưa nhập giá vé.';
  else if (Number(f.giaVe) <= 0) loi.giaVe = 'Giá vé phải là số nguyên dương (đồng).';
  else if (Number(f.giaVe) > GIA_VE_TOI_DA) loi.giaVe = 'Giá vé không được vượt quá 999.999.999.999 đồng.';

  if (!f.maSanBayDi) loi.maSanBayDi = 'Chưa chọn sân bay đi.';
  if (!f.maSanBayDen) loi.maSanBayDen = 'Chưa chọn sân bay đến.';
  else if (f.maSanBayDen === f.maSanBayDi) loi.maSanBayDen = 'Sân bay đến phải khác sân bay đi.';

  if (!f.ngayGioKhoiHanh) loi.ngayGioKhoiHanh = 'Chưa nhập ngày giờ khởi hành.';
  else if (isNaN(docIso(f.ngayGioKhoiHanh).getTime())) loi.ngayGioKhoiHanh = 'Ngày giờ khởi hành không hợp lệ.';
  else if (nc.cheDo === 'them' && docIso(f.ngayGioKhoiHanh) <= nc.bayGio) loi.ngayGioKhoiHanh = 'Ngày giờ khởi hành phải sau thời điểm hiện tại.';

  if (!f.thoiGianBay.trim()) loi.thoiGianBay = 'Chưa nhập thời gian bay.';
  else if (!laSoNguyen(f.thoiGianBay) || Number(f.thoiGianBay) <= 0) loi.thoiGianBay = 'Thời gian bay phải là số nguyên dương (phút).';
  else if (Number(f.thoiGianBay) < ts.thoiGianBayToiThieu) loi.thoiGianBay = `Thời gian bay phải từ ${ts.thoiGianBayToiThieu} phút trở lên (QĐ1).`;

  let coHang = false;
  for (const h of nc.hangVe) {
    const gt = (f.ghe[h.maHangVe] ?? '').trim();
    const khoa = `ghe.${h.maHangVe}`;
    if (!gt || !laSoNguyen(gt)) loi[khoa] = 'Số ghế phải là số nguyên không âm.';
    else {
      const so = Number(gt);
      if (so > 0) coHang = true;
      const daDung = nc.daDung[h.maHangVe] ?? 0;
      if (so < daDung) loi[khoa] = `Tối thiểu ${daDung} ghế (đã bán và đặt).`;
    }
  }
  if (!coHang && !Object.keys(loi).some((k) => k.startsWith('ghe.'))) loi.gheTheoHang = 'Phải có ít nhất một hạng vé có số lượng ghế lớn hơn 0.';

  if (f.trungGian.length > ts.soSanBayTrungGianToiDa) loi.trungGian = `Chuyến bay có tối đa ${ts.soSanBayTrungGianToiDa} sân bay trung gian (QĐ1).`;
  const daGap = new Map<string, number>();
  f.trungGian.forEach((t, i) => {
    const k = `tg.${t.id}`;
    if (!t.maSanBay) loi[`${k}.maSanBay`] = 'Chưa chọn sân bay trung gian.';
    else if (t.maSanBay === f.maSanBayDi || t.maSanBay === f.maSanBayDen) loi[`${k}.maSanBay`] = 'Phải khác sân bay đi và sân bay đến.';
    else if (daGap.has(t.maSanBay)) loi[`${k}.maSanBay`] = `Trùng với sân bay trung gian thứ ${daGap.get(t.maSanBay)! + 1}.`;
    if (t.maSanBay && !daGap.has(t.maSanBay)) daGap.set(t.maSanBay, i);

    if (!t.thoiGianDung.trim()) loi[`${k}.thoiGianDung`] = 'Chưa nhập thời gian dừng.';
    else if (!laSoNguyen(t.thoiGianDung)) loi[`${k}.thoiGianDung`] = 'Thời gian dừng là số nguyên (phút).';
    else {
      const p = Number(t.thoiGianDung);
      if (p < ts.thoiGianDungToiThieu || p > ts.thoiGianDungToiDa)
        loi[`${k}.thoiGianDung`] = `Từ ${ts.thoiGianDungToiThieu} đến ${ts.thoiGianDungToiDa} phút (QĐ1).`;
    }
    if (t.ghiChu.length > 200) loi[`${k}.ghiChu`] = 'Ghi chú tối đa 200 ký tự.';
  });

  return loi;
}

/** Thân yêu cầu gửi máy chủ: hạng có 0 ghế nghĩa là không bán hạng đó nên không gửi */
export function taoYeuCau(f: DuLieuBieuMau, hangVe: HangVe[]): YeuCauLuuChuyenBay {
  return {
    maChuyenBay: f.maChuyenBay.trim().toUpperCase(),
    giaVe: Number(f.giaVe),
    maSanBayDi: f.maSanBayDi ?? '',
    maSanBayDen: f.maSanBayDen ?? '',
    ngayGioKhoiHanh: `${f.ngayGioKhoiHanh}:00`,
    thoiGianBay: Number(f.thoiGianBay),
    gheTheoHang: hangVe.map((h) => ({ maHangVe: h.maHangVe, soLuongGhe: Number(f.ghe[h.maHangVe] || 0) })).filter((g) => g.soLuongGhe > 0),
    trungGian: f.trungGian.map((t, i) => ({
      thuTu: i + 1,
      maSanBay: t.maSanBay ?? '',
      thoiGianDung: Number(t.thoiGianDung),
      ghiChu: t.ghiChu.trim(),
    })),
  };
}

/** Đổi khóa lỗi của máy chủ (gheTheoHang.0.soLuongGhe, trungGian.1.maSanBay...) sang khóa của biểu mẫu */
export function doiKhoaLoiMayChu(chiTiet: Record<string, string> | undefined, yc: YeuCauLuuChuyenBay, f: DuLieuBieuMau): BangLoi {
  const kq: BangLoi = {};
  for (const [khoa, chu] of Object.entries(chiTiet ?? {})) {
    const ghe = /^gheTheoHang\.(\d+)/.exec(khoa);
    const tg = /^trungGian\.(\d+)\.(\w+)/.exec(khoa);
    if (ghe && yc.gheTheoHang[+ghe[1]]) kq[`ghe.${yc.gheTheoHang[+ghe[1]].maHangVe}`] = chu;
    else if (tg && f.trungGian[+tg[1]]) kq[`tg.${f.trungGian[+tg[1]].id}.${tg[2]}`] = chu;
    else kq[khoa] = chu;
  }
  return kq;
}

/** id phần tử DOM của một ô theo khóa lỗi, để đưa con trỏ về ô lỗi đầu tiên */
export const idO = (khoa: string) => `cb-${khoa.replace(/\./g, '-')}`;

/** Thứ tự các ô trên màn hình, dùng để chọn ô lỗi đầu tiên */
export function thuTuKhoa(f: DuLieuBieuMau, hangVe: HangVe[]): string[] {
  return [
    'maChuyenBay',
    'giaVe',
    'maSanBayDi',
    'maSanBayDen',
    'ngayGioKhoiHanh',
    'thoiGianBay',
    ...hangVe.map((h) => `ghe.${h.maHangVe}`),
    'gheTheoHang',
    ...f.trungGian.flatMap((t) => [`tg.${t.id}.maSanBay`, `tg.${t.id}.thoiGianDung`, `tg.${t.id}.ghiChu`]),
    'trungGian',
  ];
}
