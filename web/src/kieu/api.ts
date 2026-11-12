// Kiểu dữ liệu trao đổi với máy chủ, khớp docs/API.md (tên trường camelCase không dấu)

export type NhomQuyen = 'QuanLy' | 'NhanVien';
export type TrangThaiTaiKhoan = 'HoatDong' | 'DaKhoa';
export type TinhTrangVe = 'DaBan' | 'DaHuy';
export type TinhTrangPhieu = 'ChoThanhToan' | 'DaHuy';
export type LoaiGiayTo = 'CCCD' | 'HoChieu';
export type MucDichBan = 'banVe' | 'datVe';
export type DinhDangXuat = 'excel' | 'pdf';

/** Dạng lỗi thống nhất máy chủ trả về */
export interface LoiTraVe {
  ma: string;
  thongBao: string;
  chiTiet?: Record<string, string>;
}

export type MaLoiNghiepVu =
  | 'SAI_THONG_TIN_DANG_NHAP'
  | 'TAI_KHOAN_BI_KHOA'
  | 'TRUNG_MA'
  | 'VI_PHAM_QD1'
  | 'HET_CHO'
  | 'CHUYEN_BAY_DA_KHOI_HANH'
  | 'QUA_HAN_DAT_VE'
  | 'PHIEU_HET_HAN'
  | 'GIAY_TO_DA_THUOC_NGUOI_KHAC'
  | 'DANG_DUOC_SU_DUNG'
  | 'DA_CO_VE_HOAC_PHIEU'
  | 'KHONG_DUOC_TU_KHOA'
  | 'KHONG_DUOC_TU_DOI_QUYEN'
  | 'DU_LIEU_DA_THAY_DOI';

/* ---------- Phiên làm việc ---------- */
export interface NguoiDung {
  tenDangNhap: string;
  nhomQuyen: NhomQuyen;
}

export interface YeuCauDangNhap {
  tenDangNhap: string;
  matKhau: string;
}

/* ---------- Tài khoản ---------- */
export interface TaiKhoan {
  tenDangNhap: string;
  nhomQuyen: NhomQuyen;
  trangThai: TrangThaiTaiKhoan;
}

export interface YeuCauThemTaiKhoan {
  tenDangNhap: string;
  matKhau: string;
  nhomQuyen: NhomQuyen;
}

export interface YeuCauSuaTaiKhoan {
  nhomQuyen: NhomQuyen;
  matKhauMoi?: string;
}

/* ---------- Quy định ---------- */
export interface ThamSoQuyDinh {
  thoiGianBayToiThieu: number;
  soSanBayTrungGianToiDa: number;
  thoiGianDungToiThieu: number;
  thoiGianDungToiDa: number;
  thoiGianDatVeChamNhat: number;
  thoiGianHuyDatVe: number;
}

export type TenThamSo = keyof ThamSoQuyDinh;

export interface SanBay {
  maSanBay: string;
  tenSanBay: string;
}

export interface HangVe {
  maHangVe: string;
  tenHangVe: string;
  /** tỉ lệ theo phần trăm, 105 nghĩa là 105% đơn giá */
  tiLeDonGia: number;
}

export interface QuyDinh {
  thamSo: ThamSoQuyDinh;
  sanBay: SanBay[];
  hangVe: HangVe[];
}

/* ---------- Chuyến bay ---------- */
export interface TieuChiTimChuyenBay {
  sanBayDi?: string;
  sanBayDen?: string;
  tuNgay?: string;
  denNgay?: string;
  maChuyenBay?: string;
}

/** Một dòng của danh sách chuyến bay (BM4) */
export interface ChuyenBayTomTat {
  maChuyenBay: string;
  maSanBayDi: string;
  tenSanBayDi: string;
  maSanBayDen: string;
  tenSanBayDen: string;
  ngayGioKhoiHanh: string;
  thoiGianBay: number;
  soGheTrong: number;
  soGheDat: number;
}

export interface GheTheoHang {
  maHangVe: string;
  tenHangVe: string;
  soLuongGhe: number;
  soGheTrong: number;
  soDaBanVaDat: number;
}

export interface TrungGian {
  thuTu: number;
  maSanBay: string;
  tenSanBay: string;
  thoiGianDung: number;
  ghiChu: string;
}

