// Bố cục chung sau khi đăng nhập: thanh thông báo + header dính trên cùng, nội dung trang, chân trang.
// Gắn luôn các phím tắt toàn cục (F1, Alt+1 đến Alt+4).
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { dungPhien } from '@/phien/NguCanhPhien';
import { dungDaCuon } from '@/tien_ich/hook';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { ChanTrang } from './ChanTrang';
import { DauTrang } from './DauTrang';
import { ThanhThongBao, dungThongBao } from './ThanhThongBao';
import { hienToast } from './toast_kho';
import s from './BoCuc.module.css';

const KHOA_AN_THONG_BAO = 'qlbv_an_thong_bao';

export function BoCuc() {
  const { pathname, hash } = useLocation();
  const dieuHuong = useNavigate();
  const { laQuanLy } = dungPhien();
  const daCuon = dungDaCuon(40);
  const laTrangChinh = pathname === '/';
  const [anThongBao, datAnThongBao] = useState(() => {
    try {
      return sessionStorage.getItem(KHOA_AN_THONG_BAO) === '1';
    } catch {
      return false;
    }
  });
  const { data: thongBao } = dungThongBao(!anThongBao);
  const coThongBao = !anThongBao && !!thongBao?.length;

  // chiều cao vùng dính trên cùng, bảng và cuộn neo dùng giá trị này
  useEffect(() => {
    const goc = document.documentElement.style;
    goc.setProperty('--cao-thanh-thong-bao', coThongBao ? '44px' : '0px');
    goc.setProperty('--cao-thanh-tren', coThongBao ? '116px' : '72px');
  }, [coThongBao]);

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [pathname, hash]);

  dungPhimTat({
    f1: () => dieuHuong('/tro-giup'),
    'alt+1': () => dieuHuong('/chuyen-bay'),
    'alt+2': () => dieuHuong('/ban-ve'),
    'alt+3': () => dieuHuong('/dat-ve'),
    'alt+4': () => (laQuanLy ? dieuHuong('/bao-cao') : hienToast.canhBao('Báo cáo doanh thu chỉ dành cho Quản lý.')),
  });

  return (
    <div className={s.boCuc}>
      {laTrangChinh && <div className={s.daiDo} aria-hidden />}
      <div className={s.dinh}>
        {coThongBao && (
          <ThanhThongBao
            daCuon={daCuon}
            onDong={() => {
              datAnThongBao(true);
              try {
                sessionStorage.setItem(KHOA_AN_THONG_BAO, '1');
              } catch {
                /* bỏ qua */
              }
            }}
          />
        )}
        <DauTrang trongSuot={laTrangChinh && !daCuon} />
      </div>
      <main key={pathname} className={s.noiDung} id="noi-dung">
        <Outlet />
      </main>
      <ChanTrang />
    </div>
  );
}

/** Màn hình chờ khi đang kiểm tra phiên */
export function ManHinhCho({ chu = 'Đang mở phiên làm việc...' }: { chu?: string }) {
  return (
    <div className={s.choTai} role="status">
      <div>
        <img src="/linh_vat/vut_cho.svg" width={120} height={120} alt="" style={{ margin: '0 auto 12px' }} />
        {chu}
      </div>
    </div>
  );
}
