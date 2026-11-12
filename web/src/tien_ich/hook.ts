// Các hook nhỏ dùng nhiều nơi: theo dõi cuộn, giảm chuyển động, số chạy, đồng hồ.
import { useEffect, useRef, useState } from 'react';

/** true khi trang đã cuộn quá nguong px */
export function dungDaCuon(nguong = 40): boolean {
  const [daCuon, datDaCuon] = useState(() => typeof window !== 'undefined' && window.scrollY > nguong);
  useEffect(() => {
    const kiemTra = () => datDaCuon(window.scrollY > nguong);
    kiemTra();
    window.addEventListener('scroll', kiemTra, { passive: true });
    return () => window.removeEventListener('scroll', kiemTra);
  }, [nguong]);
  return daCuon;
}

/** Người dùng bật chế độ giảm chuyển động của hệ điều hành */
export function dungGiamChuyenDong(): boolean {
  const truyVan = '(prefers-reduced-motion: reduce)';
  const [giam, datGiam] = useState(() => typeof window !== 'undefined' && window.matchMedia(truyVan).matches);
  useEffect(() => {
    const mq = window.matchMedia(truyVan);
    const doi = () => datGiam(mq.matches);
    mq.addEventListener('change', doi);
    return () => mq.removeEventListener('change', doi);
  }, []);
  return giam;
}

/** Số chạy từ 0 tới giá trị đích (ease out), trả về giá trị hiện tại */
export function dungSoChay(dich: number, thoiGian = 900): number {
  const giam = dungGiamChuyenDong();
  const [giaTri, datGiaTri] = useState(giam ? dich : 0);
  const tuRef = useRef(0);
  useEffect(() => {
    if (giam) {
      datGiaTri(dich);
      return;
    }
    const tu = tuRef.current;
    let batDau: number | null = null;
    let khung = 0;
    const buoc = (t: number) => {
      if (batDau === null) batDau = t;
      const p = Math.min(1, (t - batDau) / thoiGian);
      const e = 1 - Math.pow(1 - p, 3);
      const hienTai = tu + (dich - tu) * e;
      tuRef.current = hienTai;
      datGiaTri(hienTai);
      if (p < 1) khung = requestAnimationFrame(buoc);
    };
    khung = requestAnimationFrame(buoc);
    return () => cancelAnimationFrame(khung);
  }, [dich, thoiGian, giam]);
  return giaTri;
}

/** Thời điểm hiện tại, cập nhật mỗi chuKy ms (dùng cho đếm ngược) */
export function dungBayGio(chuKy = 30000): Date {
  const [bayGio, datBayGio] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => datBayGio(new Date()), chuKy);
    return () => window.clearInterval(id);
  }, [chuKy]);
  return bayGio;
}

/** Bấm ra ngoài phần tử thì gọi hàm */
export function dungBamRaNgoai(ref: React.RefObject<HTMLElement>, ham: () => void, batTat = true) {
  useEffect(() => {
    if (!batTat) return;
    const xuLy = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ham();
    };
    document.addEventListener('pointerdown', xuLy);
    return () => document.removeEventListener('pointerdown', xuLy);
  }, [ref, ham, batTat]);
}
