// Lịch chuyến bay: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconMayBay } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangThemSuaChuyenBay() {
  return (
    <TrangGiuCho
      tieuDe="Lịch chuyến bay"
      icon={<IconMayBay kichThuoc={56} />}
      moTa="Nhận lịch chuyến bay theo biểu mẫu BM1"
      linhVat="cho"
      duongDan={[{ nhan: 'Chuyến bay', den: '/chuyen-bay' }, { nhan: 'Lịch chuyến bay' }]}
      noiDungSe={['Mã chuyến bay, giá vé, sân bay đi và đến, ngày giờ, thời gian bay', 'Số ghế theo hạng vé', 'Tối đa các sân bay trung gian theo quy định']}
    />
  );
}
