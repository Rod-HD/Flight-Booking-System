// Dữ liệu mẫu cho chế độ giả lập. Sinh theo ngày hiện tại để luôn có chuyến sắp bay,
// dùng bộ sinh số giả ngẫu nhiên có hạt cố định nên mỗi lần mở đều ra cùng một bộ dữ liệu.
import type {
  HangVe,
  LoaiGiayTo,
  NhomQuyen,
  SanBay,
  ThamSoQuyDinh,
  TinhTrangPhieu,
  TinhTrangVe,
  TrangThaiTaiKhoan,
} from '@/kieu/api';
import { congNgay, congPhut, dauNgay, docIso, sangIso } from '@/tien_ich/thoi_gian';

export interface TaiKhoanGia {
  tenDangNhap: string;
  matKhau: string;
  nhomQuyen: NhomQuyen;
  trangThai: TrangThaiTaiKhoan;
}

export interface ChuyenBayGia {
  maChuyenBay: string;
  giaVe: number;
  maSanBayDi: string;
  maSanBayDen: string;
  ngayGioKhoiHanh: string;
  thoiGianBay: number;
  gheTheoHang: { maHangVe: string; soLuongGhe: number }[];
  trungGian: { thuTu: number; maSanBay: string; thoiGianDung: number; ghiChu: string }[];
}

export interface HanhKhachGia {
  hoTen: string;
  loaiGiayTo: LoaiGiayTo;
  soGiayTo: string;
  dienThoai: string;
}

export interface VeGia extends HanhKhachGia {
  maVe: string;
  maChuyenBay: string;
  maHangVe: string;
  giaTien: number;
  ngayBan: string;
  tinhTrang: TinhTrangVe;
  maPhieuDat: string | null;
}

export interface PhieuGia extends HanhKhachGia {
  maPhieuDat: string;
  maChuyenBay: string;
  maHangVe: string;
  giaTien: number;
  thoiDiemDat: string;
  hanThanhToan: string;
  tinhTrang: TinhTrangPhieu;
}

export interface CoSoDuLieuGia {
  taiKhoan: TaiKhoanGia[];
  thamSo: ThamSoQuyDinh;
  sanBay: SanBay[];
  hangVe: HangVe[];
  chuyenBay: ChuyenBayGia[];
  ve: VeGia[];
  phieu: PhieuGia[];
  nhatKy: { thoiDiem: string; noiDung: string }[];
  demVe: number;
  demPhieu: number;
}

/** Bộ sinh số giả ngẫu nhiên mulberry32 */
function taoNgauNhien(hat: number) {
  let a = hat >>> 0;
  const ham = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    so: ham,
    nguyen: (tu: number, den: number) => tu + Math.floor(ham() * (den - tu + 1)),
    chon: <T,>(ds: readonly T[]): T => ds[Math.floor(ham() * ds.length)],
  };
}

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
const DEM = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Hữu', 'Thanh', 'Quốc', 'Gia', 'Bảo', 'Thu', 'Đức', 'Hoài', 'Khánh', 'Phương'];
const TEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hoa', 'Huy', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Ngân', 'Nhi', 'Phát', 'Phúc', 'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Trí', 'Tú', 'Vy', 'Yến'];

export const SAN_BAY_MAU: SanBay[] = [
  { maSanBay: 'SGN', tenSanBay: 'Tân Sơn Nhất' },
  { maSanBay: 'HAN', tenSanBay: 'Nội Bài' },
  { maSanBay: 'DAD', tenSanBay: 'Đà Nẵng' },
  { maSanBay: 'CXR', tenSanBay: 'Cam Ranh' },
  { maSanBay: 'PQC', tenSanBay: 'Phú Quốc' },
  { maSanBay: 'HPH', tenSanBay: 'Cát Bi' },
  { maSanBay: 'VII', tenSanBay: 'Vinh' },
  { maSanBay: 'HUI', tenSanBay: 'Phú Bài' },
  { maSanBay: 'VCA', tenSanBay: 'Cần Thơ' },
  { maSanBay: 'DLI', tenSanBay: 'Liên Khương' },
];

// tuyến bay mẫu: [đi, đến, phút bay, giá vé]
const TUYEN: [string, string, number, number][] = [
  ['SGN', 'HAN', 125, 1500000],
  ['HAN', 'SGN', 125, 1500000],
  ['SGN', 'DAD', 80, 950000],
  ['DAD', 'SGN', 80, 950000],
  ['HAN', 'DAD', 75, 900000],
  ['SGN', 'PQC', 60, 850000],
  ['HAN', 'PQC', 130, 1650000],
  ['SGN', 'HPH', 120, 1400000],
  ['SGN', 'VII', 105, 1250000],
  ['HAN', 'CXR', 110, 1350000],
  ['SGN', 'HUI', 85, 990000],
  ['HAN', 'VCA', 130, 1450000],
  ['DLI', 'HAN', 110, 1300000],
  ['CXR', 'HAN', 110, 1350000],
];

