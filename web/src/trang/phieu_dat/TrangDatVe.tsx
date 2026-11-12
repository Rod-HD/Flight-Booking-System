// Đặt vé (MH_DatVe, BM3): lập phiếu đặt chỗ, hoặc sửa thông tin hành khách của phiếu (?suaPhieu=)
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { List } from 'lucide-react';
import { apiPhieuDat, khoaTruyVan } from '@/api/dich_vu';
import { IconLichDongHo } from '@/icons3d';
import { KhungTrang } from '@/thanh_phan/KhungTrang';
import { Nut } from '@/thanh_phan/Nut';
import { TrangThaiRong } from '@/thanh_phan/TrangThaiRong';
import { BieuMauVe, type BanGhiSua } from '../_chung_ve/BieuMauVe';
import { KhungCho } from '../_chung_ve/KhungCho';

export function TrangDatVe() {
  const [thamSo, datThamSo] = useSearchParams();
  const maSua = thamSo.get('suaPhieu');
  const loc = {
    sanBayDi: thamSo.get('sanBayDi') ?? undefined,
    sanBayDen: thamSo.get('sanBayDen') ?? undefined,
    ngay: thamSo.get('ngay') ?? undefined,
  };

  const truyVan = useQuery({
    queryKey: khoaTruyVan.phieuDat({ maPhieuDat: maSua ?? '' }),
    queryFn: () => apiPhieuDat.danhSach({ maPhieuDat: maSua ?? '' }),
    enabled: !!maSua,
  });
  const phieu = truyVan.data?.find((p) => p.maPhieuDat === maSua);
  const banGhi: BanGhiSua | undefined = phieu && {
    ma: phieu.maPhieuDat,
    maChuyenBay: phieu.maChuyenBay,
    tenHangVe: phieu.tenHangVe,
    giaTien: phieu.giaTien,
    hanThanhToan: phieu.hanThanhToan,
    hanhKhach: { hoTen: phieu.hoTen, loaiGiayTo: phieu.loaiGiayTo, soGiayTo: phieu.soGiayTo, dienThoai: phieu.dienThoai },
  };

  const nutDanhSach = (
    <Nut bienThe="phu" muiTen={false} iconTrai={<List size={18} />} den="/phieu-dat">
      Danh sách phiếu đặt chỗ
    </Nut>
  );

  if (maSua) {
    return (
      <KhungTrang
        tieuDe="Sửa phiếu đặt chỗ"
        icon={<IconLichDongHo kichThuoc={56} />}
        moTa={`Cập nhật thông tin hành khách của phiếu ${maSua}`}
        duongDan={[{ nhan: 'Danh sách phiếu đặt chỗ', den: '/phieu-dat' }, { nhan: `Sửa phiếu ${maSua}` }]}
        nut={nutDanhSach}
      >
        {truyVan.isPending ? (
          <KhungCho />
        ) : !phieu || phieu.tinhTrang !== 'ChoThanhToan' ? (
          <TrangThaiRong
            linhVat="tra_cuu"
            kichThuocHinh={140}
            tieuDe={phieu ? `Phiếu ${maSua} đã bị hủy, không thể sửa` : `Không tìm thấy phiếu đặt chỗ ${maSua}`}
            goiY="Chỉ sửa được phiếu đang Chờ thanh toán. Phiếu có thể vừa được chuyển thành vé hoặc bị hủy tự động khi quá hạn."
            hanhDong={<Nut den="/phieu-dat">Về danh sách phiếu đặt chỗ</Nut>}
          />
        ) : (
          <BieuMauVe key={phieu.maPhieuDat} mucDich="datVe" banGhiSua={banGhi} veDanhSach="/phieu-dat" />
        )}
      </KhungTrang>
    );
  }

  return (
    <KhungTrang
      tieuDe="Đặt vé"
      icon={<IconLichDongHo kichThuoc={56} />}
      moTa="Lập phiếu đặt chỗ theo biểu mẫu BM3, giữ chỗ cho hành khách đến hạn thanh toán"
      duongDan={[{ nhan: 'Danh sách phiếu đặt chỗ', den: '/phieu-dat' }, { nhan: 'Đặt vé' }]}
      nut={nutDanhSach}
    >
      <BieuMauVe
        key={thamSo.get('maChuyenBay') ?? 'moi'}
        mucDich="datVe"
        maChuyenBayBanDau={thamSo.get('maChuyenBay')}
        loc={loc}
        onBoLoc={() => datThamSo({}, { replace: true })}
        veDanhSach="/phieu-dat"
      />
    </KhungTrang>
  );
}
