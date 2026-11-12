// Kho hộp thoại toàn cục: gọi hoiXacNhan, baoLoi... từ bất kỳ đâu, NoiHienHopThoai sẽ vẽ ra.
export type LoaiHopThoai = 'xoa' | 'loi' | 'thanh-cong' | 'canh-bao' | 'cho' | 'xac-nhan';

export interface CauHinhHopThoai {
  loai: LoaiHopThoai;
  tieuDe: string;
  noiDung?: React.ReactNode;
  nutDongY?: string;
  nutHuy?: string;
}

export interface HopThoaiDangMo extends CauHinhHopThoai {
  id: number;
  traLoi: (dongY: boolean) => void;
}

type NguoiNghe = (ds: HopThoaiDangMo[]) => void;

let danhSach: HopThoaiDangMo[] = [];
let demId = 0;
const nguoiNghe = new Set<NguoiNghe>();

function phat() {
  nguoiNghe.forEach((n) => n(danhSach));
}

export function ngheHopThoai(n: NguoiNghe) {
  nguoiNghe.add(n);
  n(danhSach);
  return () => {
    nguoiNghe.delete(n);
  };
}

function mo(cauHinh: CauHinhHopThoai): { id: number; ketQua: Promise<boolean> } {
  demId += 1;
  const id = demId;
  const ketQua = new Promise<boolean>((resolve) => {
    danhSach = [
      ...danhSach,
      {
        ...cauHinh,
        id,
        traLoi: (dongY) => {
          danhSach = danhSach.filter((h) => h.id !== id);
          phat();
          resolve(dongY);
        },
      },
    ];
  });
  phat();
  return { id, ketQua };
}

/**
 * Hỏi xác nhận, trả về true nếu người dùng đồng ý. Ví dụ:
 *   if (await hoiXacNhan({ tieuDe: 'Xóa chuyến bay CB101?', noiDung: '...', nutDongY: 'Xóa' })) ...
 * Mặc định là loại 'xoa' (icon thùng rác đỏ, nút đồng ý màu đỏ, nút hủy "Không").
 */
export function hoiXacNhan(c: Omit<CauHinhHopThoai, 'loai'> & { loai?: 'xoa' | 'xac-nhan' | 'canh-bao' }): Promise<boolean> {
  return mo({ nutDongY: 'Xóa', nutHuy: 'Không', ...c, loai: c.loai ?? 'xoa' }).ketQua;
}

export function baoLoi(tieuDe: string, noiDung?: React.ReactNode): Promise<boolean> {
  return mo({ loai: 'loi', tieuDe, noiDung, nutDongY: 'Đóng' }).ketQua;
}

export function baoThanhCong(tieuDe: string, noiDung?: React.ReactNode): Promise<boolean> {
  return mo({ loai: 'thanh-cong', tieuDe, noiDung, nutDongY: 'Đóng' }).ketQua;
}

export function baoCanhBao(tieuDe: string, noiDung?: React.ReactNode): Promise<boolean> {
  return mo({ loai: 'canh-bao', tieuDe, noiDung, nutDongY: 'Đã hiểu' }).ketQua;
}

/** Hiện hộp thoại chờ, trả về hàm để đóng. Ví dụ: const xong = hienCho('Đang lập báo cáo'); ... xong(); */
export function hienCho(noiDung: string): () => void {
  const { id } = mo({ loai: 'cho', tieuDe: noiDung });
  return () => danhSach.find((h) => h.id === id)?.traLoi(true);
}

/** Chạy một tác vụ kèm hộp thoại chờ */
export async function chayKemCho<T>(noiDung: string, tacVu: () => Promise<T>): Promise<T> {
  const xong = hienCho(noiDung);
  try {
    return await tacVu();
  } finally {
    xong();
  }
}
