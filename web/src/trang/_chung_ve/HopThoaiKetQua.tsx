// Hộp thoại báo bán vé, đặt vé thành công: linh vật, mã vé hoặc mã phiếu, giá tiền, hạn thanh toán
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { HopThoai } from '@/thanh_phan/HopThoai';
import { LinhVat } from '@/thanh_phan/LinhVat';
import { Nut } from '@/thanh_phan/Nut';
import { dinhDangTien } from '@/tien_ich/dinh_dang';
import { dinhDangNgayGio } from '@/tien_ich/thoi_gian';
import s from './BieuMauVe.module.css';

export interface KetQuaHienThi {
  loai: 've' | 'phieu';
  ma: string;
  giaTien: number;
  hoTen?: string;
  maChuyenBay?: string;
  tenHangVe?: string;
  hanThanhToan?: string;
  /** vé lập từ phiếu đặt chỗ */
  tuPhieu?: string;
}

export interface ThuocTinhHopThoaiKetQua {
  ketQua: KetQuaHienThi | null;
  onDong: () => void;
  /** nút lặng bên trái, ví dụ Bán vé khác */
  nutPhu: { chu: string; onClick: () => void };
  /** nút vàng bên phải, ví dụ Xem danh sách vé */
  nutChinh: { chu: string; onClick: () => void };
}

export function HopThoaiKetQua({ ketQua, onDong, nutPhu, nutChinh }: ThuocTinhHopThoaiKetQua) {
  const [daChep, datDaChep] = useState(false);
  const laVe = ketQua?.loai === 've';

  const chep = async () => {
    if (!ketQua) return;
    try {
      await navigator.clipboard.writeText(ketQua.ma);
      datDaChep(true);
      window.setTimeout(() => datDaChep(false), 1600);
    } catch {
      /* trình duyệt không cho chép thì thôi */
    }
  };

  return (
    <HopThoai
      mo={!!ketQua}
      onDong={onDong}
      rong={520}
      vaiTro="alertdialog"
      tieuDe={laVe ? 'Bán vé thành công' : 'Đặt vé thành công'}
      moTa={
        laVe
          ? ketQua?.tuPhieu
            ? `Đã lập vé từ phiếu đặt chỗ ${ketQua.tuPhieu}, phiếu chuyển sang Đã hủy. Báo mã vé cho hành khách.`
            : 'Vé đã được lưu với tình trạng Đã bán. Báo mã vé cho hành khách.'
          : 'Phiếu đã được lưu với tình trạng Chờ thanh toán. Báo mã phiếu và hạn thanh toán cho hành khách.'
      }
      icon={<LinhVat tuThe="thanh_cong" kichThuoc={88} className={s.linhVatKetQua} />}
      chan={
        <>
          <Nut bienThe="lang" muiTen={false} onClick={nutPhu.onClick}>
            {nutPhu.chu}
          </Nut>
          <Nut onClick={nutChinh.onClick} data-tu-focus>
            {nutChinh.chu}
          </Nut>
        </>
      }
    >
      {ketQua && (
        <div className={s.ketQua}>
          <div className={s.ketQuaMa}>
            <span>{laVe ? 'Mã vé' : 'Mã phiếu đặt'}</span>
            <b>{ketQua.ma}</b>
            <button type="button" className={s.nutChep} onClick={chep} aria-label={`Chép mã ${ketQua.ma}`} title="Chép mã">
              {daChep ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <dl className={s.ketQuaDong}>
            {ketQua.hoTen && (
              <div>
                <dt>Hành khách</dt>
                <dd>{ketQua.hoTen}</dd>
              </div>
            )}
            {ketQua.maChuyenBay && (
              <div>
                <dt>Chuyến bay</dt>
                <dd>
                  {ketQua.maChuyenBay}
                  {ketQua.tenHangVe ? ` · ${ketQua.tenHangVe}` : ''}
                </dd>
              </div>
            )}
            <div>
              <dt>Giá tiền</dt>
              <dd className={s.ketQuaTien}>{dinhDangTien(ketQua.giaTien)}</dd>
            </div>
            {ketQua.hanThanhToan && (
              <div>
                <dt>Hạn thanh toán</dt>
                <dd className={s.ketQuaHan}>{dinhDangNgayGio(ketQua.hanThanhToan)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </HopThoai>
  );
}
