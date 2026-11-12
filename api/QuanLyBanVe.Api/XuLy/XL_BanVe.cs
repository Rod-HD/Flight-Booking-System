using System.Data;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>
/// UC04 Quản lý bán vé: bán vé trực tiếp, bán vé từ phiếu đặt chỗ, tra cứu, sửa thông tin hành khách và hủy vé.
/// </summary>
public class XL_BanVe
{
    private readonly KetNoiCSDL ketNoi;
    private readonly DAL_ChuyenBay dalChuyenBay;
    private readonly DAL_GheTheoHang dalGheTheoHang;
    private readonly DAL_HangVe dalHangVe;
    private readonly DAL_HanhKhach dalHanhKhach;
    private readonly DAL_Ve dalVe;
    private readonly DAL_PhieuDatCho dalPhieuDatCho;
    private readonly DAL_ThamSoQuyDinh dalThamSo;
    private readonly DAL_SanBay dalSanBay;
    private readonly DongHoHeThong dongHo;

    public XL_BanVe(KetNoiCSDL ketNoi, DAL_ChuyenBay dalChuyenBay, DAL_GheTheoHang dalGheTheoHang, DAL_HangVe dalHangVe,
        DAL_HanhKhach dalHanhKhach, DAL_Ve dalVe, DAL_PhieuDatCho dalPhieuDatCho, DAL_ThamSoQuyDinh dalThamSo,
        DAL_SanBay dalSanBay, DongHoHeThong dongHo)
    {
        this.ketNoi = ketNoi;
        this.dalChuyenBay = dalChuyenBay;
        this.dalGheTheoHang = dalGheTheoHang;
        this.dalHangVe = dalHangVe;
        this.dalHanhKhach = dalHanhKhach;
        this.dalVe = dalVe;
        this.dalPhieuDatCho = dalPhieuDatCho;
        this.dalThamSo = dalThamSo;
        this.dalSanBay = dalSanBay;
        this.dongHo = dongHo;
    }

    /// <summary>
    /// Bước B2: kiểm tra chuyến bay chưa khởi hành (giả định 13) và còn ghế trống ở ít nhất một hạng.
    /// Trả về tổng số ghế trống của chuyến bay.
    /// </summary>
    public int kiemTraChuyenBay(string maCB)
    {
        DateTime ngayKhoiHanh = dalChuyenBay.layNgayKhoiHanh(maCB) ?? throw khongCoChuyenBay();
        if (ngayKhoiHanh <= dongHo.layThoiDiemHienTai()) throw daKhoiHanh();

        int tongSoGheTrong = dalChuyenBay.tongSoGheTrong(maCB);
        if (tongSoGheTrong <= 0) throw LoiNghiepVu.viPham(MaLoi.HET_CHO, "Chuyến bay đã hết chỗ.", "maChuyenBay");
        return tongSoGheTrong;
    }

    /// <summary>
    /// Bước B5, B6: kiểm tra hạng vé còn ghế trống theo công thức (1.2) (QĐ2) rồi tính giá tiền theo công thức (1.1).
    /// </summary>
    public decimal kiemTraChoTrong(string maCB, string maHang)
    {
        HangVe hang = dalHangVe.layHangVe(maHang) ?? throw LoiNghiepVu.khongHopLe("maHangVe", "Hạng vé không có trong danh sách hạng vé.");
        if (dalChuyenBay.laySoGheTrong(maCB, maHang) <= 0) throw hetChoHangVe();
        return hang.tinhGiaTien(dalChuyenBay.layGiaVe(maCB));
    }

