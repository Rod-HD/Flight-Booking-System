using System.Data;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>
/// UC05 Quản lý đặt vé: lập phiếu đặt chỗ, tra cứu, sửa thông tin hành khách, hủy phiếu
/// và xóa hẳn các phiếu đã hủy trước một mốc thời gian (chỉ Quản lý).
/// </summary>
public class XL_DatVe
{
    private readonly KetNoiCSDL ketNoi;
    private readonly DAL_ChuyenBay dalChuyenBay;
    private readonly DAL_GheTheoHang dalGheTheoHang;
    private readonly DAL_HangVe dalHangVe;
    private readonly DAL_HanhKhach dalHanhKhach;
    private readonly DAL_PhieuDatCho dalPhieuDatCho;
    private readonly DAL_ThamSoQuyDinh dalThamSo;
    private readonly DongHoHeThong dongHo;

    public XL_DatVe(KetNoiCSDL ketNoi, DAL_ChuyenBay dalChuyenBay, DAL_GheTheoHang dalGheTheoHang, DAL_HangVe dalHangVe,
        DAL_HanhKhach dalHanhKhach, DAL_PhieuDatCho dalPhieuDatCho, DAL_ThamSoQuyDinh dalThamSo, DongHoHeThong dongHo)
    {
        this.ketNoi = ketNoi;
        this.dalChuyenBay = dalChuyenBay;
        this.dalGheTheoHang = dalGheTheoHang;
        this.dalHangVe = dalHangVe;
        this.dalHanhKhach = dalHanhKhach;
        this.dalPhieuDatCho = dalPhieuDatCho;
        this.dalThamSo = dalThamSo;
        this.dongHo = dongHo;
    }

    /// <summary>
    /// Bước L2: kiểm tra thời hạn đặt vé theo QĐ3 và tổng số ghế trống của chuyến bay.
    /// Trả về tổng số ghế trống.
    /// </summary>
    public int kiemTraChuyenBay(string maCB)
    {
        DateTime ngayKhoiHanh = dalChuyenBay.layNgayKhoiHanh(maCB) ?? throw khongCoChuyenBay();
        kiemTraThoiHanDatVe(ngayKhoiHanh, dongHo.layThoiDiemHienTai());

        int tongSoGheTrong = dalChuyenBay.tongSoGheTrong(maCB);
        if (tongSoGheTrong <= 0) throw LoiNghiepVu.viPham(MaLoi.HET_CHO, "Chuyến bay đã hết chỗ.", "maChuyenBay");
        return tongSoGheTrong;
    }

    /// <summary>Bước L5, L6: kiểm tra hạng vé còn ghế trống theo công thức (1.2) rồi tính giá tiền theo công thức (1.1).</summary>
    public decimal kiemTraChoTrong(string maCB, string maHang)
    {
        HangVe hang = dalHangVe.layHangVe(maHang) ?? throw LoiNghiepVu.khongHopLe("maHangVe", "Hạng vé không có trong danh sách hạng vé.");
        if (dalChuyenBay.laySoGheTrong(maCB, maHang) <= 0) throw hetChoHangVe();
        return hang.tinhGiaTien(dalChuyenBay.layGiaVe(maCB));
    }

    /// <summary>Thông tin để mở màn hình đặt vé cho một chuyến bay, kèm hạn thanh toán nếu lập phiếu ngay lúc này.</summary>
    public ThongTinBan layThongTinDat(string maCB)
    {
        maCB = maCB.Trim().ToUpperInvariant();
        ChuyenBay cb = dalChuyenBay.layThongTin(maCB) ?? throw khongCoChuyenBay();
        Dictionary<string, HangVe> hangVe = dalHangVe.layDanhSachHangVe().ToDictionary(h => h.MaHangVe);
        var ketQua = new ThongTinBan();
        foreach (GheTheoHang ghe in dalGheTheoHang.layTheoChuyenBay(maCB))
        {
            HangVe hang = hangVe[ghe.MaHangVe];
            ketQua.Hang.Add(new ThongTinHang
            {
                MaHangVe = hang.MaHangVe,
                TenHangVe = hang.TenHangVe,
                SoGheTrong = dalChuyenBay.laySoGheTrong(maCB, hang.MaHangVe),
                GiaTien = hang.tinhGiaTien(cb.GiaVe)
            });
        }
        ketQua.TongSoGheTrong = ketQua.Hang.Sum(h => h.SoGheTrong);
        try
        {
            kiemTraChuyenBay(maCB);
            ketQua.DuocPhep = true;
            var phieuThu = new PhieuDatCho { ThoiDiemDat = dongHo.layThoiDiemHienTai() };
            ketQua.HanThanhToanDuKien = phieuThu.hanThanhToan(cb.NgayGioKhoiHanh, dalThamSo.layThoiGianHuyDatVe());
        }
        catch (LoiNghiepVu loi) when (loi.Loai == LoaiLoi.ViPhamQuyDinh)
        {
            ketQua.MaLoi = loi.Ma;
            ketQua.ThongBao = loi.Message;
        }
        return ketQua;
    }

