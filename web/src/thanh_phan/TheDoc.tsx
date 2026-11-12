// Thẻ dọc cho lối tắt và mẹo: nhãn vàng, chữ, hình minh họa lớn phía dưới
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import s from './TheDoc.module.css';

export interface ThuocTinhTheDoc {
  nhan: string;
  tieuDe: string;
  moTa?: string;
  hinh: React.ReactNode;
  den?: string;
  onClick?: () => void;
  /** là slide đang chọn của carousel */
  dangChon?: boolean;
  className?: string;
}

export function TheDoc({ nhan, tieuDe, moTa, hinh, den, onClick, dangChon, className }: ThuocTinhTheDoc) {
  const lop = [s.the, dangChon ? s.dangChon : '', className ?? ''].join(' ');
  const noiDung = (
    <>
      <span className={s.nhan}>{nhan}</span>
      <span className={s.tieuDe}>{tieuDe}</span>
      {moTa && <span className={s.moTa}>{moTa}</span>}
      <span className={s.hinh}>
        <span className={s.hinhTrong}>{hinh}</span>
      </span>
      <span className={s.muiTen} aria-hidden>
        <ArrowRight size={18} strokeWidth={2.4} />
      </span>
    </>
  );
  if (den) {
    return (
      <Link to={den} className={lop} onClick={onClick} draggable={false}>
        {noiDung}
      </Link>
    );
  }
  return (
    <button type="button" className={lop} onClick={onClick}>
      {noiDung}
    </button>
  );
}
