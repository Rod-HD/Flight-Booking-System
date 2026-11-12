// Bán vé: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconVeSao } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangBanVe() {
  return (
    <TrangGiuCho
      tieuDe="Bán vé"
      icon={<IconVeSao kichThuoc={56} />}
      moTa="Lập vé chuyến bay theo biểu mẫu BM2"
      linhVat="ban_ve"
      noiDungSe={['Bán trực tiếp hoặc bán từ phiếu đặt chỗ', 'Chọn chuyến bay có gõ để lọc, ghế trống theo hạng', 'Giá tiền tự tính theo tỉ lệ đơn giá']}
    />
  );
}