function sinhGiayTo(nn: ReturnType<typeof taoNgauNhien>, i: number): { loai: LoaiGiayTo; so: string } {
  if (nn.so() < 0.85) {
    const tinh = String(nn.nguyen(1, 96)).padStart(3, '0');
    return { loai: 'CCCD', so: `${tinh}${nn.nguyen(0, 1)}${String(nn.nguyen(80, 99))}${String(100000 + i).slice(-6)}` };
  }
  return { loai: 'HoChieu', so: `${nn.chon(['B', 'C', 'N'])}${String(1000000 + i * 7).slice(-7)}` };
}

function sinhDienThoai(nn: ReturnType<typeof taoNgauNhien>): string {
  return `0${nn.chon(['90', '91', '93', '94', '96', '97', '98', '32', '33', '35', '70', '77', '79', '83', '85'])}${String(nn.nguyen(0, 9999999)).padStart(7, '0')}`;
}

export const maVeTuSo = (n: number) => `VE${String(n).padStart(8, '0')}`;
export const maPhieuTuSo = (n: number) => `PD${String(n).padStart(8, '0')}`;

/** Hạn thanh toán của phiếu: 24 giờ sau khi đặt, nhưng không quá mốc hủy theo QĐ3 */
export function tinhHanThanhToan(thoiDiemDat: Date, khoiHanh: Date, thoiGianHuyDatVe: number): Date {
  const han24 = congPhut(thoiDiemDat, 24 * 60);
  const mocHuy = congNgay(dauNgay(khoiHanh), -thoiGianHuyDatVe);
  return han24 < mocHuy ? han24 : mocHuy;
}

