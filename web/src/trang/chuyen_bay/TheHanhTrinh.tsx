// Thẻ hành trình đỏ ở cột phải: sân bay đi, đến, các điểm dừng, giờ khởi hành, tổng ghế, giá vé.
// Ở chế độ thêm, sửa thẻ cập nhật ngay khi người dùng nhập.
import { Plane } from 'lucide-react';
import { dinhDangSo, dinhDangTien } from '@/tien_ich/dinh_dang';
import { dinhDangGio, dinhDangNgay, dinhDangThoiLuong, docIso } from '@/tien_ich/thoi_gian';
import s from './ChuyenBay.module.css';

export interface ThuocTinhTheHanhTrinh {
  maChuyenBay: string;
  di?: { ma: string; ten: string } | null;
  den?: { ma: string; ten: string } | null;
  soDiemDung: number;
  ngayGio: string;
  thoiGianBay: number | null;
  tongGhe: number;
  /** số ghế còn trống, chỉ có ở chế độ xem và sửa */
  gheTrong?: number;
  giaVe: number | null;
}

export function TheHanhTrinh({ maChuyenBay, di, den, soDiemDung, ngayGio, thoiGianBay, tongGhe, gheTrong, giaVe }: ThuocTinhTheHanhTrinh) {
  const ngay = ngayGio ? docIso(ngayGio) : null;
  const ngayHopLe = ngay && !isNaN(ngay.getTime());
  return (
    <section className={s.hanhTrinh} aria-label="Tóm tắt hành trình">
      <div className={s.nhanHanhTrinh}>
        Hành trình
        <span className={s.maHanhTrinh}>{maChuyenBay || 'Mã chuyến bay'}</span>
      </div>
      <div className={s.tuyen}>
        <div className={s.diem}>
          <b>{di?.ma ?? '---'}</b>
          <span>{di?.ten ?? 'Sân bay đi'}</span>
        </div>
        <div className={s.duongBay} aria-hidden>
          {Array.from({ length: soDiemDung }, (_, i) => (
            <span key={i} className={s.chamDung} style={{ left: `${((i + 1) / (soDiemDung + 1)) * 100}%` }} />
          ))}
          <span className={s.mayBayNho}>
            <Plane size={16} fill="currentColor" />
          </span>
        </div>
        <div className={`${s.diem} ${s.diemPhai}`}>
          <b>{den?.ma ?? '---'}</b>
          <span>{den?.ten ?? 'Sân bay đến'}</span>
        </div>
      </div>
      <div className={s.thoiGianTuyen}>
        <div className={s.oThoiGian}>
          <small>Khởi hành</small>
          <b>{ngayHopLe ? dinhDangGio(ngay) : '--:--'}</b>
          <span>{ngayHopLe ? dinhDangNgay(ngay) : 'Chưa chọn ngày'}</span>
        </div>
        <div className={s.oThoiGian}>
          <small>Thời gian bay</small>
          <b>{thoiGianBay ? dinhDangThoiLuong(thoiGianBay) : '--'}</b>
          <span>{soDiemDung ? `${soDiemDung} điểm dừng` : 'Bay thẳng'}</span>
        </div>
      </div>
      <div className={s.dongTomTat}>
        <span>{gheTrong !== undefined ? 'Ghế trống / tổng số ghế' : 'Tổng số ghế'}</span>
        <b>{gheTrong !== undefined ? `${dinhDangSo(gheTrong)} / ${dinhDangSo(tongGhe)}` : dinhDangSo(tongGhe)}</b>
      </div>
      <div className={s.dongTomTat}>
        <span>Giá vé (đơn giá)</span>
        <b>{giaVe ? dinhDangTien(giaVe) : '--'}</b>
      </div>
    </section>
  );
}