    /// <summary>Thông tin để mở màn hình bán vé cho một chuyến bay: có được bán không, số ghế trống và giá tiền từng hạng.</summary>
    public ThongTinBan layThongTinBan(string maCB)
    {
        maCB = maCB.Trim().ToUpperInvariant();
        ChuyenBay cb = dalChuyenBay.layThongTin(maCB) ?? throw khongCoChuyenBay();
        var ketQua = new ThongTinBan { Hang = layThongTinHang(cb) };
        ketQua.TongSoGheTrong = ketQua.Hang.Sum(h => h.SoGheTrong);
        try
        {
            kiemTraChuyenBay(maCB);
            ketQua.DuocPhep = true;
        }
        catch (LoiNghiepVu loi) when (loi.Loai == LoaiLoi.ViPhamQuyDinh)
        {
            ketQua.MaLoi = loi.Ma;
            ketQua.ThongBao = loi.Message;
        }
        return ketQua;
    }

    /// <summary>Số ghế trống (1.2) và giá tiền (1.1) của từng hạng vé mà chuyến bay có ghế.</summary>
    internal List<ThongTinHang> layThongTinHang(ChuyenBay cb)
    {
        Dictionary<string, HangVe> hangVe = dalHangVe.layDanhSachHangVe().ToDictionary(h => h.MaHangVe);
        var ds = new List<ThongTinHang>();
        foreach (GheTheoHang ghe in dalGheTheoHang.layTheoChuyenBay(cb.MaChuyenBay))
        {
            HangVe hang = hangVe[ghe.MaHangVe];
            ds.Add(new ThongTinHang
            {
                MaHangVe = hang.MaHangVe,
                TenHangVe = hang.TenHangVe,
                SoGheTrong = dalChuyenBay.laySoGheTrong(cb.MaChuyenBay, hang.MaHangVe),
                GiaTien = hang.tinhGiaTien(cb.GiaVe)
            });
        }
        return ds;
    }

    /// <summary>
    /// UC04.1 Bán vé trực tiếp. Trong một giao dịch: khóa dòng số ghế của hạng trên chuyến bay, đếm lại
    /// số ghế trống rồi mới lưu hành khách (nếu chưa có) và vé, để hai máy không bán trùng chiếc ghế cuối.
    /// </summary>
    public Ve banVe(string? maCB, string? maHang, HanhKhach? hanhKhach)
    {
        maCB = (maCB ?? "").Trim().ToUpperInvariant();
        maHang = (maHang ?? "").Trim().ToUpperInvariant();
        kiemTraDaChon(maCB, maHang);
        HanhKhach hk = KiemTraHanhKhach.chuanHoaVaKiemTra(hanhKhach);
        HangVe hang = dalHangVe.layHangVe(maHang) ?? throw LoiNghiepVu.khongHopLe("maHangVe", "Hạng vé không có trong danh sách hạng vé.");

        return ketNoi.thucHienTrongGiaoDich(() =>
        {
            // QĐ2: chỉ bán vé khi còn chỗ; số ghế trống tính theo công thức (1.2) sau khi đã khóa dòng GHETHEOHANG
            int soGheTrong = dalChuyenBay.laySoGheTrong(maCB, maHang, khoaDong: true);
            ChuyenBay cb = dalChuyenBay.layThongTin(maCB) ?? throw khongCoChuyenBay();

            // giả định 13: chỉ bán vé cho chuyến bay chưa khởi hành
            DateTime thoiDiem = dongHo.layThoiDiemHienTai();
            if (cb.NgayGioKhoiHanh <= thoiDiem) throw daKhoiHanh();
            if (soGheTrong <= 0) throw hetChoHangVe();

            string maHanhKhach = dalHanhKhach.timHoacThemHanhKhach(hk.HoTen, hk.LoaiGiayTo, hk.SoGiayTo, hk.DienThoai);
            // công thức (1.1): giá tiền = giá vé x tỉ lệ đơn giá của hạng vé, ghi vào vé lúc bán
            var ve = new Ve("", maCB, maHanhKhach, maHang, null, hang.tinhGiaTien(cb.GiaVe), thoiDiem, Ve.DA_BAN);
            ve.MaVe = dalVe.themVe(ve);
            return ve;
        });
    }

