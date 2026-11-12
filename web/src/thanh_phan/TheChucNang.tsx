// Thẻ chức năng ở trang chính: icon 3D, tiêu đề đậm, một dòng mô tả xám
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import s from './TheChucNang.module.css';

export interface ThuocTinhTheChucNang {
  icon: React.ReactNode;
  tieuDe: string;
  moTa: string;
  den: string;
  /** chữ phím tắt hiển thị ở góc, ví dụ 'Alt+2' */
  phimTat?: string;
  dangChon?: boolean;
  className?: string;
}

export function TheChucNang({ icon, tieuDe, moTa, den, phimTat, dangChon, className }: ThuocTinhTheChucNang) {
  return (
    <Link to={den} className={[s.the, dangChon ? s.dangChon : '', className ?? ''].join(' ')} aria-current={dangChon ? 'page' : undefined}>
      <div className={s.dau}>
        <span className={s.icon}>{icon}</span>
        <span className={s.phai}>
          {phimTat && (
            <kbd className={s.phim} title={`Phím tắt ${phimTat}`}>
              {phimTat}
            </kbd>
          )}
          <span className={s.muiTen} aria-hidden>
            <ArrowUpRight size={18} strokeWidth={2.4} />
          </span>
        </span>
      </div>
      <span className={s.tieuDe}>{tieuDe}</span>
      <span className={s.moTa}>{moTa}</span>
    </Link>
  );
}
