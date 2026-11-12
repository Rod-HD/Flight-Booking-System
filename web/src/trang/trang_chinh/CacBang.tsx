// Hai bảng ở trang chính: chuyến bay sắp khởi hành và phiếu đặt chỗ sắp hết hạn
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { apiChuyenBay, apiPhieuDat, khoaTruyVan } from '@/api/dich_vu';
import type { ChuyenBayTomTat, PhieuDat } from '@/kieu/api';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { NhanGheTrong, NhanTinhTrangPhieu } from '@/thanh_phan/NhanTrangThai';
import { Nut } from '@/thanh_phan/Nut';
import { dinhDangSo, dinhDangTien, tenLoaiGiayTo } from '@/tien_ich/dinh_dang';
import { dungBayGio } from '@/tien_ich/hook';
import { conLai, dinhDangGio, dinhDangNgay, dinhDangThoiLuong } from '@/tien_ich/thoi_gian';
import s from './TrangChinh.module.css';

function XemTatCa({ den, chu }: { den: string; chu: string }) {
  return (
    <Link to={den} className={s.lienKet}>
      {chu} <ArrowRight size={17} strokeWidth={2.4} />
    </Link>
  );
}

export function BangSapKhoiHanh() {
  const dieuHuong = useNavigate();
  const bayGio = dungBayGio(30000);
  const [chon, datChon] = useState<string | null>(null);
  const { data, isPending, error } = useQuery({
    queryKey: khoaTruyVan.chuyenBaySapKhoiHanh(5),
    queryFn: () => apiChuyenBay.sapKhoiHanh(5),
    refetchInterval: 60000,
  });

  return (
    <section aria-labelledby="tieu-de-sap-khoi-hanh">
      <TieuDeMuc
        id="tieu-de-sap-khoi-hanh"
        tieuDe="Chuyến bay sắp khởi hành"
        phu="Năm chuyến bay gần nhất tính từ bây giờ. Nhấp đúp một dòng để xem chi tiết."
        phai={<XemTatCa den="/chuyen-bay" chu="Xem tất cả chuyến bay" />}
      />
      <BangDuLieu<ChuyenBayTomTat>
        nhan="Chuyến bay sắp khởi hành"
        duLieu={data}
        dangTai={isPending}
        loi={error}
        khoaDong={(d) => d.maChuyenBay}
        dongDangChon={chon}
        onChonDong={(d) => datChon(d.maChuyenBay)}
        onMoDong={(d) => dieuHuong(`/chuyen-bay/${d.maChuyenBay}`)}
        rong={{ tieuDe: 'Chưa có chuyến bay sắp khởi hành', goiY: 'Khi Quản lý nhận lịch chuyến bay mới, chuyến gần nhất sẽ hiện ở đây.', linhVat: 'ngu' }}
        cot={[
          { khoa: 'ma', tieuDe: 'Mã chuyến bay', hien: (d) => <span className={s.ma}>{d.maChuyenBay}</span> },
          {
            khoa: 'di',
            tieuDe: 'Sân bay đi',
            hien: (d) => (
              <span className={s.sanBay}>
                <b>{d.maSanBayDi}</b>
                <span>{d.tenSanBayDi}</span>
              </span>
            ),
          },
          {
            khoa: 'den',
            tieuDe: 'Sân bay đến',
            hien: (d) => (
              <span className={s.sanBay}>
                <b>{d.maSanBayDen}</b>
                <span>{d.tenSanBayDen}</span>
              </span>
            ),
          },
          {
            khoa: 'gio',
            tieuDe: 'Khởi hành',
            hien: (d) => {
              const cl = conLai(d.ngayGioKhoiHanh, bayGio);
              return (
                <span className={s.hai}>
                  <b>
                    {dinhDangGio(d.ngayGioKhoiHanh)} · {dinhDangNgay(d.ngayGioKhoiHanh)}
                  </b>
                  <small className={cl.phut < 120 ? s.sapGap : undefined}>{cl.chu}</small>
                </span>
              );
            },
          },
          { khoa: 'bay', tieuDe: 'Thời gian bay', hien: (d) => dinhDangThoiLuong(d.thoiGianBay) },
          { khoa: 'trong', tieuDe: 'Ghế trống', canh: 'giua', hien: (d) => <NhanGheTrong soGhe={d.soGheTrong} /> },
          { khoa: 'dat', tieuDe: 'Ghế đã đặt', so: true, hien: (d) => dinhDangSo(d.soGheDat) },
          {
            khoa: 'tt',
            tieuDe: 'Thao tác',
            canh: 'phai',
            hien: (d) => (
              <span className={s.hanhDong}>
                <Nut kichThuoc="nho" muiTen={false} den={`/ban-ve?maChuyenBay=${d.maChuyenBay}`} disabled={d.soGheTrong <= 0}>
                  Bán vé
                </Nut>
                <Nut kichThuoc="nho" bienThe="phu" den={`/dat-ve?maChuyenBay=${d.maChuyenBay}`} disabled={d.soGheTrong <= 0}>
                  Đặt vé
                </Nut>
              </span>
            ),
          },
        ]}
      />
    </section>
  );
}