    /// <summary>
    /// UC04.2 bước P2: tìm các phiếu còn hạn theo CCCD/hộ chiếu của hành khách hoặc theo mã phiếu đặt.
    /// loaiGiayTo để trống thì tìm số giấy tờ ở cả hai loại.
    /// </summary>
    public DataTable timPhieuDat(string? loaiGiayTo, string? soGiayTo, string? maPhieuDat)
    {
        DateTime thoiDiem = dongHo.layThoiDiemHienTai();
        int thoiGianHuy = dalThamSo.layThoiGianHuyDatVe();
        var dsPhieu = new List<PhieuDatCho>();

        if (!string.IsNullOrWhiteSpace(maPhieuDat))
        {
            PhieuDatCho? phieu = dalPhieuDatCho.timPhieuConHan(maPhieuDat.Trim().ToUpperInvariant(), thoiDiem, thoiGianHuy);
            if (phieu != null) dsPhieu.Add(phieu);
        }
        else if (!string.IsNullOrWhiteSpace(soGiayTo))
        {
            string so = soGiayTo.Trim().ToUpperInvariant();
            string[] cacLoai = string.IsNullOrWhiteSpace(loaiGiayTo)
                ? new[] { HanhKhach.CAN_CUOC, HanhKhach.HO_CHIEU }
                : new[] { loaiGiayTo };
            foreach (string loai in cacLoai)
            {
                HanhKhach? hk = dalHanhKhach.timHanhKhach(loai, so);
                if (hk != null) dsPhieu.AddRange(dalPhieuDatCho.layPhieuConHan(hk.MaHanhKhach, thoiDiem, thoiGianHuy));
            }
        }
        else
        {
            throw LoiNghiepVu.khongHopLe("soGiayTo", "Hãy nhập số CCCD/hộ chiếu hoặc mã phiếu đặt.");
        }

        var bang = new DataTable("PhieuConHan");
        bang.Columns.Add("MaPhieuDat", typeof(string));
        bang.Columns.Add("MaChuyenBay", typeof(string));
        bang.Columns.Add("TuyenBay", typeof(string));
        bang.Columns.Add("MaSanBayDi", typeof(string));
        bang.Columns.Add("TenSanBayDi", typeof(string));
        bang.Columns.Add("MaSanBayDen", typeof(string));
        bang.Columns.Add("TenSanBayDen", typeof(string));
        bang.Columns.Add("NgayGioKhoiHanh", typeof(DateTime));
        bang.Columns.Add("MaHangVe", typeof(string));
        bang.Columns.Add("TenHangVe", typeof(string));
        bang.Columns.Add("HoTen", typeof(string));
        bang.Columns.Add("GiaTien", typeof(decimal));
        bang.Columns.Add("ThoiDiemDat", typeof(DateTime));
        bang.Columns.Add("HanThanhToan", typeof(DateTime));
        if (dsPhieu.Count == 0) return bang;

        Dictionary<string, string> tenSanBay = dalSanBay.layDanhSachSanBay().ToDictionary(sb => sb.MaSanBay, sb => sb.TenSanBay);
        foreach (PhieuDatCho phieu in dsPhieu)
        {
            ChuyenBay cb = dalChuyenBay.layThongTin(phieu.MaChuyenBay)!;
            bang.Rows.Add(phieu.MaPhieuDat, phieu.MaChuyenBay, cb.MaSanBayDi + " - " + cb.MaSanBayDen,
                cb.MaSanBayDi, tenSanBay.GetValueOrDefault(cb.MaSanBayDi), cb.MaSanBayDen, tenSanBay.GetValueOrDefault(cb.MaSanBayDen),
                cb.NgayGioKhoiHanh, phieu.MaHangVe, dalHangVe.layHangVe(phieu.MaHangVe)?.TenHangVe,
                dalHanhKhach.layHanhKhach(phieu.MaHanhKhach)?.HoTen,
                phieu.GiaTien, phieu.ThoiDiemDat, phieu.hanThanhToan(cb.NgayGioKhoiHanh, thoiGianHuy));
        }
        return bang;
    }