export function taoCoSoDuLieu(bayGio = new Date()): CoSoDuLieuGia {
  const nn = taoNgauNhien(20261112);
  const thamSo: ThamSoQuyDinh = {
    thoiGianBayToiThieu: 30,
    soSanBayTrungGianToiDa: 2,
    thoiGianDungToiThieu: 10,
    thoiGianDungToiDa: 20,
    thoiGianDatVeChamNhat: 1,
    thoiGianHuyDatVe: 0,
  };
  const hangVe: HangVe[] = [
    { maHangVe: 'H1', tenHangVe: 'Hạng 1', tiLeDonGia: 105 },
    { maHangVe: 'H2', tenHangVe: 'Hạng 2', tiLeDonGia: 100 },
  ];
  const db: CoSoDuLieuGia = {
    taiKhoan: [
      { tenDangNhap: 'quanly', matKhau: 'Quanly@123', nhomQuyen: 'QuanLy', trangThai: 'HoatDong' },
      { tenDangNhap: 'nhanvien', matKhau: 'Nhanvien@123', nhomQuyen: 'NhanVien', trangThai: 'HoatDong' },
      { tenDangNhap: 'banve02', matKhau: 'Nhanvien@123', nhomQuyen: 'NhanVien', trangThai: 'HoatDong' },
      { tenDangNhap: 'banve03', matKhau: 'Nhanvien@123', nhomQuyen: 'NhanVien', trangThai: 'DaKhoa' },
    ],
    thamSo,
    sanBay: SAN_BAY_MAU.map((s) => ({ ...s })),
    hangVe,
    chuyenBay: [],
    ve: [],
    phieu: [],
    nhatKy: [],
    demVe: 0,
    demPhieu: 0,
  };

  const homNay = dauNgay(bayGio);
  let soHieu = 100;
  let soKhach = 0;

  const taoKhach = (): HanhKhachGia => {
    soKhach += 1;
    const gt = sinhGiayTo(nn, soKhach);
    return {
      hoTen: `${nn.chon(HO)} ${nn.chon(DEM)} ${nn.chon(TEN)}`,
      loaiGiayTo: gt.loai,
      soGiayTo: gt.so,
      dienThoai: sinhDienThoai(nn),
    };
  };

  // các ngày có chuyến: rải đều từ đầu năm trước đến 12 ngày tới, gần hiện tại thì dày hơn
  const cacNgay: { ngay: Date; soChuyen: number }[] = [];
  const dauNam = new Date(bayGio.getFullYear(), 0, 1);
  for (let d = new Date(dauNam); d < congNgay(homNay, -14); d = congNgay(d, 6)) cacNgay.push({ ngay: d, soChuyen: 1 });
  for (let i = -14; i <= 12; i += 1) cacNgay.push({ ngay: congNgay(homNay, i), soChuyen: i >= 0 && i <= 2 ? 4 : 2 });

  for (const { ngay, soChuyen } of cacNgay) {
    const gioDaDung = new Set<number>();
    for (let k = 0; k < soChuyen; k += 1) {
      const [di, den, phut, gia] = nn.chon(TUYEN);
      let gio = nn.nguyen(6, 21);
      while (gioDaDung.has(gio)) gio = (gio % 16) + 6;
      gioDaDung.add(gio);
      const khoiHanh = new Date(ngay.getFullYear(), ngay.getMonth(), ngay.getDate(), gio, nn.chon([0, 15, 30, 45]));
      soHieu += nn.nguyen(1, 7);
      const ghe1 = nn.chon([12, 16, 20]);
      const ghe2 = nn.chon([120, 150, 168]);
      const coTrungGian = phut >= 120 && nn.so() < 0.35;
      const cb: ChuyenBayGia = {
        maChuyenBay: `CB${soHieu}`,
        giaVe: gia + nn.nguyen(-2, 4) * 50000,
        maSanBayDi: di,
        maSanBayDen: den,
        ngayGioKhoiHanh: sangIso(khoiHanh),
        thoiGianBay: phut,
        gheTheoHang: [
          { maHangVe: 'H1', soLuongGhe: ghe1 },
          { maHangVe: 'H2', soLuongGhe: ghe2 },
        ],
        trungGian: coTrungGian
          ? [{ thuTu: 1, maSanBay: 'DAD', thoiGianDung: nn.chon([10, 15, 20]), ghiChu: 'Đón thêm khách' }]
          : [],
      };
      if (cb.trungGian.some((t) => t.maSanBay === di || t.maSanBay === den)) cb.trungGian = [];
      db.chuyenBay.push(cb);

      // vé đã bán: chuyến đã bay thì gần đầy, chuyến sắp bay thì ít hơn
      const daBay = khoiHanh < bayGio;
      const tiLeDay = daBay ? 0.55 + nn.so() * 0.4 : 0.15 + nn.so() * 0.5;
      for (const g of cb.gheTheoHang) {
        const tiLe = hangVe.find((h) => h.maHangVe === g.maHangVe)!.tiLeDonGia;
        const soBan = Math.floor(g.soLuongGhe * tiLeDay * (g.maHangVe === 'H1' ? 0.7 : 1));
        for (let v = 0; v < soBan; v += 1) {
          const ngayBan = congPhut(khoiHanh, -nn.nguyen(60 * 3, 60 * 24 * 20));
          if (ngayBan > bayGio) continue;
          db.demVe += 1;
          db.ve.push({
            ...taoKhach(),
            maVe: maVeTuSo(db.demVe),
            maChuyenBay: cb.maChuyenBay,
            maHangVe: g.maHangVe,
            giaTien: Math.round((cb.giaVe * tiLe) / 100),
            ngayBan: sangIso(ngayBan),
            tinhTrang: nn.so() < 0.04 ? 'DaHuy' : 'DaBan',
            maPhieuDat: null,
          });
        }
      }

      // phiếu đặt chỗ cho chuyến còn đặt được
      const soNgayToi = Math.round((dauNgay(khoiHanh).getTime() - homNay.getTime()) / 86400000);
      if (soNgayToi >= 1) {
        const soPhieu = nn.nguyen(0, 3);
        for (let p = 0; p < soPhieu; p += 1) {
          const g = nn.chon(cb.gheTheoHang);
          const tiLe = hangVe.find((h) => h.maHangVe === g.maHangVe)!.tiLeDonGia;
          const thoiDiemDat = congPhut(bayGio, -nn.nguyen(30, 60 * 22));
          const han = tinhHanThanhToan(thoiDiemDat, khoiHanh, thamSo.thoiGianHuyDatVe);
          db.demPhieu += 1;
          db.phieu.push({
            ...taoKhach(),
            maPhieuDat: maPhieuTuSo(db.demPhieu),
            maChuyenBay: cb.maChuyenBay,
            maHangVe: g.maHangVe,
            giaTien: Math.round((cb.giaVe * tiLe) / 100),
            thoiDiemDat: sangIso(thoiDiemDat),
            hanThanhToan: sangIso(han),
            tinhTrang: nn.so() < 0.2 ? 'DaHuy' : 'ChoThanhToan',
          });
        }
      }
    }
  }

  // phiếu đã hủy từ trước để thử chức năng dọn dẹp
  for (let i = 0; i < 6; i += 1) {
    const cb = db.chuyenBay[nn.nguyen(0, Math.floor(db.chuyenBay.length / 2))];
    const dat = congPhut(docIso(cb.ngayGioKhoiHanh), -nn.nguyen(60 * 30, 60 * 24 * 6));
    db.demPhieu += 1;
    db.phieu.push({
      ...taoKhach(),
      maPhieuDat: maPhieuTuSo(db.demPhieu),
      maChuyenBay: cb.maChuyenBay,
      maHangVe: 'H2',
      giaTien: cb.giaVe,
      thoiDiemDat: sangIso(dat),
      hanThanhToan: sangIso(congPhut(dat, 24 * 60)),
      tinhTrang: 'DaHuy',
    });
  }

  // nhật ký hủy tự động của các lần chạy trước
  const phieuDaHuy = db.phieu.filter((p) => p.tinhTrang === 'DaHuy').slice(0, 8);
  const moc = [-15, -60 * 3 - 15, -60 * 9 - 15, -60 * 20 - 15];
  moc.forEach((m, i) => {
    const nhom = phieuDaHuy.slice(i * 2, i * 2 + 2).map((p) => p.maPhieuDat);
    if (!nhom.length) return;
    db.nhatKy.push({
      thoiDiem: sangIso(congPhut(bayGio, m)),
      noiDung: `Tự động hủy ${nhom.length} phiếu đặt chỗ quá hạn thanh toán: ${nhom.join(', ')}.`,
    });
  });

  return db;
}

