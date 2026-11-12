// Thêm, sửa chuyến bay (MH_ThemSuaChuyenBay): /chuyen-bay/them và /chuyen-bay/:ma/sua, chỉ Quản lý
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiChuyenBay, apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { IconMayBay } from '@/icons3d';
import { KhungTrang } from '@/thanh_phan/KhungTrang';
import { BieuMauChuyenBay } from './BieuMauChuyenBay';
import { KhungChoChuyenBay, KhongTimThayChuyenBay } from './KhungChoChuyenBay';

export function TrangThemSuaChuyenBay() {
  const { ma } = useParams();
  const laSua = !!ma;
  const quyDinh = useQuery({ queryKey: khoaTruyVan.quyDinh, queryFn: apiQuyDinh.lay });
  const chiTiet = useQuery({
    queryKey: khoaTruyVan.chuyenBayChiTiet(ma ?? ''),
    queryFn: () => apiChuyenBay.chiTiet(ma!),
    enabled: laSua,
    // luôn lấy số ghế đã bán, đã đặt mới nhất trước khi sửa
    staleTime: 0,
  });

  const dangTai = quyDinh.isPending || (laSua && chiTiet.isPending);
  const loi = quyDinh.error ?? (laSua ? chiTiet.error : null);

  return (
    <KhungTrang
      tieuDe={laSua ? `Sửa chuyến bay ${ma}` : 'Thêm chuyến bay'}
      icon={<IconMayBay kichThuoc={56} />}
      moTa="Lịch chuyến bay theo biểu mẫu BM1, kiểm tra quy định 1 ngay khi nhập"
      duongDan={
        laSua
          ? [{ nhan: 'Chuyến bay', den: '/chuyen-bay' }, { nhan: ma!, den: `/chuyen-bay/${ma}` }, { nhan: 'Sửa' }]
          : [{ nhan: 'Chuyến bay', den: '/chuyen-bay' }, { nhan: 'Thêm chuyến bay' }]
      }
    >
      {dangTai ? (
        <KhungChoChuyenBay />
      ) : loi || !quyDinh.data ? (
        <KhongTimThayChuyenBay loi={loi} ma={ma} />
      ) : (
        <BieuMauChuyenBay
          // đổi chuyến bay khác thì dựng lại biểu mẫu từ đầu
          key={ma ?? 'them'}
          cheDo={laSua ? 'sua' : 'them'}
          quyDinh={quyDinh.data}
          chiTiet={chiTiet.data}
        />
      )}
    </KhungTrang>
  );
}
