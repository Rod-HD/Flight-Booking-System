// Chọn ngày hoặc ngày giờ: dùng input gốc của trình duyệt, tạo kiểu cho đồng bộ với ô nhập
import { forwardRef } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { KhungTruong, dungIdTruong, type ThuocTinhTruong } from './ONhap';
import s from './ONhap.module.css';

export interface ThuocTinhONgay extends ThuocTinhTruong, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  /** true: chọn cả giờ (datetime-local), giá trị dạng 2026-11-12T14:30 */
  coGio?: boolean;
}

export const ONgay = forwardRef<HTMLInputElement, ThuocTinhONgay>(function ONgay(
  { nhan, batBuoc, goiY, loi, className, coGio, id, disabled, value, ...con },
  ref,
) {
  const idO = dungIdTruong(id);
  const trong = value === '' || value === undefined;
  return (
    <KhungTruong nhan={nhan} batBuoc={batBuoc} goiY={goiY} loi={loi} className={className} idO={idO} voHieu={disabled}>
      <div className={s.khung}>
        <span className={s.iconTrai}>{coGio ? <Clock3 size={18} /> : <CalendarDays size={18} />}</span>
        <input
          ref={ref}
          id={idO}
          type={coGio ? 'datetime-local' : 'date'}
          className={`${s.o} ${s.ngay} ${trong ? s.ngayTrong : ''}`}
          disabled={disabled}
          required={batBuoc}
          value={value}
          aria-invalid={!!loi || undefined}
          {...con}
        />
      </div>
    </KhungTruong>
  );
});
