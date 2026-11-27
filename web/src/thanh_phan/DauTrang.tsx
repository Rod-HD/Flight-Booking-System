// Header: logo, menu theo quyền, nhóm Trợ giúp và người dùng, nút Đăng xuất
import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Headphones, LogOut } from 'lucide-react';
import { MENU, mucDangO } from '@/dinh_tuyen';
import { dungPhien } from '@/phien/NguCanhPhien';
import { chuCaiDau, tenNhomQuyen } from '@/tien_ich/dinh_dang';
import { ChuongThongBao } from './ChuongThongBao';
import { Logo } from './Logo';
import { Nut } from './Nut';
import s from './DauTrang.module.css';

export function DauTrang() {
  const { nguoiDung, coQuyen, dangXuat } = dungPhien();
  const { pathname } = useLocation();
  const dieuHuong = useNavigate();
  const menu = MENU.filter((m) => coQuyen(m.quyen));
  const oTroGiup = pathname === '/tro-giup';
  const thanhMenu = useRef<HTMLUListElement>(null);

  // menu cuộn ngang trên màn hẹp: đưa mục đang chọn vào tầm nhìn (không cuộn trang theo chiều dọc)
  useEffect(() => {
    const ul = thanhMenu.current;
    const muc = ul?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!ul || !muc || ul.scrollWidth <= ul.clientWidth) return;
    const lech = muc.getBoundingClientRect().left - ul.getBoundingClientRect().left;
    ul.scrollTo({ left: ul.scrollLeft + lech - (ul.clientWidth - muc.offsetWidth) / 2, behavior: 'smooth' });
  }, [pathname]);

  return (
    <header className={s.dauTrang}>
      {/* chữ trắng, nền đỏ ở mọi trang (kể cả trên dải đỏ của trang chính) để thanh luôn tách khỏi phần bên dưới */}
      <div className={`${s.thanh} ${s.trongSuot} ${s.nenDo}`}>
        <div className={s.trong}>
          <Logo den="/" haiDong trang className={s.logo} />
          <span className={s.vachDung} aria-hidden />
          <nav aria-label="Menu chính" className={s.nav}>
            <ul className={s.menu} ref={thanhMenu}>
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
