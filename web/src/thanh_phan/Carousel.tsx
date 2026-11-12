// Carousel tự viết: tự chạy 5 giây một slide, trượt 420 ms, dừng khi di chuột hoặc focus,
// kéo được bằng chuột và tay, nhiều slide mỗi màn, điều khiển được từ bên ngoài (chiSo, onDoiChiSo).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dungGiamChuyenDong } from '@/tien_ich/hook';
import { NutTron } from './Nut';
import s from './Carousel.module.css';

export interface HangDieuKhienProps {
  soLuong: number;
  chiSo: number;
  den: (i: number) => void;
  /** nền sáng (mặc định) hay đặt trên ảnh tối */
  toi?: boolean;
  canh?: 'giua' | 'trai' | 'phai';
  className?: string;
  nhanSlide?: (i: number) => string;
}

/** Hàng điều khiển: nút tròn trái, dãy chấm viên thuốc, nút tròn phải */
export function HangDieuKhien({ soLuong, chiSo, den, toi, canh = 'giua', className, nhanSlide }: HangDieuKhienProps) {
  if (soLuong <= 1) return null;
  return (
    <div className={[s.dieuKhien, toi ? s.toi : '', canh === 'trai' ? s.trai : canh === 'phai' ? s.phai : '', className ?? ''].join(' ')}>
      <NutTron nhan="Slide trước" bienThe={toi ? 'toi' : 'nhat'} onClick={() => den((chiSo - 1 + soLuong) % soLuong)}>
        <ChevronLeft size={20} />
      </NutTron>
      <div className={s.dayCham} role="tablist" aria-label="Chọn slide">
        {Array.from({ length: soLuong }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            className={s.cham}
            aria-current={i === chiSo}
            aria-selected={i === chiSo}
            aria-label={nhanSlide ? nhanSlide(i) : `Slide ${i + 1}`}
            onClick={() => den(i)}
          />
        ))}
      </div>
      <NutTron nhan="Slide sau" bienThe={toi ? 'toi' : 'nhat'} onClick={() => den((chiSo + 1) % soLuong)}>
        <ChevronRight size={20} />
      </NutTron>
    </div>
  );
}

export interface ThuocTinhCarousel<T> {
  muc: T[];
  veSlide: (muc: T, trangThai: { dangChon: boolean; chiSo: number }) => React.ReactNode;
  khoaMuc?: (muc: T, i: number) => string;
  /** số slide mỗi màn; có thể là hàm theo bề rộng khung */
  moiMan?: number | ((rong: number) => number);
  khoangCach?: number;
  tuChay?: boolean;
  thoiGian?: number;
  /** điều khiển từ ngoài */
  chiSo?: number;
  onDoiChiSo?: (i: number) => void;
  dieuKhien?: 'duoi' | 'an';
  canhDieuKhien?: 'giua' | 'trai' | 'phai';
  dieuKhienToi?: boolean;
  lopDieuKhien?: string;
  boGoc?: number;
  nhan: string;
  nhanSlide?: (i: number) => string;
  className?: string;
  /** báo cho ngoài biết đang tạm dừng (để làm thanh tiến độ) */
  onTamDung?: (dung: boolean) => void;
  /** cao bằng khung cha */
  lapDay?: boolean;
  /** chừa khoảng trên dưới, hai bên để bóng của thẻ không bị cắt */
  demDoc?: number;
  demNgang?: number;
}

