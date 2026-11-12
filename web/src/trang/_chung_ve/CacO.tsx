// Các ô riêng của biểu mẫu vé: giấy tờ (loại + số), chọn hạng vé kèm ghế trống, giá tiền chạy số, băng hạn giữ chỗ
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { HangBan, LoaiGiayTo } from '@/kieu/api';
import { KhungTruong, dungIdTruong, kieuONhap } from '@/thanh_phan/ONhap';
import { dinhDangSo, dinhDangTien } from '@/tien_ich/dinh_dang';
import { dungBayGio, dungSoChay } from '@/tien_ich/hook';
import { conLai, dinhDangGio, dinhDangNgay } from '@/tien_ich/thoi_gian';
import { LUA_CHON_GIAY_TO, chuanHoaSoGiayTo } from './kiem_tra';
import s from './BieuMauVe.module.css';

/* ---------- CCCD/Hộ chiếu: chọn loại + nhập số trong cùng một khung ---------- */
export interface ThuocTinhOGiayTo {
  loai: LoaiGiayTo;
  so: string;
  /** trang cha tự chuẩn hóa lại số giấy tờ theo loại mới */
  onDoiLoai: (l: LoaiGiayTo) => void;
  onDoiSo: (so: string) => void;
  onRoi?: () => void;
  loi?: string;
  goiY?: React.ReactNode;
  nhan?: string;
  batBuoc?: boolean;
  disabled?: boolean;
  className?: string;
}

