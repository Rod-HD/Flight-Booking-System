// Hàm gọi máy chủ dùng chung: ghép tham số, đọc JSON, chuẩn hóa lỗi về dạng {ma, thongBao, chiTiet}.
// Khi bật VITE_GIA_LAP=1 thì mọi yêu cầu được chuyển sang bộ giả lập trong bộ nhớ.
import type { LoiTraVe, TapTinTai } from '@/kieu/api';

export const CHE_DO_GIA_LAP = import.meta.env.VITE_GIA_LAP === '1';

export class LoiApi extends Error implements LoiTraVe {
  trangThai: number;
  ma: string;
  thongBao: string;
  chiTiet?: Record<string, string>;

  constructor(trangThai: number, loi: LoiTraVe) {
    super(loi.thongBao);
    this.name = 'LoiApi';
    this.trangThai = trangThai;
    this.ma = loi.ma;
    this.thongBao = loi.thongBao;
    this.chiTiet = loi.chiTiet;
  }
}

export function laLoiApi(x: unknown): x is LoiApi {
  return x instanceof LoiApi;
}

/** Lấy câu thông báo hiển thị được từ một lỗi bất kỳ */
export function thongBaoLoi(x: unknown): string {
  if (laLoiApi(x)) return x.thongBao;
  if (x instanceof Error) return x.message;
  return 'Đã có lỗi xảy ra, vui lòng thử lại.';
}

export type PhuongThuc = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type GiaTriThamSo = string | number | boolean | null | undefined;
export type ThamSo = Record<string, GiaTriThamSo>;

export interface TuyChonGoi {
  thamSo?: ThamSo;
  than?: unknown;
  /** json (mặc định), tap-tin khi tải Excel/PDF */
  kieuTraVe?: 'json' | 'tap-tin';
}

/** Kết quả thô mà máy chủ thật hoặc bộ giả lập trả về */
export interface PhanHoiTho {
  trangThai: number;
  duLieu?: unknown;
  tapTin?: TapTinTai;
}

type BoXuLyGiaLap = (phuongThuc: PhuongThuc, duongDan: string, thamSo: ThamSo, than: unknown) => Promise<PhanHoiTho>;

let boGiaLap: BoXuLyGiaLap | null = null;
let khiHetPhien: (() => void) | null = null;

/** Bộ giả lập được nạp lười để không lẫn vào bản build thật */
async function layBoGiaLap(): Promise<BoXuLyGiaLap> {
  if (!boGiaLap) {
    const m = await import('./gia_lap/may_chu_gia');
    boGiaLap = m.xuLyYeuCau;
  }
  return boGiaLap;
}

/** Đăng ký hàm gọi lại khi máy chủ trả 401 (hết phiên) */
export function dangKyKhiHetPhien(ham: () => void) {
  khiHetPhien = ham;
}

export function ghepThamSo(thamSo?: ThamSo): string {
  if (!thamSo) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(thamSo)) {
    if (v === undefined || v === null || v === '') continue;
    p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

function layTenTapTin(tieuDe: string | null, macDinh: string): string {
  if (!tieuDe) return macDinh;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(tieuDe);
  if (utf) return decodeURIComponent(utf[1]);
  const thuong = /filename="?([^";]+)"?/i.exec(tieuDe);
  return thuong ? thuong[1] : macDinh;
}

async function goiMayChuThat(phuongThuc: PhuongThuc, duongDan: string, tuyChon: TuyChonGoi): Promise<PhanHoiTho> {
  const url = duongDan + ghepThamSo(tuyChon.thamSo);
  const coTapTin = tuyChon.than instanceof FormData;
  let phanHoi: Response;
  try {
    phanHoi = await fetch(url, {
      method: phuongThuc,
      credentials: 'include',
      headers: tuyChon.than !== undefined && !coTapTin ? { 'Content-Type': 'application/json' } : undefined,
      body:
        tuyChon.than === undefined ? undefined : coTapTin ? (tuyChon.than as FormData) : JSON.stringify(tuyChon.than),
    });
  } catch {
    throw new LoiApi(0, {
      ma: 'LOI_KET_NOI',
      thongBao: 'Không kết nối được máy chủ. Vui lòng kiểm tra máy chủ đã chạy chưa.',
    });
  }

  if (phanHoi.ok && tuyChon.kieuTraVe === 'tap-tin') {
    const duLieu = await phanHoi.blob();
    const ten = layTenTapTin(phanHoi.headers.get('Content-Disposition'), duongDan.split('/').pop() || 'tap_tin');
    return { trangThai: phanHoi.status, tapTin: { tenTapTin: ten, duLieu } };
  }

  const chu = await phanHoi.text();
  let duLieu: unknown = undefined;
  if (chu) {
    try {
      duLieu = JSON.parse(chu);
    } catch {
      duLieu = undefined;
    }
  }
  return { trangThai: phanHoi.status, duLieu };
}

