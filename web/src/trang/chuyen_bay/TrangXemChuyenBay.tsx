// Chi tiết chuyến bay: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconMayBay } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangXemChuyenBay() {
  return (
    <TrangGiuCho
      tieuDe="Chi tiết chuyến bay"
      icon={<IconMayBay kichThuoc={56} />}
      moTa="Xem thông tin chuyến bay, ghế theo hạng và sân bay trung gian"
      linhVat="tra_cuu"
      duongDan={[{ nhan: 'Chuyến bay', den: '/chuyen-bay' }, { nhan: 'Chi tiết chuyến bay' }]}
      noiDungSe={['Thông tin chung của chuyến bay', 'Số ghế trống, đã bán và đặt theo hạng vé', 'Danh sách sân bay trung gian']}
    />
  );
}
