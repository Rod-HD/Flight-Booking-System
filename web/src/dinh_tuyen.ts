// Một nơi khai báo các mục menu và quyền truy cập, header và bảo vệ đường dẫn cùng đọc từ đây.
import type { NhomQuyen } from '@/kieu/api';

export const CHI_QUAN_LY: NhomQuyen[] = ['QuanLy'];
export const MOI_NHOM: NhomQuyen[] = ['QuanLy', 'NhanVien'];

export interface MucMenu {
  den: string;
  ten: string;
  quyen: NhomQuyen[];
  /** các đường dẫn con cũng làm sáng mục này */
  khop: string[];
  phimTat?: string;
}

export const MENU: MucMenu[] = [
  { den: '/', ten: 'Trang chính', quyen: MOI_NHOM, khop: [] },
  { den: '/chuyen-bay', ten: 'Chuyến bay', quyen: MOI_NHOM, khop: ['/chuyen-bay'], phimTat: 'Alt+1' },
  { den: '/ban-ve', ten: 'Bán vé', quyen: MOI_NHOM, khop: ['/ban-ve', '/ve'], phimTat: 'Alt+2' },
  { den: '/dat-ve', ten: 'Đặt vé', quyen: MOI_NHOM, khop: ['/dat-ve', '/phieu-dat'], phimTat: 'Alt+3' },
  { den: '/bao-cao', ten: 'Báo cáo', quyen: CHI_QUAN_LY, khop: ['/bao-cao'], phimTat: 'Alt+4' },
  { den: '/quy-dinh', ten: 'Quy định', quyen: CHI_QUAN_LY, khop: ['/quy-dinh'] },
  { den: '/tai-khoan', ten: 'Tài khoản', quyen: CHI_QUAN_LY, khop: ['/tai-khoan'] },
];

export function mucDangO(duongDan: string, muc: MucMenu): boolean {
  if (muc.den === '/') return duongDan === '/';
  return muc.khop.some((k) => duongDan === k || duongDan.startsWith(k + '/'));
}