function chuanHoaLoi(trangThai: number, duLieu: unknown): LoiApi {
  const d = duLieu as Partial<LoiTraVe> | undefined;
  if (d && typeof d.ma === 'string' && typeof d.thongBao === 'string') {
    return new LoiApi(trangThai, { ma: d.ma, thongBao: d.thongBao, chiTiet: d.chiTiet });
  }
  const macDinh: Record<number, LoiTraVe> = {
    400: { ma: 'DU_LIEU_KHONG_HOP_LE', thongBao: 'Dữ liệu chưa hợp lệ.' },
    401: { ma: 'CHUA_DANG_NHAP', thongBao: 'Phiên làm việc đã hết, vui lòng đăng nhập lại.' },
    403: { ma: 'KHONG_DU_QUYEN', thongBao: 'Bạn không có quyền thực hiện thao tác này.' },
    404: { ma: 'KHONG_TIM_THAY', thongBao: 'Không tìm thấy dữ liệu yêu cầu.' },
    409: { ma: 'VI_PHAM_QUY_DINH', thongBao: 'Thao tác vi phạm quy định nghiệp vụ.' },
  };
  return new LoiApi(trangThai, macDinh[trangThai] ?? { ma: 'LOI_MAY_CHU', thongBao: 'Máy chủ gặp lỗi, vui lòng thử lại sau.' });
}

async function goi(phuongThuc: PhuongThuc, duongDan: string, tuyChon: TuyChonGoi = {}): Promise<PhanHoiTho> {
  const kq = CHE_DO_GIA_LAP
    ? await (await layBoGiaLap())(phuongThuc, duongDan, tuyChon.thamSo ?? {}, tuyChon.than)
    : await goiMayChuThat(phuongThuc, duongDan, tuyChon);

  if (kq.trangThai >= 400) {
    const loi = chuanHoaLoi(kq.trangThai, kq.duLieu);
    // 401 ở đường dẫn khác /api/phien và /api/dang-nhap nghĩa là phiên vừa hết hạn
    if (kq.trangThai === 401 && duongDan !== '/api/phien' && duongDan !== '/api/dang-nhap') khiHetPhien?.();
    throw loi;
  }
  return kq;
}

/** Gọi đường dẫn trả JSON (hoặc rỗng với 201/204) */
export async function goiApi<T>(phuongThuc: PhuongThuc, duongDan: string, tuyChon: TuyChonGoi = {}): Promise<T> {
  const kq = await goi(phuongThuc, duongDan, { ...tuyChon, kieuTraVe: 'json' });
  return kq.duLieu as T;
}

/** Gọi đường dẫn trả tập tin */
export async function goiTaiTapTin(duongDan: string, thamSo?: ThamSo): Promise<TapTinTai> {
  const kq = await goi('GET', duongDan, { thamSo, kieuTraVe: 'tap-tin' });
  if (!kq.tapTin) throw new LoiApi(500, { ma: 'LOI_MAY_CHU', thongBao: 'Máy chủ không trả về tập tin.' });
  return kq.tapTin;
}

/** Lưu tập tin vừa tải về máy người dùng */
export function luuTapTin(tapTin: TapTinTai) {
  const url = URL.createObjectURL(tapTin.duLieu);
  const a = document.createElement('a');
  a.href = url;
  a.download = tapTin.tenTapTin;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
