// Khung bố cục cho mọi trang nghiệp vụ: đường dẫn, tiêu đề có icon 3D, mô tả, vùng nút
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import s from './KhungTrang.module.css';

export interface MucDuongDan {
  nhan: string;
  den?: string;
}

export interface ThuocTinhKhungTrang {
  tieuDe: string;
  icon?: React.ReactNode;
  moTa?: React.ReactNode;
  /** các cấp sau "Trang chính"; cấp cuối là trang hiện tại */
  duongDan?: MucDuongDan[];
  /** nút hành động bên phải tiêu đề */
  nut?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function KhungTrang({ tieuDe, icon, moTa, duongDan, nut, children, className }: ThuocTinhKhungTrang) {
  const cap = duongDan ?? [{ nhan: tieuDe }];
  return (
    <div className={`${s.khung} ${className ?? ''}`}>
      <nav aria-label="Đường dẫn">
        <ol className={s.duongDan}>
          <li>
            <Link to="/">
              <Home size={15} /> Trang chính
            </Link>
          </li>
          {cap.map((c, i) => {
            const cuoi = i === cap.length - 1;
            return (
              <li key={c.nhan} aria-current={cuoi ? 'page' : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ChevronRight size={14} className={s.cach} aria-hidden />
                {c.den && !cuoi ? <Link to={c.den}>{c.nhan}</Link> : c.nhan}
              </li>
            );
          })}
        </ol>
      </nav>
      <header className={s.dau}>
        <div className={s.tieuDeCum}>
          {icon && <span className={s.oIcon}>{icon}</span>}
          <div>
            <h1 className={s.tieuDe}>{tieuDe}</h1>
            {moTa && <p className={s.moTa}>{moTa}</p>}
          </div>
        </div>
        {nut && <div className={s.nut}>{nut}</div>}
      </header>
      {children}
    </div>
  );
}

/** Tiêu đề một mục trong trang, có vạch đỏ bên trái */
export function TieuDeMuc({ tieuDe, phu, phai, id }: { tieuDe: string; phu?: React.ReactNode; phai?: React.ReactNode; id?: string }) {
  return (
    <div className={s.muc}>
      <div className={s.mucTrai}>
        <span className={s.vach} aria-hidden />
        <div>
          <h2 className={s.mucTieuDe} id={id}>
            {tieuDe}
          </h2>
          {phu && <p className={s.mucPhu}>{phu}</p>}
        </div>
      </div>
      {phai}
    </div>
  );
}
