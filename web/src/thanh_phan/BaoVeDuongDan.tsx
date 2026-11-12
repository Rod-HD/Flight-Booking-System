// Bảo vệ đường dẫn: chưa đăng nhập thì về /dang-nhap, sai nhóm quyền thì báo không có quyền
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { NhomQuyen } from '@/kieu/api';
import { dungPhien } from '@/phien/NguCanhPhien';
import { ManHinhCho } from './BoCuc';
import { TrangKhongDuQuyen } from './TrangThongBaoLoi';

export function YeuCauDangNhap() {
  const { nguoiDung, dangTai } = dungPhien();
  const viTri = useLocation();
  if (dangTai) return <ManHinhCho />;
  if (!nguoiDung) return <Navigate to="/dang-nhap" replace state={{ tu: viTri.pathname + viTri.search }} />;
  return <Outlet />;
}

/** Bọc các trang chỉ dành cho một số nhóm quyền */
export function YeuCauQuyen({ quyen, children }: { quyen: NhomQuyen[]; children?: React.ReactNode }) {
  const { coQuyen } = dungPhien();
  if (!coQuyen(quyen)) return <TrangKhongDuQuyen />;
  return <>{children ?? <Outlet />}</>;
}

/** Chỉ hiện nội dung (ví dụ nút) khi người dùng có quyền */
export function ChiKhiCoQuyen({ quyen, children }: { quyen: NhomQuyen[]; children: React.ReactNode }) {
  const { coQuyen } = dungPhien();
  return coQuyen(quyen) ? <>{children}</> : null;
}
