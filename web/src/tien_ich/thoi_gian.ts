// Xử lý ngày giờ theo quy ước của API: chuỗi ISO giờ địa phương, không kèm múi giờ.

const hai = (n: number) => String(n).padStart(2, '0');

/** Date sang '2026-11-12T14:30:00' */
export function sangIso(d: Date): string {
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}T${hai(d.getHours())}:${hai(d.getMinutes())}:${hai(d.getSeconds())}`;
}

/** Date sang '2026-11-12' (giá trị của input type=date) */
export function sangNgayIso(d: Date): string {
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;
}

/** Đọc chuỗi ISO giờ địa phương; chuỗi chỉ có ngày được hiểu là 00:00 */
export function docIso(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (!m) return new Date(NaN);
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
}

export function dauNgay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function congPhut(d: Date, phut: number): Date {
  return new Date(d.getTime() + phut * 60000);
}

export function congNgay(d: Date, ngay: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + ngay);
  return x;
}

/** Số ngày lịch giữa hai thời điểm (bỏ phần giờ) */
export function soNgayGiua(tu: Date, den: Date): number {
  return Math.round((dauNgay(den).getTime() - dauNgay(tu).getTime()) / 86400000);
}

/** '14:30' */
export function dinhDangGio(s: string | Date): string {
  const d = typeof s === 'string' ? docIso(s) : s;
  return `${hai(d.getHours())}:${hai(d.getMinutes())}`;
}

/** '12/11/2026' */
export function dinhDangNgay(s: string | Date): string {
  const d = typeof s === 'string' ? docIso(s) : s;
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** '14:30 12/11/2026' */
export function dinhDangNgayGio(s: string | Date): string {
  return `${dinhDangGio(s)} ${dinhDangNgay(s)}`;
}

/** Thời lượng phút sang chữ: '1 giờ 25 phút', '45 phút' */
export function dinhDangThoiLuong(phut: number): string {
  if (phut < 60) return `${phut} phút`;
  const g = Math.floor(phut / 60);
  const p = phut % 60;
  return p ? `${g} giờ ${p} phút` : `${g} giờ`;
}

/** Thời gian còn lại tới một mốc, dạng 'còn 1 giờ 20 phút' hoặc 'đã quá hạn' */
export function conLai(moc: string | Date, bayGio = new Date()): { chu: string; phut: number } {
  const d = typeof moc === 'string' ? docIso(moc) : moc;
  const phut = Math.floor((d.getTime() - bayGio.getTime()) / 60000);
  if (phut < 0) return { chu: 'đã quá hạn', phut };
  if (phut < 60) return { chu: `còn ${phut} phút`, phut };
  if (phut < 24 * 60) {
    const g = Math.floor(phut / 60);
    const p = phut % 60;
    return { chu: p ? `còn ${g} giờ ${p} phút` : `còn ${g} giờ`, phut };
  }
  return { chu: `còn ${Math.floor(phut / 1440)} ngày`, phut };
}

/** Lời chào theo buổi trong ngày */
export function loiChaoTheoBuoi(d = new Date()): string {
  const h = d.getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 13) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}
