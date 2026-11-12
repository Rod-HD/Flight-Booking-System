// Máy chủ giả lập chạy trong trình duyệt: cùng đường dẫn, cùng dạng dữ liệu và mã lỗi như docs/API.md.
// Chỉ dùng khi chưa có máy chủ thật (VITE_GIA_LAP=1). Dữ liệu nằm trong bộ nhớ, tải lại trang là làm mới.
import type {
  BaoCaoNam,
  BaoCaoThang,
  ChuyenBayChiTiet,
  ChuyenBayTomTat,
  HanhKhach,
  KetQuaBanVe,
  KetQuaDatVe,
  LoaiGiayTo,
  LoiTraVe,
  NguoiDung,
  NhomQuyen,
  PhieuConHan,
  PhieuDat,
  TaiKhoan,
  TenThamSo,
  ThongTinBan,
  Ve,
  YeuCauBanVe,
  YeuCauLuuChuyenBay,
} from '@/kieu/api';
import { congNgay, dauNgay, docIso, sangIso, soNgayGiua } from '@/tien_ich/thoi_gian';
import type { PhanHoiTho, PhuongThuc, ThamSo } from '../may_khach';
import {
  type ChuyenBayGia,
  type CoSoDuLieuGia,
  type PhieuGia,
  type VeGia,
  maPhieuTuSo,
  maVeTuSo,
  taoCoSoDuLieu,
  tinhHanThanhToan,
} from './du_lieu';

const KHOA_PHIEN = 'qlbv_gia_lap_phien';
const db: CoSoDuLieuGia = taoCoSoDuLieu();

/* ---------- tiện ích phản hồi ---------- */
class LoiGia extends Error {
  constructor(
    public trangThai: number,
    public loi: LoiTraVe,
  ) {
    super(loi.thongBao);
  }
}

const loi = (trangThai: number, ma: string, thongBao: string, chiTiet?: Record<string, string>) =>
  new LoiGia(trangThai, { ma, thongBao, chiTiet });

const khongTimThay = (thongBao = 'Không tìm thấy dữ liệu yêu cầu.') => loi(404, 'KHONG_TIM_THAY', thongBao);

function kiemTraChiTiet(chiTiet: Record<string, string>) {
  if (Object.keys(chiTiet).length) throw loi(400, 'DU_LIEU_KHONG_HOP_LE', 'Dữ liệu chưa hợp lệ, vui lòng kiểm tra các ô được đánh dấu.', chiTiet);
}

