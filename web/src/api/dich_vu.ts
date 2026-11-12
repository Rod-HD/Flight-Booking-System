// Mỗi đường dẫn trong docs/API.md ứng với một hàm có kiểu rõ ràng.
// Trang chỉ gọi các hàm ở đây, không tự ghép đường dẫn.
import { goiApi, goiTaiTapTin } from './may_khach';
import type {
  BaoCaoNam,
  BaoCaoThang,
  ChuyenBayChiTiet,
  ChuyenBayTomTat,
  DinhDangXuat,
  HanhKhach,
  HangVe,
  KetQuaBanVe,
  KetQuaDatVe,
  KetQuaNhapExcel,
  LoaiGiayTo,
  MucDichBan,
  NguoiDung,
  PhieuConHan,
  PhieuDat,
  QuyDinh,
  SanBay,
  TaiKhoan,
  TenThamSo,
  ThongBao,
  ThongTinBan,
  TieuChiTimChuyenBay,
  TieuChiTimPhieu,
  TieuChiTimVe,
  Ve,
  YeuCauBanVe,
  YeuCauDangNhap,
  YeuCauLuuChuyenBay,
  YeuCauSuaTaiKhoan,
  YeuCauThemTaiKhoan,
} from '@/kieu/api';

const ma = encodeURIComponent;

/* ---------- Phiên làm việc (UC01) ---------- */
export const apiPhien = {
  dangNhap: (yc: YeuCauDangNhap) => goiApi<NguoiDung>('POST', '/api/dang-nhap', { than: yc }),
  dangXuat: () => goiApi<void>('POST', '/api/dang-xuat'),
  lay: () => goiApi<NguoiDung>('GET', '/api/phien'),
};

/* ---------- Tài khoản (UC02, chỉ Quản lý) ---------- */
export const apiTaiKhoan = {
  danhSach: () => goiApi<TaiKhoan[]>('GET', '/api/tai-khoan'),
  them: (yc: YeuCauThemTaiKhoan) => goiApi<void>('POST', '/api/tai-khoan', { than: yc }),
  sua: (tenDangNhap: string, yc: YeuCauSuaTaiKhoan) =>
    goiApi<void>('PUT', `/api/tai-khoan/${ma(tenDangNhap)}`, { than: yc }),
  khoa: (tenDangNhap: string) => goiApi<void>('POST', `/api/tai-khoan/${ma(tenDangNhap)}/khoa`),
  moKhoa: (tenDangNhap: string) => goiApi<void>('POST', `/api/tai-khoan/${ma(tenDangNhap)}/mo-khoa`),
};

/* ---------- Quy định, sân bay, hạng vé (UC08) ---------- */
export const apiQuyDinh = {
  lay: () => goiApi<QuyDinh>('GET', '/api/quy-dinh'),
  suaThamSo: (tenThamSo: TenThamSo, giaTriMoi: number) =>
    goiApi<void>('PUT', `/api/quy-dinh/tham-so/${ma(tenThamSo)}`, { than: { giaTriMoi } }),
  themSanBay: (sb: SanBay) => goiApi<void>('POST', '/api/san-bay', { than: sb }),
  suaSanBay: (maSanBay: string, tenSanBay: string) =>
    goiApi<void>('PUT', `/api/san-bay/${ma(maSanBay)}`, { than: { tenSanBay } }),
  xoaSanBay: (maSanBay: string) => goiApi<void>('DELETE', `/api/san-bay/${ma(maSanBay)}`),
  themHangVe: (hv: HangVe) => goiApi<void>('POST', '/api/hang-ve', { than: hv }),
  suaHangVe: (maHangVe: string, tenHangVe: string) =>
    goiApi<void>('PUT', `/api/hang-ve/${ma(maHangVe)}`, { than: { tenHangVe } }),
  xoaHangVe: (maHangVe: string) => goiApi<void>('DELETE', `/api/hang-ve/${ma(maHangVe)}`),
};

/* ---------- Chuyến bay (UC03) ---------- */
export const apiChuyenBay = {
  traCuu: (tieuChi: TieuChiTimChuyenBay = {}) =>
    goiApi<ChuyenBayTomTat[]>('GET', '/api/chuyen-bay', { thamSo: { ...tieuChi } }),
  chiTiet: (maChuyenBay: string) => goiApi<ChuyenBayChiTiet>('GET', `/api/chuyen-bay/${ma(maChuyenBay)}`),
  them: (yc: YeuCauLuuChuyenBay) => goiApi<void>('POST', '/api/chuyen-bay', { than: yc }),
  sua: (maChuyenBay: string, yc: YeuCauLuuChuyenBay) =>
    goiApi<void>('PUT', `/api/chuyen-bay/${ma(maChuyenBay)}`, { than: yc }),
  xoa: (maChuyenBay: string) => goiApi<void>('DELETE', `/api/chuyen-bay/${ma(maChuyenBay)}`),
  nhapExcel: (tapTin: File) => {
    const fd = new FormData();
    fd.append('tapTin', tapTin);
    return goiApi<KetQuaNhapExcel>('POST', '/api/chuyen-bay/nhap-excel', { than: fd });
  },
  taiMauExcel: () => goiTaiTapTin('/api/chuyen-bay/mau-excel'),
  xuatExcel: (tieuChi: TieuChiTimChuyenBay = {}) => goiTaiTapTin('/api/chuyen-bay/xuat-excel', { ...tieuChi }),
  sapKhoiHanh: (soLuong = 5) =>
    goiApi<ChuyenBayTomTat[]>('GET', '/api/chuyen-bay/sap-khoi-hanh', { thamSo: { soLuong } }),
  thongTinBan: (maChuyenBay: string, mucDich: MucDichBan) =>
    goiApi<ThongTinBan>('GET', `/api/chuyen-bay/${ma(maChuyenBay)}/thong-tin-ban`, { thamSo: { mucDich } }),
};

