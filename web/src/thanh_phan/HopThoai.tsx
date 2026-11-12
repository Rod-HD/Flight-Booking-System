// Hộp thoại: khung chung (HopThoai) cho biểu mẫu tùy ý và nơi hiện các hộp thoại gọi bằng hàm.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock3, HelpCircle, Trash2, X, XCircle } from 'lucide-react';
import { Nut, NutTron } from './Nut';
import { ngheHopThoai, type HopThoaiDangMo, type LoaiHopThoai } from './hop_thoai_kho';
import s from './HopThoai.module.css';

const PHAN_TU_FOCUS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ThuocTinhHopThoai {
  mo: boolean;
  onDong: () => void;
  tieuDe: React.ReactNode;
  moTa?: React.ReactNode;
  /** icon lớn phía trái tiêu đề (ví dụ icon 3D) */
  icon?: React.ReactNode;
  /** vòng màu quanh icon */
  mauIcon?: 'do' | 'xanh' | 'vang' | 'khong';
  children?: React.ReactNode;
  /** các nút ở chân, canh phải */
  chan?: React.ReactNode;
  rong?: number;
  /** bấm nền mờ có đóng không */
  dongKhiBamNen?: boolean;
  coNutDong?: boolean;
  /** hiện vòng quay thay nội dung (hộp thoại chờ) */
  vaiTro?: 'dialog' | 'alertdialog';
}

