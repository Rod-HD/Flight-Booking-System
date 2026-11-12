// Trang đăng nhập (UC01): carousel key visual bên trái, thẻ đăng nhập bên phải
import { useCallback, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, BarChart3, CalendarClock, Eye, EyeOff, Info, LockKeyhole, Sparkles, Ticket, UserRound } from 'lucide-react';
import { CHE_DO_GIA_LAP, laLoiApi, thongBaoLoi } from '@/api/may_khach';
import { CanhBauTroi, type ChuDeCanh } from '@/canh/CanhBauTroi';
import { IconChiaKhoa } from '@/icons3d';
import { dungPhien } from '@/phien/NguCanhPhien';
import { Carousel, HangDieuKhien } from '@/thanh_phan/Carousel';
import { DONG_PHIEN_BAN } from '@/thanh_phan/ChanTrang';
import { Logo } from '@/thanh_phan/Logo';
import { Nut } from '@/thanh_phan/Nut';
import { ONhap } from '@/thanh_phan/ONhap';
import { ManHinhCho } from '@/thanh_phan/BoCuc';
import s from './TrangDangNhap.module.css';

interface Slide {
  chuDe: ChuDeCanh;
  nhan: string;
  tieuDe: [string, string];
  moTa: string;
  tenThe: string;
  moTaThe: string;
  icon: React.ReactNode;
}

const SLIDE: Slide[] = [
  {
    chuDe: 'ban-ve',
    nhan: 'Bán vé',
    tieuDe: ['Bán vé nhanh,', 'đúng quy định'],
    moTa: 'Kiểm tra chỗ trống và tính giá theo hạng vé ngay khi lập vé, bán trực tiếp hoặc từ phiếu đặt chỗ.',
    tenThe: 'Bán vé nhanh',
    moTaThe: 'Trực tiếp hoặc từ phiếu đặt',
    icon: <Ticket size={22} strokeWidth={2.2} />,
  },
  {
    chuDe: 'giu-cho',
    nhan: 'Đặt vé',
    tieuDe: ['Giữ chỗ linh hoạt,', 'tự động hủy khi quá hạn'],
    moTa: 'Phiếu đặt chỗ được giữ đến hạn thanh toán. Quá hạn, hệ thống tự hủy phiếu và ghi lại nhật ký.',
    tenThe: 'Giữ chỗ linh hoạt',
    moTaThe: 'Tự hủy phiếu quá hạn',
    icon: <CalendarClock size={22} strokeWidth={2.2} />,
  },
  {
    chuDe: 'bao-cao',
    nhan: 'Báo cáo',
    tieuDe: ['Báo cáo doanh thu', 'trong một lần bấm'],
    moTa: 'Lập báo cáo doanh thu theo tháng hoặc theo năm, xuất ra tập tin Excel hoặc PDF.',
    tenThe: 'Báo cáo doanh thu',
    moTaThe: 'Theo tháng và theo năm',
    icon: <BarChart3 size={22} strokeWidth={2.2} />,
  },
];

function cauLoi(e: unknown): { tieuDe: string; chiTiet: string } {
  if (laLoiApi(e) && e.ma === 'SAI_THONG_TIN_DANG_NHAP')
    return { tieuDe: 'Sai tên đăng nhập hoặc mật khẩu', chiTiet: 'Vui lòng kiểm tra lại, chú ý chữ hoa và chữ thường.' };
  if (laLoiApi(e) && e.ma === 'TAI_KHOAN_BI_KHOA')
    return { tieuDe: 'Tài khoản đã bị khóa', chiTiet: 'Vui lòng liên hệ Quản lý để được mở khóa.' };
  return { tieuDe: 'Không đăng nhập được', chiTiet: thongBaoLoi(e) };
}

