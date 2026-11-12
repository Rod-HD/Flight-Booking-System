// Hàm dùng chung cho bộ kiểm thử giao diện: đăng nhập, nhập ngày, chọn trong ô chọn, tạo dữ liệu thử qua API.
import { expect, request, type APIRequestContext, type Locator, type Page } from '@playwright/test';

export const TAI_KHOAN = {
  quanLy: { ten: 'quanly', matKhau: 'Quanly@123' },
  nhanVien: { ten: 'nhanvien', matKhau: 'Nhanvien@123' },
  biKhoa: { ten: 'nhanvien2', matKhau: 'Nhanvien2@123' },
} as const;

export type VaiTro = keyof typeof TAI_KHOAN;

export const DIA_CHI = process.env.DIA_CHI ?? 'http://localhost:5080';

/* ---------------- mã và số giấy tờ không trùng giữa các lần chạy ---------------- */

let dem = 0;
const goc = Date.now();

/** Mã gồm tiền tố và chữ số, tối đa 10 ký tự, khác nhau giữa các lần gọi và các lần chạy. */
export function maMoi(tienTo = 'KT'): string {
  dem += 1;
  const duoi = ((goc / 1000) % 1e6 | 0).toString(36).toUpperCase() + String(dem).padStart(2, '0');
  return (tienTo + duoi).slice(0, 10);
}

/** Số căn cước 12 chữ số, khác nhau giữa các lần gọi và các lần chạy. */
export function soCanCuocMoi(): string {
  dem += 1;
  return '09' + String(goc % 1e8).padStart(8, '0') + String(dem % 100).padStart(2, '0');
}

/** Tên đăng nhập mới, không dấu, không khoảng trắng. */
export function tenDangNhapMoi(tienTo = 'kt'): string {
  return maMoi(tienTo.toUpperCase()).toLowerCase();
}

/* ---------------- ngày giờ theo giờ Việt Nam ---------------- */

export interface MocThoiGian {
  /** dạng 2026-11-20 */
  iso: string;
  /** dạng 20/11/2026 */
  vn: string;
  /** dạng 2026-11-20T08:30:00 (gửi API) */
  isoGio: string;
  /** dạng 20/11/2026 08:30 */
  vnGio: string;
  nam: number;
  thang: number;
}

/** Thời điểm theo giờ Việt Nam: hôm nay cộng lechNgay ngày, đặt giờ phút cho trước (mặc định giữ giờ hiện tại). */
export function mocVN(lechNgay: number, gio?: number, phut = 0): MocThoiGian {
  const d = new Date(Date.now() + lechNgay * 86_400_000);
  const phan = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const hh = gio === undefined ? phan.hour : String(gio).padStart(2, '0');
  const mm = gio === undefined ? phan.minute : String(phut).padStart(2, '0');
  const iso = `${phan.year}-${phan.month}-${phan.day}`;
  return {
    iso,
    vn: `${phan.day}/${phan.month}/${phan.year}`,
    isoGio: `${iso}T${hh}:${mm}:00`,
    vnGio: `${phan.day}/${phan.month}/${phan.year} ${hh}:${mm}`,
    nam: Number(phan.year),
    thang: Number(phan.month),
  };
}

/**
 * Nhập ngày (dd/mm/yyyy) hoặc ngày giờ (dd/mm/yyyy HH:mm) vào ô có nhãn cho trước.
 * Ô ngày gốc của trình duyệt (date, datetime-local) nhận chuỗi ISO; ô chọn ngày dạng chữ nhận chuỗi
 * dd/mm/yyyy rồi rời ô bằng Tab. Mọi chỗ nhập ngày trong bộ kiểm thử đều đi qua hàm này.
 */
export async function nhapNgay(vung: Page | Locator, nhan: string | RegExp, chuoi: string) {
  const o = vung.getByLabel(nhan).first();
  const kieu = (await o.getAttribute('type')) ?? 'text';
  const m = chuoi.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!m && chuoi !== '') throw new Error(`Chuỗi ngày không đúng dạng dd/mm/yyyy [HH:mm]: ${chuoi}`);
  if (kieu === 'date' || kieu === 'datetime-local') {
    if (!m) {
      await o.fill('');
      return;
    }
    const ngay = `${m[3]}-${m[2]}-${m[1]}`;
    await o.fill(kieu === 'date' ? ngay : `${ngay}T${m[4] ?? '00'}:${m[5] ?? '00'}`);
  } else {
    await o.fill(chuoi);
    await o.press('Tab');
  }
}

/** Gõ vào ô chọn (combobox) rồi bấm lựa chọn có tên khớp. */
export async function chonTrongOChon(o: Locator, tuKhoa: string, luaChon: string | RegExp = tuKhoa) {
  await o.click();
  await o.fill(tuKhoa);
  const page = o.page();
  await page.getByRole('option', { name: luaChon }).first().click();
}

/** Bấm một nút trong hộp thoại (hỏi xác nhận, báo lỗi...) có tiêu đề cho trước. */
export async function bamTrongHopThoai(page: Page, tieuDe: string | RegExp, nut: string | RegExp) {
  const hop = hopThoai(page, tieuDe);
  await expect(hop).toBeVisible();
  await hop.getByRole('button', { name: nut, exact: typeof nut === 'string' }).click();
  await expect(hop).toBeHidden();
}

export function hopThoai(page: Page, tieuDe: string | RegExp): Locator {
  return page.locator('[role="dialog"], [role="alertdialog"]').filter({ has: page.getByRole('heading', { name: tieuDe }) });
}

/** Thông báo ngắn (toast) có chứa nội dung cho trước. */
export function toast(page: Page, noiDung: string | RegExp): Locator {
  return page.locator('[role="status"], [role="alert"]').filter({ hasText: noiDung }).first();
}

