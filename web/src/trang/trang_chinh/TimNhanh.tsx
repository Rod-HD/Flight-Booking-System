// Thanh tìm nhanh nổi: chọn nghiệp vụ (Bán vé, Đặt vé, Tra cứu) rồi chuyển sang trang tương ứng kèm tham số.
// Tham số gửi đi: /ban-ve và /dat-ve nhận ?sanBayDi&sanBayDen&ngay, /chuyen-bay nhận ?sanBayDi&sanBayDen&tuNgay&denNgay
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, CalendarClock, PlaneLanding, PlaneTakeoff, Search, Ticket } from 'lucide-react';
import { apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { OChon, type LuaChon } from '@/thanh_phan/OChon';
import { ONgay } from '@/thanh_phan/ONgay';
import { LOP_O_PHANG, ThanhTimKiem } from '@/thanh_phan/ThanhTimKiem';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import s from './TrangChinh.module.css';

type NghiepVu = 'ban-ve' | 'dat-ve' | 'tra-cuu';

const CHU_NUT: Record<NghiepVu, string> = {
  'ban-ve': 'Tìm chuyến để bán',
  'dat-ve': 'Tìm chuyến để đặt',
  'tra-cuu': 'Tìm chuyến bay',
};

export function TimNhanh() {
  const dieuHuong = useNavigate();
  const [nghiepVu, datNghiepVu] = useState<NghiepVu>('ban-ve');
  const [di, datDi] = useState<string | null>(null);
  const [den, datDen] = useState<string | null>(null);
  const [ngay, datNgay] = useState('');
  const goc = useRef<HTMLDivElement>(null);
  const { data: quyDinh, isPending } = useQuery({ queryKey: khoaTruyVan.quyDinh, queryFn: apiQuyDinh.lay, staleTime: 300000 });

  const sanBay: LuaChon[] = useMemo(
    () => (quyDinh?.sanBay ?? []).map((sb) => ({ giaTri: sb.maSanBay, ma: sb.maSanBay, nhan: sb.tenSanBay })),
    [quyDinh],
  );

  dungPhimTat({ 'ctrl+f': () => goc.current?.querySelector<HTMLInputElement>('input')?.focus() });

  const tim = () => {
    if (di && den && di === den) {
      hienToast.loi('Sân bay đến phải khác sân bay đi.');
      return;
    }
    const p = new URLSearchParams();
    if (di) p.set('sanBayDi', di);
    if (den) p.set('sanBayDen', den);
    if (nghiepVu === 'tra-cuu') {
      if (ngay) {
        p.set('tuNgay', ngay);
        p.set('denNgay', ngay);
      }
      dieuHuong(`/chuyen-bay?${p}`);
    } else {
      if (ngay) p.set('ngay', ngay);
      dieuHuong(`/${nghiepVu}?${p}`);
    }
  };

  return (
    <div className={s.timNhanh} ref={goc}>
      <ThanhTimKiem<NghiepVu>
        tab={[
          { khoa: 'ban-ve', nhan: 'Bán vé', icon: <Ticket size={18} /> },
          { khoa: 'dat-ve', nhan: 'Đặt vé', icon: <CalendarClock size={18} /> },
          { khoa: 'tra-cuu', nhan: 'Tra cứu chuyến bay', icon: <Search size={18} /> },
        ]}
        giaTriTab={nghiepVu}
        onDoiTab={datNghiepVu}
        nhanTab="Tìm nhanh theo nghiệp vụ"
        onSubmit={tim}
      >
        <ThanhTimKiem.O>
          <OChon
            className={LOP_O_PHANG}
            nhan="Từ (sân bay đi)"
            giaTri={di}
            onDoi={datDi}
            luaChon={sanBay}
            dangTai={isPending}
            placeholder="Chọn sân bay đi"
            iconTrai={<PlaneTakeoff size={18} />}
          />
        </ThanhTimKiem.O>
        <ThanhTimKiem.O>
          <NutTron
            nhan="Đổi chiều sân bay đi và đến"
            className={s.nutDoiChieu}
            onClick={() => {
              datDi(den);
              datDen(di);
            }}
          >
            <ArrowLeftRight size={17} />
          </NutTron>
          <OChon
            className={LOP_O_PHANG}
            nhan="Đến (sân bay đến)"
            giaTri={den}
            onDoi={datDen}
            luaChon={sanBay}
            dangTai={isPending}
            placeholder="Chọn sân bay đến"
            iconTrai={<PlaneLanding size={18} />}
          />
        </ThanhTimKiem.O>
        <ThanhTimKiem.O rong={230}>
          <ONgay className={LOP_O_PHANG} nhan="Ngày đi" value={ngay} onChange={(e) => datNgay(e.target.value)} />
        </ThanhTimKiem.O>
        <ThanhTimKiem.Nut>
          <Nut type="submit" kichThuoc="lon">
            {CHU_NUT[nghiepVu]}
          </Nut>
        </ThanhTimKiem.Nut>
      </ThanhTimKiem>
    </div>
  );
}