export function TrangDangNhap() {
  const { nguoiDung, dangTai, dangNhap } = dungPhien();
  const dieuHuong = useNavigate();
  const viTri = useLocation();
  const [chiSo, datChiSo] = useState(0);
  const [tamDung, datTamDung] = useState(false);
  const [ten, datTen] = useState('');
  const [matKhau, datMatKhau] = useState('');
  const [hienMatKhau, datHienMatKhau] = useState(false);
  const [capsLock, datCapsLock] = useState(false);
  const [loiO, datLoiO] = useState<{ ten?: string; matKhau?: string }>({});
  const [loi, datLoi] = useState<{ tieuDe: string; chiTiet: string; lan: number } | null>(null);
  const [dangGui, datDangGui] = useState(false);
  const oTen = useRef<HTMLInputElement>(null);
  const oMatKhau = useRef<HTMLInputElement>(null);
  const onTamDung = useCallback((d: boolean) => datTamDung(d), []);

  if (dangTai) return <ManHinhCho />;
  if (nguoiDung) return <Navigate to="/" replace />;

  const guiDangNhap = async (e: React.FormEvent) => {
    e.preventDefault();
    const loiMoi: typeof loiO = {};
    if (!ten.trim()) loiMoi.ten = 'Vui lòng nhập tên đăng nhập.';
    if (!matKhau) loiMoi.matKhau = 'Vui lòng nhập mật khẩu.';
    datLoiO(loiMoi);
    if (loiMoi.ten || loiMoi.matKhau) {
      (loiMoi.ten ? oTen : oMatKhau).current?.focus();
      return;
    }
    datDangGui(true);
    datLoi(null);
    try {
      await dangNhap(ten.trim(), matKhau);
      const tu = (viTri.state as { tu?: string } | null)?.tu;
      dieuHuong(tu && tu !== '/dang-nhap' ? tu : '/', { replace: true });
    } catch (err) {
      datLoi({ ...cauLoi(err), lan: Date.now() });
      oMatKhau.current?.focus();
      oMatKhau.current?.select();
    } finally {
      datDangGui(false);
    }
  };

  const thoat = () => {
    datTen('');
    datMatKhau('');
    datLoi(null);
    datLoiO({});
    datHienMatKhau(false);
    oTen.current?.focus();
  };

  const kiemTraCaps = (e: React.KeyboardEvent) => datCapsLock(e.getModifierState?.('CapsLock') ?? false);
  const slide = SLIDE[chiSo];

  return (
    <div className={s.trang}>
      <div className={s.luoi}>
        <section className={s.trai} aria-label="Giới thiệu phần mềm">
          <Carousel
            muc={SLIDE}
            khoaMuc={(m) => m.chuDe}
            chiSo={chiSo}
            onDoiChiSo={datChiSo}
            onTamDung={onTamDung}
            dieuKhien="an"
            lapDay
            nhan="Tính năng chính"
            veSlide={(m, { dangChon }) => <CanhBauTroi chuDe={m.chuDe} bo="dung" key={dangChon ? 'chon' : 'khong'} />}
          />
          <div className={s.phu}>
            <div className={s.dauDo}>
              <div className={s.thuongHieu}>
                <Logo trang kichThuoc="lon" />
              </div>
              <p className={s.tenPhu} style={{ marginLeft: 68 }}>
                Phần mềm nội bộ của phòng vé · Nhóm 12
              </p>
            </div>
            <div className={s.duoi}>
              <div key={chiSo} className={s.doi}>
                <span className={s.nhanVang}>
                  <Sparkles size={16} /> {slide.nhan}
                </span>
                <h2 className={s.tieuDe}>
                  {slide.tieuDe[0]}
                  <br />
                  <span className={s.vang}>{slide.tieuDe[1]}</span>
                </h2>
                <p className={s.moTa}>{slide.moTa}</p>
              </div>
              <HangDieuKhien
                soLuong={SLIDE.length}
                chiSo={chiSo}
                den={datChiSo}
                toi
                canh="trai"
                className={s.dieuKhien}
                nhanSlide={(i) => SLIDE[i].tenThe}
              />
              <div className={s.cacThe}>
                {SLIDE.map((m, i) => (
                  <button key={m.chuDe} type="button" className={s.theKinh} aria-current={i === chiSo} onClick={() => datChiSo(i)}>
                    <span className={s.iconKinh}>{m.icon}</span>
                    <span>
                      <span className={s.tenThe}>{m.tenThe}</span>
                      <span className={s.moTaThe}>{m.moTaThe}</span>
                    </span>
                    {i === chiSo && <span key={chiSo} className={`${s.tienDo} ${tamDung ? s.tienDoDung : ''}`} aria-hidden />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={s.phai}>
          <div className={s.the}>
            <span className={s.oKhoa}>
              <IconChiaKhoa kichThuoc={52} />
            </span>
            <h1 className={s.tieuDeThe}>Đăng nhập</h1>
            <p className={s.phuThe}>Dành cho Quản lý và Nhân viên bán vé</p>

            <form className={s.form} onSubmit={guiDangNhap} noValidate>
              {loi && (
                <div key={loi.lan} className={s.hopLoi} role="alert">
                  <AlertCircle size={20} />
                  <span>
                    <b>{loi.tieuDe}</b>
                    {loi.chiTiet}
                  </span>
                </div>
              )}
              <ONhap
                ref={oTen}
                nhan="Tên đăng nhập"
                batBuoc
                autoFocus
                autoComplete="username"
                placeholder="Nhập tên đăng nhập"
                iconTrai={<UserRound size={18} />}
                value={ten}
                loi={loiO.ten}
                onChange={(e) => {
                  datTen(e.target.value);
                  if (loiO.ten) datLoiO({ ...loiO, ten: undefined });
                }}
              />
              <ONhap
                ref={oMatKhau}
                nhan="Mật khẩu"
                batBuoc
                type={hienMatKhau ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                iconTrai={<LockKeyhole size={18} />}
                value={matKhau}
                loi={loiO.matKhau}
                goiY={capsLock ? <span className={s.capsLock}>Caps Lock đang bật</span> : undefined}
                onKeyDown={kiemTraCaps}
                onKeyUp={kiemTraCaps}
                onChange={(e) => {
                  datMatKhau(e.target.value);
                  if (loiO.matKhau) datLoiO({ ...loiO, matKhau: undefined });
                }}
                ben={
                  <button
                    type="button"
                    className={s.nutMat}
                    aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    title={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={hienMatKhau}
                    onClick={() => datHienMatKhau((x) => !x)}
                  >
                    {hienMatKhau ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                }
              />
              <div className={s.cacNut}>
                <Nut type="submit" kichThuoc="lon" toanChieuRong dangXuLy={dangGui}>
                  {dangGui ? 'Đang đăng nhập' : 'Đăng nhập'}
                </Nut>
                <Nut bienThe="lang" kichThuoc="lon" toanChieuRong muiTen={false} onClick={thoat} disabled={dangGui}>
                  Thoát
                </Nut>
              </div>
            </form>
            <p className={s.ghiChu}>
              <Info size={16} />
              <span>
                Tài khoản bị khóa vui lòng liên hệ <b>Quản lý</b>
              </span>
            </p>
          </div>
          {CHE_DO_GIA_LAP && (
            <div className={s.giaLap}>
              Chế độ giả lập, bấm để điền:
              <button
                type="button"
                onClick={() => {
                  datTen('quanly');
                  datMatKhau('Quanly@123');
                }}
              >
                quanly
              </button>
              ·
              <button
                type="button"
                onClick={() => {
                  datTen('nhanvien');
                  datMatKhau('Nhanvien@123');
                }}
              >
                nhanvien
              </button>
            </div>
          )}
        </section>
      </div>
      <footer className={s.chan}>
        <span className={s.chanTrai}>
          <img src="/logo.svg" alt="" aria-hidden />
          {DONG_PHIEN_BAN}
        </span>
        <span>
          Nhấn <kbd className={s.phim}>Enter</kbd> để đăng nhập
        </span>
      </footer>
    </div>
  );
}
