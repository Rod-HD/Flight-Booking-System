// Phân quyền: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconKhienChia } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangTaiKhoan() {
  return (
    <TrangGiuCho
      tieuDe="Phân quyền"
      icon={<IconKhienChia kichThuoc={56} />}
      moTa="Tài khoản người dùng và nhóm quyền"
      linhVat="cho"
      noiDungSe={['Thêm tài khoản, chọn nhóm quyền', 'Sửa nhóm quyền, đặt lại mật khẩu', 'Khóa và mở khóa tài khoản']}
    />
  );
}
