// Thay đổi quy định: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconBanhRangDanhSach } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangQuyDinh() {
  return (
    <TrangGiuCho
      tieuDe="Thay đổi quy định"
      icon={<IconBanhRangDanhSach kichThuoc={56} />}
      moTa="Tham số thời gian, danh sách sân bay và hạng vé"
      linhVat="cho"
      noiDungSe={['Sáu tham số của quy định 1 và quy định 3', 'Thêm, sửa, xóa sân bay', 'Thêm, sửa, xóa hạng vé']}
    />
  );
}