function csv(ten: string, dong: (string | number)[][]): PhanHoiTho {
  const noiDung = '﻿' + dong.map((d) => d.map((o) => `"${String(o).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  return { trangThai: 200, tapTin: { tenTapTin: ten, duLieu: new Blob([noiDung], { type: 'text/csv;charset=utf-8' }) } };
}

/* ---------- phiên ---------- */
function layNguoiDung(): NguoiDung | null {
  let ten: string | null = null;
  try {
    ten = sessionStorage.getItem(KHOA_PHIEN);
  } catch {
    ten = null;
  }
  const tk = db.taiKhoan.find((t) => t.tenDangNhap === ten && t.trangThai === 'HoatDong');
  return tk ? { tenDangNhap: tk.tenDangNhap, nhomQuyen: tk.nhomQuyen } : null;
}

function datPhien(ten: string | null) {
  try {
    if (ten) sessionStorage.setItem(KHOA_PHIEN, ten);
    else sessionStorage.removeItem(KHOA_PHIEN);
  } catch {
    /* trình duyệt chặn lưu trữ thì phiên chỉ sống tới khi tải lại */
  }
}

/* ---------- tra cứu nội bộ ---------- */
const bayGio = () => new Date();
const tenSanBay = (ma: string) => db.sanBay.find((s) => s.maSanBay === ma)?.tenSanBay ?? ma;
const tenHang = (ma: string) => db.hangVe.find((h) => h.maHangVe === ma)?.tenHangVe ?? ma;
const tiLeHang = (ma: string) => db.hangVe.find((h) => h.maHangVe === ma)?.tiLeDonGia ?? 100;
const giaTien = (cb: ChuyenBayGia, maHang: string) => Math.round((cb.giaVe * tiLeHang(maHang)) / 100);

function timChuyenBay(ma: string): ChuyenBayGia {
  const cb = db.chuyenBay.find((c) => c.maChuyenBay === ma);
  if (!cb) throw khongTimThay(`Không tìm thấy chuyến bay ${ma}.`);
  return cb;
}

function soGheDaDung(maChuyenBay: string, maHang?: string): number {
  const ve = db.ve.filter((v) => v.maChuyenBay === maChuyenBay && v.tinhTrang === 'DaBan' && (!maHang || v.maHangVe === maHang)).length;
  const phieu = db.phieu.filter(
    (p) => p.maChuyenBay === maChuyenBay && p.tinhTrang === 'ChoThanhToan' && (!maHang || p.maHangVe === maHang),
  ).length;
  return ve + phieu;
}

function tomTat(cb: ChuyenBayGia): ChuyenBayTomTat {
  const tong = cb.gheTheoHang.reduce((s, g) => s + g.soLuongGhe, 0);
  const dat = soGheDaDung(cb.maChuyenBay);
  return {
    maChuyenBay: cb.maChuyenBay,
    maSanBayDi: cb.maSanBayDi,
    tenSanBayDi: tenSanBay(cb.maSanBayDi),
    maSanBayDen: cb.maSanBayDen,
    tenSanBayDen: tenSanBay(cb.maSanBayDen),
    ngayGioKhoiHanh: cb.ngayGioKhoiHanh,
    thoiGianBay: cb.thoiGianBay,
    soGheTrong: tong - dat,
    soGheDat: dat,
  };
}

function veRa(v: VeGia): Ve {
  const { maHangVe, ...con } = v;
  return { ...con, tenHangVe: tenHang(maHangVe) };
}

function phieuRa(p: PhieuGia): PhieuDat {
  const { maHangVe, ...con } = p;
  return { ...con, tenHangVe: tenHang(maHangVe) };
}

/** UC06: hủy các phiếu quá hạn, chạy trước mỗi yêu cầu để dữ liệu luôn đúng */
function huyPhieuQuaHan() {
  const now = bayGio();
  const daHuy: string[] = [];
  for (const p of db.phieu) {
    if (p.tinhTrang === 'ChoThanhToan' && docIso(p.hanThanhToan) <= now) {
      p.tinhTrang = 'DaHuy';
      daHuy.push(p.maPhieuDat);
    }
  }
  if (daHuy.length) {
    db.nhatKy.push({
      thoiDiem: sangIso(now),
      noiDung: `Tự động hủy ${daHuy.length} phiếu đặt chỗ quá hạn thanh toán: ${daHuy.join(', ')}.`,
    });
  }
}

/* ---------- kiểm tra dữ liệu ---------- */
function kiemTraHanhKhach(hk: Partial<HanhKhach> | undefined, chiTiet: Record<string, string>, tienTo = '') {
  const t = (k: string) => (tienTo ? `${tienTo}.${k}` : k);
  if (!hk?.hoTen?.trim()) chiTiet[t('hoTen')] = 'Vui lòng nhập họ tên hành khách.';
  else if (hk.hoTen.trim().length > 50) chiTiet[t('hoTen')] = 'Họ tên tối đa 50 ký tự.';
  if (hk?.loaiGiayTo !== 'CCCD' && hk?.loaiGiayTo !== 'HoChieu') chiTiet[t('loaiGiayTo')] = 'Vui lòng chọn loại giấy tờ.';
  const so = hk?.soGiayTo?.trim() ?? '';
  if (!so) chiTiet[t('soGiayTo')] = 'Vui lòng nhập số giấy tờ.';
  else if (hk?.loaiGiayTo === 'CCCD' && !/^\d{12}$/.test(so)) chiTiet[t('soGiayTo')] = 'Số CCCD gồm đúng 12 chữ số.';
  else if (hk?.loaiGiayTo === 'HoChieu' && !/^[A-Z0-9]{6,20}$/.test(so))
    chiTiet[t('soGiayTo')] = 'Số hộ chiếu gồm 6 đến 20 chữ in hoa hoặc số.';
  const dt = hk?.dienThoai?.trim() ?? '';
  if (!dt) chiTiet[t('dienThoai')] = 'Vui lòng nhập số điện thoại.';
  else if (!/^\+?\d{8,15}$/.test(dt)) chiTiet[t('dienThoai')] = 'Điện thoại gồm 8 đến 15 chữ số.';
}

/** Giả định 9, 10: một giấy tờ chỉ thuộc về một hành khách */
function kiemTraGiayTo(hk: HanhKhach, boQua?: { ve?: string; phieu?: string }) {
  const trung = [...db.ve.filter((v) => v.maVe !== boQua?.ve), ...db.phieu.filter((p) => p.maPhieuDat !== boQua?.phieu)].find(
    (x) => x.loaiGiayTo === hk.loaiGiayTo && x.soGiayTo === hk.soGiayTo.trim(),
  );
  if (trung && trung.hoTen.trim().toLowerCase() !== hk.hoTen.trim().toLowerCase()) {
    throw loi(409, 'GIAY_TO_DA_THUOC_NGUOI_KHAC', `Giấy tờ ${hk.soGiayTo} đã được dùng cho hành khách ${trung.hoTen}.`);
  }
}

function thongTinBan(cb: ChuyenBayGia, mucDich: 'banVe' | 'datVe'): ThongTinBan {
  const now = bayGio();
  const hang = cb.gheTheoHang.map((g) => ({
    maHangVe: g.maHangVe,
    tenHangVe: tenHang(g.maHangVe),
    soGheTrong: g.soLuongGhe - soGheDaDung(cb.maChuyenBay, g.maHangVe),
    giaTien: giaTien(cb, g.maHangVe),
  }));
  const tongSoGheTrong = hang.reduce((s, h) => s + h.soGheTrong, 0);
  const khoiHanh = docIso(cb.ngayGioKhoiHanh);
  const kq: ThongTinBan = { duocPhep: true, tongSoGheTrong, hang };
  if (khoiHanh <= now) {
    return { ...kq, duocPhep: false, maLoi: 'CHUYEN_BAY_DA_KHOI_HANH', thongBao: `Chuyến bay ${cb.maChuyenBay} đã khởi hành.` };
  }
  if (mucDich === 'datVe') {
    const soNgay = soNgayGiua(now, khoiHanh);
    if (soNgay < db.thamSo.thoiGianDatVeChamNhat) {
      return {
        ...kq,
        duocPhep: false,
        maLoi: 'QUA_HAN_DAT_VE',
        thongBao: `Chỉ nhận đặt vé chậm nhất ${db.thamSo.thoiGianDatVeChamNhat} ngày trước khi khởi hành (QĐ3).`,
      };
    }
    kq.hanThanhToanDuKien = sangIso(tinhHanThanhToan(now, khoiHanh, db.thamSo.thoiGianHuyDatVe));
  }
  if (tongSoGheTrong <= 0) {
    return { ...kq, duocPhep: false, maLoi: 'HET_CHO', thongBao: `Chuyến bay ${cb.maChuyenBay} đã hết chỗ.` };
  }
  return kq;
}

function kiemTraYeuCauBan(yc: Partial<YeuCauBanVe>, mucDich: 'banVe' | 'datVe') {
  const chiTiet: Record<string, string> = {};
  if (!yc.maChuyenBay) chiTiet.maChuyenBay = 'Vui lòng chọn chuyến bay.';
  if (!yc.maHangVe) chiTiet.maHangVe = 'Vui lòng chọn hạng vé.';
  kiemTraHanhKhach(yc.hanhKhach, chiTiet, 'hanhKhach');
  kiemTraChiTiet(chiTiet);
  const cb = timChuyenBay(yc.maChuyenBay!);
  const tt = thongTinBan(cb, mucDich);
  if (!tt.duocPhep) throw loi(409, tt.maLoi!, tt.thongBao!);
  const hang = tt.hang.find((h) => h.maHangVe === yc.maHangVe);
  if (!hang) throw loi(400, 'DU_LIEU_KHONG_HOP_LE', 'Hạng vé không có trên chuyến bay này.', { maHangVe: 'Hạng vé không có trên chuyến bay này.' });
  if (hang.soGheTrong <= 0) throw loi(409, 'HET_CHO', `${hang.tenHangVe} của chuyến bay ${cb.maChuyenBay} đã hết chỗ.`);
  const hk = { ...yc.hanhKhach!, hoTen: yc.hanhKhach!.hoTen.trim(), soGiayTo: yc.hanhKhach!.soGiayTo.trim() };
  kiemTraGiayTo(hk);
  return { cb, hang, hk };
}

function kiemTraChuyenBay(yc: Partial<YeuCauLuuChuyenBay>, laThem: boolean) {
  const chiTiet: Record<string, string> = {};
  const ts = db.thamSo;
  if (laThem && !/^[A-Z0-9]{1,10}$/.test(yc.maChuyenBay ?? '')) chiTiet.maChuyenBay = 'Mã chuyến bay gồm 1 đến 10 chữ in hoa hoặc số.';
  if (!yc.giaVe || yc.giaVe <= 0) chiTiet.giaVe = 'Giá vé phải lớn hơn 0.';
  if (!db.sanBay.some((s) => s.maSanBay === yc.maSanBayDi)) chiTiet.maSanBayDi = 'Vui lòng chọn sân bay đi.';
  if (!db.sanBay.some((s) => s.maSanBay === yc.maSanBayDen)) chiTiet.maSanBayDen = 'Vui lòng chọn sân bay đến.';
  else if (yc.maSanBayDen === yc.maSanBayDi) chiTiet.maSanBayDen = 'Sân bay đến phải khác sân bay đi.';
  if (!yc.ngayGioKhoiHanh || isNaN(docIso(yc.ngayGioKhoiHanh).getTime())) chiTiet.ngayGioKhoiHanh = 'Vui lòng chọn ngày giờ khởi hành.';
  if (!yc.thoiGianBay || yc.thoiGianBay <= 0) chiTiet.thoiGianBay = 'Vui lòng nhập thời gian bay.';
  const ghe = yc.gheTheoHang ?? [];
  if (!ghe.length) chiTiet.gheTheoHang = 'Chuyến bay phải có ít nhất một hạng vé.';
  ghe.forEach((g, i) => {
    if (!db.hangVe.some((h) => h.maHangVe === g.maHangVe)) chiTiet[`gheTheoHang.${i}.maHangVe`] = 'Hạng vé không tồn tại.';
    if (!Number.isInteger(g.soLuongGhe) || g.soLuongGhe <= 0) chiTiet[`gheTheoHang.${i}.soLuongGhe`] = 'Số ghế phải là số nguyên dương.';
  });
  kiemTraChiTiet(chiTiet);

  const tg = yc.trungGian ?? [];
  if (yc.thoiGianBay! < ts.thoiGianBayToiThieu)
    throw loi(409, 'VI_PHAM_QD1', `Thời gian bay phải từ ${ts.thoiGianBayToiThieu} phút trở lên (QĐ1).`, {
      thoiGianBay: `Tối thiểu ${ts.thoiGianBayToiThieu} phút.`,
    });
  if (tg.length > ts.soSanBayTrungGianToiDa)
    throw loi(409, 'VI_PHAM_QD1', `Chỉ được có tối đa ${ts.soSanBayTrungGianToiDa} sân bay trung gian (QĐ1).`);
  const daGap = new Set([yc.maSanBayDi, yc.maSanBayDen]);
  tg.forEach((t, i) => {
    if (!db.sanBay.some((s) => s.maSanBay === t.maSanBay)) throw loi(400, 'DU_LIEU_KHONG_HOP_LE', 'Sân bay trung gian không tồn tại.', { [`trungGian.${i}.maSanBay`]: 'Sân bay không tồn tại.' });
    if (daGap.has(t.maSanBay))
      throw loi(400, 'DU_LIEU_KHONG_HOP_LE', 'Sân bay trung gian không được trùng nhau hoặc trùng sân bay đi, đến.', {
        [`trungGian.${i}.maSanBay`]: 'Sân bay bị trùng.',
      });
    daGap.add(t.maSanBay);
    if (t.thoiGianDung < ts.thoiGianDungToiThieu || t.thoiGianDung > ts.thoiGianDungToiDa)
      throw loi(409, 'VI_PHAM_QD1', `Thời gian dừng phải từ ${ts.thoiGianDungToiThieu} đến ${ts.thoiGianDungToiDa} phút (QĐ1).`, {
        [`trungGian.${i}.thoiGianDung`]: `Từ ${ts.thoiGianDungToiThieu} đến ${ts.thoiGianDungToiDa} phút.`,
      });
  });
}

/* ---------- định tuyến ---------- */
interface NguCanh {
  thamSo: ThamSo;
  // thân yêu cầu lấy từ JSON nên để kiểu tự do
  than: any;
  nguoiDung: NguoiDung | null;
  p: string[];
}

type Quyen = 'congKhai' | 'dangNhap' | 'quanLy';
type XuLy = (c: NguCanh) => unknown;

interface Tuyen {
  phuongThuc: PhuongThuc;
  mau: RegExp;
  quyen: Quyen;
  xuLy: XuLy;
  /** trạng thái khi thành công, mặc định 200 */
  trangThai?: number;
}

const tuyen: Tuyen[] = [];
function them(phuongThuc: PhuongThuc, duongDan: string, quyen: Quyen, xuLy: XuLy, trangThai?: number) {
  const mau = new RegExp('^' + duongDan.replace(/\{[^}]+\}/g, '([^/]+)') + '$');
  tuyen.push({ phuongThuc, mau, quyen, xuLy, trangThai });
}

const chuoi = (x: unknown) => (x === undefined || x === null ? '' : String(x));

/* Phiên làm việc */
them('POST', '/api/dang-nhap', 'congKhai', ({ than }) => {
  const tk = db.taiKhoan.find((t) => t.tenDangNhap === chuoi(than?.tenDangNhap).trim());
  if (!tk || tk.matKhau !== chuoi(than?.matKhau)) throw loi(401, 'SAI_THONG_TIN_DANG_NHAP', 'Sai tên đăng nhập hoặc mật khẩu.');
  if (tk.trangThai === 'DaKhoa') throw loi(403, 'TAI_KHOAN_BI_KHOA', 'Tài khoản đã bị khóa.');
  datPhien(tk.tenDangNhap);
  return { tenDangNhap: tk.tenDangNhap, nhomQuyen: tk.nhomQuyen };
});
them('POST', '/api/dang-xuat', 'congKhai', () => {
  datPhien(null);
}, 204);
them('GET', '/api/phien', 'dangNhap', ({ nguoiDung }) => nguoiDung);

/* Tài khoản */
them('GET', '/api/tai-khoan', 'quanLy', (): TaiKhoan[] =>
  db.taiKhoan.map(({ tenDangNhap, nhomQuyen, trangThai }) => ({ tenDangNhap, nhomQuyen, trangThai })),
);
them('POST', '/api/tai-khoan', 'quanLy', ({ than }) => {
  const chiTiet: Record<string, string> = {};
  const ten = chuoi(than?.tenDangNhap).trim();
  if (!/^[a-z0-9_.]{3,30}$/.test(ten)) chiTiet.tenDangNhap = 'Tên đăng nhập gồm 3 đến 30 chữ thường, số, dấu chấm hoặc gạch dưới.';
  if (chuoi(than?.matKhau).length < 6) chiTiet.matKhau = 'Mật khẩu tối thiểu 6 ký tự.';
  if (than?.nhomQuyen !== 'QuanLy' && than?.nhomQuyen !== 'NhanVien') chiTiet.nhomQuyen = 'Vui lòng chọn nhóm quyền.';
  kiemTraChiTiet(chiTiet);
  if (db.taiKhoan.some((t) => t.tenDangNhap === ten)) throw loi(409, 'TRUNG_MA', `Tên đăng nhập ${ten} đã tồn tại.`);
  db.taiKhoan.push({ tenDangNhap: ten, matKhau: chuoi(than.matKhau), nhomQuyen: than.nhomQuyen as NhomQuyen, trangThai: 'HoatDong' });
}, 201);
them('PUT', '/api/tai-khoan/{ten}', 'quanLy', ({ p, than, nguoiDung }) => {
  const tk = db.taiKhoan.find((t) => t.tenDangNhap === p[0]);
  if (!tk) throw khongTimThay('Không tìm thấy tài khoản.');
  if (than?.nhomQuyen !== 'QuanLy' && than?.nhomQuyen !== 'NhanVien')
    kiemTraChiTiet({ nhomQuyen: 'Vui lòng chọn nhóm quyền.' });
  if (tk.tenDangNhap === nguoiDung?.tenDangNhap && than.nhomQuyen !== tk.nhomQuyen)
    throw loi(409, 'KHONG_DUOC_TU_DOI_QUYEN', 'Không được tự đổi nhóm quyền của tài khoản đang đăng nhập.');
  if (than.matKhauMoi !== undefined && than.matKhauMoi !== '' && chuoi(than.matKhauMoi).length < 6)
    kiemTraChiTiet({ matKhauMoi: 'Mật khẩu tối thiểu 6 ký tự.' });
  tk.nhomQuyen = than.nhomQuyen;
  if (than.matKhauMoi) tk.matKhau = chuoi(than.matKhauMoi);
}, 204);
them('POST', '/api/tai-khoan/{ten}/khoa', 'quanLy', ({ p, nguoiDung }) => {
  const tk = db.taiKhoan.find((t) => t.tenDangNhap === p[0]);
  if (!tk) throw khongTimThay('Không tìm thấy tài khoản.');
  if (tk.tenDangNhap === nguoiDung?.tenDangNhap) throw loi(409, 'KHONG_DUOC_TU_KHOA', 'Không được tự khóa tài khoản đang đăng nhập.');
  tk.trangThai = 'DaKhoa';
}, 204);
them('POST', '/api/tai-khoan/{ten}/mo-khoa', 'quanLy', ({ p }) => {
  const tk = db.taiKhoan.find((t) => t.tenDangNhap === p[0]);
  if (!tk) throw khongTimThay('Không tìm thấy tài khoản.');
  tk.trangThai = 'HoatDong';
}, 204);

/* Quy định */
them('GET', '/api/quy-dinh', 'dangNhap', () => ({
  thamSo: { ...db.thamSo },
  sanBay: db.sanBay.map((s) => ({ ...s })),
  hangVe: db.hangVe.map((h) => ({ ...h })),
}));
them('PUT', '/api/quy-dinh/tham-so/{ten}', 'quanLy', ({ p, than }) => {
  const ten = p[0] as TenThamSo;
  if (!(ten in db.thamSo)) throw khongTimThay('Không có tham số quy định này.');
  const gt = Number(than?.giaTriMoi);
  if (!Number.isInteger(gt) || gt < 0) kiemTraChiTiet({ giaTriMoi: 'Giá trị phải là số nguyên không âm.' });
  const moi = { ...db.thamSo, [ten]: gt };
  if (moi.thoiGianDungToiThieu > moi.thoiGianDungToiDa)
    kiemTraChiTiet({ giaTriMoi: 'Thời gian dừng tối thiểu không được lớn hơn thời gian dừng tối đa.' });
  if (moi.thoiGianDatVeChamNhat <= moi.thoiGianHuyDatVe)
    kiemTraChiTiet({ giaTriMoi: 'Thời gian chậm nhất khi đặt vé phải lớn hơn thời gian hủy đặt vé.' });
  db.thamSo = moi;
}, 204);
them('POST', '/api/san-bay', 'quanLy', ({ than }) => {
  const ma = chuoi(than?.maSanBay).trim();
  const ten = chuoi(than?.tenSanBay).trim();
  const chiTiet: Record<string, string> = {};
  if (!/^[A-Z]{3}$/.test(ma)) chiTiet.maSanBay = 'Mã sân bay gồm đúng 3 chữ cái in hoa.';
  if (!ten) chiTiet.tenSanBay = 'Vui lòng nhập tên sân bay.';
  kiemTraChiTiet(chiTiet);
  if (db.sanBay.some((s) => s.maSanBay === ma || s.tenSanBay.toLowerCase() === ten.toLowerCase()))
    throw loi(409, 'TRUNG_MA', 'Mã hoặc tên sân bay đã tồn tại.');
  db.sanBay.push({ maSanBay: ma, tenSanBay: ten });
}, 201);
them('PUT', '/api/san-bay/{ma}', 'quanLy', ({ p, than }) => {
  const sb = db.sanBay.find((s) => s.maSanBay === p[0]);
  if (!sb) throw khongTimThay('Không tìm thấy sân bay.');
  const ten = chuoi(than?.tenSanBay).trim();
  if (!ten) kiemTraChiTiet({ tenSanBay: 'Vui lòng nhập tên sân bay.' });
  if (db.sanBay.some((s) => s !== sb && s.tenSanBay.toLowerCase() === ten.toLowerCase())) throw loi(409, 'TRUNG_MA', 'Tên sân bay đã tồn tại.');
  sb.tenSanBay = ten;
}, 204);
them('DELETE', '/api/san-bay/{ma}', 'quanLy', ({ p }) => {
  const i = db.sanBay.findIndex((s) => s.maSanBay === p[0]);
  if (i < 0) throw khongTimThay('Không tìm thấy sân bay.');
  const dangDung = db.chuyenBay.some(
    (c) => c.maSanBayDi === p[0] || c.maSanBayDen === p[0] || c.trungGian.some((t) => t.maSanBay === p[0]),
  );
  if (dangDung) throw loi(409, 'DANG_DUOC_SU_DUNG', `Sân bay ${p[0]} đang được dùng trong lịch chuyến bay, không thể xóa.`);
  if (db.sanBay.length <= 2) throw loi(409, 'VI_PHAM_QD1', 'Phải có ít nhất 2 sân bay.');
  db.sanBay.splice(i, 1);
}, 204);
them('POST', '/api/hang-ve', 'quanLy', ({ than }) => {
  const ma = chuoi(than?.maHangVe).trim();
  const ten = chuoi(than?.tenHangVe).trim();
  const tiLe = Number(than?.tiLeDonGia);
  const chiTiet: Record<string, string> = {};
  if (!/^[A-Z0-9]{1,5}$/.test(ma)) chiTiet.maHangVe = 'Mã hạng vé gồm 1 đến 5 chữ in hoa hoặc số.';
  if (!ten) chiTiet.tenHangVe = 'Vui lòng nhập tên hạng vé.';
  if (!(tiLe > 0)) chiTiet.tiLeDonGia = 'Tỉ lệ đơn giá phải lớn hơn 0.';
  kiemTraChiTiet(chiTiet);
  if (db.hangVe.some((h) => h.maHangVe === ma || h.tenHangVe.toLowerCase() === ten.toLowerCase()))
    throw loi(409, 'TRUNG_MA', 'Mã hoặc tên hạng vé đã tồn tại.');
  db.hangVe.push({ maHangVe: ma, tenHangVe: ten, tiLeDonGia: Math.round(tiLe * 100) / 100 });
}, 201);
them('PUT', '/api/hang-ve/{ma}', 'quanLy', ({ p, than }) => {
  const hv = db.hangVe.find((h) => h.maHangVe === p[0]);
  if (!hv) throw khongTimThay('Không tìm thấy hạng vé.');
  const ten = chuoi(than?.tenHangVe).trim();
  if (!ten) kiemTraChiTiet({ tenHangVe: 'Vui lòng nhập tên hạng vé.' });
  if (db.hangVe.some((h) => h !== hv && h.tenHangVe.toLowerCase() === ten.toLowerCase())) throw loi(409, 'TRUNG_MA', 'Tên hạng vé đã tồn tại.');
  hv.tenHangVe = ten;
}, 204);
them('DELETE', '/api/hang-ve/{ma}', 'quanLy', ({ p }) => {
  const i = db.hangVe.findIndex((h) => h.maHangVe === p[0]);
  if (i < 0) throw khongTimThay('Không tìm thấy hạng vé.');
  if (db.chuyenBay.some((c) => c.gheTheoHang.some((g) => g.maHangVe === p[0])))
    throw loi(409, 'DANG_DUOC_SU_DUNG', `Hạng vé ${p[0]} đang được dùng trên các chuyến bay, không thể xóa.`);
  if (db.hangVe.length <= 1) throw loi(409, 'DANG_DUOC_SU_DUNG', 'Phải có ít nhất 1 hạng vé.');
  db.hangVe.splice(i, 1);
}, 204);

/* Chuyến bay */
function locChuyenBay(t: ThamSo): ChuyenBayGia[] {
  const tu = t.tuNgay ? dauNgay(docIso(chuoi(t.tuNgay))) : null;
  const den = t.denNgay ? congNgay(dauNgay(docIso(chuoi(t.denNgay))), 1) : null;
  const ma = chuoi(t.maChuyenBay).trim().toUpperCase();
  return db.chuyenBay
    .filter((c) => {
      const kh = docIso(c.ngayGioKhoiHanh);
      if (t.sanBayDi && c.maSanBayDi !== t.sanBayDi) return false;
      if (t.sanBayDen && c.maSanBayDen !== t.sanBayDen) return false;
      if (tu && kh < tu) return false;
      if (den && kh >= den) return false;
      if (ma && !c.maChuyenBay.includes(ma)) return false;
      return true;
    })
    .sort((a, b) => a.ngayGioKhoiHanh.localeCompare(b.ngayGioKhoiHanh));
}

them('GET', '/api/chuyen-bay', 'dangNhap', ({ thamSo }) => locChuyenBay(thamSo).map(tomTat));
them('GET', '/api/chuyen-bay/sap-khoi-hanh', 'dangNhap', ({ thamSo }) => {
  const now = sangIso(bayGio());
  const soLuong = Math.max(1, Number(thamSo.soLuong) || 5);
  return db.chuyenBay
    .filter((c) => c.ngayGioKhoiHanh > now)
    .sort((a, b) => a.ngayGioKhoiHanh.localeCompare(b.ngayGioKhoiHanh))
    .slice(0, soLuong)
    .map(tomTat);
});
them('GET', '/api/chuyen-bay/mau-excel', 'dangNhap', () =>
  csv('mau_lich_chuyen_bay.csv', [
    ['MaChuyenBay', 'GiaVe', 'MaSanBayDi', 'MaSanBayDen', 'NgayGioKhoiHanh', 'ThoiGianBay', 'GheHang1', 'GheHang2', 'TrungGian1', 'ThoiGianDung1', 'TrungGian2', 'ThoiGianDung2'],
    ['CB900', 1500000, 'SGN', 'HAN', '2026-12-01T08:30:00', 125, 20, 150, '', '', '', ''],
  ]),
);
them('GET', '/api/chuyen-bay/xuat-excel', 'dangNhap', ({ thamSo }) =>
  csv('danh_sach_chuyen_bay.csv', [
    ['STT', 'Mã chuyến bay', 'Sân bay đi', 'Sân bay đến', 'Ngày giờ khởi hành', 'Thời gian bay', 'Số ghế trống', 'Số ghế đặt'],
    ...locChuyenBay(thamSo).map((c, i) => {
      const t = tomTat(c);
      return [i + 1, t.maChuyenBay, t.tenSanBayDi, t.tenSanBayDen, t.ngayGioKhoiHanh, t.thoiGianBay, t.soGheTrong, t.soGheDat];
    }),
  ]),
);
them('POST', '/api/chuyen-bay/nhap-excel', 'quanLy', ({ than }) => {
  if (!(than instanceof FormData) || !than.get('tapTin')) kiemTraChiTiet({ tapTin: 'Vui lòng chọn tập tin Excel.' });
  return {
    soDaThem: 0,
    dongLoi: [{ dong: 1, lyDo: 'Chế độ giả lập không đọc nội dung tập tin Excel, hãy chạy cùng máy chủ thật để nhập lịch.' }],
  };
});
them('GET', '/api/chuyen-bay/{ma}', 'dangNhap', ({ p }): ChuyenBayChiTiet => {
  const cb = timChuyenBay(p[0]);
  return {
    maChuyenBay: cb.maChuyenBay,
    giaVe: cb.giaVe,
    maSanBayDi: cb.maSanBayDi,
    maSanBayDen: cb.maSanBayDen,
    ngayGioKhoiHanh: cb.ngayGioKhoiHanh,
    thoiGianBay: cb.thoiGianBay,
    gheTheoHang: cb.gheTheoHang.map((g) => {
      const daDung = soGheDaDung(cb.maChuyenBay, g.maHangVe);
      return { maHangVe: g.maHangVe, tenHangVe: tenHang(g.maHangVe), soLuongGhe: g.soLuongGhe, soGheTrong: g.soLuongGhe - daDung, soDaBanVaDat: daDung };
    }),
    trungGian: cb.trungGian.map((t) => ({ ...t, tenSanBay: tenSanBay(t.maSanBay) })),
  };
});
them('POST', '/api/chuyen-bay', 'quanLy', ({ than }) => {
  kiemTraChuyenBay(than ?? {}, true);
  if (db.chuyenBay.some((c) => c.maChuyenBay === than.maChuyenBay)) throw loi(409, 'TRUNG_MA', `Mã chuyến bay ${than.maChuyenBay} đã tồn tại.`);
  db.chuyenBay.push(structuredClone(than) as ChuyenBayGia);
}, 201);
them('PUT', '/api/chuyen-bay/{ma}', 'quanLy', ({ p, than }) => {
  const cb = timChuyenBay(p[0]);
  kiemTraChuyenBay(than ?? {}, false);
  const yc = than as YeuCauLuuChuyenBay;
  for (const g of cb.gheTheoHang) {
    const moi = yc.gheTheoHang.find((x) => x.maHangVe === g.maHangVe);
    const daDung = soGheDaDung(cb.maChuyenBay, g.maHangVe);
    if ((moi?.soLuongGhe ?? 0) < daDung)
      throw loi(409, 'DA_CO_VE_HOAC_PHIEU', `${tenHang(g.maHangVe)} đã có ${daDung} vé và phiếu, không thể giảm số ghế xuống thấp hơn.`);
  }
  Object.assign(cb, structuredClone({ ...yc, maChuyenBay: cb.maChuyenBay }));
}, 204);
them('DELETE', '/api/chuyen-bay/{ma}', 'quanLy', ({ p }) => {
  const cb = timChuyenBay(p[0]);
  if (db.ve.some((v) => v.maChuyenBay === cb.maChuyenBay) || db.phieu.some((x) => x.maChuyenBay === cb.maChuyenBay))
    throw loi(409, 'DA_CO_VE_HOAC_PHIEU', `Chuyến bay ${cb.maChuyenBay} đã có vé hoặc phiếu đặt chỗ, không thể xóa.`);
  db.chuyenBay.splice(db.chuyenBay.indexOf(cb), 1);
}, 204);
them('GET', '/api/chuyen-bay/{ma}/thong-tin-ban', 'dangNhap', ({ p, thamSo }) =>
  thongTinBan(timChuyenBay(p[0]), thamSo.mucDich === 'datVe' ? 'datVe' : 'banVe'),
);

/* Vé */
them('POST', '/api/ve', 'dangNhap', ({ than }): KetQuaBanVe => {
  const { cb, hang, hk } = kiemTraYeuCauBan(than ?? {}, 'banVe');
  db.demVe += 1;
  const v: VeGia = {
    ...hk,
    maVe: maVeTuSo(db.demVe),
    maChuyenBay: cb.maChuyenBay,
    maHangVe: hang.maHangVe,
    giaTien: hang.giaTien,
    ngayBan: sangIso(bayGio()),
    tinhTrang: 'DaBan',
    maPhieuDat: null,
  };
  db.ve.push(v);
  return { maVe: v.maVe, giaTien: v.giaTien, ngayBan: v.ngayBan };
}, 201);
them('POST', '/api/ve/tu-phieu', 'dangNhap', ({ than }): KetQuaBanVe => {
  const p = db.phieu.find((x) => x.maPhieuDat === chuoi(than?.maPhieuDat).trim());
  if (!p) throw khongTimThay('Không tìm thấy phiếu đặt chỗ.');
  if (p.tinhTrang !== 'ChoThanhToan' || docIso(p.hanThanhToan) <= bayGio())
    throw loi(409, 'PHIEU_HET_HAN', `Phiếu ${p.maPhieuDat} đã hết hạn hoặc đã bị hủy.`);
  const cb = timChuyenBay(p.maChuyenBay);
  if (docIso(cb.ngayGioKhoiHanh) <= bayGio()) throw loi(409, 'CHUYEN_BAY_DA_KHOI_HANH', `Chuyến bay ${cb.maChuyenBay} đã khởi hành.`);
  p.tinhTrang = 'DaHuy';
  db.demVe += 1;
  const v: VeGia = {
    hoTen: p.hoTen,
    loaiGiayTo: p.loaiGiayTo,
    soGiayTo: p.soGiayTo,
    dienThoai: p.dienThoai,
    maVe: maVeTuSo(db.demVe),
    maChuyenBay: p.maChuyenBay,
    maHangVe: p.maHangVe,
    giaTien: p.giaTien,
    ngayBan: sangIso(bayGio()),
    tinhTrang: 'DaBan',
    maPhieuDat: p.maPhieuDat,
  };
  db.ve.push(v);
  return { maVe: v.maVe, giaTien: v.giaTien, ngayBan: v.ngayBan };
}, 201);
them('GET', '/api/ve', 'dangNhap', ({ thamSo: t }): Ve[] => {
  const coTieuChi = ['maVe', 'soGiayTo', 'maChuyenBay', 'tuNgay', 'denNgay'].some((k) => chuoi(t[k]).trim());
  const homNay = sangIso(dauNgay(bayGio())).slice(0, 10);
  const tu = coTieuChi ? chuoi(t.tuNgay).slice(0, 10) : homNay;
  const den = coTieuChi ? chuoi(t.denNgay).slice(0, 10) : homNay;
  return db.ve
    .filter((v) => {
      const ngay = v.ngayBan.slice(0, 10);
      if (t.maVe && !v.maVe.includes(chuoi(t.maVe).trim().toUpperCase())) return false;
      if (t.soGiayTo && !v.soGiayTo.includes(chuoi(t.soGiayTo).trim().toUpperCase())) return false;
      if (t.maChuyenBay && v.maChuyenBay !== chuoi(t.maChuyenBay).trim().toUpperCase()) return false;
      if (tu && ngay < tu) return false;
      if (den && ngay > den) return false;
      return true;
    })
    .sort((a, b) => b.ngayBan.localeCompare(a.ngayBan))
    .map(veRa);
});
them('PUT', '/api/ve/{ma}/hanh-khach', 'dangNhap', ({ p, than }) => {
  const v = db.ve.find((x) => x.maVe === p[0]);
  if (!v) throw khongTimThay('Không tìm thấy vé.');
  const chiTiet: Record<string, string> = {};
  kiemTraHanhKhach(than, chiTiet);
  kiemTraChiTiet(chiTiet);
  if (v.tinhTrang === 'DaHuy') throw loi(409, 'DU_LIEU_DA_THAY_DOI', 'Vé đã bị hủy, không thể sửa.');
  kiemTraGiayTo(than as HanhKhach, { ve: v.maVe });
  Object.assign(v, { hoTen: than.hoTen.trim(), loaiGiayTo: than.loaiGiayTo as LoaiGiayTo, soGiayTo: than.soGiayTo.trim(), dienThoai: than.dienThoai.trim() });
}, 204);
them('POST', '/api/ve/{ma}/huy', 'dangNhap', ({ p }) => {
  const v = db.ve.find((x) => x.maVe === p[0]);
  if (!v) throw khongTimThay('Không tìm thấy vé.');
  if (v.tinhTrang === 'DaHuy') throw loi(409, 'DU_LIEU_DA_THAY_DOI', 'Vé đã được hủy trước đó.');
  const cb = timChuyenBay(v.maChuyenBay);
  if (docIso(cb.ngayGioKhoiHanh) <= bayGio()) throw loi(409, 'CHUYEN_BAY_DA_KHOI_HANH', 'Chuyến bay đã khởi hành, không thể hủy vé.');
  v.tinhTrang = 'DaHuy';
}, 204);

/* Phiếu đặt chỗ */
them('POST', '/api/phieu-dat', 'dangNhap', ({ than }): KetQuaDatVe => {
  const { cb, hang, hk } = kiemTraYeuCauBan(than ?? {}, 'datVe');
  const now = bayGio();
  db.demPhieu += 1;
  const ph: PhieuGia = {
    ...hk,
    maPhieuDat: maPhieuTuSo(db.demPhieu),
    maChuyenBay: cb.maChuyenBay,
    maHangVe: hang.maHangVe,
    giaTien: hang.giaTien,
    thoiDiemDat: sangIso(now),
    hanThanhToan: sangIso(tinhHanThanhToan(now, docIso(cb.ngayGioKhoiHanh), db.thamSo.thoiGianHuyDatVe)),
    tinhTrang: 'ChoThanhToan',
  };
  db.phieu.push(ph);
  return { maPhieuDat: ph.maPhieuDat, giaTien: ph.giaTien, thoiDiemDat: ph.thoiDiemDat, hanThanhToan: ph.hanThanhToan };
}, 201);
them('GET', '/api/phieu-dat', 'dangNhap', ({ thamSo: t }) =>
  db.phieu
    .filter((x) => {
      if (t.maPhieuDat && !x.maPhieuDat.includes(chuoi(t.maPhieuDat).trim().toUpperCase())) return false;
      if (t.soGiayTo && !x.soGiayTo.includes(chuoi(t.soGiayTo).trim().toUpperCase())) return false;
      if (t.maChuyenBay && x.maChuyenBay !== chuoi(t.maChuyenBay).trim().toUpperCase()) return false;
      if (t.tinhTrang && x.tinhTrang !== t.tinhTrang) return false;
      return true;
    })
    .sort((a, b) => b.thoiDiemDat.localeCompare(a.thoiDiemDat))
    .map(phieuRa),
);
them('GET', '/api/phieu-dat/sap-het-han', 'dangNhap', ({ thamSo }) =>
  db.phieu
    .filter((x) => x.tinhTrang === 'ChoThanhToan')
    .sort((a, b) => a.hanThanhToan.localeCompare(b.hanThanhToan))
    .slice(0, Math.max(1, Number(thamSo.soLuong) || 5))
    .map(phieuRa),
);
them('GET', '/api/phieu-dat/con-han', 'dangNhap', ({ thamSo: t }): PhieuConHan[] => {
  const now = sangIso(bayGio());
  if (!t.maPhieuDat && !t.soGiayTo) kiemTraChiTiet({ soGiayTo: 'Vui lòng nhập số giấy tờ hoặc mã phiếu đặt.' });
  return db.phieu
    .filter((x) => x.tinhTrang === 'ChoThanhToan' && x.hanThanhToan > now)
    .filter((x) =>
      t.maPhieuDat
        ? x.maPhieuDat === chuoi(t.maPhieuDat).trim().toUpperCase()
        : x.soGiayTo === chuoi(t.soGiayTo).trim().toUpperCase() && (!t.loaiGiayTo || x.loaiGiayTo === t.loaiGiayTo),
    )
    .map((x) => {
      const cb = timChuyenBay(x.maChuyenBay);
      return {
        maPhieuDat: x.maPhieuDat,
        maChuyenBay: x.maChuyenBay,
        tuyenBay: `${tenSanBay(cb.maSanBayDi)} → ${tenSanBay(cb.maSanBayDen)}`,
        ngayGioKhoiHanh: cb.ngayGioKhoiHanh,
        tenHangVe: tenHang(x.maHangVe),
        hoTen: x.hoTen,
        giaTien: x.giaTien,
        hanThanhToan: x.hanThanhToan,
      };
    });
});
them('GET', '/api/phieu-dat/da-huy/dem', 'quanLy', ({ thamSo }) => {
  if (!thamSo.truocNgay) kiemTraChiTiet({ truocNgay: 'Vui lòng chọn ngày.' });
  const moc = chuoi(thamSo.truocNgay).slice(0, 10);
  return { soPhieu: db.phieu.filter((x) => x.tinhTrang === 'DaHuy' && x.thoiDiemDat.slice(0, 10) < moc).length };
});
them('DELETE', '/api/phieu-dat/da-huy', 'quanLy', ({ thamSo }) => {
  if (!thamSo.truocNgay) kiemTraChiTiet({ truocNgay: 'Vui lòng chọn ngày.' });
  const moc = chuoi(thamSo.truocNgay).slice(0, 10);
  const truoc = db.phieu.length;
  db.phieu = db.phieu.filter((x) => !(x.tinhTrang === 'DaHuy' && x.thoiDiemDat.slice(0, 10) < moc));
  return { soDaXoa: truoc - db.phieu.length };
});
them('PUT', '/api/phieu-dat/{ma}/hanh-khach', 'dangNhap', ({ p, than }) => {
  const ph = db.phieu.find((x) => x.maPhieuDat === p[0]);
  if (!ph) throw khongTimThay('Không tìm thấy phiếu đặt chỗ.');
  const chiTiet: Record<string, string> = {};
  kiemTraHanhKhach(than, chiTiet);
  kiemTraChiTiet(chiTiet);
  if (ph.tinhTrang === 'DaHuy') throw loi(409, 'DU_LIEU_DA_THAY_DOI', 'Phiếu đã bị hủy, không thể sửa.');
  kiemTraGiayTo(than as HanhKhach, { phieu: ph.maPhieuDat });
  Object.assign(ph, { hoTen: than.hoTen.trim(), loaiGiayTo: than.loaiGiayTo as LoaiGiayTo, soGiayTo: than.soGiayTo.trim(), dienThoai: than.dienThoai.trim() });
}, 204);
them('POST', '/api/phieu-dat/{ma}/huy', 'dangNhap', ({ p }) => {
  const ph = db.phieu.find((x) => x.maPhieuDat === p[0]);
  if (!ph) throw khongTimThay('Không tìm thấy phiếu đặt chỗ.');
  if (ph.tinhTrang === 'DaHuy') throw loi(409, 'DU_LIEU_DA_THAY_DOI', 'Phiếu đã được hủy trước đó.');
  ph.tinhTrang = 'DaHuy';
}, 204);

/* Báo cáo */
function baoCaoThang(thang: number, nam: number): BaoCaoThang {
  const tienTo = `${nam}-${String(thang).padStart(2, '0')}`;
  const cacChuyen = db.chuyenBay.filter((c) => c.ngayGioKhoiHanh.startsWith(tienTo)).sort((a, b) => a.ngayGioKhoiHanh.localeCompare(b.ngayGioKhoiHanh));
  const dong = cacChuyen.map((c) => {
    const ve = db.ve.filter((v) => v.maChuyenBay === c.maChuyenBay && v.tinhTrang === 'DaBan');
    return { maChuyenBay: c.maChuyenBay, soVe: ve.length, doanhThu: ve.reduce((s, v) => s + v.giaTien, 0) };
  });
  const tong = dong.reduce((s, d) => s + d.doanhThu, 0);
  return {
    thang,
    nam,
    soChuyenBay: cacChuyen.length,
    tongSoVe: dong.reduce((s, d) => s + d.soVe, 0),
    tongDoanhThu: tong,
    dong: dong.map((d, i) => ({ stt: i + 1, ...d, tiLe: tong ? Math.round((d.doanhThu / tong) * 10000) / 100 : 0 })),
  };
}

function baoCaoNam(nam: number): BaoCaoNam {
  const cacThang = Array.from({ length: 12 }, (_, i) => baoCaoThang(i + 1, nam));
  const tong = cacThang.reduce((s, t) => s + t.tongDoanhThu, 0);
  return {
    nam,
    tongDoanhThu: tong,
    dong: cacThang.map((t) => ({
      thang: t.thang,
      soChuyenBay: t.soChuyenBay,
      doanhThu: t.tongDoanhThu,
      tiLe: tong ? Math.round((t.tongDoanhThu / tong) * 10000) / 100 : 0,
    })),
  };
}

function kiemTraThangNam(t: ThamSo, canThang: boolean) {
  const chiTiet: Record<string, string> = {};
  const thang = Number(t.thang);
  const nam = Number(t.nam);
  if (canThang && !(thang >= 1 && thang <= 12)) chiTiet.thang = 'Tháng phải từ 1 đến 12.';
  if (!(nam >= 2000 && nam <= 2100)) chiTiet.nam = 'Năm không hợp lệ.';
  kiemTraChiTiet(chiTiet);
  return { thang, nam };
}

them('GET', '/api/bao-cao/thang', 'quanLy', ({ thamSo }) => {
  const { thang, nam } = kiemTraThangNam(thamSo, true);
  return baoCaoThang(thang, nam);
});
them('GET', '/api/bao-cao/nam', 'quanLy', ({ thamSo }) => baoCaoNam(kiemTraThangNam(thamSo, false).nam));
them('GET', '/api/bao-cao/thang/xuat', 'quanLy', ({ thamSo }) => {
  const { thang, nam } = kiemTraThangNam(thamSo, true);
  const bc = baoCaoThang(thang, nam);
  return csv(`bao_cao_thang_${thang}_${nam}.csv`, [
    ['STT', 'Chuyến bay', 'Số vé', 'Doanh thu', 'Tỉ lệ (%)'],
    ...bc.dong.map((d) => [d.stt, d.maChuyenBay, d.soVe, d.doanhThu, d.tiLe]),
    ['', 'Tổng', bc.tongSoVe, bc.tongDoanhThu, 100],
  ]);
});
them('GET', '/api/bao-cao/nam/xuat', 'quanLy', ({ thamSo }) => {
  const bc = baoCaoNam(kiemTraThangNam(thamSo, false).nam);
  return csv(`bao_cao_nam_${bc.nam}.csv`, [
    ['STT', 'Tháng', 'Số chuyến bay', 'Doanh thu', 'Tỉ lệ (%)'],
    ...bc.dong.map((d, i) => [i + 1, d.thang, d.soChuyenBay, d.doanhThu, d.tiLe]),
    ['', 'Tổng', '', bc.tongDoanhThu, 100],
  ]);
});

/* Thông báo */
them('GET', '/api/thong-bao', 'dangNhap', () => [...db.nhatKy].sort((a, b) => b.thoiDiem.localeCompare(a.thoiDiem)).slice(0, 20));

/* ---------- điểm vào ---------- */
const cho = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function xuLyYeuCau(phuongThuc: PhuongThuc, duongDan: string, thamSo: ThamSo, than: unknown): Promise<PhanHoiTho> {
  await cho(180 + Math.random() * 260);
  huyPhieuQuaHan();
  const duongDanSach = duongDan.split('?')[0];
  for (const t of tuyen) {
    if (t.phuongThuc !== phuongThuc) continue;
    const m = t.mau.exec(duongDanSach);
    if (!m) continue;
    const nguoiDung = layNguoiDung();
    try {
      if (t.quyen !== 'congKhai' && !nguoiDung) throw loi(401, 'CHUA_DANG_NHAP', 'Phiên làm việc đã hết, vui lòng đăng nhập lại.');
      if (t.quyen === 'quanLy' && nguoiDung?.nhomQuyen !== 'QuanLy')
        throw loi(403, 'KHONG_DU_QUYEN', 'Chức năng này chỉ dành cho Quản lý.');
      const kq = t.xuLy({ thamSo, than: structuredCloneAnToan(than), nguoiDung, p: m.slice(1).map(decodeURIComponent) });
      if (kq && typeof kq === 'object' && 'tapTin' in (kq as object)) return kq as PhanHoiTho;
      return { trangThai: t.trangThai ?? 200, duLieu: t.trangThai === 204 ? undefined : structuredCloneAnToan(kq) };
    } catch (e) {
      if (e instanceof LoiGia) return { trangThai: e.trangThai, duLieu: e.loi };
      console.error('[gia lap]', e);
      return { trangThai: 500, duLieu: { ma: 'LOI_MAY_CHU', thongBao: 'Máy chủ giả lập gặp lỗi.' } };
    }
  }
  return { trangThai: 404, duLieu: { ma: 'KHONG_TIM_THAY', thongBao: `Không có đường dẫn ${phuongThuc} ${duongDanSach}.` } };
}

/** Sao chép để trang không sửa nhầm dữ liệu trong bộ nhớ; FormData giữ nguyên */
function structuredCloneAnToan<T>(x: T): T {
  if (x === undefined || x === null || x instanceof FormData) return x;
  return structuredClone(x);
}