    /// <summary>
    /// UC04.2 bước P4: lập vé từ phiếu đặt chỗ. Đọc lại phiếu và kiểm tra còn hạn vì phiếu có thể vừa bị
    /// UC06 hoặc máy khác hủy; vé lấy giá tiền ghi trên phiếu và lưu mã phiếu; phiếu chuyển sang Đã hủy
    /// trong cùng giao dịch. Chỗ đã được giữ từ lúc đặt nên không kiểm tra lại số ghế trống (giả định 5).
    /// </summary>
    public Ve banVeTuPhieu(string? maPhieuDat)
    {
        if (string.IsNullOrWhiteSpace(maPhieuDat)) throw LoiNghiepVu.khongHopLe("maPhieuDat", "Chưa chọn phiếu đặt chỗ.");
        string maPhieu = maPhieuDat.Trim().ToUpperInvariant();
        var hetHan = LoiNghiepVu.viPham(MaLoi.PHIEU_HET_HAN,
            "Phiếu đặt chỗ không còn hạn (đã bị hủy, đã quá 24 giờ hoặc đã đến mốc hủy đặt vé).");

        return ketNoi.thucHienTrongGiaoDich(() =>
        {
            PhieuDatCho phieu = dalPhieuDatCho.layThongTinPhieu(maPhieu, khoaDong: true)
                ?? throw LoiNghiepVu.khongTimThay("Không tìm thấy phiếu đặt chỗ.");
            ChuyenBay cb = dalChuyenBay.layThongTin(phieu.MaChuyenBay)!;
            DateTime thoiDiem = dongHo.layThoiDiemHienTai();
            if (!phieu.conHan(thoiDiem, cb.NgayGioKhoiHanh, dalThamSo.layThoiGianHuyDatVe())) throw hetHan;

            var ve = new Ve("", phieu.MaChuyenBay, phieu.MaHanhKhach, phieu.MaHangVe, phieu.MaPhieuDat,
                phieu.GiaTien, thoiDiem, Ve.DA_BAN);
            ve.MaVe = dalVe.themVe(ve);
            if (dalPhieuDatCho.huy(phieu.MaPhieuDat) == 0) throw hetHan;
            return ve;
        });
    }

    /// <summary>
    /// UC04.3 Tra cứu vé theo mã vé, số giấy tờ, chuyến bay, khoảng ngày bán.
    /// Không có tiêu chí nào thì hiển thị các vé bán trong ngày hôm nay.
    /// </summary>
    public DataTable timVe(TieuChiTim tieuChi)
    {
        var chuan = new TieuChiTim
        {
            MaSo = chuanHoaMa(tieuChi.MaSo),
            SoGiayTo = chuanHoaMa(tieuChi.SoGiayTo),
            MaChuyenBay = chuanHoaMa(tieuChi.MaChuyenBay),
            TuNgay = tieuChi.TuNgay?.Date,
            DenNgay = tieuChi.DenNgay?.Date.AddDays(1)
        };
        bool khongCoTieuChi = chuan.MaSo == null && chuan.SoGiayTo == null && chuan.MaChuyenBay == null
            && chuan.TuNgay == null && chuan.DenNgay == null;
        if (khongCoTieuChi)
        {
            chuan.TuNgay = dongHo.layThoiDiemHienTai().Date;
            chuan.DenNgay = chuan.TuNgay.Value.AddDays(1);
        }
        return dalVe.timVe(chuan);
    }