    /// <summary>
    /// UC05.1 Lập phiếu đặt chỗ. Trong một giao dịch: khóa dòng số ghế của hạng, kiểm tra thời hạn đặt vé (QĐ3),
    /// đếm lại số ghế trống rồi mới lưu hành khách (nếu chưa có) và phiếu Chờ thanh toán.
    /// hanThanhToan là thời điểm sớm hơn giữa 24 giờ kể từ lúc đặt và mốc hủy đặt vé theo QĐ3 (giả định 7).
    /// </summary>
    public PhieuDatCho datVe(string? maCB, string? maHang, HanhKhach? hanhKhach, out DateTime hanThanhToan)
    {
        string maChuyenBay = (maCB ?? "").Trim().ToUpperInvariant();
        string maHangVe = (maHang ?? "").Trim().ToUpperInvariant();
        var loi = new Dictionary<string, string>();
        if (maChuyenBay.Length == 0) loi["maChuyenBay"] = "Chưa chọn chuyến bay.";
        if (maHangVe.Length == 0) loi["maHangVe"] = "Chưa chọn hạng vé.";
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
        HanhKhach hk = KiemTraHanhKhach.chuanHoaVaKiemTra(hanhKhach);
        HangVe hang = dalHangVe.layHangVe(maHangVe) ?? throw LoiNghiepVu.khongHopLe("maHangVe", "Hạng vé không có trong danh sách hạng vé.");

        DateTime han = default;
        PhieuDatCho ketQua = ketNoi.thucHienTrongGiaoDich(() =>
        {
            // phiếu giữ chỗ nên cũng phải còn ghế trống như khi bán vé (giả định 2); khóa dòng GHETHEOHANG rồi đếm lại
            int soGheTrong = dalChuyenBay.laySoGheTrong(maChuyenBay, maHangVe, khoaDong: true);
            ChuyenBay cb = dalChuyenBay.layThongTin(maChuyenBay) ?? throw khongCoChuyenBay();

            DateTime thoiDiem = dongHo.layThoiDiemHienTai();
            kiemTraThoiHanDatVe(cb.NgayGioKhoiHanh, thoiDiem);
            if (soGheTrong <= 0) throw hetChoHangVe();

            string maHanhKhach = dalHanhKhach.timHoacThemHanhKhach(hk.HoTen, hk.LoaiGiayTo, hk.SoGiayTo, hk.DienThoai);
            // giá tiền theo công thức (1.1), ghi vào phiếu lúc đặt và không đổi khi giá vé chuyến bay được sửa
            var phieu = new PhieuDatCho("", maChuyenBay, maHanhKhach, maHangVe, hang.tinhGiaTien(cb.GiaVe), thoiDiem,
                PhieuDatCho.CHO_THANH_TOAN);
            phieu.MaPhieuDat = dalPhieuDatCho.themPhieuDat(phieu);
            han = phieu.hanThanhToan(cb.NgayGioKhoiHanh, dalThamSo.layThoiGianHuyDatVe());
            return phieu;
        });
        hanThanhToan = han;
        return ketQua;
    }

    /// <summary>UC05.2 Tra cứu phiếu theo mã phiếu đặt, số giấy tờ, chuyến bay, tình trạng; kèm cột hạn thanh toán.</summary>
    public DataTable timPhieuDat(TieuChiTim tieuChi)
    {
        var chuan = new TieuChiTim
        {
            MaSo = chuanHoaMa(tieuChi.MaSo),
            SoGiayTo = chuanHoaMa(tieuChi.SoGiayTo),
            MaChuyenBay = chuanHoaMa(tieuChi.MaChuyenBay),
            TinhTrang = string.IsNullOrWhiteSpace(tieuChi.TinhTrang) ? null : tieuChi.TinhTrang
        };
        DataTable bang = dalPhieuDatCho.timPhieu(chuan);
        themCotHanThanhToan(bang);
        return bang;
    }

    /// <summary>Các phiếu Chờ thanh toán còn hạn, phiếu sắp hết hạn đứng trước.</summary>
    public DataTable laySapHetHan(int soLuong)
    {
        soLuong = Math.Clamp(soLuong, 1, 100);
        DataTable bang = dalPhieuDatCho.timPhieuSapHetHan(dongHo.layThoiDiemHienTai(), dalThamSo.layThoiGianHuyDatVe(), soLuong);
        themCotHanThanhToan(bang);
        return bang;
    }

