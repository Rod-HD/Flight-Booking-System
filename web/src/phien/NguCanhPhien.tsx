// Ngữ cảnh phiên đăng nhập: lấy /api/phien khi mở ứng dụng, cung cấp hàm đăng nhập, đăng xuất.
import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPhien, khoaTruyVan } from '@/api/dich_vu';
import { dangKyKhiHetPhien, laLoiApi } from '@/api/may_khach';
import type { NguoiDung, NhomQuyen } from '@/kieu/api';

interface GiaTriPhien {
  nguoiDung: NguoiDung | null;
  dangTai: boolean;
  laQuanLy: boolean;
  coQuyen: (quyen?: NhomQuyen[]) => boolean;
  dangNhap: (tenDangNhap: string, matKhau: string) => Promise<NguoiDung>;
  dangXuat: () => Promise<void>;
}

const NguCanh = createContext<GiaTriPhien | null>(null);

async function layPhien(): Promise<NguoiDung | null> {
  try {
    return await apiPhien.lay();
  } catch (e) {
    if (laLoiApi(e) && e.trangThai === 401) return null;
    throw e;
  }
}

export function NhaCungCapPhien({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const truyVan = useQuery({ queryKey: khoaTruyVan.phien, queryFn: layPhien, staleTime: Infinity, retry: false });

  // máy chủ báo hết phiên ở bất kỳ yêu cầu nào thì đưa về trang đăng nhập
  useEffect(() => {
    dangKyKhiHetPhien(() => qc.setQueryData(khoaTruyVan.phien, null));
  }, [qc]);

  const dangNhap = useCallback(
    async (tenDangNhap: string, matKhau: string) => {
      const nd = await apiPhien.dangNhap({ tenDangNhap, matKhau });
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'phien' });
      qc.setQueryData(khoaTruyVan.phien, nd);
      return nd;
    },
    [qc],
  );

  const dangXuat = useCallback(async () => {
    try {
      await apiPhien.dangXuat();
    } finally {
      qc.setQueryData(khoaTruyVan.phien, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'phien' });
    }
  }, [qc]);

  const nguoiDung = truyVan.data ?? null;
  const giaTri = useMemo<GiaTriPhien>(
    () => ({
      nguoiDung,
      dangTai: truyVan.isPending,
      laQuanLy: nguoiDung?.nhomQuyen === 'QuanLy',
      coQuyen: (quyen) => !quyen || (!!nguoiDung && quyen.includes(nguoiDung.nhomQuyen)),
      dangNhap,
      dangXuat,
    }),
    [nguoiDung, truyVan.isPending, dangNhap, dangXuat],
  );

  return <NguCanh.Provider value={giaTri}>{children}</NguCanh.Provider>;
}

export function dungPhien(): GiaTriPhien {
  const g = useContext(NguCanh);
  if (!g) throw new Error('dungPhien phải nằm trong NhaCungCapPhien');
  return g;
}