export const OGiayTo = forwardRef<HTMLInputElement, ThuocTinhOGiayTo>(function OGiayTo(
  { loai, so, onDoiLoai, onDoiSo, onRoi, loi, goiY, nhan = 'CCCD/Hộ chiếu', batBuoc = true, disabled, className },
  ref,
) {
  const idO = dungIdTruong();
  return (
    <KhungTruong nhan={nhan} batBuoc={batBuoc} loi={loi} goiY={goiY} idO={idO} voHieu={disabled} className={className}>
      <div className={kieuONhap.khung}>
        <span className={s.chonLoai}>
          <select
            aria-label="Loại giấy tờ"
            className={s.chonLoaiO}
            value={loai}
            disabled={disabled}
            onChange={(e) => {
              onDoiLoai(e.target.value as LoaiGiayTo);
            }}
          >
            {LUA_CHON_GIAY_TO.map((l) => (
              <option key={l.giaTri} value={l.giaTri}>
                {l.nhan}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden />
        </span>
        <input
          ref={ref}
          id={idO}
          className={kieuONhap.o}
          value={so}
          disabled={disabled}
          inputMode={loai === 'CCCD' ? 'numeric' : 'text'}
          autoComplete="off"
          spellCheck={false}
          placeholder={loai === 'CCCD' ? '12 chữ số' : 'Chữ in hoa và số, 6 đến 20 ký tự'}
          maxLength={loai === 'CCCD' ? 12 : 20}
          aria-invalid={!!loi || undefined}
          aria-describedby={loi ? `${idO}-loi` : goiY ? `${idO}-goi-y` : undefined}
          onChange={(e) => onDoiSo(chuanHoaSoGiayTo(loai, e.target.value))}
          onBlur={onRoi}
        />
        {loai === 'CCCD' && so.length > 0 && (
          <span className={`${kieuONhap.ben} ${s.demSo}`} aria-hidden>
            {so.length}/12
          </span>
        )}
      </div>
    </KhungTruong>
  );
});

/* ---------- Hạng vé: các viên chọn, hạng hết chỗ bị vô hiệu ---------- */
export interface ThuocTinhChonHang {
  hang: HangBan[];
  giaTri: string | null;
  onDoi: (ma: string) => void;
  loi?: string;
  disabled?: boolean;
  dangTai?: boolean;
  goiY?: React.ReactNode;
}

export function ChonHangVe({ hang, giaTri, onDoi, loi, disabled, dangTai, goiY }: ThuocTinhChonHang) {
  const idO = dungIdTruong();
  const chonDuoc = hang.filter((h) => h.soGheTrong > 0);

  const diChuyen = (e: React.KeyboardEvent, i: number) => {
    const huong = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!huong || !chonDuoc.length) return;
    e.preventDefault();
    const hienTai = chonDuoc.findIndex((h) => h.maHangVe === hang[i].maHangVe);
    const ke = chonDuoc[(hienTai + huong + chonDuoc.length) % chonDuoc.length];
    onDoi(ke.maHangVe);
    (e.currentTarget.parentElement?.querySelector(`[data-ma="${ke.maHangVe}"]`) as HTMLElement | null)?.focus();
  };

  return (
    <KhungTruong nhan="Hạng vé" batBuoc loi={loi} goiY={goiY} idO={idO} voHieu={disabled}>
      <div
        id={idO}
        className={`${s.hang} ${loi ? s.hangLoi : ''}`}
        role="radiogroup"
        aria-label="Hạng vé"
        aria-invalid={!!loi || undefined}
        aria-describedby={loi ? `${idO}-loi` : undefined}
      >
        {dangTai && <span className={s.hangTrong}>Đang tải hạng vé...</span>}
        {!dangTai && !hang.length && <span className={s.hangTrong}>Chọn chuyến bay để xem các hạng vé</span>}
        {!dangTai &&
          hang.map((h, i) => {
            const het = h.soGheTrong <= 0;
            const chon = giaTri === h.maHangVe;
            const coTheFocus = chon || (!giaTri && chonDuoc[0]?.maHangVe === h.maHangVe);
            return (
              <button
                key={h.maHangVe}
                type="button"
                role="radio"
                data-ma={h.maHangVe}
                aria-checked={chon}
                disabled={disabled || het}
                tabIndex={coTheFocus ? 0 : -1}
                className={`${s.vienHang} ${chon ? s.vienHangChon : ''}`}
                title={het ? `${h.tenHangVe} đã hết chỗ` : `${h.tenHangVe}: ${h.soGheTrong} ghế trống, ${dinhDangTien(h.giaTien)}`}
                onClick={() => onDoi(h.maHangVe)}
                onKeyDown={(e) => diChuyen(e, i)}
              >
                <span className={s.tenHang}>{h.tenHangVe}</span>
                <span className={s.gheHang}>{het ? 'Hết chỗ' : `${dinhDangSo(h.soGheTrong)} ghế trống`}</span>
              </button>
            );
          })}
      </div>
    </KhungTruong>
  );
}

/* ---------- Giá tiền: chỉ đọc, số lớn màu đỏ, chạy số khi đổi ---------- */
export function OGiaTien({ giaTien, chuThich }: { giaTien: number; chuThich: React.ReactNode }) {
  const so = dungSoChay(giaTien, 650);
  const idO = dungIdTruong();
  return (
    <KhungTruong nhan="Giá tiền" goiY={chuThich} idO={idO} chiDoc>
      <output id={idO} className={`${s.giaTien} ${giaTien ? '' : s.giaTienTrong}`} aria-live="polite" aria-label={dinhDangTien(giaTien)}>
        <span aria-hidden>{dinhDangSo(so)}</span>
        <small aria-hidden>₫</small>
      </output>
    </KhungTruong>
  );
}

/* ---------- Băng hạn giữ chỗ (đặt vé): màu hổ phách, có đồng hồ ---------- */
export function BangHanGiuCho({ han, soNgayToiThieu }: { han: string; soNgayToiThieu: number }) {
  const bayGio = dungBayGio(30000);
  const cl = conLai(han, bayGio);
  return (
    <div className={s.bangHan} role="status">
      <span className={s.dongHo} aria-hidden>
        <span className={s.kimGio} />
        <span className={s.kimPhut} />
      </span>
      <div>
        <p className={s.bangHanChu}>
          Giữ chỗ đến <b>{dinhDangGio(han)}</b> ngày <b>{dinhDangNgay(han)}</b>. Phiếu tự hủy nếu chưa thanh toán trước hạn.
        </p>
        <p className={s.bangHanPhu}>
          Thời gian giữ chỗ {cl.chu}. Chỉ nhận đặt vé chậm nhất {soNgayToiThieu} ngày trước khi khởi hành (QĐ3).
        </p>
      </div>
    </div>
  );
}
