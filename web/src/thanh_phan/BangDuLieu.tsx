// Bảng dữ liệu dùng chung: tiêu đề dính, chọn dòng (chuột và bàn phím), phân trang, rỗng, đang tải, lỗi
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { thongBaoLoi } from '@/api/may_khach';
import { NutTron } from './Nut';
import { KhungXuong, TrangThaiRong, type ThuocTinhTrangThaiRong } from './TrangThaiRong';
import s from './BangDuLieu.module.css';

export interface CotBang<T> {
  khoa: string;
  tieuDe: React.ReactNode;
  /** nội dung ô */
  hien: (dong: T, chiSo: number) => React.ReactNode;
  canh?: 'trai' | 'phai' | 'giua';
  /** cột số: canh phải, đậm, chữ số đều */
  so?: boolean;
  rong?: number | string;
}

export interface ThuocTinhBang<T> {
  cot: CotBang<T>[];
  duLieu: T[] | undefined;
  khoaDong: (dong: T) => string;
  dangTai?: boolean;
  loi?: unknown;
  /** dòng đang chọn (theo khoaDong) */
  dongDangChon?: string | null;
  onChonDong?: (dong: T) => void;
  /** nhấp đúp hoặc Enter lần hai */
  onMoDong?: (dong: T) => void;
  /** số dòng mỗi trang; bỏ trống thì không phân trang */
  kichThuocTrang?: number;
  rong?: Omit<ThuocTinhTrangThaiRong, 'className'>;
  /** chiều cao tối đa: bảng tự cuộn trong khung, tiêu đề dính ở đỉnh khung */
  chieuCaoToiDa?: number;
  /** tên đơn vị trong dòng tóm tắt, ví dụ 'chuyến bay' */
  donVi?: string;
  soDongXuong?: number;
  nhan?: string;
  className?: string;
}

function lopCanh(c: { canh?: string; so?: boolean }) {
  return [c.canh === 'phai' || c.so ? s.phai : c.canh === 'giua' ? s.giua : '', c.so ? s.so : ''].join(' ');
}

function dayTrang(hienTai: number, tong: number): (number | '...')[] {
  if (tong <= 7) return Array.from({ length: tong }, (_, i) => i + 1);
  const kq: (number | '...')[] = [1];
  const tu = Math.max(2, hienTai - 1);
  const den = Math.min(tong - 1, hienTai + 1);
  if (tu > 2) kq.push('...');
  for (let i = tu; i <= den; i += 1) kq.push(i);
  if (den < tong - 1) kq.push('...');
  kq.push(tong);
  return kq;
}

