// Phím tắt: một bộ lắng nghe duy nhất trên window, các trang đăng ký qua hook dungPhimTat.
// Phím đăng ký sau được ưu tiên (trang đè lên phím tắt toàn cục nếu trùng).
import { useEffect, useRef } from 'react';

export type HamPhimTat = (e: KeyboardEvent) => void;

interface MucDangKy {
  id: number;
  bang: React.MutableRefObject<Record<string, HamPhimTat>>;
  /** vẫn chạy khi đang mở hộp thoại */
  keCaHopThoai: boolean;
}

const danhSach: MucDangKy[] = [];
let demId = 0;
let daGanBoNghe = false;

/** Đổi sự kiện bàn phím thành chuỗi như 'ctrl+s', 'alt+1', 'f1', 'esc' */
export function chuoiPhim(e: KeyboardEvent): string {
  const phan: string[] = [];
  if (e.ctrlKey || e.metaKey) phan.push('ctrl');
  if (e.altKey) phan.push('alt');
  if (e.shiftKey) phan.push('shift');
  let k = e.key;
  // Alt+số trên một số bàn phím trả ký tự lạ, dùng e.code cho chắc
  if (/^Digit\d$/.test(e.code)) k = e.code.slice(5);
  else if (/^Key[A-Z]$/.test(e.code)) k = e.code.slice(3);
  k = k.toLowerCase();
  if (k === 'escape') k = 'esc';
  if (['control', 'alt', 'shift', 'meta'].includes(k)) return '';
  phan.push(k);
  return phan.join('+');
}

function coHopThoaiDangMo(): boolean {
  return !!document.querySelector('[aria-modal="true"]');
}

function xuLyPhim(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing) return;
  const phim = chuoiPhim(e);
  if (!phim) return;
  const hopThoai = coHopThoaiDangMo();
  for (let i = danhSach.length - 1; i >= 0; i -= 1) {
    const muc = danhSach[i];
    if (hopThoai && !muc.keCaHopThoai) continue;
    const ham = muc.bang.current[phim];
    if (ham) {
      e.preventDefault();
      ham(e);
      return;
    }
  }
}

/**
 * Đăng ký phím tắt cho một trang, ví dụ:
 *   dungPhimTat({ 'ctrl+n': themMoi, 'ctrl+s': luu, 'ctrl+f': () => oTim.current?.focus() });
 * Ghi chú: Chrome giữ riêng Ctrl+N (cửa sổ mới) nên có thể không chặn được phím này.
 */
export function dungPhimTat(bang: Record<string, HamPhimTat>, tuyChon: { batTat?: boolean; keCaHopThoai?: boolean } = {}) {
  const { batTat = true, keCaHopThoai = false } = tuyChon;
  const ref = useRef(bang);
  ref.current = bang;
  useEffect(() => {
    if (!batTat) return;
    if (!daGanBoNghe) {
      window.addEventListener('keydown', xuLyPhim);
      daGanBoNghe = true;
    }
    demId += 1;
    const muc: MucDangKy = { id: demId, bang: ref, keCaHopThoai: keCaHopThoai };
    danhSach.push(muc);
    return () => {
      const i = danhSach.findIndex((m) => m.id === muc.id);
      if (i >= 0) danhSach.splice(i, 1);
    };
  }, [batTat, keCaHopThoai]);
}

/** Danh sách phím tắt hiển thị ở trang Trợ giúp */
export const BANG_PHIM_TAT: { phim: string[]; moTa: string; chiQuanLy?: boolean }[] = [
  { phim: ['F1'], moTa: 'Mở trang Trợ giúp' },
  { phim: ['Alt', '1'], moTa: 'Chuyến bay' },
  { phim: ['Alt', '2'], moTa: 'Bán vé' },
  { phim: ['Alt', '3'], moTa: 'Đặt vé' },
  { phim: ['Alt', '4'], moTa: 'Báo cáo doanh thu', chiQuanLy: true },
  { phim: ['Ctrl', 'N'], moTa: 'Thêm mới trên trang danh sách' },
  { phim: ['Ctrl', 'S'], moTa: 'Lưu biểu mẫu đang mở' },
  { phim: ['Ctrl', 'F'], moTa: 'Đưa con trỏ tới ô tìm kiếm' },
  { phim: ['Enter'], moTa: 'Xác nhận, đăng nhập' },
  { phim: ['Esc'], moTa: 'Đóng hộp thoại, hủy thao tác' },
];
