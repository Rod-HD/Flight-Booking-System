// Đặt vé: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconLichDongHo } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangDatVe() {
  return (
    <TrangGiuCho
      tieuDe="Đặt vé"
      icon={<IconLichDongHo kichThuoc={56} />}
      moTa="Lập phiếu đặt chỗ theo biểu mẫu BM3"
      linhVat="cho"
      noiDungSe={['Chọn chuyến bay và hạng vé, nhập thông tin hành khách', 'Hiện hạn thanh toán dự kiến', 'Kiểm tra thời hạn đặt vé theo quy định']}
    />
  );
}
