// Bán vé (MH_BanVe, BM2): bán trực tiếp hoặc bán từ phiếu đặt chỗ; ?suaVe= mở chế độ sửa thông tin hành khách
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, List, Ticket } from 'lucide-react';
import { apiVe, khoaTruyVan } from '@/api/dich_vu';
import { IconVeSao } from '@/icons3d';
import { hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { KhungTrang } from '@/thanh_phan/KhungTrang';
import { Nut } from '@/thanh_phan/Nut';
import { CongTac } from '@/thanh_phan/TabTruot';
import { TrangThaiRong } from '@/thanh_phan/TrangThaiRong';
import { BieuMauVe, type BanGhiSua } from '../_chung_ve/BieuMauVe';
import { KhungCho } from '../_chung_ve/KhungCho';
import { BanTuPhieu } from './BanTuPhieu';
import s from './TrangBanVe.module.css';

type CheDo = 'trucTiep' | 'tuPhieu';

export function TrangBanVe() {
  const [thamSo, datThamSo] = useSearchParams();
  const maSua = thamSo.get('suaVe');
  const maPhieu = thamSo.get('maPhieuDat');
  const cheDo: CheDo = maPhieu || thamSo.get('cheDo') === 'tuPhieu' ? 'tuPhieu' : 'trucTiep';
  const [nhapDo, datNhapDo] = useState(false);
  const doiNhapDo = useCallback((x: boolean) => datNhapDo(x), []);

  const doiCheDo = async (k: CheDo) => {
    if (k === cheDo) return;
    if (k === 'tuPhieu' && nhapDo) {
      const dongY = await hoiXacNhan({
        tieuDe: 'Chuyển sang bán từ phiếu đặt chỗ?',
        noiDung: 'Thông tin vé đang nhập dở sẽ không được lưu.',
        nutDongY: 'Chuyển',
        nutHuy: 'Ở lại',
      });
      if (!dongY) return;
    }
    datNhapDo(false);
    datThamSo(k === 'tuPhieu' ? { cheDo: 'tuPhieu' } : {}, { replace: true });
  };

  const truyVan = useQuery({
    queryKey: khoaTruyVan.ve({ maVe: maSua ?? '' }),
    queryFn: () => apiVe.danhSach({ maVe: maSua ?? '' }),
    enabled: !!maSua,
  });

  const nutDanhSach = (
    <Nut bienThe="phu" muiTen={false} iconTrai={<List size={18} />} den="/ve">
      Danh sách vé
    </Nut>
  );

  if (maSua) {
    const ve = truyVan.data?.find((v) => v.maVe === maSua);
    const banGhi: BanGhiSua | undefined = ve && {
      ma: ve.maVe,
      maChuyenBay: ve.maChuyenBay,
      tenHangVe: ve.tenHangVe,
      giaTien: ve.giaTien,
      hanhKhach: { hoTen: ve.hoTen, loaiGiayTo: ve.loaiGiayTo, soGiayTo: ve.soGiayTo, dienThoai: ve.dienThoai },
    };
    return (
      <KhungTrang
        tieuDe="Sửa vé"
        icon={<IconVeSao kichThuoc={56} />}
        moTa={`Cập nhật thông tin hành khách của vé ${maSua}`}
        duongDan={[{ nhan: 'Danh sách vé', den: '/ve' }, { nhan: `Sửa vé ${maSua}` }]}
        nut={nutDanhSach}
      >
        {truyVan.isPending ? (
          <KhungCho />
        ) : !ve || ve.tinhTrang !== 'DaBan' ? (
          <TrangThaiRong
            linhVat="tra_cuu"
            kichThuocHinh={140}
            tieuDe={ve ? `Vé ${maSua} đã bị hủy, không thể sửa` : `Không tìm thấy vé ${maSua}`}
            goiY="Chỉ sửa được vé đang ở tình trạng Đã bán."
            hanhDong={<Nut den="/ve">Về danh sách vé</Nut>}
          />
        ) : (
          <BieuMauVe key={ve.maVe} mucDich="banVe" banGhiSua={banGhi} veDanhSach="/ve" />
        )}
      </KhungTrang>
    );
  }

  return (
    <KhungTrang
      tieuDe="Bán vé"
      icon={<IconVeSao kichThuoc={56} />}
      moTa="Lập vé chuyến bay theo biểu mẫu BM2: bán trực tiếp hoặc bán từ phiếu đặt chỗ"
      duongDan={[{ nhan: 'Danh sách vé', den: '/ve' }, { nhan: 'Bán vé' }]}
      nut={nutDanhSach}
    >
      <div className={s.congTac}>
        <CongTac<CheDo>
          nhan="Cách bán vé"
          trai={{ khoa: 'trucTiep', nhan: 'Bán trực tiếp', icon: <Ticket size={18} /> }}
          phai={{ khoa: 'tuPhieu', nhan: 'Bán từ phiếu đặt chỗ', icon: <ClipboardList size={18} /> }}
          giaTri={cheDo}
          onDoi={doiCheDo}
        />
        <p className={s.congTacGoiY}>
          {cheDo === 'trucTiep'
            ? 'Hành khách mua và thanh toán ngay: chọn chuyến bay, nhập thông tin hành khách và hạng vé.'
            : 'Hành khách đến thanh toán cho phiếu đã đặt: tìm phiếu còn hạn rồi lập vé từ phiếu.'}
        </p>
      </div>

      <div key={cheDo} className={s.vungCheDo}>
        {cheDo === 'trucTiep' ? (
          <BieuMauVe
            key={thamSo.get('maChuyenBay') ?? 'moi'}
            mucDich="banVe"
            maChuyenBayBanDau={thamSo.get('maChuyenBay')}
            loc={{
              sanBayDi: thamSo.get('sanBayDi') ?? undefined,
              sanBayDen: thamSo.get('sanBayDen') ?? undefined,
              ngay: thamSo.get('ngay') ?? undefined,
            }}
            onBoLoc={() => datThamSo({}, { replace: true })}
            veDanhSach="/ve"
            onDoiNhapDo={doiNhapDo}
          />
        ) : (
          <BanTuPhieu key={maPhieu ?? 'tim'} maPhieuBanDau={maPhieu} onChuyenTrucTiep={() => doiCheDo('trucTiep')} batPhimTat />
        )}
      </div>
    </KhungTrang>
  );
}