/** Khung hộp thoại dùng chung: Esc để đóng, giữ focus bên trong, trả focus khi đóng */
export function HopThoai({
  mo,
  onDong,
  tieuDe,
  moTa,
  icon,
  mauIcon = 'khong',
  children,
  chan,
  rong = 480,
  dongKhiBamNen = true,
  coNutDong = true,
  vaiTro = 'dialog',
}: ThuocTinhHopThoai) {
  const [hien, datHien] = useState(mo);
  const [dangDong, datDangDong] = useState(false);
  const the = useRef<HTMLDivElement>(null);
  const truoc = useRef<HTMLElement | null>(null);
  const idTieuDe = useRef(`ht-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (mo) {
      truoc.current = document.activeElement as HTMLElement;
      datHien(true);
      datDangDong(false);
    } else if (hien) {
      datDangDong(true);
      const id = window.setTimeout(() => {
        datHien(false);
        datDangDong(false);
        truoc.current?.focus?.();
      }, 160);
      return () => window.clearTimeout(id);
    }
  }, [mo]); // chỉ theo mo

  useEffect(() => {
    if (!hien || dangDong) return;
    const el = the.current;
    const dauTien = el?.querySelector<HTMLElement>('[data-tu-focus]') ?? el?.querySelector<HTMLElement>(PHAN_TU_FOCUS);
    (dauTien ?? el)?.focus();
    const cu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = cu;
    };
  }, [hien, dangDong]);

  if (!hien) return null;

  const xuLyPhim = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onDong();
    } else if (e.key === 'Tab' && the.current) {
      const ds = Array.from(the.current.querySelectorAll<HTMLElement>(PHAN_TU_FOCUS));
      if (!ds.length) return;
      const dau = ds[0];
      const cuoi = ds[ds.length - 1];
      if (e.shiftKey && document.activeElement === dau) {
        e.preventDefault();
        cuoi.focus();
      } else if (!e.shiftKey && document.activeElement === cuoi) {
        e.preventDefault();
        dau.focus();
      }
    }
  };

  const lopVong = mauIcon === 'do' ? s.vongDo : mauIcon === 'xanh' ? s.vongXanh : mauIcon === 'vang' ? s.vongVang : '';

  return createPortal(
    <div
      className={`${s.nen} ${dangDong ? s.dangDong : ''}`}
      onMouseDown={(e) => {
        if (dongKhiBamNen && e.target === e.currentTarget) onDong();
      }}
    >
      <div
        ref={the}
        className={s.the}
        role={vaiTro}
        aria-modal="true"
        aria-labelledby={idTieuDe}
        tabIndex={-1}
        style={{ ['--rong-hop-thoai' as string]: `${rong}px` }}
        onKeyDown={xuLyPhim}
      >
        {coNutDong && (
          <NutTron nhan="Đóng" bienThe="trong" kichThuoc="nho" className={s.dong} onClick={onDong}>
            <X size={18} />
          </NutTron>
        )}
        <div className={s.dau}>
          {icon && <span className={mauIcon === 'khong' ? undefined : `${s.vongIcon} ${lopVong}`}>{icon}</span>}
          <div className={s.chu}>
            <h2 id={idTieuDe} className={s.tieuDe}>
              {tieuDe}
            </h2>
            {moTa && <div className={s.noiDung}>{moTa}</div>}
          </div>
        </div>
        {children && <div className={s.than}>{children}</div>}
        {chan && <div className={s.chan}>{chan}</div>}
      </div>
    </div>,
    document.body,
  );
}

const ICON: Record<Exclude<LoaiHopThoai, 'cho'>, { icon: React.ReactNode; mau: 'do' | 'xanh' | 'vang' }> = {
  xoa: { icon: <Trash2 size={26} strokeWidth={2.2} />, mau: 'do' },
  loi: { icon: <XCircle size={28} strokeWidth={2.2} />, mau: 'do' },
  'thanh-cong': { icon: <CheckCircle2 size={28} strokeWidth={2.2} />, mau: 'xanh' },
  'canh-bao': { icon: <Clock3 size={26} strokeWidth={2.2} />, mau: 'vang' },
  'xac-nhan': { icon: <HelpCircle size={28} strokeWidth={2.2} />, mau: 'do' },
};

function MotHopThoai({ h }: { h: HopThoaiDangMo }) {
  const [mo, datMo] = useState(true);
  const traLoiSau = (dongY: boolean) => {
    datMo(false);
    window.setTimeout(() => h.traLoi(dongY), 160);
  };

  if (h.loai === 'cho') {
    return createPortal(
      <div className={s.nen}>
        <div className={`${s.the} ${s.cho}`} role="alertdialog" aria-modal="true" aria-busy="true" aria-label={h.tieuDe} style={{ ['--rong-hop-thoai' as string]: '380px' }}>
          <span className={s.vongQuay} aria-hidden />
          <span className={s.choChu}>{h.tieuDe}</span>
        </div>
      </div>,
      document.body,
    );
  }

  const cauHinh = ICON[h.loai];
  const coHaiNut = h.loai === 'xoa' || h.loai === 'xac-nhan' || (h.loai === 'canh-bao' && !!h.nutHuy);
  return (
    <HopThoai
      mo={mo}
      onDong={() => traLoiSau(false)}
      tieuDe={h.tieuDe}
      moTa={h.noiDung}
      icon={cauHinh.icon}
      mauIcon={cauHinh.mau}
      vaiTro="alertdialog"
      coNutDong={false}
      rong={460}
      chan={
        coHaiNut ? (
          <>
            <Nut bienThe="lang" onClick={() => traLoiSau(false)} data-tu-focus>
              {h.nutHuy ?? 'Không'}
            </Nut>
            <Nut bienThe={h.loai === 'xoa' ? 'nguy-hiem' : 'chinh'} muiTen={false} onClick={() => traLoiSau(true)}>
              {h.nutDongY}
            </Nut>
          </>
        ) : (
          <Nut bienThe="chinh" muiTen={false} onClick={() => traLoiSau(true)} data-tu-focus>
            {h.nutDongY ?? 'Đóng'}
          </Nut>
        )
      }
    />
  );
}

/** Đặt một lần ở gốc ứng dụng */
export function NoiHienHopThoai() {
  const [ds, datDs] = useState<HopThoaiDangMo[]>([]);
  useEffect(() => ngheHopThoai(datDs), []);
  return (
    <>
      {ds.map((h) => (
        <MotHopThoai key={h.id} h={h} />
      ))}
    </>
  );
}