export function Carousel<T>({
  muc,
  veSlide,
  khoaMuc,
  moiMan = 1,
  khoangCach = 0,
  tuChay = true,
  thoiGian = 5000,
  chiSo: chiSoNgoai,
  onDoiChiSo,
  dieuKhien = 'duoi',
  canhDieuKhien = 'giua',
  dieuKhienToi,
  lopDieuKhien,
  boGoc = 0,
  nhan,
  nhanSlide,
  className,
  onTamDung,
  lapDay,
  demDoc = 0,
  demNgang = 0,
}: ThuocTinhCarousel<T>) {
  const giam = dungGiamChuyenDong();
  const [chiSoTrong, datChiSoTrong] = useState(0);
  const chiSo = chiSoNgoai ?? chiSoTrong;
  const soLuong = muc.length;
  const khungRef = useRef<HTMLDivElement>(null);
  const [rong, datRong] = useState(0);
  const [diChuot, datDiChuot] = useState(false);
  const [coFocus, datCoFocus] = useState(false);
  const [keo, datKeo] = useState<{ batDau: number; lech: number } | null>(null);
  const daKeoXa = useRef(false);

  const den = useCallback(
    (i: number) => {
      const moi = ((i % soLuong) + soLuong) % soLuong;
      if (onDoiChiSo) onDoiChiSo(moi);
      if (chiSoNgoai === undefined) datChiSoTrong(moi);
    },
    [soLuong, onDoiChiSo, chiSoNgoai],
  );

  useLayoutEffect(() => {
    const el = khungRef.current;
    if (!el) return;
    const doRong = () => datRong(el.clientWidth - demNgang * 2);
    const ro = new ResizeObserver(doRong);
    ro.observe(el);
    doRong();
    return () => ro.disconnect();
  }, [demNgang]);

  const soMoiMan = Math.max(1, Math.min(soLuong, typeof moiMan === 'function' ? moiMan(rong || 1200) : moiMan));
  const rongSlide = rong ? (rong - khoangCach * (soMoiMan - 1)) / soMoiMan : 0;
  // slide đang chọn luôn nằm trong vùng nhìn; khi nhiều slide một màn thì trượt vừa đủ
  const viTri = Math.max(0, Math.min(chiSo - (soMoiMan > 1 ? soMoiMan - 1 : 0), soLuong - soMoiMan));
  const viTriHop = soMoiMan > 1 && chiSo < soMoiMan ? 0 : viTri;
  const dich = -(viTriHop * (rongSlide + khoangCach)) + (keo?.lech ?? 0);

  const tamDung = diChuot || coFocus || !!keo || giam || !tuChay;
  useEffect(() => {
    onTamDung?.(tamDung);
  }, [tamDung, onTamDung]);

  useEffect(() => {
    if (tamDung || soLuong <= 1) return;
    const id = window.setTimeout(() => den(chiSo + 1), thoiGian);
    return () => window.clearTimeout(id);
  }, [tamDung, chiSo, soLuong, thoiGian, den]);

  const batDauKeo = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    daKeoXa.current = false;
    datKeo({ batDau: e.clientX, lech: 0 });
  };
  const dangKeo = (e: React.PointerEvent) => {
    if (!keo) return;
    const lech = e.clientX - keo.batDau;
    if (Math.abs(lech) > 6 && !daKeoXa.current) {
      daKeoXa.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    // kéo quá mép thì nặng tay hơn
    const mep = (viTriHop === 0 && lech > 0) || (viTriHop >= soLuong - soMoiMan && lech < 0);
    datKeo({ ...keo, lech: mep ? lech * 0.35 : lech });
  };
  const thaKeo = () => {
    if (!keo) return;
    const nguong = Math.min(80, (rongSlide || 300) * 0.18);
    if (keo.lech < -nguong) den(soMoiMan > 1 ? Math.max(chiSo, viTriHop + soMoiMan - 1) + 1 : chiSo + 1);
    else if (keo.lech > nguong) den(soMoiMan > 1 ? Math.min(chiSo, viTriHop) - 1 : chiSo - 1);
    datKeo(null);
  };

  const xuLyPhim = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowRight') den(chiSo + 1);
    else if (e.key === 'ArrowLeft') den(chiSo - 1);
  };

  return (
    <div
      className={`${s.carousel} ${lapDay ? s.lapDay : ''} ${className ?? ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={nhan}
      tabIndex={0}
      onKeyDown={xuLyPhim}
      onMouseEnter={() => datDiChuot(true)}
      onMouseLeave={() => datDiChuot(false)}
      onFocus={() => datCoFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) datCoFocus(false);
      }}
    >
      <div
        ref={khungRef}
        className={`${s.khungNhin} ${keo && daKeoXa.current ? s.dangKeo : ''}`}
        style={{ ['--bo-carousel' as string]: `${boGoc}px`, padding: demDoc || demNgang ? `${demDoc}px ${demNgang}px` : undefined, margin: demDoc || demNgang ? `-${demDoc}px -${demNgang}px` : undefined }}
        onPointerDown={batDauKeo}
        onPointerMove={dangKeo}
        onPointerUp={thaKeo}
        onPointerCancel={thaKeo}
        onClickCapture={(e) => {
          // vừa kéo xong thì không tính là bấm vào slide
          if (daKeoXa.current) {
            e.preventDefault();
            e.stopPropagation();
            daKeoXa.current = false;
          }
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className={s.ray}
          style={{ transform: `translate3d(${dich}px,0,0)`, ['--khoang' as string]: `${khoangCach}px`, ['--rong-slide' as string]: rongSlide ? `${rongSlide}px` : `${100 / soMoiMan}%` }}
          aria-live={tamDung ? 'polite' : 'off'}
        >
          {muc.map((m, i) => (
            <div
              key={khoaMuc ? khoaMuc(m, i) : i}
              className={s.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} trên ${soLuong}`}
              aria-hidden={soMoiMan === 1 && i !== chiSo ? true : undefined}
            >
              {veSlide(m, { dangChon: i === chiSo, chiSo: i })}
            </div>
          ))}
        </div>
      </div>
      {dieuKhien === 'duoi' && (
        <HangDieuKhien soLuong={soLuong} chiSo={chiSo} den={den} toi={dieuKhienToi} canh={canhDieuKhien} className={lopDieuKhien} nhanSlide={nhanSlide} />
      )}
    </div>
  );
}
