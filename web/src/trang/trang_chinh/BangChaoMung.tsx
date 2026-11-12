// Băng chào mừng dạng carousel: lời chào theo buổi kèm tên đăng nhập, key visual có Vút
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { CanhBauTroi, type ChuDeCanh } from '@/canh/CanhBauTroi';
import { dungPhien } from '@/phien/NguCanhPhien';
import { Carousel } from '@/thanh_phan/Carousel';
import { Nut } from '@/thanh_phan/Nut';
import { loiChaoTheoBuoi } from '@/tien_ich/thoi_gian';
import s from './TrangChinh.module.css';

interface SlideChao {
  chuDe: ChuDeCanh;
  tieuDe: React.ReactNode;
  moTa: string;
  nut: { chu: string; den: string };
  nutPhu?: { chu: string; den: string };
}

function ngayHomNay(): string {
  const chu = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return chu.charAt(0).toUpperCase() + chu.slice(1);
}

export function BangChaoMung() {
  const { nguoiDung, laQuanLy } = dungPhien();
  const [chiSo, datChiSo] = useState(0);
  const ten = nguoiDung?.tenDangNhap ?? '';

  const slide: SlideChao[] = [
    {
      chuDe: 'chao',
      tieuDe: (
        <>
          {loiChaoTheoBuoi()}, <em>{ten}</em>!
        </>
      ),
      moTa: laQuanLy
        ? 'Chúc bạn một ca làm việc suôn sẻ. Lịch bay, bán vé, báo cáo và quy định đều ở ngay bên dưới.'
        : 'Chúc bạn một ca làm việc suôn sẻ. Tra cứu chuyến bay, bán vé và giữ chỗ đều ở ngay bên dưới.',
      nut: { chu: 'Tra cứu chuyến bay', den: '/chuyen-bay' },
      nutPhu: { chu: 'Bán vé', den: '/ban-ve' },
    },
    {
      chuDe: 'giu-cho',
      tieuDe: (
        <>
          Giữ chỗ linh hoạt, <em>tự hủy khi quá hạn</em>
        </>
      ),
      moTa: 'Phiếu đặt chỗ chưa thanh toán sẽ được hệ thống tự hủy khi đến hạn và ghi vào thanh thông báo.',
      nut: { chu: 'Xem phiếu đặt chỗ', den: '/phieu-dat' },
      nutPhu: { chu: 'Đặt vé', den: '/dat-ve' },
    },
    laQuanLy
      ? {
          chuDe: 'bao-cao',
          tieuDe: (
            <>
              Báo cáo doanh thu <em>trong một lần bấm</em>
            </>
          ),
          moTa: 'Lập báo cáo theo tháng hoặc theo năm, xuất ra Excel hoặc PDF để gửi đi.',
          nut: { chu: 'Lập báo cáo', den: '/bao-cao' },
        }
      : {
          chuDe: 'ban-ve',
          tieuDe: (
            <>
              Bán vé <em>từ phiếu đặt chỗ</em>
            </>
          ),
          moTa: 'Tìm phiếu theo giấy tờ hoặc mã phiếu rồi lập vé ngay tại quầy khi hành khách thanh toán.',
          nut: { chu: 'Bán vé từ phiếu', den: '/ban-ve?cheDo=tuPhieu' },
        },
  ];

  return (
    <section className={s.bang} aria-label="Lời chào">
      <Carousel
        muc={slide}
        khoaMuc={(m) => m.chuDe}
        chiSo={chiSo}
        onDoiChiSo={datChiSo}
        canhDieuKhien="phai"
        lopDieuKhien={s.dieuKhienBang}
        nhan="Băng chào mừng"
        veSlide={(m, { dangChon }) => (
          <div className={s.slide}>
            <CanhBauTroi chuDe={m.chuDe} bo="ngang" key={dangChon ? 'chon' : 'khong'} />
            <div className={s.chuBang}>
              <span className={s.nhanNgay}>
                <CalendarDays size={16} /> {ngayHomNay()}
              </span>
              <h1 className={s.loiChao}>{m.tieuDe}</h1>
              <p className={s.moTaBang}>{m.moTa}</p>
              <div className={s.nutBang}>
                <Nut den={m.nut.den} tabIndex={dangChon ? 0 : -1}>
                  {m.nut.chu}
                </Nut>
                {m.nutPhu && (
                  <Nut den={m.nutPhu.den} bienThe="lang" muiTen={false} tabIndex={dangChon ? 0 : -1}>
                    {m.nutPhu.chu}
                  </Nut>
                )}
              </div>
            </div>
          </div>
        )}
      />
    </section>
  );
}
