// Ô chọn ngày hoặc ngày giờ tự vẽ: luôn hiển thị dd/MM/yyyy (và HH:mm 24 giờ) dù trình duyệt dùng ngôn ngữ nào.
// Giá trị trao đổi với trang vẫn là chuỗi ISO: '2026-11-12' hoặc '2026-11-12T14:30', chuỗi rỗng khi chưa chọn.
// onChange nhận đối tượng có target.value là chuỗi ISO, giống ô input gốc trước đây.
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { KhungTruong, dungIdTruong, type ThuocTinhTruong } from './ONhap';
import { Nut } from './Nut';
import s from './ONhap.module.css';
import l from './ONgay.module.css';

export interface ThuocTinhONgay
  extends ThuocTinhTruong,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'value' | 'min' | 'max'> {
  /** true: chọn cả giờ, giá trị dạng 2026-11-12T14:30 */
  coGio?: boolean;
  /** chuỗi ISO, rỗng khi chưa chọn */
  value?: string;
  /** chuỗi ISO nhỏ nhất được chọn */
  min?: string;
  /** chuỗi ISO lớn nhất được chọn */
  max?: string;
}

const hai = (n: number) => String(n).padStart(2, '0');
const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const TEN_THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const LOI_NGAY = 'Ngày không hợp lệ';

interface Ngay {
  nam: number;
  thang: number; // 1..12
  ngay: number;
}

const ngayIso = (d: Ngay) => `${d.nam}-${hai(d.thang)}-${hai(d.ngay)}`;
const ngayHienThi = (d: Ngay) => `${hai(d.ngay)}/${hai(d.thang)}/${d.nam}`;
const tuDate = (d: Date): Ngay => ({ nam: d.getFullYear(), thang: d.getMonth() + 1, ngay: d.getDate() });
const sangDate = (d: Ngay) => new Date(d.nam, d.thang - 1, d.ngay);
const congNgay = (d: Ngay, n: number) => tuDate(new Date(d.nam, d.thang - 1, d.ngay + n));
const cungNgay = (a: Ngay | null, b: Ngay | null) => !!a && !!b && a.nam === b.nam && a.thang === b.thang && a.ngay === b.ngay;

/** Ngày có thật không (loại 31/02, 29/02 năm không nhuận...) */
function hopLe(nam: number, thang: number, ngay: number) {
  if (nam < 1900 || nam > 2100 || thang < 1 || thang > 12 || ngay < 1) return false;
  return ngay <= new Date(nam, thang, 0).getDate();
}

/** Tách chuỗi ISO thành ngày và giờ phút */
function docGiaTri(v: string | undefined): { ngay: Ngay; gio: number; phut: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v ?? '');
  if (!m || !hopLe(+m[1], +m[2], +m[3])) return null;
  return { ngay: { nam: +m[1], thang: +m[2], ngay: +m[3] }, gio: +(m[4] ?? 0), phut: +(m[5] ?? 0) };
}

function hienThi(v: string | undefined, coGio?: boolean): string {
  const g = docGiaTri(v);
  if (!g) return '';
  return coGio ? `${ngayHienThi(g.ngay)} ${hai(g.gio)}:${hai(g.phut)}` : ngayHienThi(g.ngay);
}

/** So sánh hai chuỗi ISO trên phần chung (ngày với ngày giờ thì chỉ so phần ngày) */
function soSanh(a: string, b: string) {
  const n = Math.min(a.length, b.length);
  const x = a.slice(0, n);
  const y = b.slice(0, n);
  return x < y ? -1 : x > y ? 1 : 0;
}

const DO_DAI = [2, 2, 4, 2, 2];
const DAU_NOI = ['/', '/', ' ', ':'];

/**
 * Định dạng lại chữ đang gõ: tự chèn '/', ' ' và ':'.
 * Gõ dấu phân cách sớm (ví dụ '1/') thì đệm số 0 cho đủ hai chữ số.
 * dangThem = true khi người dùng gõ thêm, khi đó tự thêm dấu nối ở cuối nếu nhóm vừa đủ.
 */