/* ---------- Vé (UC04) ---------- */
/** Tra cứu vé và tra cứu phiếu đặt chỗ chỉ trả về tối đa bấy nhiêu dòng (SO_DONG_TOI_DA ở DAL_Ve, DAL_PhieuDatCho) */
export const SO_KET_QUA_TOI_DA = 1000;

export const apiVe = {
  ban: (yc: YeuCauBanVe) => goiApi<KetQuaBanVe>('POST', '/api/ve', { than: yc }),
  banTuPhieu: (maPhieuDat: string) => goiApi<KetQuaBanVe>('POST', '/api/ve/tu-phieu', { than: { maPhieuDat } }),
  danhSach: (tieuChi: TieuChiTimVe = {}) => goiApi<Ve[]>('GET', '/api/ve', { thamSo: { ...tieuChi } }),
  suaHanhKhach: (maVe: string, hk: HanhKhach) => goiApi<void>('PUT', `/api/ve/${ma(maVe)}/hanh-khach`, { than: hk }),
  huy: (maVe: string) => goiApi<void>('POST', `/api/ve/${ma(maVe)}/huy`),
};

/* ---------- Phiếu đặt chỗ (UC05) ---------- */
export const apiPhieuDat = {
  dat: (yc: YeuCauBanVe) => goiApi<KetQuaDatVe>('POST', '/api/phieu-dat', { than: yc }),
  danhSach: (tieuChi: TieuChiTimPhieu = {}) =>
    goiApi<PhieuDat[]>('GET', '/api/phieu-dat', { thamSo: { ...tieuChi } }),
  conHanTheoGiayTo: (loaiGiayTo: LoaiGiayTo, soGiayTo: string) =>
    goiApi<PhieuConHan[]>('GET', '/api/phieu-dat/con-han', { thamSo: { loaiGiayTo, soGiayTo } }),
  conHanTheoMa: (maPhieuDat: string) =>
    goiApi<PhieuConHan[]>('GET', '/api/phieu-dat/con-han', { thamSo: { maPhieuDat } }),
  sapHetHan: (soLuong = 5) => goiApi<PhieuDat[]>('GET', '/api/phieu-dat/sap-het-han', { thamSo: { soLuong } }),
  suaHanhKhach: (maPhieuDat: string, hk: HanhKhach) =>
    goiApi<void>('PUT', `/api/phieu-dat/${ma(maPhieuDat)}/hanh-khach`, { than: hk }),
  huy: (maPhieuDat: string) => goiApi<void>('POST', `/api/phieu-dat/${ma(maPhieuDat)}/huy`),
  demDaHuy: (truocNgay: string) =>
    goiApi<{ soPhieu: number }>('GET', '/api/phieu-dat/da-huy/dem', { thamSo: { truocNgay } }),
  xoaDaHuy: (truocNgay: string) =>
    goiApi<{ soDaXoa: number }>('DELETE', '/api/phieu-dat/da-huy', { thamSo: { truocNgay } }),
};

/* ---------- Báo cáo (UC07, chỉ Quản lý) ---------- */
export const apiBaoCao = {
  thang: (thang: number, nam: number) => goiApi<BaoCaoThang>('GET', '/api/bao-cao/thang', { thamSo: { thang, nam } }),
  nam: (nam: number) => goiApi<BaoCaoNam>('GET', '/api/bao-cao/nam', { thamSo: { nam } }),
  xuatThang: (thang: number, nam: number, dinhDang: DinhDangXuat) =>
    goiTaiTapTin('/api/bao-cao/thang/xuat', { thang, nam, dinhDang }),
  xuatNam: (nam: number, dinhDang: DinhDangXuat) => goiTaiTapTin('/api/bao-cao/nam/xuat', { nam, dinhDang }),
};

/* ---------- Thông báo (UC06) ---------- */
export const apiThongBao = {
  danhSach: () => goiApi<ThongBao[]>('GET', '/api/thong-bao'),
};

/** Khóa truy vấn dùng chung cho TanStack Query, để làm mới đúng chỗ sau khi ghi */
export const khoaTruyVan = {
  phien: ['phien'] as const,
  thongBao: ['thong-bao'] as const,
  quyDinh: ['quy-dinh'] as const,
  taiKhoan: ['tai-khoan'] as const,
  chuyenBay: (tieuChi: TieuChiTimChuyenBay = {}) => ['chuyen-bay', 'danh-sach', tieuChi] as const,
  chuyenBayChiTiet: (maChuyenBay: string) => ['chuyen-bay', 'chi-tiet', maChuyenBay] as const,
  chuyenBaySapKhoiHanh: (soLuong: number) => ['chuyen-bay', 'sap-khoi-hanh', soLuong] as const,
  thongTinBan: (maChuyenBay: string, mucDich: MucDichBan) => ['chuyen-bay', 'thong-tin-ban', maChuyenBay, mucDich] as const,
  ve: (tieuChi: TieuChiTimVe = {}) => ['ve', tieuChi] as const,
  phieuDat: (tieuChi: TieuChiTimPhieu = {}) => ['phieu-dat', 'danh-sach', tieuChi] as const,
  phieuSapHetHan: (soLuong: number) => ['phieu-dat', 'sap-het-han', soLuong] as const,
  baoCaoThang: (thang: number, nam: number) => ['bao-cao', 'thang', thang, nam] as const,
  baoCaoNam: (nam: number) => ['bao-cao', 'nam', nam] as const,
};
