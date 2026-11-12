// Logo nhóm (tấm vé đỏ có máy bay và ngôi sao) kèm tên phần mềm, luôn đi cùng nhau
import { Link } from 'react-router-dom';
import s from './Logo.module.css';

export const TEN_PHAN_MEM = 'Quản lý bán vé chuyến bay';

export interface ThuocTinhLogo {
  /** chữ trắng khi đặt trên nền đỏ */
  trang?: boolean;
  kichThuoc?: 'vua' | 'lon';
  /** tách tên thành hai dòng cho gọn */
  haiDong?: boolean;
  den?: string;
  className?: string;
}

export function Logo({ trang, kichThuoc = 'vua', haiDong, den, className }: ThuocTinhLogo) {
  const lop = [s.logo, trang ? s.trang : '', kichThuoc === 'lon' ? s.lon : '', className ?? ''].join(' ');
  const noiDung = (
    <>
      <span className={s.o}>
        <img src="/logo.svg" alt="" aria-hidden />
      </span>
      <span className={s.chu}>
        {haiDong ? (
          <>
            <span className={s.hangHai}>Quản lý bán vé</span>
            <span className={s.hangHai}>chuyến bay</span>
          </>
        ) : (
          TEN_PHAN_MEM
        )}
      </span>
    </>
  );
  if (den) {
    return (
      <Link to={den} className={lop} aria-label={`${TEN_PHAN_MEM}, về trang chính`}>
        {noiDung}
      </Link>
    );
  }
  return <span className={lop}>{noiDung}</span>;
}