function dinhDangKhiGo(tho: string, coGio: boolean, dangThem: boolean): string {
  const iso = docGiaTri(tho.trim());
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(tho.trim())) return hienThi(tho.trim().slice(0, coGio ? 16 : 10), coGio);
  const soNhom = coGio ? 5 : 3;
  const nhom: string[] = [''];
  let dong = false; // nhóm cuối đã được đóng bằng dấu phân cách
  for (const c of tho) {
    const i = nhom.length - 1;
    if (/\d/.test(c)) {
      if (nhom[i].length >= DO_DAI[i] || dong) {
        if (nhom.length >= soNhom) break;
        nhom.push(c);
        dong = false;
      } else nhom[i] += c;
    } else if (nhom[i] !== '' && !dong && nhom.length < soNhom) {
      if (DO_DAI[i] === 2 && nhom[i].length === 1) nhom[i] = '0' + nhom[i];
      if (nhom[i].length === DO_DAI[i]) dong = true;
    }
  }
  let kq = nhom[0];
  for (let i = 1; i < nhom.length; i++) kq += DAU_NOI[i - 1] + nhom[i];
  const cuoi = nhom.length - 1;
  if (dangThem && cuoi < soNhom - 1 && (dong || nhom[cuoi].length === DO_DAI[cuoi])) kq += DAU_NOI[cuoi];
  return kq;
}

/** Đọc chữ dd/mm/yyyy [hh:mm] thành ISO; null khi sai. gioMacDinh dùng khi ô có giờ nhưng chỉ gõ ngày */
function docChu(chu: string, coGio: boolean, gioMacDinh: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/.exec(chu.trim());
  if (!m) return null;
  const [d, t, n] = [+m[1], +m[2], +m[3]];
  if (!hopLe(n, t, d)) return null;
  const iso = `${n}-${hai(t)}-${hai(d)}`;
  if (!coGio) return m[4] === undefined ? iso : null;
  if (m[4] === undefined) return `${iso}T${gioMacDinh}`;
  const [g, p] = [+m[4], +m[5]];
  if (g > 23 || p > 59) return null;
  return `${iso}T${hai(g)}:${hai(p)}`;
}

/** 42 ô của bảng lịch (6 tuần, bắt đầu thứ Hai) */
function oCuaThang(nam: number, thang: number): Ngay[] {
  const dau = new Date(nam, thang - 1, 1);
  const lech = (dau.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => tuDate(new Date(nam, thang - 1, 1 - lech + i)));
}

function suKien(value: string, name: string | undefined, id: string) {
  const t = { value, name, id } as unknown as HTMLInputElement;
  return { target: t, currentTarget: t } as unknown as React.ChangeEvent<HTMLInputElement>;
}