export function BangDuLieu<T>({
  cot,
  duLieu,
  khoaDong,
  dangTai,
  loi,
  dongDangChon,
  onChonDong,
  onMoDong,
  kichThuocTrang,
  rong,
  chieuCaoToiDa,
  donVi = 'dòng',
  soDongXuong = 5,
  nhan,
  className,
}: ThuocTinhBang<T>) {
  const [trang, datTrang] = useState(1);
  const tong = duLieu?.length ?? 0;
  const soTrang = kichThuocTrang ? Math.max(1, Math.ceil(tong / kichThuocTrang)) : 1;

  useEffect(() => {
    if (trang > soTrang) datTrang(soTrang);
  }, [soTrang, trang]);

  const dongHien = useMemo(() => {
    if (!duLieu) return [];
    if (!kichThuocTrang) return duLieu;
    return duLieu.slice((trang - 1) * kichThuocTrang, trang * kichThuocTrang);
  }, [duLieu, kichThuocTrang, trang]);

  const diChuyenChon = (e: React.KeyboardEvent<HTMLTableRowElement>, chiSo: number, dong: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (dongDangChon === khoaDong(dong) && onMoDong) onMoDong(dong);
      else onChonDong?.(dong);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const ke = dongHien[chiSo + (e.key === 'ArrowDown' ? 1 : -1)];
      if (ke) {
        onChonDong?.(ke);
        const tr = (e.currentTarget.parentElement?.children[chiSo + (e.key === 'ArrowDown' ? 1 : -1)] as HTMLElement) ?? null;
        tr?.focus();
      }
    }
  };

  const coDuLieu = !dangTai && !loi && tong > 0;

  return (
    <div className={`${s.khung} ${className ?? ''}`}>
      <div className={chieuCaoToiDa ? s.cuonDoc : s.cuon} style={chieuCaoToiDa ? { maxHeight: chieuCaoToiDa, ['--dinh-tieu-de' as string]: '0px' } : { ['--dinh-tieu-de' as string]: 'var(--cao-thanh-tren)' }}>
        <table className={s.bang} aria-label={nhan} aria-busy={dangTai || undefined}>
          <thead>
            <tr>
              {cot.map((c) => (
                <th key={c.khoa} scope="col" className={lopCanh(c)} style={c.rong ? { width: c.rong } : undefined}>
                  {c.tieuDe}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dangTai &&
              Array.from({ length: soDongXuong }, (_, i) => (
                <tr key={`x${i}`} className={s.xuongDong}>
                  {cot.map((c, k) => (
                    <td key={c.khoa} className={lopCanh(c)}>
                      <KhungXuong rong={k === 0 ? '70%' : `${50 + ((i * 7 + k * 13) % 40)}%`} cao={14} />
                    </td>
                  ))}
                </tr>
              ))}
            {coDuLieu &&
              dongHien.map((d, i) => {
                const khoa = khoaDong(d);
                const dangChon = dongDangChon === khoa;
                return (
                  <tr
                    key={khoa}
                    className={[s.dong, onChonDong ? s.coChon : '', dangChon ? s.dangChon : ''].join(' ')}
                    tabIndex={onChonDong ? 0 : undefined}
                    aria-selected={onChonDong ? dangChon : undefined}
                    onClick={onChonDong ? () => onChonDong(d) : undefined}
                    onDoubleClick={onMoDong ? () => onMoDong(d) : undefined}
                    onKeyDown={onChonDong ? (e) => diChuyenChon(e, i, d) : undefined}
                  >
                    {cot.map((c) => (
                      <td key={c.khoa} className={lopCanh(c)}>
                        {c.hien(d, (trang - 1) * (kichThuocTrang ?? 0) + i)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {!dangTai && !!loi && <div className={s.loi} role="alert">{thongBaoLoi(loi)}</div>}
      {!dangTai && !loi && tong === 0 && (
        <TrangThaiRong tieuDe={rong?.tieuDe ?? 'Chưa có dữ liệu'} goiY={rong?.goiY} linhVat={rong?.linhVat ?? 'ngu'} hanhDong={rong?.hanhDong} />
      )}
      {coDuLieu && kichThuocTrang && (
        <div className={s.chanBang}>
          <span className={s.tomTat}>
            Hiển thị <b>{(trang - 1) * kichThuocTrang + 1}</b> đến <b>{Math.min(tong, trang * kichThuocTrang)}</b> trong <b>{tong}</b> {donVi}
          </span>
          {soTrang > 1 && (
            <nav className={s.phanTrang} aria-label="Phân trang">
              <NutTron nhan="Trang trước" kichThuoc="nho" disabled={trang === 1} onClick={() => datTrang(trang - 1)}>
                <ChevronLeft size={18} />
              </NutTron>
              {dayTrang(trang, soTrang).map((t, i) =>
                t === '...' ? (
                  <span key={`c${i}`} className={s.baCham}>
                    ...
                  </span>
                ) : (
                  <button key={t} type="button" className={s.soTrang} aria-current={t === trang ? 'page' : undefined} onClick={() => datTrang(t)}>
                    {t}
                  </button>
                ),
              )}
              <NutTron nhan="Trang sau" kichThuoc="nho" disabled={trang === soTrang} onClick={() => datTrang(trang + 1)}>
                <ChevronRight size={18} />
              </NutTron>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