    /// <summary>UC05.3 Sửa phiếu: chỉ sửa thông tin hành khách của phiếu đang Chờ thanh toán (giả định 8).</summary>
    public void suaPhieuDat(string maPhieuDat, HanhKhach? thongTinMoi)
    {
        maPhieuDat = maPhieuDat.Trim().ToUpperInvariant();
        HanhKhach hk = KiemTraHanhKhach.chuanHoaVaKiemTra(thongTinMoi);
        var trungGiayTo = XL_BanVe.giayToThuocNguoiKhac();
        try
        {
            ketNoi.thucHienTrongGiaoDich(() =>
            {
                PhieuDatCho phieu = dalPhieuDatCho.layThongTinPhieu(maPhieuDat, khoaDong: true) ?? throw khongCoPhieu();
                // ngoại lệ S3b: phiếu vừa chuyển sang Đã hủy do UC06 hoặc do thao tác ở máy khác
                if (phieu.TinhTrang != PhieuDatCho.CHO_THANH_TOAN)
                    throw LoiNghiepVu.viPham(MaLoi.DU_LIEU_DA_THAY_DOI, "Phiếu đặt chỗ đã bị hủy nên không sửa được.");

                // ngoại lệ S3a: giấy tờ mới không được thuộc hành khách khác
                HanhKhach? chuGiayTo = dalHanhKhach.timHanhKhach(hk.LoaiGiayTo, hk.SoGiayTo);
                if (chuGiayTo != null && chuGiayTo.MaHanhKhach != phieu.MaHanhKhach) throw trungGiayTo;

                dalHanhKhach.capNhat(phieu.MaHanhKhach, hk.HoTen, hk.LoaiGiayTo, hk.SoGiayTo, hk.DienThoai);
            });
        }
        catch (LoiTrungDuLieu)
        {
            throw trungGiayTo;
        }
    }

    /// <summary>UC05.4 Hủy phiếu theo yêu cầu của hành khách: phiếu chuyển sang Đã hủy và trả lại chỗ (AT03).</summary>
    public void huyPhieuDat(string maPhieuDat)
    {
        maPhieuDat = maPhieuDat.Trim().ToUpperInvariant();
        PhieuDatCho phieu = dalPhieuDatCho.layThongTinPhieu(maPhieuDat) ?? throw khongCoPhieu();
        // ngoại lệ H2a: phiếu đã bị hủy trước khi lưu
        if (phieu.TinhTrang != PhieuDatCho.CHO_THANH_TOAN || dalPhieuDatCho.huy(maPhieuDat) == 0)
            throw LoiNghiepVu.viPham(MaLoi.DU_LIEU_DA_THAY_DOI, "Phiếu đặt chỗ này đã được hủy trước đó.");
    }

    /// <summary>UC05.5 bước X2: số phiếu Đã hủy có thời điểm đặt trước mốc và chưa được chuyển thành vé.</summary>
    public int demPhieuDaHuy(DateTime mocThoiGian)
    {
        return dalPhieuDatCho.demPhieuDaHuy(mocThoiGian);
    }

    /// <summary>UC05.5 bước X3: xóa hẳn các phiếu đó khỏi cơ sở dữ liệu (AT04); trả về số phiếu đã xóa.</summary>
    public int xoaPhieuDaHuy(DateTime mocThoiGian)
    {
        return dalPhieuDatCho.xoaPhieuDaHuy(mocThoiGian);
    }

    /// <summary>
    /// QĐ3 (giả định 6): chỉ cho đặt vé khi ngày khởi hành cách ngày hiện tại không ít hơn thời gian chậm nhất
    /// khi đặt vé, tính theo ngày lịch. Tham số được đọc từ CSDL ở mỗi lần kiểm tra.
    /// </summary>
    private void kiemTraThoiHanDatVe(DateTime ngayGioKhoiHanh, DateTime thoiDiem)
    {
        int soNgayToiThieu = dalThamSo.layThoiGianDatVeChamNhat();
        if ((ngayGioKhoiHanh.Date - thoiDiem.Date).Days < soNgayToiThieu)
            throw LoiNghiepVu.viPham(MaLoi.QUA_HAN_DAT_VE,
                "Đã quá thời hạn đặt vé: chỉ nhận đặt vé chậm nhất " + soNgayToiThieu + " ngày trước ngày khởi hành.",
                "maChuyenBay");
    }

    /// <summary>Thêm cột HanThanhToan cho bảng kết quả tra cứu phiếu, tính bằng hanThanhToan của lớp PhieuDatCho.</summary>
    private void themCotHanThanhToan(DataTable bang)
    {
        int thoiGianHuy = dalThamSo.layThoiGianHuyDatVe();
        bang.Columns.Add("HanThanhToan", typeof(DateTime));
        foreach (DataRow dong in bang.Rows)
        {
            var phieu = new PhieuDatCho { ThoiDiemDat = (DateTime)dong["ThoiDiemDat"] };
            dong["HanThanhToan"] = phieu.hanThanhToan((DateTime)dong["NgayGioKhoiHanh"], thoiGianHuy);
        }
    }

    private static string? chuanHoaMa(string? ma)
    {
        return string.IsNullOrWhiteSpace(ma) ? null : ma.Trim().ToUpperInvariant();
    }

    private static LoiNghiepVu khongCoChuyenBay() => LoiNghiepVu.khongTimThay("Không tìm thấy chuyến bay.");

    private static LoiNghiepVu khongCoPhieu() => LoiNghiepVu.khongTimThay("Không tìm thấy phiếu đặt chỗ.");

    private static LoiNghiepVu hetChoHangVe() => LoiNghiepVu.viPham(MaLoi.HET_CHO, "Hạng vé đã hết chỗ.", "maHangVe");
}
