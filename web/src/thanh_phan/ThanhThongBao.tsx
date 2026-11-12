// Thanh thông báo trên cùng: lấy nhật ký hủy phiếu tự động (/api/thong-bao), tự chuyển, có trước, sau, đóng
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { apiThongBao, khoaTruyVan } from '@/api/dich_vu';
import { dinhDangGio, dinhDangNgay } from '@/tien_ich/thoi_gian';
import { NutTron } from './Nut';
import s from './ThanhThongBao.module.css';

export function dungThongBao(batTat: boolean) {
  return useQuery({
    queryKey: khoaTruyVan.thongBao,
    queryFn: apiThongBao.danhSach,
    enabled: batTat,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function ThanhThongBao({ daCuon, onDong }: { daCuon: boolean; onDong: () => void }) {
  const { data } = dungThongBao(true);
  const ds = data ?? [];
  const [chiSo, datChiSo] = useState(0);
  const [dung, datDung] = useState(false);

  useEffect(() => {
    if (dung || ds.length <= 1) return;
    const id = window.setTimeout(() => datChiSo((i) => (i + 1) % ds.length), 5000);
    return () => window.clearTimeout(id);
  }, [chiSo, dung, ds.length]);

  useEffect(() => {
    if (chiSo >= ds.length) datChiSo(0);
  }, [ds.length, chiSo]);

  if (!ds.length) return null;
  const tb = ds[Math.min(chiSo, ds.length - 1)];

  return (
    <div className={`${s.thanh} ${daCuon ? s.daCuon : ''}`} onMouseEnter={() => datDung(true)} onMouseLeave={() => datDung(false)}>
      <div className={s.trong}>
        <span className={s.chuong} aria-hidden>
          <Bell size={15} strokeWidth={2.4} />
        </span>
        <span className={s.the}>[THÔNG BÁO]</span>
        <div className={s.khungChu} aria-live="polite">
          <div key={chiSo} className={s.dong}>
            <span className={s.gio}>
              {dinhDangGio(tb.thoiDiem)} {dinhDangNgay(tb.thoiDiem).slice(0, 5)}
            </span>
            <span>{tb.noiDung}</span>
          </div>
        </div>
        {ds.length > 1 && (
          <>
            <NutTron nhan="Thông báo trước" bienThe="trong" kichThuoc="nho" className={s.nutTB} onClick={() => datChiSo((chiSo - 1 + ds.length) % ds.length)}>
              <ChevronLeft size={18} />
            </NutTron>
            <span className={s.dem}>
              {chiSo + 1}/{ds.length}
            </span>
            <NutTron nhan="Thông báo sau" bienThe="trong" kichThuoc="nho" className={s.nutTB} onClick={() => datChiSo((chiSo + 1) % ds.length)}>
              <ChevronRight size={18} />
            </NutTron>
          </>
        )}
        <span className={s.vach} aria-hidden />
        <NutTron nhan="Đóng thanh thông báo" bienThe="trong" kichThuoc="nho" className={s.nutTB} onClick={onDong}>
          <X size={18} />
        </NutTron>
      </div>
    </div>
  );
}
