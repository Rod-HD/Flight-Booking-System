// Khối chỉ Quản lý (UC05.5, AT04): đếm rồi xóa hẳn các phiếu Đã hủy đặt trước một ngày, chưa chuyển thành vé
import { forwardRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { apiPhieuDat } from '@/api/dich_vu';
import { thongBaoLoi } from '@/api/may_khach';
import { baoCanhBao, baoLoi, baoThanhCong, chayKemCho, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { Nut } from '@/thanh_phan/Nut';
import { ONgay } from '@/thanh_phan/ONgay';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangSo } from '@/tien_ich/dinh_dang';
import { congNgay, dinhDangNgay, sangNgayIso } from '@/tien_ich/thoi_gian';
import { lamMoiSauGhi } from '../_chung_ve/kiem_tra';
import s from '../_chung_ve/DanhSach.module.css';

export const KhoiXoaPhieuDaHuy = forwardRef<HTMLElement, { noiBat: boolean }>(function KhoiXoaPhieuDaHuy({ noiBat }, ref) {
  const qc = useQueryClient();
  const homNay = sangNgayIso(new Date());
  const [ngay, datNgay] = useState(() => sangNgayIso(congNgay(new Date(), -30)));
  const [loi, datLoi] = useState<string | undefined>();
  const [dangXoa, datDangXoa] = useState(false);

  const xoa = async () => {
    if (!ngay) {
      datLoi('Vui lòng chọn ngày.');
      return;
    }
    if (ngay > homNay) {
      datLoi('Chọn một ngày không sau ngày hôm nay.');
      return;
    }
    datLoi(undefined);
    datDangXoa(true);
    try {
      const { soPhieu } = await apiPhieuDat.demDaHuy(ngay);
      if (soPhieu === 0) {
        await baoCanhBao('Không có phiếu nào để xóa', `Không có phiếu đặt chỗ Đã hủy nào đặt trước ngày ${dinhDangNgay(ngay)} mà chưa được chuyển thành vé.`);
        return;
      }
      const dongY = await hoiXacNhan({
        tieuDe: `Xóa ${dinhDangSo(soPhieu)} phiếu đã hủy?`,
        noiDung: (
          <>
            Có <b>{dinhDangSo(soPhieu)} phiếu</b> Đã hủy đặt trước ngày <b>{dinhDangNgay(ngay)}</b> và chưa được chuyển thành vé. Các phiếu này sẽ bị xóa hẳn khỏi cơ sở dữ liệu,
            không thể hoàn tác.
          </>
        ),
        nutDongY: 'Xóa phiếu đã hủy',
        nutHuy: 'Không',
      });
      if (!dongY) return;
      const { soDaXoa } = await chayKemCho('Đang xóa phiếu đã hủy, vui lòng chờ', () => apiPhieuDat.xoaDaHuy(ngay));
      hienToast.thanhCong(`Đã xóa ${dinhDangSo(soDaXoa)} phiếu đặt chỗ đã hủy`);
      await lamMoiSauGhi(qc);
      baoThanhCong('Đã xóa phiếu đã hủy', `Đã xóa ${dinhDangSo(soDaXoa)} phiếu đặt chỗ đã hủy trước ngày ${dinhDangNgay(ngay)}.`);
    } catch (e) {
      baoLoi('Không thể xóa phiếu đã hủy', thongBaoLoi(e));
    } finally {
      datDangXoa(false);
    }
  };

  return (
    <section ref={ref} id="xoa-phieu-da-huy" className={`${s.khoiQuanLy} ${noiBat ? s.khoiNoiBat : ''}`} aria-labelledby="tieu-de-xoa-phieu">
      <div className={s.khoiChu}>
        <h2 id="tieu-de-xoa-phieu" className={s.khoiTieuDe}>
          <ShieldAlert size={20} color="var(--do-500)" aria-hidden />
          Dọn dẹp phiếu đặt chỗ đã hủy
          <NhanTrangThai loai="do" nho coCham={false}>
            Chỉ Quản lý
          </NhanTrangThai>
        </h2>
        <p className={s.khoiMoTa}>
          Xóa hẳn các phiếu Đã hủy có thời điểm đặt trước ngày được chọn. Phiếu đã chuyển thành vé được giữ lại vì vé còn lưu mã phiếu.
        </p>
      </div>
      <ONgay
        className={s.khoiNgay}
        nhan="Xóa phiếu đã hủy trước ngày"
        batBuoc
        max={homNay}
        value={ngay}
        loi={loi}
        onChange={(e) => {
          datNgay(e.target.value);
          datLoi(undefined);
        }}
      />
      <Nut bienThe="nguy-hiem" muiTen={false} iconTrai={<Trash2 size={18} />} dangXuLy={dangXoa} onClick={xoa}>
        Xóa phiếu đã hủy
      </Nut>
    </section>
  );
});
