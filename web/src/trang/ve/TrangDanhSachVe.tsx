// Danh sách vé: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconChongVe } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangDanhSachVe() {
  return (
    <TrangGiuCho
      tieuDe="Danh sách vé"
      icon={<IconChongVe kichThuoc={56} />}
      moTa="Tra cứu, sửa thông tin hành khách và hủy vé"
      linhVat="tra_cuu"
      duongDan={[{ nhan: 'Bán vé', den: '/ban-ve' }, { nhan: 'Danh sách vé' }]}
      noiDungSe={['Tra cứu theo mã vé, giấy tờ, chuyến bay và ngày bán', 'Sửa thông tin hành khách', 'Hủy vé khi chuyến bay chưa khởi hành']}
    />
  );
}
