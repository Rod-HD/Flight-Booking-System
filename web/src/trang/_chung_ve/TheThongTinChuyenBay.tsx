// Bảng bên phải trang Bán vé, Đặt vé: tuyến bay, giờ khởi hành, thời gian bay, sân bay trung gian, ghế trống theo hạng
import { useQuery } from '@tanstack/react-query';
import { Clock3, MapPin, Plane, Timer, Wallet } from 'lucide-react';
import { apiChuyenBay, khoaTruyVan } from '@/api/dich_vu';
import type { ChuyenBayTomTat, SanBay, ThongTinBan } from '@/kieu/api';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { KhungXuong, TrangThaiRong } from '@/thanh_phan/TrangThaiRong';
import { dinhDangSo, dinhDangTien } from '@/tien_ich/dinh_dang';
import { dungBayGio } from '@/tien_ich/hook';
import { conLai, dinhDangGio, dinhDangNgay, dinhDangThoiLuong } from '@/tien_ich/thoi_gian';
import s from './BieuMauVe.module.css';

export interface ThuocTinhTheThongTin {
  maChuyenBay: string | null;
  tomTat?: ChuyenBayTomTat;
  sanBay?: SanBay[];
  thongTin?: ThongTinBan;
  /** chế độ sửa: không xét được phép bán hay không */
  chiXem?: boolean;
}

export function TheThongTinChuyenBay({ maChuyenBay, tomTat, sanBay, thongTin, chiXem }: ThuocTinhTheThongTin) {
  const bayGio = dungBayGio(30000);
  const { data: ct, isPending } = useQuery({
    queryKey: khoaTruyVan.chuyenBayChiTiet(maChuyenBay ?? ''),
    queryFn: () => apiChuyenBay.chiTiet(maChuyenBay ?? ''),
    enabled: !!maChuyenBay,
  });

  if (!maChuyenBay) {
    return (
      <aside className={s.panel} aria-label="Thông tin chuyến bay">
        <h2 className={s.panelTieuDe}>Thông tin chuyến bay</h2>
        <TrangThaiRong linhVat="tra_cuu" kichThuocHinh={104} tieuDe="Chưa chọn chuyến bay" goiY="Chọn chuyến bay ở ô bên trái, thông tin tuyến bay và số ghế trống theo từng hạng vé sẽ hiện ở đây." />
      </aside>
    );
  }

  const tenSB = (ma: string) => (ct?.maSanBayDi === ma ? ct.tenSanBayDi : ct?.maSanBayDen === ma ? ct.tenSanBayDen : undefined) ?? sanBay?.find((x) => x.maSanBay === ma)?.tenSanBay ?? (tomTat?.maSanBayDi === ma ? tomTat.tenSanBayDi : tomTat?.maSanBayDen === ma ? tomTat.tenSanBayDen : '');
  const tongTrong = thongTin?.tongSoGheTrong ?? ct?.gheTheoHang.reduce((t, g) => t + g.soGheTrong, 0) ?? 0;
  const khongDuoc = !chiXem && thongTin && !thongTin.duocPhep;
  const cl = ct ? conLai(ct.ngayGioKhoiHanh, bayGio) : null;

  let nhan: React.ReactNode = null;
  if (ct) {
    if (cl && cl.phut < 0) nhan = <NhanTrangThai loai="trung-tinh">Đã khởi hành</NhanTrangThai>;
    else if (tongTrong <= 0) nhan = <NhanTrangThai loai="do">Hết chỗ</NhanTrangThai>;
    else if (khongDuoc && thongTin?.maLoi === 'QUA_HAN_DAT_VE') nhan = <NhanTrangThai loai="canh-bao">Quá hạn đặt vé</NhanTrangThai>;
    else nhan = <NhanTrangThai loai="thanh-cong">Còn chỗ</NhanTrangThai>;
  }

  return (
    <aside className={`${s.panel} ${khongDuoc ? s.panelLoi : ''}`} aria-label="Thông tin chuyến bay" aria-busy={isPending || undefined}>
      <div className={s.panelDau}>
        <h2 className={s.panelTieuDe}>Thông tin chuyến bay</h2>
        {nhan}
      </div>

      {isPending || !ct ? (
        <div className={s.panelXuong}>
          <KhungXuong rong="60%" cao={28} />
          <KhungXuong rong="100%" cao={64} boGoc={16} />
          <KhungXuong rong="80%" />
          <KhungXuong rong="70%" />
          <KhungXuong rong="100%" cao={96} boGoc={16} />
        </div>
      ) : (
        <div key={ct.maChuyenBay} className={s.panelThan}>
          <span className={s.maCB}>{ct.maChuyenBay}</span>
          <div className={s.tuyen}>
            <div className={s.diem}>
              <b>{ct.maSanBayDi}</b>
              <span>{tenSB(ct.maSanBayDi)}</span>
            </div>
            <div className={s.duongBay} aria-hidden>
              <span className={s.vet} />
              <Plane size={20} className={s.mayBay} />
            </div>
            <div className={`${s.diem} ${s.diemDen}`}>
              <b>{ct.maSanBayDen}</b>
              <span>{tenSB(ct.maSanBayDen)}</span>
            </div>
          </div>

          <dl className={s.dongTin}>
            <div>
              <dt>
                <Clock3 size={16} /> Khởi hành
              </dt>
              <dd>
                <b>
                  {dinhDangGio(ct.ngayGioKhoiHanh)} {dinhDangNgay(ct.ngayGioKhoiHanh)}
                </b>
                {cl && <small className={cl.phut < 0 ? s.chuDo : cl.phut < 180 ? s.chuCam : undefined}>{cl.phut < 0 ? 'đã khởi hành' : cl.chu}</small>}
              </dd>
            </div>
            <div>
              <dt>
                <Timer size={16} /> Thời gian bay
              </dt>
              <dd>
                <b>{dinhDangThoiLuong(ct.thoiGianBay)}</b>
              </dd>
            </div>
            <div>
              <dt>
                <Wallet size={16} /> Giá vé (đơn giá)
              </dt>
              <dd>
                <b>{dinhDangTien(ct.giaVe)}</b>
              </dd>
            </div>
            {ct.trungGian.length > 0 && (
              <div>
                <dt>
                  <MapPin size={16} /> Sân bay trung gian
                </dt>
                <dd className={s.trungGian}>
                  {ct.trungGian.map((t) => (
                    <span key={t.thuTu}>
                      <b>{t.maSanBay}</b> {t.tenSanBay} · dừng {t.thoiGianDung} phút
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          <table className={s.bangHang}>
            <thead>
              <tr>
                <th scope="col">Hạng vé</th>
                <th scope="col">Số ghế trống</th>
              </tr>
            </thead>
            <tbody>
              {ct.gheTheoHang.filter((g) => g.soLuongGhe > 0).map((g) => {
                const trong = thongTin?.hang.find((h) => h.maHangVe === g.maHangVe)?.soGheTrong ?? g.soGheTrong;
                return (
                  <tr key={g.maHangVe}>
                    <td>{g.tenHangVe}</td>
                    <td>
                      <span className={trong <= 0 ? s.gheHet : trong <= 10 ? s.gheIt : s.gheNhieu}>
                        {trong <= 0 ? 'Hết chỗ' : dinhDangSo(trong)}
                      </span>
                      <small> / {dinhDangSo(g.soLuongGhe)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {khongDuoc && thongTin?.thongBao && (
            <p className={s.panelCanhBao} role="alert">
              {thongTin.thongBao}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
