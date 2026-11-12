// Nút viên thuốc và nút tròn icon
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import s from './Nut.module.css';

export type BienTheNut = 'chinh' | 'phu' | 'nguy-hiem' | 'lang' | 'chu';

const lopBienThe: Record<BienTheNut, string> = {
  chinh: s.chinh,
  phu: s.phu,
  'nguy-hiem': s.nguyHiem,
  lang: s.lang,
  chu: s.chu,
};

export interface ThuocTinhNut extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** chinh (vàng), phu (viền đỏ), nguy-hiem (đỏ đặc), lang (viền xám), chu (liên kết) */
  bienThe?: BienTheNut;
  kichThuoc?: 'nho' | 'vua' | 'lon';
  /** mặc định có mũi tên với nút chính */
  muiTen?: boolean;
  iconTrai?: React.ReactNode;
  dangXuLy?: boolean;
  toanChieuRong?: boolean;
  /** có den thì nút là liên kết chuyển trang */
  den?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Nut = forwardRef<HTMLButtonElement, ThuocTinhNut>(function Nut(
  { bienThe = 'chinh', kichThuoc = 'vua', muiTen, iconTrai, dangXuLy, toanChieuRong, den, className, children, disabled, type = 'button', ...con },
  ref,
) {
  const coMuiTen = muiTen ?? bienThe === 'chinh';
  const lop = [
    s.nut,
    lopBienThe[bienThe],
    kichThuoc === 'nho' ? s.nho : kichThuoc === 'lon' ? s.lon : '',
    toanChieuRong ? s.toanChieuRong : '',
    className ?? '',
  ].join(' ');
  const kichIcon = kichThuoc === 'nho' ? 16 : 18;
  const noiDung = (
    <>
      {dangXuLy ? <span className={s.quay} aria-hidden /> : iconTrai && <span className={s.icon}>{iconTrai}</span>}
      {children}
      {coMuiTen && !dangXuLy && (
        <span className={s.muiTen} aria-hidden>
          <ArrowRight size={kichIcon} strokeWidth={2.6} />
        </span>
      )}
    </>
  );

  if (den && !disabled) {
    return (
      <Link to={den} className={lop} onClick={con.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>} aria-label={con['aria-label']} title={con.title} tabIndex={con.tabIndex}>
        {noiDung}
      </Link>
    );
  }

  return (
    <button ref={ref} type={type} className={lop} disabled={disabled || dangXuLy} aria-busy={dangXuLy || undefined} {...con}>
      {noiDung}
    </button>
  );
});

export interface ThuocTinhNutTron extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** bắt buộc: chữ mô tả cho trình đọc màn hình và chú thích khi di chuột */
  nhan: string;
  bienThe?: 'nhat' | 'trong' | 'toi' | 'do';
  kichThuoc?: 'nho' | 'vua' | 'lon';
  type?: 'button' | 'submit';
}

export const NutTron = forwardRef<HTMLButtonElement, ThuocTinhNutTron>(function NutTron(
  { nhan, bienThe = 'nhat', kichThuoc = 'vua', className, children, type = 'button', ...con },
  ref,
) {
  const lop = [
    s.tron,
    bienThe === 'trong' ? s.tronTrong : bienThe === 'toi' ? s.tronToi : bienThe === 'do' ? s.tronDo : '',
    kichThuoc === 'nho' ? s.tronNho : kichThuoc === 'lon' ? s.tronLon : '',
    className ?? '',
  ].join(' ');
  return (
    <button ref={ref} type={type} className={lop} aria-label={nhan} title={nhan} {...con}>
      {children}
    </button>
  );
});