/* ---------------- đăng nhập ---------------- */

/** Đăng nhập bằng giao diện trang đăng nhập. */
export async function dangNhapGiaoDien(page: Page, ten: string, matKhau: string) {
  await page.goto('/dang-nhap');
  await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill(ten);
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(matKhau);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

/** Đăng nhập nhanh qua API (cookie dùng chung với trình duyệt) rồi mở trang cần thử. */
export async function dangNhap(page: Page, vaiTro: VaiTro, duongDan = '/') {
  const tk = TAI_KHOAN[vaiTro];
  const phanHoi = await page.request.post('/api/dang-nhap', { data: { tenDangNhap: tk.ten, matKhau: tk.matKhau } });
  expect(phanHoi.ok(), `đăng nhập ${tk.ten}`).toBeTruthy();
  await page.goto(duongDan);
}

/* ---------------- tạo dữ liệu thử qua API ---------------- */

export interface ChuyenBayThu {
  maChuyenBay: string;
  giaVe: number;
  maSanBayDi: string;
  maSanBayDen: string;
  ngayGioKhoiHanh: string;
  thoiGianBay: number;
  gheTheoHang: { maHangVe: string; soLuongGhe: number }[];
  trungGian: { thuTu: number; maSanBay: string; thoiGianDung: number; ghiChu?: string }[];
}

export interface HanhKhachThu {
  hoTen: string;
  loaiGiayTo: 'CCCD' | 'HoChieu';
  soGiayTo: string;
  dienThoai: string;
}

export function hanhKhachMoi(hoTen = 'Nguyễn Văn Thử'): HanhKhachThu {
  return { hoTen, loaiGiayTo: 'CCCD', soGiayTo: soCanCuocMoi(), dienThoai: '0901234567' };
}

/** Phiên gọi API bằng tài khoản Quản lý để chuẩn bị dữ liệu cho các ca kiểm thử. */
export class ApiThu {
  private constructor(private readonly yc: APIRequestContext) {}

  static async moi(vaiTro: VaiTro = 'quanLy'): Promise<ApiThu> {
    const yc = await request.newContext({ baseURL: DIA_CHI });
    const tk = TAI_KHOAN[vaiTro];
    const ph = await yc.post('/api/dang-nhap', { data: { tenDangNhap: tk.ten, matKhau: tk.matKhau } });
    if (!ph.ok()) throw new Error(`Không đăng nhập được ${tk.ten}: ${ph.status()} ${await ph.text()}`);
    return new ApiThu(yc);
  }

  async dong() {
    await this.yc.dispose();
  }

  private async goi<T>(phuongThuc: 'get' | 'post' | 'put' | 'delete', duongDan: string, data?: unknown): Promise<T> {
    const ph = await this.yc[phuongThuc](duongDan, data === undefined ? undefined : { data });
    if (!ph.ok()) throw new Error(`${phuongThuc.toUpperCase()} ${duongDan}: ${ph.status()} ${await ph.text()}`);
    const chu = await ph.text();
    return (chu ? JSON.parse(chu) : undefined) as T;
  }

  /** Thêm chuyến bay khởi hành sau lechNgay ngày (giờ Việt Nam), mặc định SGN đi HAN, 2 ghế Hạng 1 và 5 ghế Hạng 2. */
  async themChuyenBay(tuyChon: Partial<ChuyenBayThu> & { lechNgay?: number; gio?: number } = {}): Promise<ChuyenBayThu> {
    const { lechNgay = 10, gio = 8, ...con } = tuyChon;
    const cb: ChuyenBayThu = {
      maChuyenBay: maMoi('KT'),
      giaVe: 1_000_000,
      maSanBayDi: 'SGN',
      maSanBayDen: 'HAN',
      ngayGioKhoiHanh: mocVN(lechNgay, gio, 30).isoGio,
      thoiGianBay: 120,
      gheTheoHang: [
        { maHangVe: 'H1', soLuongGhe: 2 },
        { maHangVe: 'H2', soLuongGhe: 5 },
      ],
      trungGian: [],
      ...con,
    };
    await this.goi('post', '/api/chuyen-bay', cb);
    return cb;
  }

  async banVe(maChuyenBay: string, maHangVe: string, hk: HanhKhachThu = hanhKhachMoi()): Promise<{ maVe: string; giaTien: number }> {
    return this.goi('post', '/api/ve', { maChuyenBay, maHangVe, hanhKhach: hk });
  }

  async datVe(maChuyenBay: string, maHangVe: string, hk: HanhKhachThu = hanhKhachMoi()): Promise<{ maPhieuDat: string; giaTien: number }> {
    return this.goi('post', '/api/phieu-dat', { maChuyenBay, maHangVe, hanhKhach: hk });
  }

  async thamSo(): Promise<Record<string, number>> {
    const qd = await this.goi<{ thamSo: Record<string, number> }>('get', '/api/quy-dinh');
    return qd.thamSo;
  }

  async doiThamSo(ten: string, giaTriMoi: number) {
    await this.goi('put', `/api/quy-dinh/tham-so/${ten}`, { giaTriMoi });
  }

  async themTaiKhoan(tenDangNhap: string, matKhau: string, nhomQuyen: 'QuanLy' | 'NhanVien' = 'NhanVien') {
    await this.goi('post', '/api/tai-khoan', { tenDangNhap, matKhau, nhomQuyen });
  }

  async xoaSanBayNeuCo(ma: string) {
    await this.yc.delete(`/api/san-bay/${ma}`);
  }

  async xoaHangVeNeuCo(ma: string) {
    await this.yc.delete(`/api/hang-ve/${ma}`);
  }
}
