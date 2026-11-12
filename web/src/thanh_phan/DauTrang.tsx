// Header: logo, menu theo quyền, nhóm Trợ giúp và người dùng, nút Đăng xuất
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Headphones, LogOut } from 'lucide-react';
import { MENU, mucDangO } from '@/dinh_tuyen';
import { dungPhien } from '@/phien/NguCanhPhien';
import { chuCaiDau, tenNhomQuyen } from '@/tien_ich/dinh_dang';
import { ChuongThongBao } from './ChuongThongBao';
import { Logo } from './Logo';
import { Nut } from './Nut';
import s from './DauTrang.module.css';

export function DauTrang({ trongSuot }: { trongSuot: boolean }) {
  const { nguoiDung, coQuyen, dangXuat } = dungPhien();
  const { pathname } = useLocation();
  const dieuHuong = useNavigate();
  const menu = MENU.filter((m) => coQuyen(m.quyen));
  const oTroGiup = pathname === '/tro-giup';

  return (
    <header className={s.dauTrang}>
      <div className={`${s.thanh} ${trongSuot ? s.trongSuot : ''}`}>
        <div className={s.trong}>
          <Logo den="/" haiDong trang={trongSuot} />
          <span className={s.vachDung} aria-hidden />
          <nav aria-label="Menu chính" style={{ flex: 1, minWidth: 0, height: '100%' }}>
            <ul className={s.menu}>
              {menu.map((m) => {
                const dangO = mucDangO(pathname, m);
                return (
                  <li key={m.den}>
                    <NavLink
                      to={m.den}
                      end={m.den === '/'}
                      className={`${s.muc} ${dangO ? s.dangO : ''}`}
                      aria-current={dangO ? 'page' : undefined}
                      title={m.phimTat ? `${m.ten} (${m.phimTat})` : m.ten}
                    >
                      {m.ten}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className={s.phai}>
            <div className={s.cum}>
              <ChuongThongBao lop={s.nutCum} />
              <Link to="/tro-giup" className={`${s.nutCum} ${oTroGiup ? s.dangO : ''}`} aria-current={oTroGiup ? 'page' : undefined} title="Trợ giúp (F1)">
                <Headphones size={17} strokeWidth={2.2} />
                <span className={s.chuTroGiup}>
                  Trợ giúp <span className={s.phimNho}>(F1)</span>
                </span>
              </Link>
              {nguoiDung && (
                <span className={s.nguoi} title={`${nguoiDung.tenDangNhap} · ${tenNhomQuyen[nguoiDung.nhomQuyen]}`}>
                  <span className={s.anh} aria-hidden>
                    {chuCaiDau(nguoiDung.tenDangNhap)}
                  </span>
                  <span className={s.ten}>
                    <span className={s.tenDN}>{nguoiDung.tenDangNhap}</span>
                    <span className={s.vaiTro}>{tenNhomQuyen[nguoiDung.nhomQuyen]}</span>
                  </span>
                </span>
              )}
            </div>
            <Nut
              bienThe="lang"
              muiTen={false}
              className={s.dangXuat}
              iconTrai={<LogOut size={17} />}
              onClick={async () => {
                await dangXuat();
                dieuHuong('/dang-nhap', { replace: true });
              }}
            >
              <span className={s.chuDangXuat}>Đăng xuất</span>
            </Nut>
          </div>
        </div>
      </div>
    </header>
  );
}