export const ONgay = forwardRef<HTMLInputElement, ThuocTinhONgay>(function ONgay(
  { nhan, batBuoc, goiY, loi, className, coGio = false, id, disabled, value, onChange, onBlur, onKeyDown, min, max, placeholder, name, ...con },
  ref,
) {
  const idO = dungIdTruong(id);
  const idBang = `${idO}-lich`;
  const oRef = useRef<HTMLInputElement | null>(null);
  const khungRef = useRef<HTMLDivElement>(null);
  const bangRef = useRef<HTMLDivElement>(null);
  const [chu, datChu] = useState(() => hienThi(value, coGio));
  const [loiNoi, datLoiNoi] = useState<string | null>(null);
  const [mo, datMo] = useState(false);

  const daChon = docGiaTri(value);
  // đồng bộ chữ hiển thị khi trang đổi giá trị
  useEffect(() => {
    datChu(hienThi(value, coGio));
    datLoiNoi(null);
  }, [value, coGio]);

  const gioMacDinh = daChon ? `${hai(daChon.gio)}:${hai(daChon.phut)}` : '00:00';

  const ganRef = useCallback(
    (el: HTMLInputElement | null) => {
      oRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const phat = (iso: string) => {
    datLoiNoi(null);
    datChu(hienThi(iso, coGio));
    if (iso !== (value ?? '')) onChange?.(suKien(iso, name, idO));
  };

  /** kiểm tra khoảng min/max, trả về lời báo lỗi hoặc null */
  const loiKhoang = (iso: string): string | null => {
    if (min && soSanh(iso, min) < 0) return coGio && min.length > 10 ? `Phải từ ${hienThi(min, true)} trở đi` : `Phải từ ngày ${hienThi(min)} trở đi`;
    if (max && soSanh(iso, max) > 0) return coGio && max.length > 10 ? `Phải trước hoặc bằng ${hienThi(max, true)}` : `Phải trước hoặc bằng ngày ${hienThi(max)}`;
    return null;
  };

  /** chốt chữ đang gõ; trả về true khi hợp lệ */
  const chot = (): boolean => {
    if (chu.trim() === '') {
      phat('');
      return true;
    }
    const iso = docChu(chu, coGio, gioMacDinh);
    if (!iso) {
      datLoiNoi(LOI_NGAY);
      return false;
    }
    const lk = loiKhoang(iso);
    if (lk) {
      datLoiNoi(lk);
      return false;
    }
    phat(iso);
    return true;
  };

  const doiChu = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tho = e.target.value;
    const dangThem = tho.length > chu.length;
    const viTri = e.target.selectionStart ?? tho.length;
    const moi = dinhDangKhiGo(tho, coGio, dangThem);
    datChu(moi);
    datLoiNoi(null);
    // giữ con trỏ sau cùng số chữ số như trước khi định dạng lại
    if (viTri < tho.length) {
      const soChuSo = tho.slice(0, viTri).replace(/\D/g, '').length;
      let k = 0;
      let pos = 0;
      while (pos < moi.length && k < soChuSo) {
        if (/\d/.test(moi[pos])) k++;
        pos++;
      }
      requestAnimationFrame(() => oRef.current?.setSelectionRange(pos, pos));
    }
    // gõ đủ một ngày hợp lệ thì báo cho trang ngay
    const iso = docChu(moi, coGio, gioMacDinh);
    if (iso && moi.length === (coGio ? 16 : 10) && !loiKhoang(iso) && iso !== value) onChange?.(suKien(iso, name, idO));
  };

  const xuLyPhim = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'ArrowDown' && (e.altKey || !mo)) {
      e.preventDefault();
      datMo(true);
      return;
    }
    if (e.key === 'Escape' && mo) {
      e.preventDefault();
      e.stopPropagation();
      datMo(false);
      return;
    }
    if (e.key === 'Enter') {
      const daDoi = chu !== hienThi(value, coGio);
      if (!daDoi) return; // để biểu mẫu gửi như bình thường
      e.preventDefault();
      if (chot()) {
        // đợi trang nhận giá trị mới rồi mới gửi biểu mẫu
        const bieuMau = e.currentTarget.form;
        if (bieuMau) window.setTimeout(() => bieuMau.requestSubmit(), 0);
      }
    }
  };

  const dong = useCallback((traConTro: boolean) => {
    datMo(false);
    if (traConTro) oRef.current?.focus();
  }, []);

  const loiHien = loi ?? loiNoi;
  const trong = chu === '';

  return (
    <KhungTruong nhan={nhan} batBuoc={batBuoc} goiY={goiY} loi={loiHien} className={className} idO={idO} voHieu={disabled}>
      <div ref={khungRef} className={`${s.khung} ${s.khungNgay} ${mo ? s.dangMoLich : ''}`}>
        <button
          type="button"
          className={s.nutLich}
          aria-label={mo ? 'Đóng bảng lịch' : coGio ? 'Mở bảng chọn ngày giờ' : 'Mở bảng chọn ngày'}
          aria-haspopup="dialog"
          aria-expanded={mo}
          aria-controls={mo ? idBang : undefined}
          disabled={disabled}
          onClick={() => (mo ? dong(true) : datMo(true))}
        >
          <CalendarDays size={18} />
        </button>
        <input
          ref={ganRef}
          id={idO}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={coGio ? 16 : 10}
          placeholder={placeholder ?? (coGio ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy')}
          className={`${s.o} ${s.oNgay} ${trong ? s.ngayTrong : ''}`}
          disabled={disabled}
          required={batBuoc}
          value={chu}
          aria-invalid={!!loiHien || undefined}
          aria-describedby={loiHien ? `${idO}-loi` : goiY ? `${idO}-goi-y` : undefined}
          aria-haspopup="dialog"
          aria-expanded={mo}
          onChange={doiChu}
          onKeyDown={xuLyPhim}
          onBlur={(e) => {
            chot();
            onBlur?.(e);
          }}
          {...con}
        />
      </div>
      {mo && !disabled && (
        <BangLich
          id={idBang}
          nhan={nhan}
          neo={khungRef}
          bangRef={bangRef}
          coGio={coGio}
          value={value}
          min={min}
          max={max}
          loiKhoang={loiKhoang}
          onChon={(iso, dongLuon) => {
            const lk = loiKhoang(iso);
            if (lk) {
              datLoiNoi(lk);
              datChu(hienThi(iso, coGio));
              return;
            }
            phat(iso);
            if (dongLuon) dong(true);
          }}
          onDong={dong}
        />
      )}
    </KhungTruong>
  );
});

interface ThuocTinhBangLich {
  id: string;
  nhan?: string;
  neo: React.RefObject<HTMLDivElement>;
  bangRef: React.RefObject<HTMLDivElement>;
  coGio: boolean;
  value?: string;
  min?: string;
  max?: string;
  loiKhoang: (iso: string) => string | null;
  onChon: (iso: string, dong: boolean) => void;
  onDong: (traConTro: boolean) => void;
}

/** Bảng lịch nổi, vẽ qua cổng vào body để không bị khung cha cắt */
function BangLich({ id, nhan, neo, bangRef, coGio, value, min, max, onChon, onDong }: ThuocTinhBangLich) {
  const daChon = docGiaTri(value);
  const homNay = tuDate(new Date());
  const ngayMin = docGiaTri(min)?.ngay ?? null;
  const ngayMax = docGiaTri(max)?.ngay ?? null;
  const ngoaiKhoang = (d: Ngay) => (!!ngayMin && ngayIso(d) < ngayIso(ngayMin)) || (!!ngayMax && ngayIso(d) > ngayIso(ngayMax));

  const batDau = daChon?.ngay ?? (ngayMin && ngayIso(homNay) < ngayIso(ngayMin) ? ngayMin : ngayMax && ngayIso(homNay) > ngayIso(ngayMax) ? ngayMax : homNay);
  const [xem, datXem] = useState({ nam: batDau.nam, thang: batDau.thang });
  const [tieuDiem, datTieuDiem] = useState<Ngay>(batDau);
  const [gio, datGio] = useState(daChon ? hai(daChon.gio) : '08');
  const [phut, datPhut] = useState(daChon ? hai(daChon.phut) : '00');
  const [viTri, datViTri] = useState<{ top: number; left: number; lenTren: boolean } | null>(null);
  const luoiRef = useRef<HTMLDivElement>(null);
  const tuBanPhim = useRef(false);

  // đặt vị trí dưới ô, lật lên khi sát đáy màn hình
  const dinhViTri = useCallback(() => {
    const k = neo.current?.getBoundingClientRect();
    const b = bangRef.current;
    if (!k || !b) return;
    const cao = b.offsetHeight;
    const rong = b.offsetWidth;
    const duoi = window.innerHeight - k.bottom;
    const lenTren = duoi < cao + 16 && k.top > duoi;
    const top = lenTren ? k.top - cao - 8 : k.bottom + 8;
    const left = Math.max(8, Math.min(k.left, window.innerWidth - rong - 8));
    datViTri({ top, left, lenTren });
  }, [neo, bangRef]);

  useLayoutEffect(() => {
    dinhViTri();
    window.addEventListener('resize', dinhViTri);
    window.addEventListener('scroll', dinhViTri, true);
    return () => {
      window.removeEventListener('resize', dinhViTri);
      window.removeEventListener('scroll', dinhViTri, true);
    };
  }, [dinhViTri]);

  // nhấp ra ngoài thì đóng
  useEffect(() => {
    const xuLy = (e: PointerEvent) => {
      const t = e.target as Node;
      if (neo.current?.contains(t) || bangRef.current?.contains(t)) return;
      onDong(false);
    };
    document.addEventListener('pointerdown', xuLy);
    return () => document.removeEventListener('pointerdown', xuLy);
  }, [neo, bangRef, onDong]);

  // định vị xong (bảng đã hiện) thì đưa con trỏ vào ngày đang chọn
  const daDuaConTro = useRef(false);
  useEffect(() => {
    if (!viTri || daDuaConTro.current) return;
    daDuaConTro.current = true;
    luoiRef.current?.querySelector<HTMLButtonElement>('[data-tieu-diem="true"]')?.focus({ preventScroll: true });
  }, [viTri]);
  useEffect(() => {
    if (!tuBanPhim.current) return;
    tuBanPhim.current = false;
    luoiRef.current?.querySelector<HTMLButtonElement>('[data-tieu-diem="true"]')?.focus({ preventScroll: true });
  }, [tieuDiem]);

  const oNgay = useMemo(() => oCuaThang(xem.nam, xem.thang), [xem]);

  const doiThang = (n: number) => {
    const d = new Date(xem.nam, xem.thang - 1 + n, 1);
    datXem({ nam: d.getFullYear(), thang: d.getMonth() + 1 });
  };

  const thangTruocBiKhoa = !!ngayMin && ngayIso({ nam: xem.nam, thang: xem.thang, ngay: 1 }) <= ngayIso(ngayMin);
  const thangSauBiKhoa = !!ngayMax && ngayIso(tuDate(new Date(xem.nam, xem.thang, 0))) >= ngayIso(ngayMax);

  const isoCua = (d: Ngay, g = gio, p = phut) => (coGio ? `${ngayIso(d)}T${hai(Math.min(23, +g || 0))}:${hai(Math.min(59, +p || 0))}` : ngayIso(d));

  const chonNgay = (d: Ngay) => {
    if (ngoaiKhoang(d)) return;
    datTieuDiem(d);
    if (d.thang !== xem.thang || d.nam !== xem.nam) datXem({ nam: d.nam, thang: d.thang });
    onChon(isoCua(d), !coGio);
  };

  const diChuyen = (d: Ngay) => {
    tuBanPhim.current = true;
    datTieuDiem(d);
    if (d.thang !== xem.thang || d.nam !== xem.nam) datXem({ nam: d.nam, thang: d.thang });
  };

  const phimLuoi = (e: React.KeyboardEvent) => {
    const buoc: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in buoc) {
      e.preventDefault();
      diChuyen(congNgay(tieuDiem, buoc[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const d = new Date(tieuDiem.nam, tieuDiem.thang - 1 + (e.key === 'PageUp' ? -1 : 1), 1);
      const cuoiThang = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      diChuyen({ nam: d.getFullYear(), thang: d.getMonth() + 1, ngay: Math.min(tieuDiem.ngay, cuoiThang) });
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const thu = (sangDate(tieuDiem).getDay() + 6) % 7;
      diChuyen(congNgay(tieuDiem, e.key === 'Home' ? -thu : 6 - thu));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      chonNgay(tieuDiem);
    }
  };

  const doiGio = (g: string, p: string) => {
    datGio(g);
    datPhut(p);
    if (daChon && g !== '' && p !== '') onChon(isoCua(daChon.ngay, g, p), false);
  };

  const buocGio = (n: number) => doiGio(hai((((+gio || 0) + n) % 24 + 24) % 24), phut);
  const buocPhut = (n: number) => {
    const p = +phut || 0;
    const moi = n > 0 ? Math.floor(p / 5) * 5 + 5 : Math.ceil(p / 5) * 5 - 5;
    doiGio(gio, hai(((moi % 60) + 60) % 60));
  };

  const homNayIso = coGio ? isoCua(homNay) : ngayIso(homNay);

  const bang = (
    <div
      ref={bangRef}
      id={id}
      role="dialog"
      aria-label={nhan ? `Chọn ${nhan.toLowerCase()}` : 'Chọn ngày'}
      className={`${l.bang} ${viTri?.lenTren ? l.lenTren : ''}`}
      style={viTri ? { top: viTri.top, left: viTri.left } : { top: -9999, left: -9999, visibility: 'hidden' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onDong(true);
        }
      }}
    >
      <div className={l.dauBang}>
        <button type="button" className={l.nutThang} onClick={() => doiThang(-1)} disabled={thangTruocBiKhoa} aria-label="Tháng trước">
          <ChevronLeft size={18} />
        </button>
        <span className={l.tieuDe} aria-live="polite">
          Tháng {xem.thang} năm {xem.nam}
        </span>
        <button type="button" className={l.nutThang} onClick={() => doiThang(1)} disabled={thangSauBiKhoa} aria-label="Tháng sau">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className={l.hangThu} aria-hidden>
        {THU.map((t) => (
          <span key={t} className={t === 'CN' ? l.chuNhat : undefined}>
            {t}
          </span>
        ))}
      </div>
      <div ref={luoiRef} className={l.luoi} role="grid" aria-label={`Tháng ${xem.thang} năm ${xem.nam}`} onKeyDown={phimLuoi}>
        {Array.from({ length: 6 }, (_, tuan) => (
          <div key={tuan} role="row" className={l.hangNgay}>
            {oNgay.slice(tuan * 7, tuan * 7 + 7).map((d) => {
              const khoa = ngoaiKhoang(d);
              const chon = cungNgay(d, daChon?.ngay ?? null);
              const tieuDiemO = cungNgay(d, tieuDiem);
              const ngoaiThang = d.thang !== xem.thang;
              return (
                <button
                  key={ngayIso(d)}
                  type="button"
                  role="gridcell"
                  className={[l.ngay, ngoaiThang ? l.ngoaiThang : '', cungNgay(d, homNay) ? l.homNay : '', chon ? l.daChon : ''].join(' ')}
                  disabled={khoa}
                  tabIndex={tieuDiemO ? 0 : -1}
                  data-tieu-diem={tieuDiemO}
                  aria-selected={chon}
                  aria-current={cungNgay(d, homNay) ? 'date' : undefined}
                  aria-label={`${TEN_THU[sangDate(d).getDay()]}, ${d.ngay} tháng ${d.thang} năm ${d.nam}`}
                  onClick={() => chonNgay(d)}
                >
                  {d.ngay}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {coGio && (
        <div className={l.hangGio}>
          <span className={l.nhanGio}>Giờ khởi hành</span>
          <OSoGio
            nhan="Giờ"
            giaTri={gio}
            toiDa={23}
            onDoi={(g) => doiGio(g, phut)}
            onTang={() => buocGio(1)}
            onGiam={() => buocGio(-1)}
          />
          <span className={l.haiCham} aria-hidden>
            :
          </span>
          <OSoGio
            nhan="Phút"
            giaTri={phut}
            toiDa={59}
            onDoi={(p) => doiGio(gio, p)}
            onTang={() => buocPhut(1)}
            onGiam={() => buocPhut(-1)}
          />
        </div>
      )}
      <div className={l.chanBang}>
        <Nut
          bienThe="phu"
          kichThuoc="nho"
          muiTen={false}
          disabled={!coGio && ngoaiKhoang(homNay)}
          onClick={() => {
            datXem({ nam: homNay.nam, thang: homNay.thang });
            datTieuDiem(homNay);
            if (!ngoaiKhoang(homNay)) onChon(homNayIso, !coGio);
          }}
        >
          Hôm nay
        </Nut>
        <Nut
          bienThe="lang"
          kichThuoc="nho"
          muiTen={false}
          onClick={() => {
            onChon('', true);
          }}
        >
          Xóa
        </Nut>
        {coGio && (
          <Nut
            bienThe="chinh"
            kichThuoc="nho"
            className={l.nutXong}
            onClick={() => {
              if (daChon) onChon(isoCua(daChon.ngay), true);
              else if (!ngoaiKhoang(tieuDiem)) onChon(isoCua(tieuDiem), true);
              else onDong(true);
            }}
          >
            Xong
          </Nut>
        )}
      </div>
    </div>
  );
  return createPortal(bang, document.body);
}

interface ThuocTinhOSoGio {
  nhan: string;
  giaTri: string;
  toiDa: number;
  onDoi: (v: string) => void;
  onTang: () => void;
  onGiam: () => void;
}

/** Ô hai chữ số cho giờ hoặc phút: gõ tay, mũi tên lên xuống hoặc nút tăng giảm */
function OSoGio({ nhan, giaTri, toiDa, onDoi, onTang, onGiam }: ThuocTinhOSoGio) {
  return (
    <div className={l.oGio}>
      <input
        type="text"
        inputMode="numeric"
        aria-label={nhan}
        maxLength={2}
        value={giaTri}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const so = e.target.value.replace(/\D/g, '').slice(0, 2);
          onDoi(so !== '' && +so > toiDa ? String(toiDa) : so);
        }}
        onBlur={() => onDoi(hai(Math.min(toiDa, +giaTri || 0)))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            onTang();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onGiam();
          }
        }}
      />
      <span className={l.nutBuoc}>
        <button type="button" tabIndex={-1} aria-label={`Tăng ${nhan.toLowerCase()}`} onClick={onTang}>
          <ChevronUp size={14} strokeWidth={2.6} />
        </button>
        <button type="button" tabIndex={-1} aria-label={`Giảm ${nhan.toLowerCase()}`} onClick={onGiam}>
          <ChevronDown size={14} strokeWidth={2.6} />
        </button>
      </span>
    </div>
  );
}
