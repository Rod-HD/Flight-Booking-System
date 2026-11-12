// Ô chọn có gõ để lọc (combobox): gõ không dấu vẫn khớp, điều khiển bằng mũi tên, Enter, Esc.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { khopTuKhoa } from '@/tien_ich/dinh_dang';
import { dungBamRaNgoai } from '@/tien_ich/hook';
import { KhungTruong, dungIdTruong, type ThuocTinhTruong } from './ONhap';
import s from './ONhap.module.css';

export interface LuaChon {
  giaTri: string;
  nhan: string;
  /** chữ ngắn đậm phía trước, ví dụ mã sân bay */
  ma?: string;
  /** chữ phụ bên phải */
  phu?: string;
}

export interface ThuocTinhOChon extends ThuocTinhTruong {
  giaTri: string | null;
  onDoi: (giaTri: string | null) => void;
  luaChon: LuaChon[];
  placeholder?: string;
  iconTrai?: React.ReactNode;
  disabled?: boolean;
  /** hiện nút xóa lựa chọn */
  choXoa?: boolean;
  chuKhongCo?: string;
  id?: string;
  dangTai?: boolean;
}

export function OChon({
  nhan,
  batBuoc,
  goiY,
  loi,
  className,
  giaTri,
  onDoi,
  luaChon,
  placeholder = 'Gõ để tìm...',
  iconTrai,
  disabled,
  choXoa = true,
  chuKhongCo = 'Không có kết quả phù hợp',
  id,
  dangTai,
}: ThuocTinhOChon) {
  const idO = dungIdTruong(id);
  const idDs = `${idO}-ds`;
  const goc = useRef<HTMLDivElement>(null);
  const o = useRef<HTMLInputElement>(null);
  const dsRef = useRef<HTMLUListElement>(null);
  const [mo, datMo] = useState(false);
  const [tuKhoa, datTuKhoa] = useState('');
  const [sang, datSang] = useState(0);

  const dangChon = luaChon.find((l) => l.giaTri === giaTri) ?? null;
  const chuHienThi = (l: LuaChon | null) => (l ? (l.ma ? `${l.ma} · ${l.nhan}` : l.nhan) : '');

  const daLoc = useMemo(
    () => luaChon.filter((l) => khopTuKhoa(`${l.ma ?? ''} ${l.nhan} ${l.phu ?? ''}`, tuKhoa)),
    [luaChon, tuKhoa],
  );

  const dong = useCallback(() => {
    datMo(false);
    datTuKhoa('');
  }, []);
  dungBamRaNgoai(goc, dong, mo);

  useEffect(() => {
    if (!mo) return;
    const i = Math.max(0, daLoc.findIndex((l) => l.giaTri === giaTri));
    datSang(i);
    // chỉ đặt lại khi mở hoặc khi gõ, không theo giaTri
  }, [mo, tuKhoa]);

  useEffect(() => {
    if (!mo || !dsRef.current) return;
    const el = dsRef.current.querySelector<HTMLElement>(`[data-chi-so="${sang}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [sang, mo]);

  const chon = (l: LuaChon) => {
    onDoi(l.giaTri);
    dong();
  };

  const xuLyPhim = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!mo) datMo(true);
      else datSang((i) => Math.min(daLoc.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      datSang((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (mo && daLoc[sang]) {
        e.preventDefault();
        chon(daLoc[sang]);
      }
    } else if (e.key === 'Escape') {
      if (mo) {
        e.preventDefault();
        e.stopPropagation();
        dong();
      }
    } else if (e.key === 'Tab') {
      dong();
    }
  };

  return (
    <KhungTruong nhan={nhan} batBuoc={batBuoc} goiY={goiY} loi={loi} className={className} idO={idO} voHieu={disabled} lopThem={mo ? s.dangMo : ''}>
      <div className={s.khung} ref={goc}>
        {iconTrai && <span className={s.iconTrai}>{iconTrai}</span>}
        <input
          ref={o}
          id={idO}
          className={s.o}
          role="combobox"
          aria-expanded={mo}
          aria-controls={idDs}
          aria-autocomplete="list"
          aria-activedescendant={mo && daLoc[sang] ? `${idDs}-${sang}` : undefined}
          aria-invalid={!!loi || undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={dangTai ? 'Đang tải...' : dangChon ? chuHienThi(dangChon) : placeholder}
          value={mo ? tuKhoa : chuHienThi(dangChon)}
          onChange={(e) => {
            datTuKhoa(e.target.value);
            if (!mo) datMo(true);
          }}
          onFocus={() => datMo(true)}
          onClick={() => datMo(true)}
          onKeyDown={xuLyPhim}
        />
        <span className={s.ben}>
          {choXoa && giaTri && !disabled && (
            <button
              type="button"
              className={s.xoa}
              aria-label="Xóa lựa chọn"
              onClick={() => {
                onDoi(null);
                o.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          )}
          <span className={s.muiCombo} aria-hidden>
            <ChevronDown size={18} />
          </span>
        </span>
        {mo && !disabled && (
          <ul className={s.danhSach} id={idDs} role="listbox" ref={dsRef}>
            {daLoc.length === 0 && <li className={s.khongCo}>{dangTai ? 'Đang tải...' : chuKhongCo}</li>}
            {daLoc.map((l, i) => (
              <li
                key={l.giaTri}
                id={`${idDs}-${i}`}
                data-chi-so={i}
                role="option"
                aria-selected={l.giaTri === giaTri}
                data-sang={i === sang}
                className={s.luaChon}
                onPointerEnter={() => datSang(i)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => chon(l)}
              >
                {l.ma && <span className={s.maLuaChon}>{l.ma}</span>}
                <span>{l.nhan}</span>
                {l.giaTri === giaTri ? (
                  <Check size={16} className={s.tich} />
                ) : (
                  l.phu && <span className={s.phuLuaChon}>{l.phu}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </KhungTruong>
  );
}
