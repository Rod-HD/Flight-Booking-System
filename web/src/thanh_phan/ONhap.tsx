// Ô nhập chữ, ô chọn gốc và khung trường dùng chung (nhãn, dấu sao bắt buộc, gợi ý, lỗi)
import { forwardRef, useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import s from './ONhap.module.css';

export interface ThuocTinhTruong {
  nhan?: string;
  batBuoc?: boolean;
  goiY?: React.ReactNode;
  loi?: string | null;
  className?: string;
}

interface KhungTruongProps extends ThuocTinhTruong {
  idO: string;
  voHieu?: boolean;
  chiDoc?: boolean;
  children: React.ReactNode;
  lopThem?: string;
}

/** Khung bao quanh mọi loại ô nhập, giữ cùng một kiểu nhãn và báo lỗi */
export function KhungTruong({ nhan, batBuoc, goiY, loi, className, idO, voHieu, chiDoc, children, lopThem }: KhungTruongProps) {
  const lop = [s.truong, batBuoc ? s.batBuoc : '', loi ? s.loi : '', voHieu ? s.voHieu : '', chiDoc ? s.chiDoc : '', lopThem ?? '', className ?? ''].join(' ');
  return (
    <div className={lop}>
      {nhan && (
        <label htmlFor={idO} className={s.nhan}>
          {nhan}
          {batBuoc && (
            <span className={s.sao} aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {loi ? (
        <span className={s.chuLoi} id={`${idO}-loi`} role="alert">
          <AlertCircle size={15} strokeWidth={2.4} />
          {loi}
        </span>
      ) : (
        goiY && (
          <span className={s.goiY} id={`${idO}-goi-y`}>
            {goiY}
          </span>
        )
      )}
    </div>
  );
}

export function dungIdTruong(id?: string) {
  const tuSinh = useId();
  return id ?? `o${tuSinh.replace(/:/g, '')}`;
}

export interface ThuocTinhONhap extends ThuocTinhTruong, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  iconTrai?: React.ReactNode;
  /** nội dung bên phải ô (nút hiện mật khẩu, đơn vị...) */
  ben?: React.ReactNode;
}

export const ONhap = forwardRef<HTMLInputElement, ThuocTinhONhap>(function ONhap(
  { nhan, batBuoc, goiY, loi, className, iconTrai, ben, id, disabled, readOnly, ...con },
  ref,
) {
  const idO = dungIdTruong(id);
  return (
    <KhungTruong nhan={nhan} batBuoc={batBuoc} goiY={goiY} loi={loi} className={className} idO={idO} voHieu={disabled} chiDoc={readOnly}>
      <div className={s.khung}>
        {iconTrai && <span className={s.iconTrai}>{iconTrai}</span>}
        <input
          ref={ref}
          id={idO}
          className={s.o}
          disabled={disabled}
          readOnly={readOnly}
          required={batBuoc}
          aria-invalid={!!loi || undefined}
          aria-describedby={loi ? `${idO}-loi` : goiY ? `${idO}-goi-y` : undefined}
          {...con}
        />
        {ben && <span className={s.ben}>{ben}</span>}
      </div>
    </KhungTruong>
  );
});

export interface ThuocTinhOChonGoc extends ThuocTinhTruong, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  luaChon: { giaTri: string; nhan: string }[];
  /** dòng đầu trống, ví dụ 'Tất cả' */
  dongTrong?: string;
  iconTrai?: React.ReactNode;
}

/** Ô chọn dùng select gốc, hợp với danh sách ngắn cố định (loại giấy tờ, tình trạng) */
export const OChonGoc = forwardRef<HTMLSelectElement, ThuocTinhOChonGoc>(function OChonGoc(
  { nhan, batBuoc, goiY, loi, className, luaChon, dongTrong, iconTrai, id, disabled, ...con },
  ref,
) {
  const idO = dungIdTruong(id);
  return (
    <KhungTruong nhan={nhan} batBuoc={batBuoc} goiY={goiY} loi={loi} className={className} idO={idO} voHieu={disabled}>
      <div className={s.khung}>
        {iconTrai && <span className={s.iconTrai}>{iconTrai}</span>}
        <select ref={ref} id={idO} className={`${s.o} ${s.chon}`} disabled={disabled} aria-invalid={!!loi || undefined} {...con}>
          {dongTrong !== undefined && <option value="">{dongTrong}</option>}
          {luaChon.map((l) => (
            <option key={l.giaTri} value={l.giaTri}>
              {l.nhan}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className={s.mui} aria-hidden />
      </div>
    </KhungTruong>
  );
});

export { s as kieuONhap };
