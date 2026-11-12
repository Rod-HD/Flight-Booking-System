// Danh sách phiếu đặt chỗ: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconBiaKepDongHo } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangDanhSachPhieuDat() {
  return (
    <TrangGiuCho
      tieuDe="Danh sách phiếu đặt chỗ"
      icon={<IconBiaKepDongHo kichThuoc={56} />}
      moTa="Tra cứu, sửa và hủy phiếu đặt chỗ"
      linhVat="tra_cuu"
      duongDan={[{ nhan: 'Đặt vé', den: '/dat-ve' }, { nhan: 'Danh sách phiếu đặt chỗ' }]}
      noiDungSe={['Tra cứu theo mã phiếu, giấy tờ, chuyến bay và tình trạng', 'Sửa thông tin hành khách, hủy phiếu', 'Xóa phiếu đã hủy trước một mốc thời gian (Quản lý)']}
    />
  );
}