export interface ChuyenBayChiTiet {
  maChuyenBay: string;
  giaVe: number;
  maSanBayDi: string;
  maSanBayDen: string;
  /** máy chủ thật trả thêm */
  tenSanBayDi?: string;
  tenSanBayDen?: string;
  ngayGioKhoiHanh: string;
  thoiGianBay: number;
  gheTheoHang: GheTheoHang[];
  trungGian: TrungGian[];
}

/** Thân yêu cầu thêm, sửa chuyến bay (không có các trường tính toán) */
export interface YeuCauLuuChuyenBay {
  maChuyenBay: string;
  giaVe: number;
  maSanBayDi: string;
  maSanBayDen: string;
  ngayGioKhoiHanh: string;
  thoiGianBay: number;
  gheTheoHang: { maHangVe: string; soLuongGhe: number }[];
  trungGian: { thuTu: number; maSanBay: string; thoiGianDung: number; ghiChu: string }[];
}

export interface KetQuaNhapExcel {
  soDaThem: number;
  dongLoi: { dong: number; lyDo: string }[];
}

/* ---------- Bán vé, đặt vé ---------- */
export interface HangBan {
  maHangVe: string;
  tenHangVe: string;
  soGheTrong: number;
  giaTien: number;
}

export interface ThongTinBan {
  duocPhep: boolean;
  maLoi?: string;
  thongBao?: string;
  tongSoGheTrong: number;
  hanThanhToanDuKien?: string;
  hang: HangBan[];
}

export interface HanhKhach {
  hoTen: string;
  loaiGiayTo: LoaiGiayTo;
  soGiayTo: string;
  dienThoai: string;
}

export interface YeuCauBanVe {
  maChuyenBay: string;
  maHangVe: string;
  hanhKhach: HanhKhach;
}

export interface KetQuaBanVe {
  maVe: string;
  giaTien: number;
  ngayBan: string;
}

export interface PhieuConHan {
  maPhieuDat: string;
  maChuyenBay: string;
  tuyenBay: string;
  ngayGioKhoiHanh: string;
  tenHangVe: string;
  hoTen: string;
  giaTien: number;
  hanThanhToan: string;
  /** máy chủ thật trả thêm */
  thoiDiemDat?: string;
}

export interface TieuChiTimVe {
  maVe?: string;
  soGiayTo?: string;
  maChuyenBay?: string;
  tuNgay?: string;
  denNgay?: string;
}

export interface Ve extends HanhKhach {
  maVe: string;
  maChuyenBay: string;
  /** máy chủ thật trả thêm */
  maHangVe?: string;
  ngayGioKhoiHanh?: string;
  tenHangVe: string;
  giaTien: number;
  ngayBan: string;
  tinhTrang: TinhTrangVe;
  maPhieuDat: string | null;
}

export interface KetQuaDatVe {
  maPhieuDat: string;
  giaTien: number;
  thoiDiemDat: string;
  hanThanhToan: string;
}

export interface TieuChiTimPhieu {
  maPhieuDat?: string;
  soGiayTo?: string;
  maChuyenBay?: string;
  tinhTrang?: TinhTrangPhieu;
}

export interface PhieuDat extends HanhKhach {
  maPhieuDat: string;
  maChuyenBay: string;
  /** máy chủ thật trả thêm */
  maHangVe?: string;
  ngayGioKhoiHanh?: string;
  tenHangVe: string;
  giaTien: number;
  thoiDiemDat: string;
  hanThanhToan: string;
  tinhTrang: TinhTrangPhieu;
}

/* ---------- Báo cáo ---------- */
export interface BaoCaoThang {
  thang: number;
  nam: number;
  soChuyenBay: number;
  tongSoVe: number;
  tongDoanhThu: number;
  dong: { stt: number; maChuyenBay: string; soVe: number; doanhThu: number; tiLe: number }[];
}

export interface BaoCaoNam {
  nam: number;
  tongDoanhThu: number;
  dong: { thang: number; soChuyenBay: number; doanhThu: number; tiLe: number }[];
}

/* ---------- Thông báo ---------- */
export interface ThongBao {
  thoiDiem: string;
  noiDung: string;
}

/** Tập tin tải về (Excel, PDF) */
export interface TapTinTai {
  tenTapTin: string;
  duLieu: Blob;
}
