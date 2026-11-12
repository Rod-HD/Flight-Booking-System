// Nạp danh sách chuyến bay cho ô chọn ở trang Bán vé, Đặt vé.
// Bán vé: các chuyến chưa khởi hành. Đặt vé: các chuyến khởi hành cách hôm nay không ít hơn thời gian đặt vé chậm nhất (QĐ3).
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiChuyenBay, apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import type { ChuyenBayTomTat, MucDichBan, TieuChiTimChuyenBay } from '@/kieu/api';
import type { LuaChon } from '@/thanh_phan/OChon';
import { congNgay, dauNgay, dinhDangGio, dinhDangNgay, docIso, sangNgayIso } from '@/tien_ich/thoi_gian';

export interface LocChuyenBay {
  sanBayDi?: string;
  sanBayDen?: string;
  ngay?: string;
}

export function luaChonChuyenBay(cb: ChuyenBayTomTat): LuaChon {
  return {
    giaTri: cb.maChuyenBay,
    ma: cb.maChuyenBay,
    nhan: `${cb.maSanBayDi} → ${cb.maSanBayDen} · ${dinhDangGio(cb.ngayGioKhoiHanh)} ${dinhDangNgay(cb.ngayGioKhoiHanh).slice(0, 5)}`,
    phu: cb.soGheTrong > 0 ? `${cb.soGheTrong} trống` : 'Hết chỗ',
  };
}

export function dungQuyDinh() {
  return useQuery({ queryKey: khoaTruyVan.quyDinh, queryFn: apiQuyDinh.lay, staleTime: 300000 });
}

export function dungChuyenBayDeBan(mucDich: MucDichBan, loc: LocChuyenBay, maCanCo: string | null, batTat = true) {
  const { data: quyDinh } = dungQuyDinh();
  const soNgayToiThieu = mucDich === 'datVe' ? quyDinh?.thamSo.thoiGianDatVeChamNhat : 0;
  const choQuyDinh = mucDich === 'datVe' && soNgayToiThieu === undefined;

  const tieuChi = useMemo<TieuChiTimChuyenBay>(() => {
    const homNay = dauNgay(new Date());
    const moc = sangNgayIso(congNgay(homNay, soNgayToiThieu ?? 0));
    const t: TieuChiTimChuyenBay = { tuNgay: moc };
    if (loc.sanBayDi) t.sanBayDi = loc.sanBayDi;
    if (loc.sanBayDen) t.sanBayDen = loc.sanBayDen;
    if (loc.ngay) {
      t.tuNgay = loc.ngay > moc ? loc.ngay : moc;
      t.denNgay = loc.ngay;
    }
    return t;
  }, [loc.sanBayDi, loc.sanBayDen, loc.ngay, soNgayToiThieu]);

  const truyVan = useQuery({
    queryKey: khoaTruyVan.chuyenBay(tieuChi),
    queryFn: () => apiChuyenBay.traCuu(tieuChi),
    enabled: batTat && !choQuyDinh,
  });

  // chuyến bay truyền qua đường dẫn có thể không nằm trong danh sách (đã khởi hành, quá hạn đặt), vẫn nạp để báo đúng lý do
  const ngoaiDs = !!maCanCo && !!truyVan.data && !truyVan.data.some((c) => c.maChuyenBay === maCanCo);
  const them = useQuery({
    queryKey: khoaTruyVan.chuyenBay({ maChuyenBay: maCanCo ?? '' }),
    queryFn: () => apiChuyenBay.traCuu({ maChuyenBay: maCanCo ?? '' }),
    enabled: batTat && ngoaiDs,
  });

  const ds = useMemo(() => {
    const bayGio = new Date();
    let kq = (truyVan.data ?? []).filter((c) => mucDich === 'datVe' || docIso(c.ngayGioKhoiHanh) > bayGio);
    const cb = them.data?.find((c) => c.maChuyenBay === maCanCo);
    if (ngoaiDs && cb && !kq.some((c) => c.maChuyenBay === cb.maChuyenBay)) kq = [cb, ...kq];
    return kq;
  }, [truyVan.data, them.data, maCanCo, ngoaiDs, mucDich]);

  const luaChon = useMemo(() => ds.map(luaChonChuyenBay), [ds]);

  return { ds, luaChon, dangTai: truyVan.isPending || choQuyDinh, soNgayToiThieu: soNgayToiThieu ?? 1 };
}

/** Mọi chuyến bay, dùng cho ô lọc Chuyến bay ở các trang danh sách */
export function dungLuaChonMoiChuyenBay() {
  const { data, isPending } = useQuery({ queryKey: khoaTruyVan.chuyenBay({}), queryFn: () => apiChuyenBay.traCuu({}) });
  const luaChon = useMemo(
    () =>
      [...(data ?? [])]
        .sort((a, b) => b.ngayGioKhoiHanh.localeCompare(a.ngayGioKhoiHanh))
        .map((cb) => ({ ...luaChonChuyenBay(cb), phu: undefined })),
    [data],
  );
  return { luaChon, dangTai: isPending };
}
