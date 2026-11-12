// Báo cáo doanh thu: trang giữ chỗ, sẽ được thay bằng trang hoàn chỉnh
import { IconBieuDoXu } from '@/icons3d';
import { TrangGiuCho } from '@/thanh_phan/TrangThongBaoLoi';

export function TrangBaoCao() {
  return (
    <TrangGiuCho
      tieuDe="Báo cáo doanh thu"
      icon={<IconBieuDoXu kichThuoc={56} />}
      moTa="Lập báo cáo doanh thu theo tháng (BM5.1) và theo năm (BM5.2)"
      linhVat="thanh_cong"
      noiDungSe={['Báo cáo tháng và báo cáo năm', 'Cột tỉ lệ có thanh ngang', 'Xuất Excel hoặc PDF']}
    />
  );
}
