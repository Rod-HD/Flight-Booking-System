// Chân trang: logo, tên nhóm, phiên bản
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import s from './ChanTrang.module.css';

export const DONG_PHIEN_BAN = 'Nhóm 12 · SE104.R13 · Phiên bản 1.0';

export function ChanTrang() {
  return (
    <footer className={s.chan}>
      <div className={s.trong}>
        <div className={s.trai}>
          <Logo den="/" />
          <span>{DONG_PHIEN_BAN}</span>
        </div>
        <nav className={s.lienKet} aria-label="Liên kết chân trang">
          <Link to="/tro-giup">Trợ giúp</Link>
          <Link to="/tro-giup#phim-tat">Phím tắt</Link>
        </nav>
      </div>
    </footer>
  );
}
