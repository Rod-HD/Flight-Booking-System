// Khung định tuyến của ứng dụng
import { Route, Routes } from 'react-router-dom';
import { CHI_QUAN_LY } from '@/dinh_tuyen';
import { BoCuc } from '@/thanh_phan/BoCuc';
import { YeuCauDangNhap, YeuCauQuyen } from '@/thanh_phan/BaoVeDuongDan';
import { TrangKhongTimThay } from '@/thanh_phan/TrangThongBaoLoi';
import { TrangDangNhap } from '@/trang/dang_nhap/TrangDangNhap';
import { TrangChinh } from '@/trang/trang_chinh/TrangChinh';
import { TrangTroGiup } from '@/trang/tro_giup/TrangTroGiup';
import { TrangDanhSachChuyenBay } from '@/trang/chuyen_bay/TrangDanhSachChuyenBay';
import { TrangThemSuaChuyenBay } from '@/trang/chuyen_bay/TrangThemSuaChuyenBay';
import { TrangXemChuyenBay } from '@/trang/chuyen_bay/TrangXemChuyenBay';
import { TrangDanhSachVe } from '@/trang/ve/TrangDanhSachVe';
import { TrangBanVe } from '@/trang/ve/TrangBanVe';
import { TrangDanhSachPhieuDat } from '@/trang/phieu_dat/TrangDanhSachPhieuDat';
import { TrangDatVe } from '@/trang/phieu_dat/TrangDatVe';
import { TrangBaoCao } from '@/trang/bao_cao/TrangBaoCao';
import { TrangQuyDinh } from '@/trang/quy_dinh/TrangQuyDinh';
import { TrangTaiKhoan } from '@/trang/tai_khoan/TrangTaiKhoan';

export function App() {
  return (
    <Routes>
      <Route path="/dang-nhap" element={<TrangDangNhap />} />
      <Route element={<YeuCauDangNhap />}>
        <Route element={<BoCuc />}>
          <Route index element={<TrangChinh />} />
          <Route path="chuyen-bay" element={<TrangDanhSachChuyenBay />} />
          <Route path="chuyen-bay/them" element={<YeuCauQuyen quyen={CHI_QUAN_LY}><TrangThemSuaChuyenBay /></YeuCauQuyen>} />
          <Route path="chuyen-bay/:ma" element={<TrangXemChuyenBay />} />
          <Route path="chuyen-bay/:ma/sua" element={<YeuCauQuyen quyen={CHI_QUAN_LY}><TrangThemSuaChuyenBay /></YeuCauQuyen>} />
          <Route path="ve" element={<TrangDanhSachVe />} />
          <Route path="ban-ve" element={<TrangBanVe />} />
          <Route path="phieu-dat" element={<TrangDanhSachPhieuDat />} />
          <Route path="dat-ve" element={<TrangDatVe />} />
          <Route element={<YeuCauQuyen quyen={CHI_QUAN_LY} />}>
            <Route path="bao-cao" element={<TrangBaoCao />} />
            <Route path="quy-dinh" element={<TrangQuyDinh />} />
            <Route path="tai-khoan" element={<TrangTaiKhoan />} />
          </Route>
          <Route path="tro-giup" element={<TrangTroGiup />} />
          <Route path="*" element={<TrangKhongTimThay />} />
        </Route>
      </Route>
    </Routes>
  );
}
