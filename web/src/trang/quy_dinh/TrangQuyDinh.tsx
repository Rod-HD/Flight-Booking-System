// Thay đổi quy định (MH_ThayDoiQD, QĐ6): sáu tham số của QĐ1, QĐ3 và hai danh sách sân bay, hạng vé
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { IconBanhRangDanhSach } from '@/icons3d';
import { KhungTrang, TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { Nut } from '@/thanh_phan/Nut';
import { KhungXuong } from '@/thanh_phan/TrangThaiRong';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { DanhSachHangVe } from './DanhSachHangVe';
import { DanhSachSanBay, type DieuKhienDanhSach } from './DanhSachSanBay';
import { HopThoaiThamSo } from './HopThoaiThamSo';
import { THAM_SO, type MoTaThamSo } from './tham_so';
import s from './QuyDinh.module.css';

export function TrangQuyDinh() {
  const { data, isPending, error } = useQuery({ queryKey: khoaTruyVan.quyDinh, queryFn: apiQuyDinh.lay, staleTime: 0 });
  const [dangSua, datDangSua] = useState<MoTaThamSo | null>(null);
  const [vuaDoi, datVuaDoi] = useState<string | null>(null);
  const dsSanBay = useRef<DieuKhienDanhSach>(null);

  dungPhimTat({
    'ctrl+n': () => dsSanBay.current?.them(),
    'ctrl+f': () => dsSanBay.current?.timKiem(),
  });

  return (
    <KhungTrang
      tieuDe="Thay đổi quy định"
      icon={<IconBanhRangDanhSach kichThuoc={56} />}
      moTa="Các quy định thay đổi được theo QĐ6, giá trị mới áp dụng ngay cho các nghiệp vụ phát sinh sau khi lưu"
      duongDan={[{ nhan: 'Quy định' }]}
      nut={
        <Nut bienThe="lang" muiTen={false} iconTrai={<X size={18} />} den="/">
          Đóng
        </Nut>
      }
    >
      <section className={s.muc} aria-labelledby="muc-tham-so">
        <TieuDeMuc
          id="muc-tham-so"
          tieuDe="Tham số quy định"
          phu="Bấm vào một thẻ hoặc nút Thay đổi để cập nhật giá trị. Giá trị hiện hành hiện ngay trên thẻ."
        />
        <div className={s.luoiThe}>
          {THAM_SO.map((m, i) =>
            isPending || !data ? (
              <div key={m.ten} className={s.the} style={{ cursor: 'default' }}>
                <KhungXuong rong={52} cao={52} boGoc={16} />
                <div style={{ marginTop: 18 }}>
                  <KhungXuong rong="70%" cao={18} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <KhungXuong rong="40%" cao={40} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <KhungXuong rong="90%" cao={12} />
                </div>
              </div>
            ) : (
              <div
                key={m.ten}
                className={`${s.the} ${vuaDoi === m.ten ? s.vuaDoi : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
                role="button"
                tabIndex={0}
                aria-label={`${m.tieuDe}: ${data.thamSo[m.ten]} ${m.donVi}. Bấm để thay đổi`}
                onClick={() => datDangSua(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    datDangSua(m);
                  }
                }}
              >
                <div className={s.dauThe}>
                  <span className={s.oIcon}>{m.icon}</span>
                  <span className={s.nhanQd}>{m.qd}</span>
                </div>
                <h3 className={s.tieuDe}>{m.tieuDe}</h3>
                <p className={s.giaTri}>
                  <b>{data.thamSo[m.ten]}</b>
                  <span>{m.donVi}</span>
                </p>
                <p className={s.moTa}>{m.moTa(data.thamSo)}</p>
                <div className={s.chanThe}>
                  <Nut bienThe="phu" kichThuoc="nho" tabIndex={-1} onClick={(e) => (e.stopPropagation(), datDangSua(m))}>
                    Thay đổi
                  </Nut>
                </div>
              </div>
            ),
          )}
        </div>
        {error && <p style={{ marginTop: 16, color: 'var(--do-500)', fontWeight: 600 }}>Không tải được quy định. Vui lòng thử lại.</p>}
      </section>

      <section className={s.muc} aria-labelledby="muc-danh-sach">
        <TieuDeMuc
          id="muc-danh-sach"
          tieuDe="Danh sách sân bay và hạng vé"
          phu="Thêm, sửa tên, xóa sân bay và hạng vé. Không xóa được mục đang có chuyến bay sử dụng."
        />
        <div className={s.haiCot}>
          <DanhSachSanBay ref={dsSanBay} sanBay={data?.sanBay} dangTai={isPending} loi={error} />
          <DanhSachHangVe hangVe={data?.hangVe} dangTai={isPending} loi={error} />
        </div>
      </section>

      {data && (
        <HopThoaiThamSo
          moTa={dangSua}
          thamSo={data.thamSo}
          onDong={() => datDangSua(null)}
          onDaLuu={(ten) => {
            datVuaDoi(ten);
            window.setTimeout(() => datVuaDoi(null), 1800);
          }}
        />
      )}
    </KhungTrang>
  );
}