export function BangPhieuSapHetHan() {
  const bayGio = dungBayGio(30000);
  const [chon, datChon] = useState<string | null>(null);
  const { data, isPending, error } = useQuery({
    queryKey: khoaTruyVan.phieuSapHetHan(5),
    queryFn: () => apiPhieuDat.sapHetHan(5),
    refetchInterval: 60000,
  });

  return (
    <section aria-labelledby="tieu-de-sap-het-han">
      <TieuDeMuc
        id="tieu-de-sap-het-han"
        tieuDe="Phiếu đặt chỗ sắp hết hạn"
        phu="Phiếu chờ thanh toán có hạn gần nhất. Quá hạn, hệ thống sẽ tự hủy phiếu."
        phai={<XemTatCa den="/phieu-dat" chu="Xem tất cả phiếu" />}
      />
      <BangDuLieu<PhieuDat>
        nhan="Phiếu đặt chỗ sắp hết hạn"
        duLieu={data}
        dangTai={isPending}
        loi={error}
        khoaDong={(d) => d.maPhieuDat}
        dongDangChon={chon}
        onChonDong={(d) => datChon(d.maPhieuDat)}
        rong={{ tieuDe: 'Không có phiếu nào đang chờ thanh toán', goiY: 'Mọi phiếu đặt chỗ đã được xử lý xong.', linhVat: 'thanh_cong' }}
        cot={[
          {
            khoa: 'ma',
            tieuDe: 'Mã phiếu',
            hien: (d) => (
              <span className={s.hai}>
                <span className={s.maPhieu}>{d.maPhieuDat}</span>
                <small>{d.tenHangVe}</small>
              </span>
            ),
          },
          {
            khoa: 'hk',
            tieuDe: 'Hành khách',
            hien: (d) => (
              <span className={s.hai}>
                <b>{d.hoTen}</b>
                <small>
                  {tenLoaiGiayTo[d.loaiGiayTo]} {d.soGiayTo}
                </small>
              </span>
            ),
          },
          { khoa: 'cb', tieuDe: 'Chuyến bay', hien: (d) => <span className={s.ma}>{d.maChuyenBay}</span> },
          { khoa: 'tien', tieuDe: 'Giá tiền', so: true, hien: (d) => dinhDangTien(d.giaTien) },
          {
            khoa: 'han',
            tieuDe: 'Hạn thanh toán',
            hien: (d) => {
              const cl = conLai(d.hanThanhToan, bayGio);
              return (
                <span className={s.hai}>
                  <b>
                    {dinhDangGio(d.hanThanhToan)} · {dinhDangNgay(d.hanThanhToan)}
                  </b>
                  <small className={cl.phut < 60 ? s.gap : cl.phut < 360 ? s.sapGap : undefined}>{cl.chu}</small>
                </span>
              );
            },
          },
          { khoa: 'tt', tieuDe: 'Tình trạng', hien: (d) => <NhanTinhTrangPhieu giaTri={d.tinhTrang} /> },
          {
            khoa: 'hd',
            tieuDe: 'Thao tác',
            canh: 'phai',
            hien: (d) => (
              <Nut kichThuoc="nho" den={`/ban-ve?maPhieuDat=${d.maPhieuDat}`}>
                Bán vé từ phiếu
              </Nut>
            ),
          },
        ]}
      />
    </section>
  );
}
