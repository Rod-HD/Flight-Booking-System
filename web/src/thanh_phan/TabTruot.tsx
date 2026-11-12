// Tab trượt: nền (hoặc gạch chân) chạy theo mục đang chọn. Dùng cho tab và công tắc hai lựa chọn.
import { useLayoutEffect, useRef, useState } from 'react';
import s from './TabTruot.module.css';

export interface MucTab<K extends string> {
  khoa: K;
  nhan: React.ReactNode;
  icon?: React.ReactNode;
  voHieu?: boolean;
}

export interface ThuocTinhTabTruot<K extends string> {
  muc: MucTab<K>[];
  giaTri: K;
  onDoi: (k: K) => void;
  kieu?: 'vien-thuoc' | 'gach-chan' | 'dai-do';
  nhan: string;
  className?: string;
  /** id vùng nội dung ứng với từng tab (aria-controls) */
  idNoiDung?: (k: K) => string;
}

export function TabTruot<K extends string>({ muc, giaTri, onDoi, kieu = 'vien-thuoc', nhan, className, idNoiDung }: ThuocTinhTabTruot<K>) {
  const goc = useRef<HTMLDivElement>(null);
  const [nen, datNen] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const capNhat = () => {
      const el = goc.current?.querySelector<HTMLElement>(`[data-khoa="${giaTri}"]`);
      if (el) datNen({ x: el.offsetLeft, w: el.offsetWidth });
    };
    capNhat();
    const ro = new ResizeObserver(capNhat);
    if (goc.current) ro.observe(goc.current);
    document.fonts?.ready.then(capNhat);
    return () => ro.disconnect();
  }, [giaTri, muc.length]);

  const diChuyen = (e: React.KeyboardEvent, i: number) => {
    const huong = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!huong) return;
    e.preventDefault();
    for (let b = 1; b <= muc.length; b += 1) {
      const ke = muc[(i + huong * b + muc.length) % muc.length];
      if (!ke.voHieu) {
        onDoi(ke.khoa);
        goc.current?.querySelector<HTMLElement>(`[data-khoa="${ke.khoa}"]`)?.focus();
        return;
      }
    }
  };

  const lopKieu = kieu === 'gach-chan' ? s.gachChan : kieu === 'dai-do' ? s.daiDo : s.vienThuoc;
  const gachNgan = kieu === 'dai-do' ? 24 : 0;

  return (
    <div ref={goc} className={`${s.tab} ${lopKieu} ${className ?? ''}`} role="tablist" aria-label={nhan}>
      {nen && (
        <span
          className={s.nen}
          aria-hidden
          style={{ width: nen.w - gachNgan * 2, transform: `translateX(${nen.x + gachNgan}px)` }}
        />
      )}
      {muc.map((m, i) => (
        <button
          key={m.khoa}
          type="button"
          role="tab"
          data-khoa={m.khoa}
          className={s.muc}
          aria-selected={m.khoa === giaTri}
          aria-controls={idNoiDung?.(m.khoa)}
          tabIndex={m.khoa === giaTri ? 0 : -1}
          disabled={m.voHieu}
          onClick={() => onDoi(m.khoa)}
          onKeyDown={(e) => diChuyen(e, i)}
        >
          {m.icon}
          {m.nhan}
        </button>
      ))}
    </div>
  );
}

/** Công tắc hai lựa chọn, ví dụ Bán trực tiếp / Bán từ phiếu đặt chỗ */
export function CongTac<K extends string>(p: { trai: MucTab<K>; phai: MucTab<K>; giaTri: K; onDoi: (k: K) => void; nhan: string; className?: string }) {
  return <TabTruot muc={[p.trai, p.phai]} giaTri={p.giaTri} onDoi={p.onDoi} kieu="vien-thuoc" nhan={p.nhan} className={p.className} />;
}