    /// <summary>UC04.4 Sửa vé: chỉ sửa họ tên, loại và số giấy tờ, điện thoại của hành khách (giả định 8).</summary>
    public void suaVe(string maVe, HanhKhach? thongTinMoi)
    {
        maVe = maVe.Trim().ToUpperInvariant();
        HanhKhach hk = KiemTraHanhKhach.chuanHoaVaKiemTra(thongTinMoi);
        var trungGiayTo = giayToThuocNguoiKhac();
        try
        {
            ketNoi.thucHienTrongGiaoDich(() =>
            {
                Ve ve = dalVe.layVe(maVe, khoaDong: true) ?? throw khongCoVe();
                // ngoại lệ S3b: vé vừa bị hủy ở máy khác
                if (ve.TinhTrang != Ve.DA_BAN)
                    throw LoiNghiepVu.viPham(MaLoi.DU_LIEU_DA_THAY_DOI, "Vé đã bị hủy nên không sửa được.");

                // ngoại lệ S3a: giấy tờ mới không được thuộc hành khách khác
                HanhKhach? chuGiayTo = dalHanhKhach.timHanhKhach(hk.LoaiGiayTo, hk.SoGiayTo);
                if (chuGiayTo != null && chuGiayTo.MaHanhKhach != ve.MaHanhKhach) throw trungGiayTo;

                dalHanhKhach.capNhat(ve.MaHanhKhach, hk.HoTen, hk.LoaiGiayTo, hk.SoGiayTo, hk.DienThoai);
            });
        }
        catch (LoiTrungDuLieu)
        {
            throw trungGiayTo;
        }
    }

    /// <summary>UC04.5 Hủy vé: chỉ khi chuyến bay chưa khởi hành; vé chuyển sang Đã hủy và trả lại chỗ (AT03).</summary>
    public void huyVe(string maVe)
    {
        maVe = maVe.Trim().ToUpperInvariant();
        ketNoi.thucHienTrongGiaoDich(() =>
        {
            Ve ve = dalVe.layVe(maVe, khoaDong: true) ?? throw khongCoVe();
            var daHuy = LoiNghiepVu.viPham(MaLoi.DU_LIEU_DA_THAY_DOI, "Vé này đã được hủy trước đó.");
            if (ve.TinhTrang != Ve.DA_BAN) throw daHuy;

            DateTime ngayKhoiHanh = dalChuyenBay.layNgayKhoiHanh(ve.MaChuyenBay) ?? throw khongCoChuyenBay();
            if (ngayKhoiHanh <= dongHo.layThoiDiemHienTai())
                throw LoiNghiepVu.viPham(MaLoi.CHUYEN_BAY_DA_KHOI_HANH, "Không thể hủy vé vì chuyến bay đã khởi hành.");

            if (dalVe.huy(maVe) == 0) throw daHuy;
        });
    }

    private static void kiemTraDaChon(string maCB, string maHang)
    {
        var loi = new Dictionary<string, string>();
        if (maCB.Length == 0) loi["maChuyenBay"] = "Chưa chọn chuyến bay.";
        if (maHang.Length == 0) loi["maHangVe"] = "Chưa chọn hạng vé.";
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
    }

    private static string? chuanHoaMa(string? ma)
    {
        return string.IsNullOrWhiteSpace(ma) ? null : ma.Trim().ToUpperInvariant();
    }

    private static LoiNghiepVu khongCoChuyenBay() => LoiNghiepVu.khongTimThay("Không tìm thấy chuyến bay.");

    private static LoiNghiepVu khongCoVe() => LoiNghiepVu.khongTimThay("Không tìm thấy vé.");

    private static LoiNghiepVu daKhoiHanh() =>
        LoiNghiepVu.viPham(MaLoi.CHUYEN_BAY_DA_KHOI_HANH, "Không bán vé cho chuyến bay đã khởi hành.", "maChuyenBay");

    private static LoiNghiepVu hetChoHangVe() => LoiNghiepVu.viPham(MaLoi.HET_CHO, "Hạng vé đã hết chỗ.", "maHangVe");

    internal static LoiNghiepVu giayToThuocNguoiKhac() =>
        LoiNghiepVu.viPham(MaLoi.GIAY_TO_DA_THUOC_NGUOI_KHAC, "Số giấy tờ này đã thuộc một hành khách khác.", "soGiayTo");
}
