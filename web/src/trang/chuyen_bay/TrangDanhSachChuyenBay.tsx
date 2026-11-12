// Danh sách chuyến bay: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconMayBay } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangDanhSachChuyenBay() {
  return (
    <TrangGiuCho
      tieuDe="Danh sách chuyến bay"
      icon={<IconMayBay kichThuoc={56} />}
      moTa="Tra cứu lịch chuyến bay theo biểu mẫu BM4"
      linhVat="tra_cuu"
      noiDungSe={['Tra cứu theo sân bay đi, sân bay đến, khoảng ngày và mã chuyến bay', 'Nút Bán vé, Đặt vé trên từng dòng', 'Thêm, sửa, xóa, nhập và xuất Excel (Quản lý)']}
    />
  );
}
