// Trang chính theo vai trò (MH_Chinh): băng chào mừng, tìm nhanh, thẻ chức năng, hai bảng, lối tắt
import { useState } from 'react';
import {
  IconBanhRangDanhSach,
  IconBiaKepDongHo,
  IconBieuDoXu,
  IconChongVe,
  IconKhienChia,
  IconKinhLup,
  IconLichDongHo,
  IconMayBay,
  IconThuMucBang,
  IconVeSao,
} from '@/icons3d';
import { dungPhien } from '@/phien/NguCanhPhien';
import { Carousel } from '@/thanh_phan/Carousel';
import { TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { LinhVat } from '@/thanh_phan/LinhVat';
import { TheChucNang, type ThuocTinhTheChucNang } from '@/thanh_phan/TheChucNang';
import { TheDoc, type ThuocTinhTheDoc } from '@/thanh_phan/TheDoc';
import { BangChaoMung } from './BangChaoMung';
import { BangPhieuSapHetHan, BangSapKhoiHanh } from './CacBang';
import { TimNhanh } from './TimNhanh';
import s from './TrangChinh.module.css';

const THE_QUAN_LY: ThuocTinhTheChucNang[] = [
  { icon: <IconMayBay />, tieuDe: 'Quản lý chuyến bay', moTa: 'Nhận lịch, sửa, xóa và tra cứu chuyến bay', den: '/chuyen-bay', phimTat: 'Alt+1' },
  { icon: <IconVeSao />, tieuDe: 'Bán vé', moTa: 'Bán trực tiếp hoặc từ phiếu đặt chỗ', den: '/ban-ve', phimTat: 'Alt+2' },
  { icon: <IconLichDongHo />, tieuDe: 'Đặt vé', moTa: 'Giữ chỗ đến hạn thanh toán', den: '/dat-ve', phimTat: 'Alt+3' },
  { icon: <IconChongVe />, tieuDe: 'Danh sách vé', moTa: 'Tra cứu, sửa thông tin và hủy vé', den: '/ve' },
  { icon: <IconBiaKepDongHo />, tieuDe: 'Phiếu đặt chỗ', moTa: 'Tra cứu, sửa và hủy phiếu đặt chỗ', den: '/phieu-dat' },
  { icon: <IconBieuDoXu />, tieuDe: 'Báo cáo doanh thu', moTa: 'Theo tháng và theo năm, xuất Excel, PDF', den: '/bao-cao', phimTat: 'Alt+4' },
  { icon: <IconBanhRangDanhSach />, tieuDe: 'Thay đổi quy định', moTa: 'Sân bay, hạng vé và các mốc thời gian', den: '/quy-dinh' },
  { icon: <IconKhienChia />, tieuDe: 'Phân quyền', moTa: 'Tài khoản và nhóm quyền người dùng', den: '/tai-khoan' },
];

const THE_NHAN_VIEN: ThuocTinhTheChucNang[] = [
  { icon: <IconKinhLup />, tieuDe: 'Tra cứu chuyến bay', moTa: 'Lịch bay, ghế trống theo hạng vé', den: '/chuyen-bay', phimTat: 'Alt+1' },
  { icon: <IconVeSao />, tieuDe: 'Bán vé', moTa: 'Bán trực tiếp hoặc từ phiếu đặt chỗ', den: '/ban-ve', phimTat: 'Alt+2' },
  { icon: <IconLichDongHo />, tieuDe: 'Đặt vé', moTa: 'Giữ chỗ đến hạn thanh toán', den: '/dat-ve', phimTat: 'Alt+3' },
  { icon: <IconChongVe />, tieuDe: 'Danh sách vé', moTa: 'Tra cứu, sửa thông tin và hủy vé', den: '/ve' },
  { icon: <IconBiaKepDongHo />, tieuDe: 'Phiếu đặt chỗ', moTa: 'Tra cứu, sửa và hủy phiếu', den: '/phieu-dat' },
];

const LOI_TAT_QUAN_LY: ThuocTinhTheDoc[] = [
  { nhan: 'Lịch bay', tieuDe: 'Nhập lịch chuyến bay từ tập tin Excel', moTa: 'Theo tập tin mẫu, kiểm tra quy định từng dòng', hinh: <IconThuMucBang kichThuoc={132} />, den: '/chuyen-bay?nhapExcel=1' },
  { nhan: 'Dọn dẹp', tieuDe: 'Xóa phiếu đặt chỗ đã hủy trước một mốc thời gian', moTa: 'Giữ dữ liệu gọn nhẹ', hinh: <IconBiaKepDongHo kichThuoc={132} />, den: '/phieu-dat?xoaDaHuy=1' },
  { nhan: 'Báo cáo', tieuDe: 'Xuất báo cáo doanh thu ra Excel hoặc PDF', moTa: 'Theo tháng và theo năm', hinh: <IconBieuDoXu kichThuoc={132} />, den: '/bao-cao' },
  { nhan: 'Quy định', tieuDe: 'Cập nhật thời gian đặt vé và hủy đặt vé', moTa: 'Áp dụng ngay sau khi lưu', hinh: <IconBanhRangDanhSach kichThuoc={132} />, den: '/quy-dinh' },
];

const LOI_TAT_NHAN_VIEN: ThuocTinhTheDoc[] = [
  { nhan: 'Bán vé', tieuDe: 'Bán vé từ phiếu đặt chỗ', moTa: 'Tìm phiếu theo giấy tờ hoặc mã phiếu', hinh: <LinhVat tuThe="ban_ve" kichThuoc={150} />, den: '/ban-ve?cheDo=tuPhieu' },
  { nhan: 'Tra cứu', tieuDe: 'Tra cứu chuyến bay', moTa: 'Theo sân bay, ngày bay hoặc mã chuyến', hinh: <LinhVat tuThe="tra_cuu" kichThuoc={150} />, den: '/chuyen-bay' },
  { nhan: 'Vé', tieuDe: 'Danh sách vé hôm nay', moTa: 'Các vé đã bán trong ngày', hinh: <IconChongVe kichThuoc={132} />, den: '/ve' },
];

export function TrangChinh() {
  const { laQuanLy } = dungPhien();
  const [chiSoLoiTat, datChiSoLoiTat] = useState(0);
  const the = laQuanLy ? THE_QUAN_LY : THE_NHAN_VIEN;
  const loiTat = laQuanLy ? LOI_TAT_QUAN_LY : LOI_TAT_NHAN_VIEN;

  return (
    <div className={s.trang}>
      <BangChaoMung />
      <TimNhanh />

      <section className={s.muc} aria-labelledby="tieu-de-chuc-nang">
        <TieuDeMuc
          id="tieu-de-chuc-nang"
          tieuDe={laQuanLy ? 'Chức năng chính' : 'Nghiệp vụ phòng vé'}
          phu={laQuanLy ? 'Tám nhóm chức năng dành cho Quản lý' : 'Bấm vào thẻ hoặc dùng phím tắt để chuyển nghiệp vụ'}
        />
        <div className={laQuanLy ? s.luoi8 : s.luoi5}>
          {the.map((t) => (
            <TheChucNang key={t.den} {...t} />
          ))}
        </div>
      </section>

      <div className={`${s.muc} ${s.luoiBang}`}>
        <BangSapKhoiHanh />
        <BangPhieuSapHetHan />
      </div>

      <section className={s.muc} aria-labelledby="tieu-de-loi-tat">
        <TieuDeMuc id="tieu-de-loi-tat" tieuDe={laQuanLy ? 'Lối tắt cho Quản lý' : 'Lối tắt'} phu="Các thao tác hay dùng, bấm để đi thẳng tới nơi cần làm" />
        <Carousel
          muc={loiTat}
          khoaMuc={(m) => m.tieuDe}
          chiSo={chiSoLoiTat}
          onDoiChiSo={datChiSoLoiTat}
          moiMan={(rong) => (rong > 1100 ? 4 : rong > 820 ? 3 : rong > 540 ? 2 : 1)}
          khoangCach={24}
          demDoc={40}
          demNgang={20}
          nhan="Lối tắt"
          veSlide={(m, { dangChon }) => <TheDoc {...m} dangChon={dangChon} />}
        />
      </section>
    </div>
  );
}
