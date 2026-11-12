// Nút chuông trên header: mở bảng thả xuống liệt kê nhật ký tự động hủy phiếu (/api/thong-bao), dòng mới nhất nền đỏ nhạt
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { dinhDangGio, dinhDangNgay, docIso } from '@/tien_ich/thoi_gian';
import { dungBamRaNgoai } from '@/tien_ich/hook';
import { dungThongBao } from './ThanhThongBao';
import s from './ChuongThongBao.module.css';

const KHOA_DA_XEM = 'qlbv_thong_bao_da_xem';

function docDaXem(): string {
  try {
    return localStorage.getItem(KHOA_DA_XEM) ?? '';
  } catch {
    return '';
  }
}

/** lop: lớp kiểu của nút ở header để đồng bộ với nút Trợ giúp */
export function ChuongThongBao({ lop }: { lop?: string }) {
  const { data, isPending } = dungThongBao(true);
  const [mo, datMo] = useState(false);
  const [daXem, datDaXem] = useState(docDaXem);
  const goc = useRef<HTMLDivElement>(null);
  const ds = data ?? [];
  const moiNhat = ds[0]?.thoiDiem ?? '';
  const soMoi = ds.filter((t) => t.thoiDiem > daXem).length;

  const dong = useCallback(() => datMo(false), []);
  dungBamRaNgoai(goc, dong, mo);

  useEffect(() => {
    if (!mo || !moiNhat) return;
    datDaXem(moiNhat);
    try {
      localStorage.setItem(KHOA_DA_XEM, moiNhat);
    } catch {
      /* không lưu được thì lần sau vẫn hiện chấm đỏ */
    }
  }, [mo, moiNhat]);

  return (
    <div className={s.goc} ref={goc}>
      <button
        type="button"
        className={`${lop ?? ''} ${s.nut} ${mo ? s.dangMo : ''}`}
        aria-label={soMoi ? `Thông báo, ${soMoi} thông báo mới` : 'Thông báo'}
        title="Thông báo"
        aria-expanded={mo}
        aria-haspopup="dialog"
        onClick={() => datMo((x) => !x)}
      >
        <Bell size={17} strokeWidth={2.2} className={soMoi ? s.lac : undefined} />
        {soMoi > 0 && <span className={s.cham}>{soMoi > 9 ? '9+' : soMoi}</span>}
      </button>
      {mo && (
        <div
          className={s.bang}
          role="dialog"
          aria-label="Danh sách thông báo"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              datMo(false);
            }
          }}
        >
          <div className={s.dau}>
            <div>
              <b>Thông báo</b>
              <span>Nhật ký tự động hủy phiếu đặt chỗ quá hạn</span>
            </div>
            {ds.length > 0 && <span className={s.dem}>{ds.length}</span>}
          </div>
          {isPending ? (
            <p className={s.trong}>Đang tải thông báo...</p>
          ) : ds.length === 0 ? (
            <p className={s.trong}>
              <BellOff size={22} />
              Chưa có thông báo nào.
            </p>
          ) : (
            <ul className={s.ds}>
              {ds.map((t, i) => (
                <li key={`${t.thoiDiem}-${i}`} className={i === 0 ? s.moiNhat : undefined}>
                  <time dateTime={t.thoiDiem} className={s.gio}>
                    <b>{dinhDangGio(t.thoiDiem)}</b>
                    <small>{dinhDangNgay(docIso(t.thoiDiem))}</small>
                  </time>
                  <span className={s.noiDung}>{t.noiDung}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
