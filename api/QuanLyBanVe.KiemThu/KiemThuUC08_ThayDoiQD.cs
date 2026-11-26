using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC08_ThayDoiQD : KiemThuCoSo
{
    private readonly XL_ThayDoiQD xl;

    public KiemThuUC08_ThayDoiQD(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_ThayDoiQD>();
    }

    private ThamSoQuyDinh thamSo() => xl.layDanhSachQuyDinh(out _, out _);

    [Fact(DisplayName = "NV06 TD06: xem giá trị hiện hành gồm sáu tham số mặc định theo đề, danh sách sân bay và hạng vé")]
    public void XemGiaTriHienHanh()
    {
        ThamSoQuyDinh ts = xl.layDanhSachQuyDinh(out List<SanBay> dsSanBay, out List<HangVe> dsHangVe);

        Assert.Equal(new[] { 30, 2, 10, 20, 1, 0 }, new[]
        {
            ts.ThoiGianBayToiThieu, ts.SoSanBayTrungGianToiDa, ts.ThoiGianDungToiThieu,
            ts.ThoiGianDungToiDa, ts.ThoiGianDatVeChamNhat, ts.ThoiGianHuyDatVe
        });
        Assert.Equal(5, dsSanBay.Count);
        Assert.Equal(new[] { 105.00m, 100.00m }, dsHangVe.Select(h => h.TiLeDonGia));
    }

    [Fact(DisplayName = "NV06 TH02 đến TH04, TH06, TH07: sửa từng tham số, giá trị mới được lưu")]
    public void SuaThamSo()
    {
        xl.capNhatThamSo("thoiGianBayToiThieu", 45); // tên tham số không phân biệt hoa thường
        xl.capNhatThamSo("SoSanBayTrungGianToiDa", 0);
        xl.capNhatThamSo("ThoiGianDungToiDa", 30);
        xl.capNhatThamSo("ThoiGianDungToiThieu", 30);
        xl.capNhatThamSo("ThoiGianDatVeChamNhat", 5);
        xl.capNhatThamSo("ThoiGianHuyDatVe", 4);

        ThamSoQuyDinh ts = thamSo();
        Assert.Equal(45, ts.ThoiGianBayToiThieu);
        Assert.Equal(0, ts.SoSanBayTrungGianToiDa);
        Assert.Equal(30, ts.ThoiGianDungToiThieu);
        Assert.Equal(30, ts.ThoiGianDungToiDa);
        Assert.Equal(5, ts.ThoiGianDatVeChamNhat);
        Assert.Equal(4, ts.ThoiGianHuyDatVe);
        Assert.Equal(1, csdl.dem("SELECT COUNT(*) FROM THAMSOQUYDINH"));
    }

    [Fact(DisplayName = "NV06 ngoại lệ 6a: giá trị âm, thiếu giá trị hoặc tham số không có")]
    public void GiaTriKhongHopLe()
    {
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, batLoi(() => xl.capNhatThamSo("ThoiGianBayToiThieu", -1)).Loai);
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, batLoi(() => xl.capNhatThamSo("ThoiGianBayToiThieu", null)).Loai);
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, batLoi(() => xl.capNhatThamSo("ThoiGianHuyDatVe", 100000)).Loai);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.capNhatThamSo("GiaVe", 10)).Loai);
        Assert.Equal(30, thamSo().ThoiGianBayToiThieu);
    }

    [Theory(DisplayName = "TH02 giả định 12: thời gian bay tối thiểu không vượt cận trên 1.440 phút của thời gian bay")]
    [InlineData(1440, true)]
    [InlineData(1441, false)]
    public void ThoiGianBayToiThieu_CanTren(int giaTri, bool hopLe)
    {
        if (hopLe)
        {
            xl.capNhatThamSo("ThoiGianBayToiThieu", giaTri);
            Assert.Equal(giaTri, thamSo().ThoiGianBayToiThieu);
            return;
        }
        LoiNghiepVu loi = batLoi(() => xl.capNhatThamSo("ThoiGianBayToiThieu", giaTri));
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Contains("1440", loi.Message);
        Assert.Equal(30, thamSo().ThoiGianBayToiThieu);
    }

    [Fact(DisplayName = "TH04 ngoại lệ 6a: thời gian dừng tối thiểu không lớn hơn tối đa")]
    public void ThoiGianDungToiThieuLonHonToiDa()
    {
        LoiNghiepVu tangToiThieu = batLoi(() => xl.capNhatThamSo("ThoiGianDungToiThieu", 21));
        LoiNghiepVu giamToiDa = batLoi(() => xl.capNhatThamSo("ThoiGianDungToiDa", 9));

        Assert.Equal("Thời gian dừng tối thiểu không được lớn hơn thời gian dừng tối đa.", tangToiThieu.Message);
        Assert.Equal(tangToiThieu.Message, giamToiDa.Message);
        Assert.Equal(10, thamSo().ThoiGianDungToiThieu);
        Assert.Equal(20, thamSo().ThoiGianDungToiDa);
    }

    [Fact(DisplayName = "TH06, TH07 giả định 6: thời gian hủy đặt vé phải nhỏ hơn thời gian chậm nhất khi đặt vé")]
    public void ThoiGianHuyPhaiNhoHonThoiGianDat()
    {
        LoiNghiepVu tangHuy = batLoi(() => xl.capNhatThamSo("ThoiGianHuyDatVe", 1));
        LoiNghiepVu giamDat = batLoi(() => xl.capNhatThamSo("ThoiGianDatVeChamNhat", 0));

        Assert.Equal("Thời gian hủy đặt vé phải nhỏ hơn thời gian chậm nhất khi đặt vé.", tangHuy.Message);
        Assert.Equal(tangHuy.Message, giamDat.Message);
        Assert.Equal(1, thamSo().ThoiGianDatVeChamNhat);
        Assert.Equal(0, thamSo().ThoiGianHuyDatVe);
    }

    [Fact(DisplayName = "TH01: thêm sân bay, sửa tên sân bay; mã 3 chữ in hoa, mã và tên không trùng")]
    public void ThemSuaSanBay()
    {
        xl.themSanBay("hph", "  Cát   Bi ");
        xl.suaSanBay("HPH", "Cát Bi (Hải Phòng)");

        xl.layDanhSachQuyDinh(out List<SanBay> dsSanBay, out _);
        Assert.Equal("Cát Bi (Hải Phòng)", dsSanBay.Single(sb => sb.MaSanBay == "HPH").TenSanBay);
        Assert.Equal(6, dsSanBay.Count);

        Assert.Equal(MaLoi.TRUNG_MA, batLoi(() => xl.themSanBay("SGN", "Tên khác")).Ma);
        Assert.Contains("tenSanBay", batLoi(() => xl.themSanBay("VII", "Nội Bài")).ChiTiet.Keys);
        Assert.Contains("maSanBay", batLoi(() => xl.themSanBay("V1", "Vinh")).ChiTiet.Keys);
        Assert.Contains("tenSanBay", batLoi(() => xl.themSanBay("VII", " ")).ChiTiet.Keys);
        Assert.Contains("tenSanBay", batLoi(() => xl.suaSanBay("HPH", "Nội Bài")).ChiTiet.Keys);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.suaSanBay("XXX", "Tên")).Loai);
    }

    [Fact(DisplayName = "AT02 ngoại lệ 6b: không xóa sân bay đang được chuyến bay sử dụng, kể cả làm sân bay trung gian")]
    public void XoaSanBayDangDuocSuDung()
    {
        lay<XL_ChuyenBay>().themChuyenBay(new ChuyenBay("CB900", 1_000_000m, "SGN", "HAN", HOM_NAY.AddDays(3), 120),
            new List<GheTheoHang> { new("", "H2", 10) },
            new List<ChiTietSanBayTrungGian> { new("", 1, "DAD", 15, null) });

        foreach (string ma in new[] { "SGN", "HAN", "DAD" })
        {
            LoiNghiepVu loi = batLoi(() => xl.xoaSanBay(ma));
            Assert.Equal(MaLoi.DANG_DUOC_SU_DUNG, loi.Ma);
            Assert.Equal("Không thể xóa sân bay vì đang được chuyến bay sử dụng.", loi.Message);
        }
        xl.xoaSanBay("PQC"); // chưa có chuyến bay nào dùng
        Assert.Null(lay<DAL_SanBay>().laySanBay("PQC"));
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.xoaSanBay("PQC")).Loai);
    }

    [Fact(DisplayName = "TH01 giả định 11: danh sách luôn còn ít nhất hai sân bay")]
    public void ConItNhatHaiSanBay()
    {
        xl.xoaSanBay("PQC");
        xl.xoaSanBay("CXR");
        xl.xoaSanBay("DAD");

        LoiNghiepVu loi = batLoi(() => xl.xoaSanBay("HAN"));
        Assert.Equal("Danh sách phải còn ít nhất hai sân bay.", loi.Message);
        Assert.Equal(2, csdl.dem("SELECT COUNT(*) FROM SANBAY"));
    }

    [Fact(DisplayName = "TH05: thêm hạng vé kèm tỉ lệ đơn giá, giá tiền hạng mới tính theo công thức (1.1)")]
    public void ThemHangVe()
    {
        xl.themHangVe("h3", "Hạng 3", 87.5m);
        taoChuyenBay("CB500", HOM_NAY.AddDays(5), giaVe: 2_000_000m);
        csdl.thucThi("INSERT INTO GHETHEOHANG (MaChuyenBay, MaHangVe, SoLuongGhe) VALUES ('CB500', 'H3', 4)");

        Ve ve = lay<XL_BanVe>().banVe("CB500", "H3", khach(1));
        Assert.Equal(1_750_000m, ve.GiaTien);

        Assert.Equal(MaLoi.TRUNG_MA, batLoi(() => xl.themHangVe("H1", "Hạng nhất", 120m)).Ma);
        Assert.Contains("tenHangVe", batLoi(() => xl.themHangVe("H4", "Hạng 1", 120m)).ChiTiet.Keys);
        Assert.Contains("maHangVe", batLoi(() => xl.themHangVe("hang-4", "Hạng 4", 120m)).ChiTiet.Keys);
        Assert.Contains("tiLeDonGia", batLoi(() => xl.themHangVe("H4", "Hạng 4", 0m)).ChiTiet.Keys);
        Assert.Contains("tiLeDonGia", batLoi(() => xl.themHangVe("H4", "Hạng 4", null)).ChiTiet.Keys);
        Assert.Contains("tiLeDonGia", batLoi(() => xl.themHangVe("H4", "Hạng 4", 100.123m)).ChiTiet.Keys);
    }

    [Fact(DisplayName = "QĐ6 giả định 11: sửa hạng vé chỉ sửa tên, tỉ lệ đơn giá không đổi sau khi lưu")]
    public void SuaHangVeChiSuaTen()
    {
        xl.suaHangVe("H1", "Thương gia");

        HangVe hang = lay<DAL_HangVe>().layHangVe("H1")!;
        Assert.Equal("Thương gia", hang.TenHangVe);
        Assert.Equal(105.00m, hang.TiLeDonGia);
        Assert.Contains("tenHangVe", batLoi(() => xl.suaHangVe("H1", "Hạng 2")).ChiTiet.Keys);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.suaHangVe("H9", "Hạng 9")).Loai);
    }

    [Fact(DisplayName = "AT02 ngoại lệ 6b, TH05: không xóa hạng vé đang được chuyến bay sử dụng; luôn còn ít nhất một hạng vé")]
    public void XoaHangVe()
    {
        taoChuyenBay("CB500", HOM_NAY.AddDays(5), gheH1: 0, gheH2: 10);

        LoiNghiepVu dangDung = batLoi(() => xl.xoaHangVe("H2"));
        Assert.Equal(MaLoi.DANG_DUOC_SU_DUNG, dangDung.Ma);
        Assert.Equal("Không thể xóa hạng vé vì đang được chuyến bay sử dụng.", dangDung.Message);

        xl.xoaHangVe("H1"); // chưa có chuyến bay nào có ghế hạng 1
        Assert.Null(lay<DAL_HangVe>().layHangVe("H1"));

        lay<XL_ChuyenBay>().xoaChuyenBay("CB500");
        LoiNghiepVu conMot = batLoi(() => xl.xoaHangVe("H2"));
        Assert.Equal("Danh sách phải còn ít nhất một hạng vé.", conMot.Message);
    }

    [Fact(DisplayName = "PH-09: cận trên của tham số: 100.000 phút, 365 ngày, 255 sân bay trung gian thì lưu được; vượt 1 thì bị từ chối")]
    public void PH09_CanTrenThamSo()
    {
        void bienTren(string ten, int toiDa)
        {
            LoiNghiepVu loi = batLoi(() => xl.capNhatThamSo(ten, toiDa + 1));
            Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
            Assert.Equal("Giá trị mới không được lớn hơn " + toiDa + ".", loi.Message);
        }

        xl.capNhatThamSo("ThoiGianDungToiDa", 100_000);
        bienTren("ThoiGianDungToiDa", 100_000);
        xl.capNhatThamSo("ThoiGianDungToiThieu", 100_000);
        bienTren("ThoiGianDungToiThieu", 100_000);
        xl.capNhatThamSo("SoSanBayTrungGianToiDa", 255);
        bienTren("SoSanBayTrungGianToiDa", 255);
        xl.capNhatThamSo("ThoiGianDatVeChamNhat", 365);
        bienTren("ThoiGianDatVeChamNhat", 365);
        // thời gian hủy phải nhỏ hơn thời gian đặt (365) nên giá trị lớn nhất lưu được là 364
        xl.capNhatThamSo("ThoiGianHuyDatVe", 364);
        bienTren("ThoiGianHuyDatVe", 365);

        ThamSoQuyDinh ts = thamSo();
        Assert.Equal(new[] { 100_000, 100_000, 255, 365, 364 }, new[]
        {
            ts.ThoiGianDungToiDa, ts.ThoiGianDungToiThieu, ts.SoSanBayTrungGianToiDa, ts.ThoiGianDatVeChamNhat, ts.ThoiGianHuyDatVe
        });
    }

    [Theory(DisplayName = "PH-12: tỉ lệ đơn giá 0,01 và 999,99 lưu được; 1.000 và 105,555 (ba số lẻ) bị từ chối")]
    [InlineData("0.01", true)]
    [InlineData("999.99", true)]
    [InlineData("1000", false)]
    [InlineData("105.555", false)]
    public void PH12_BienTiLeDonGia(string chuoiTiLe, bool hopLe)
    {
        decimal tiLe = decimal.Parse(chuoiTiLe, System.Globalization.CultureInfo.InvariantCulture);

        if (hopLe)
        {
            xl.themHangVe("H3", "Hạng thử", tiLe);
            Assert.Equal(tiLe, lay<DAL_HangVe>().layHangVe("H3")!.TiLeDonGia);
            return;
        }
        LoiNghiepVu loi = batLoi(() => xl.themHangVe("H3", "Hạng thử", tiLe));
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.True(loi.ChiTiet.ContainsKey("tiLeDonGia"));
        Assert.Null(lay<DAL_HangVe>().layHangVe("H3"));
    }

    [Fact(DisplayName = "PH-10 (B2): tên sân bay 100 ký tự lưu được, 101 ký tự bị từ chối, khi thêm và khi sửa")]
    public void PH10_DoDaiTenSanBay()
    {
        string ten100 = new string('a', 100);

        xl.themSanBay("VII", ten100);
        LoiNghiepVu themDai = batLoi(() => xl.themSanBay("VKG", new string('b', 101)));
        LoiNghiepVu suaDai = batLoi(() => xl.suaSanBay("VII", new string('c', 101)));

        Assert.Equal(ten100, lay<DAL_SanBay>().laySanBay("VII")!.TenSanBay);
        Assert.Equal("Tên sân bay tối đa 100 ký tự.", themDai.ChiTiet["tenSanBay"]);
        Assert.Equal("Tên sân bay tối đa 100 ký tự.", suaDai.ChiTiet["tenSanBay"]);
        Assert.Null(lay<DAL_SanBay>().laySanBay("VKG"));
    }
}
