// Khung xương khi đang tải chuyến bay và trang báo không tìm thấy chuyến bay
import { laLoiApi, thongBaoLoi } from '@/api/may_khach';
import { Nut } from '@/thanh_phan/Nut';
import { KhungXuong, TrangThaiRong } from '@/thanh_phan/TrangThaiRong';
import s from './ChuyenBay.module.css';

export function KhungChoChuyenBay() {
  return (
    <div className={s.luoi} aria-busy="true" aria-label="Đang tải chuyến bay">
      <div className={s.cot}>
        {[6, 3, 2].map((so, i) => (
          <div key={i} className={s.the}>
            <KhungXuong rong={220} cao={22} />
            <div className={s.luoiO} style={{ marginTop: 24 }}>
              {Array.from({ length: so }, (_, k) => (
                <div key={k} className={s.xuongForm}>
                  <KhungXuong rong="40%" cao={12} />
                  <KhungXuong cao={48} boGoc={12} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={s.cotPhai}>
        <KhungXuong cao={300} boGoc={24} />
        <KhungXuong cao={180} boGoc={24} />
      </div>
    </div>
  );
}

export function KhongTimThayChuyenBay({ loi, ma }: { loi: unknown; ma?: string }) {
  const khongCo = laLoiApi(loi) && loi.trangThai === 404;
  return (
    <div className={s.the}>
      <TrangThaiRong
        linhVat="tra_cuu"
        kichThuocHinh={140}
        tieuDe={khongCo ? `Không tìm thấy chuyến bay ${ma ?? ''}` : 'Không tải được dữ liệu chuyến bay'}
        goiY={khongCo ? 'Chuyến bay có thể đã bị xóa. Hãy quay lại danh sách để tra cứu lại.' : thongBaoLoi(loi)}
        hanhDong={<Nut den="/chuyen-bay">Về danh sách chuyến bay</Nut>}
      />
    </div>
  );
}
