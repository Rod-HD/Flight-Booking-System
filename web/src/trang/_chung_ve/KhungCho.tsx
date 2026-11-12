// Khung xương giữ chỗ khi đang nạp vé hoặc phiếu cần sửa
import { KhungXuong } from '@/thanh_phan/TrangThaiRong';
import s from './BieuMauVe.module.css';

export function KhungCho() {
  return (
    <div className={s.boCuc} aria-busy="true">
      <div className={s.the}>
        <div className={s.panelXuong}>
          <KhungXuong rong="40%" cao={28} />
          <KhungXuong rong="70%" />
          <div className={s.luoi}>
            {Array.from({ length: 6 }, (_, i) => (
              <KhungXuong key={i} cao={48} boGoc={12} />
            ))}
          </div>
        </div>
      </div>
      <div className={s.panel}>
        <div className={s.panelXuong}>
          <KhungXuong rong="60%" cao={24} />
          <KhungXuong cao={72} boGoc={16} />
          <KhungXuong cao={96} boGoc={16} />
        </div>
      </div>
    </div>
  );
}
