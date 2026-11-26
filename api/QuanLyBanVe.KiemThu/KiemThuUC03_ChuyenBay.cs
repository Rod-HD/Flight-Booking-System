using System.Data;
using ClosedXML.Excel;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC03_ChuyenBay : KiemThuCoSo
{
    private static readonly DateTime NGAY_MAI = HOM_NAY.AddDays(1).AddHours(8);
    private readonly XL_ChuyenBay xl;

    public KiemThuUC03_ChuyenBay(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_ChuyenBay>();
    }

    private static ChuyenBay lich(string ma = "CB900", decimal giaVe = 1_500_000m, string di = "SGN", string den = "HAN",
        DateTime? ngayGio = null, int thoiGianBay = 120)
    {
        return new ChuyenBay(ma, giaVe, di, den, ngayGio ?? NGAY_MAI, thoiGianBay);
    }

    private static List<GheTheoHang> ghe(int h1 = 10, int h2 = 50)
    {
        return new List<GheTheoHang> { new("", "H1", h1), new("", "H2", h2) };
    }

    private static List<ChiTietSanBayTrungGian> trungGian(params (string MaSanBay, int ThoiGianDung)[] ds)
    {
        return ds.Select((t, i) => new ChiTietSanBayTrungGian("", (byte)(i + 1), t.MaSanBay, t.ThoiGianDung, null)).ToList();
    }

    private static List<ChiTietSanBayTrungGian> bayThang() => new();

    [Fact(DisplayName = "NV01: thêm chuyến bay hợp lệ lưu đủ CHUYENBAY, số ghế từng hạng và sân bay trung gian")]
    public void ThemChuyenBayHopLe()
    {
        xl.themChuyenBay(lich(), ghe(10, 50), trungGian(("DAD", 15), ("CXR", 20)));

        ChuyenBay cb = xl.layThongTin("CB900", out var dsGhe, out var dsTrungGian, out var daBanVaDat);
        Assert.Equal(1_500_000m, cb.GiaVe);
        Assert.Equal(NGAY_MAI, cb.NgayGioKhoiHanh);
        Assert.Equal(new[] { 10, 50 }, dsGhe.Select(g => g.SoLuongGhe));
        Assert.Equal(new[] { "DAD", "CXR" }, dsTrungGian.Select(t => t.MaSanBay));
        Assert.Equal(new byte[] { 1, 2 }, dsTrungGian.Select(t => t.ThuTu));
        Assert.All(daBanVaDat.Values, so => Assert.Equal(0, so));
    }

    [Fact(DisplayName = "NV01 giả định 12: hạng nhập 0 ghế không tạo dòng trong GHETHEOHANG")]
    public void HangKhongCoGheKhongLuu()
    {
        xl.themChuyenBay(lich(), ghe(0, 40), bayThang());

        xl.layThongTin("CB900", out var dsGhe, out _, out _);
        Assert.Single(dsGhe);
        Assert.Equal("H2", dsGhe[0].MaHangVe);
    }

    [Fact(DisplayName = "NV01 ngoại lệ T3a: mã chuyến bay đã tồn tại")]
    public void TrungMaChuyenBay()
    {
        xl.themChuyenBay(lich(), ghe(), bayThang());
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(), ghe(), bayThang()));
        Assert.Equal(MaLoi.TRUNG_MA, loi.Ma);
        Assert.Equal("Mã chuyến bay đã tồn tại.", loi.Message);
    }

    [Fact(DisplayName = "NV01 giả định 12: sân bay đến phải khác sân bay đi")]
    public void SanBayDenTrungSanBayDi()
    {
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(den: "SGN"), ghe(), bayThang()));
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Equal("Sân bay đến phải khác sân bay đi.", loi.ChiTiet["maSanBayDen"]);
    }

    [Fact(DisplayName = "NV01 giả định 12: khi thêm mới, ngày giờ khởi hành phải sau thời điểm hiện tại")]
    public void NgayGioKhoiHanhTrongQuaKhu()
    {
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(ngayGio: dongHo.BayGio.AddMinutes(-1)), ghe(), bayThang()));
        Assert.Contains("ngayGioKhoiHanh", loi.ChiTiet.Keys);
    }

    [Theory(DisplayName = "NV01 giả định 12: giá vé là số nguyên dương")]
    [InlineData(0)]
    [InlineData(-1000)]
    [InlineData(1500000.5)]
    public void GiaVeKhongHopLe(decimal giaVe)
    {
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(giaVe: giaVe), ghe(), bayThang()));
        Assert.Contains("giaVe", loi.ChiTiet.Keys);
    }

    [Fact(DisplayName = "NV01 giả định 12: phải có ít nhất một hạng có số ghế lớn hơn 0, số ghế không âm")]
    public void SoGheKhongHopLe()
    {
        Assert.Contains("gheTheoHang", batLoi(() => xl.themChuyenBay(lich(), ghe(0, 0), bayThang())).ChiTiet.Keys);
        Assert.Contains("gheTheoHang", batLoi(() => xl.themChuyenBay(lich(), ghe(-1, 10), bayThang())).ChiTiet.Keys);
    }

    [Fact(DisplayName = "NV01 giả định 12: sân bay trung gian không trùng nhau và khác sân bay đi, đến")]
    public void SanBayTrungGianKhongHopLe()
    {
        LoiNghiepVu trung = batLoi(() => xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", 15), ("DAD", 15))));
        Assert.Equal("Các sân bay trung gian không được trùng nhau.", trung.ChiTiet["trungGian"]);

        LoiNghiepVu trungDiDen = batLoi(() => xl.themChuyenBay(lich(), ghe(), trungGian(("HAN", 15))));
        Assert.Equal("Sân bay trung gian phải khác sân bay đi và sân bay đến.", trungDiDen.ChiTiet["trungGian"]);
    }

    [Fact(DisplayName = "NV01 QĐ1: thời gian bay không nhỏ hơn thời gian bay tối thiểu (30 phút)")]
    public void QD1_ThoiGianBayToiThieu()
    {
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(thoiGianBay: 29), ghe(), bayThang()));
        Assert.Equal(MaLoi.VI_PHAM_QD1, loi.Ma);
        Assert.Equal("Thời gian bay phải từ 30 phút trở lên (QĐ1).", loi.Message);

        xl.themChuyenBay(lich(thoiGianBay: 30), ghe(), bayThang());
    }

    [Fact(DisplayName = "NV01 QĐ1: tối đa 2 sân bay trung gian")]
    public void QD1_SoSanBayTrungGianToiDa()
    {
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", 15), ("CXR", 15), ("PQC", 15))));
        Assert.Equal(MaLoi.VI_PHAM_QD1, loi.Ma);
        Assert.Contains("tối đa 2 sân bay trung gian", loi.Message);
    }

    [Theory(DisplayName = "NV01 QĐ1: thời gian dừng từ 10 đến 20 phút")]
    [InlineData(9, false)]
    [InlineData(10, true)]
    [InlineData(20, true)]
    [InlineData(21, false)]
    public void QD1_ThoiGianDung(int thoiGianDung, bool hopLe)
    {
        if (hopLe)
        {
            xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", thoiGianDung)));
        }
        else
        {
            LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", thoiGianDung))));
            Assert.Equal(MaLoi.VI_PHAM_QD1, loi.Ma);
            Assert.Contains("từ 10 đến 20 phút", loi.Message);
        }
    }

    [Fact(DisplayName = "CT-03 đường P6 của kiemTraQuyDinhNhanLich: vi phạm cả thời gian bay và số sân bay trung gian thì báo đủ hai lỗi")]
    public void QD1_ViPhamThoiGianBayVaSoTrungGian()
    {
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(thoiGianBay: 29), ghe(), trungGian(("DAD", 15), ("CXR", 15), ("PQC", 15))));
        Assert.Equal(MaLoi.VI_PHAM_QD1, loi.Ma);
        Assert.Equal(new[] { "thoiGianBay", "trungGian" }, loi.ChiTiet.Keys);
        Assert.Contains("từ 30 phút", loi.Message);
        Assert.Contains("tối đa 2 sân bay trung gian", loi.Message);
    }

    [Fact(DisplayName = "TH02 đến TH04, HQ07: QĐ1 kiểm tra theo tham số đọc từ CSDL ở mỗi lần kiểm tra")]
    public void QD1_DocThamSoMoiLanKiemTra()
    {
        var xlQuyDinh = lay<XL_ThayDoiQD>();
        xlQuyDinh.capNhatThamSo("ThoiGianBayToiThieu", 45);
        xlQuyDinh.capNhatThamSo("SoSanBayTrungGianToiDa", 3);
        xlQuyDinh.capNhatThamSo("ThoiGianDungToiDa", 40);

        Assert.Contains("từ 45 phút", batLoi(() => xl.themChuyenBay(lich(thoiGianBay: 40), ghe(), bayThang())).Message);
        xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", 35), ("CXR", 40), ("PQC", 10)));

        xl.layThongTin("CB900", out _, out var dsTrungGian, out _);
        Assert.Equal(3, dsTrungGian.Count);
    }

    [Fact(DisplayName = "NV01 QĐ1: chuyến bay lưu trước khi quy định đổi vẫn sửa được phần khác; phần lịch bay vừa đổi mới xét QĐ1")]
    public void SuaChuyenBaySauKhiDoiQuyDinh()
    {
        xl.themChuyenBay(lich(thoiGianBay: 40), ghe(), trungGian(("DAD", 12)));
        var xlQuyDinh = lay<XL_ThayDoiQD>();
        xlQuyDinh.capNhatThamSo("ThoiGianBayToiThieu", 60);
        xlQuyDinh.capNhatThamSo("ThoiGianDungToiThieu", 15);

        // giữ nguyên 40 phút bay và 12 phút dừng (nay đã dưới mức mới): vẫn sửa được giá vé, số ghế
        xl.suaChuyenBay("CB900", lich(giaVe: 2_000_000m, thoiGianBay: 40), ghe(12, 40), trungGian(("DAD", 12)));
        Assert.Equal(2_000_000m, xl.layThongTin("CB900", out _, out _, out _).GiaVe);

        // đổi thời gian bay thì thời gian bay phải theo mức mới; thời gian dừng không đổi nên không bị xét
        LoiNghiepVu loiBay = batLoi(() => xl.suaChuyenBay("CB900", lich(thoiGianBay: 50), ghe(), trungGian(("DAD", 12))));
        Assert.Equal(MaLoi.VI_PHAM_QD1, loiBay.Ma);
        Assert.Equal(new[] { "thoiGianBay" }, loiBay.ChiTiet.Keys);
        // đổi sân bay trung gian thì thời gian dừng phải theo mức mới
        LoiNghiepVu loiDung = batLoi(() => xl.suaChuyenBay("CB900", lich(thoiGianBay: 40), ghe(), trungGian(("CXR", 12))));
        Assert.Equal(new[] { "trungGian" }, loiDung.ChiTiet.Keys);
        xl.suaChuyenBay("CB900", lich(thoiGianBay: 60), ghe(), trungGian(("CXR", 15)));
    }

    [Fact(DisplayName = "NV01: giá tiền của hạng đắt nhất (giá vé x tỉ lệ đơn giá) không vượt 999.999.999.999 đồng")]
    public void GiaTienHangDatNhatVuaCotTien()
    {
        // Hạng 1 có tỉ lệ 105%: 999.999.999.999 x 105% vượt cột tiền của vé
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(giaVe: 999_999_999_999m), ghe(), bayThang()));
        Assert.Contains("Hạng 1", loi.ChiTiet["giaVe"]);
        // chuyến bay không bán Hạng 1 thì giá vé lớn nhất vẫn lưu được
        xl.themChuyenBay(lich(giaVe: 999_999_999_999m), ghe(h1: 0), bayThang());
        // 952.380.952.380 x 105% = 999.999.999.999
        xl.themChuyenBay(lich(ma: "CB901", giaVe: 952_380_952_380m), ghe(), bayThang());
    }

    [Fact(DisplayName = "NV04: tra cứu và xuất Excel chỉ lấy tối đa 1.000 chuyến bay đầu theo giờ khởi hành")]
    public void TraCuuToiDa1000Dong()
    {
        csdl.thucThi(@"
            INSERT INTO CHUYENBAY (MaChuyenBay, GiaVe, MaSanBayDi, MaSanBayDen, NgayGioKhoiHanh, ThoiGianBay)
            SELECT TOP (1005) 'T' + CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS varchar(9)), 1000000, 'SGN', 'HAN',
                DATEADD(MINUTE, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)), '2026-12-01'), 60
            FROM sys.all_objects a CROSS JOIN sys.all_objects b;");

        DataTable bang = xl.timKiem(new TieuChiTim());
        Assert.Equal(DAL_ChuyenBay.SO_DONG_TOI_DA, bang.Rows.Count);
        Assert.Equal("T1", bang.Rows[0]["MaChuyenBay"]);

        using var tapBang = new XLWorkbook(new MemoryStream(xl.xuatExcel(new TieuChiTim())));
        Assert.Contains(tapBang.Worksheet(1).CellsUsed(), o => o.GetString().Contains("Chỉ xuất 1000 chuyến bay đầu tiên"));
    }

    [Fact(DisplayName = "TT01: trang tính có vùng dữ liệu quá lớn (một ô lạc ở dòng rất xa) bị từ chối ngay")]
    public void NhapTuExcel_VungDuLieuQuaLon()
    {
        using var tapBang = new XLWorkbook();
        IXLWorksheet trang = tapBang.AddWorksheet(XL_ChuyenBay.TRANG_CHUYEN_BAY);
        trang.Cell(1, 1).Value = "Mã chuyến bay";
        trang.Cell(1_000_000, 1).Value = "x";
        using var boNho = new MemoryStream();
        tapBang.SaveAs(boNho);
        boNho.Position = 0;

        LoiNghiepVu loi = batLoi(() => xl.nhapTuExcel(boNho));
        Assert.Contains("vùng dữ liệu quá lớn", loi.ChiTiet["tapTin"]);
    }

    [Fact(DisplayName = "NV01 UC03.2: sửa chuyến bay chưa khởi hành cập nhật thông tin")]
    public void SuaChuyenBay()
    {
        taoChuyenBay("CB800", HOM_NAY.AddDays(5), gheH1: 4, gheH2: 20);

        xl.suaChuyenBay("CB800", lich(ma: "KHAC", giaVe: 2_000_000m, di: "DAD", den: "PQC", ngayGio: HOM_NAY.AddDays(6), thoiGianBay: 90),
            ghe(6, 0), trungGian(("SGN", 20)));

        ChuyenBay cb = xl.layThongTin("CB800", out var dsGhe, out var dsTrungGian, out _);
        Assert.Equal("CB800", cb.MaChuyenBay); // mã chuyến bay không sửa
        Assert.Equal(2_000_000m, cb.GiaVe);
        Assert.Equal("DAD", cb.MaSanBayDi);
        Assert.Equal(90, cb.ThoiGianBay);
        Assert.Equal(new[] { "H1" }, dsGhe.Select(g => g.MaHangVe));
        Assert.Equal(6, dsGhe[0].SoLuongGhe);
        Assert.Single(dsTrungGian);
        Assert.False(lay<DAL_ChuyenBay>().kiemTraMaChuyenBay("KHAC"));
    }

    [Fact(DisplayName = "NV01 UC03.2 giả định 12: khi sửa, ngày giờ khởi hành mới cũng phải sau thời điểm hiện tại")]
    public void SuaChuyenBay_DoiVeQuaKhu()
    {
        taoChuyenBay("CB800", HOM_NAY.AddDays(5));

        LoiNghiepVu quaKhu = batLoi(() => xl.suaChuyenBay("CB800", lich(giaVe: 2_000_000m, ngayGio: HOM_NAY.AddDays(-2)), ghe(), bayThang()));
        LoiNghiepVu dungLuc = batLoi(() => xl.suaChuyenBay("CB800", lich(giaVe: 2_000_000m, ngayGio: HOM_NAY.AddHours(9)), ghe(), bayThang()));

        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, quaKhu.Loai);
        Assert.Equal("Ngày giờ khởi hành phải sau thời điểm hiện tại.", quaKhu.ChiTiet["ngayGioKhoiHanh"]);
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, dungLuc.Loai);
        ChuyenBay cb = xl.layThongTin("CB800", out _, out _, out _);
        Assert.Equal(HOM_NAY.AddDays(5), cb.NgayGioKhoiHanh);
        Assert.Equal(1_000_000m, cb.GiaVe);
    }

    [Fact(DisplayName = "NV01 UC03.2: không sửa được chuyến bay đã khởi hành, kể cả khởi hành đúng lúc này")]
    public void SuaChuyenBay_DaKhoiHanh()
    {
        DateTime bayGio = HOM_NAY.AddHours(9);
        taoChuyenBay("CB800", HOM_NAY.AddDays(-2));
        taoChuyenBay("CB801", bayGio);
        taoChuyenBay("CB802", bayGio.AddMinutes(1));

        LoiNghiepVu daBay = batLoi(() => xl.suaChuyenBay("CB800", lich(giaVe: 2_000_000m, ngayGio: HOM_NAY.AddDays(5)), ghe(), bayThang()));
        LoiNghiepVu dungLuc = batLoi(() => xl.suaChuyenBay("CB801", lich(giaVe: 2_000_000m, ngayGio: bayGio), ghe(), bayThang()));
        xl.suaChuyenBay("CB802", lich(giaVe: 2_000_000m, ngayGio: bayGio.AddMinutes(1)), ghe(), bayThang());

        Assert.Equal(MaLoi.CHUYEN_BAY_DA_KHOI_HANH, daBay.Ma);
        Assert.Equal(LoaiLoi.ViPhamQuyDinh, daBay.Loai);
        Assert.Equal(MaLoi.CHUYEN_BAY_DA_KHOI_HANH, dungLuc.Ma);
        Assert.Equal(1_000_000m, xl.layThongTin("CB800", out _, out _, out _).GiaVe);
        Assert.Equal(HOM_NAY.AddDays(-2), xl.layThongTin("CB800", out _, out _, out _).NgayGioKhoiHanh);
        Assert.Equal(2_000_000m, xl.layThongTin("CB802", out _, out _, out _).GiaVe);
    }

    [Fact(DisplayName = "NV01 UC03.3: chuyến bay đã khởi hành chưa có vé, phiếu vẫn xóa được như quy tắc cũ")]
    public void XoaChuyenBay_DaKhoiHanh()
    {
        taoChuyenBay("CB800", HOM_NAY.AddDays(-2));

        xl.xoaChuyenBay("CB800");

        Assert.False(lay<DAL_ChuyenBay>().kiemTraMaChuyenBay("CB800"));
    }

    [Theory(DisplayName = "NV01 giả định 12: mỗi hạng vé tối đa 1.000 ghế")]
    [InlineData(1000, true)]
    [InlineData(1001, false)]
    public void SoGheToiDa(int soGhe, bool hopLe)
    {
        if (hopLe)
        {
            xl.themChuyenBay(lich(), ghe(soGhe, 50), bayThang());
            xl.layThongTin("CB900", out var dsGhe, out _, out _);
            Assert.Equal(soGhe, dsGhe.Single(g => g.MaHangVe == "H1").SoLuongGhe);
            return;
        }
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(), ghe(soGhe, 50), bayThang()));
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Contains("1000", loi.ChiTiet["gheTheoHang"]);
        Assert.False(lay<DAL_ChuyenBay>().kiemTraMaChuyenBay("CB900"));
    }

    [Theory(DisplayName = "NV01 giả định 12: thời gian bay tối đa 1.440 phút")]
    [InlineData(1440, true)]
    [InlineData(1441, false)]
    public void ThoiGianBayToiDa(int thoiGianBay, bool hopLe)
    {
        if (hopLe)
        {
            xl.themChuyenBay(lich(thoiGianBay: thoiGianBay), ghe(), bayThang());
            Assert.Equal(thoiGianBay, xl.layThongTin("CB900", out _, out _, out _).ThoiGianBay);
            return;
        }
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(thoiGianBay: thoiGianBay), ghe(), bayThang()));
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Contains("1440", loi.ChiTiet["thoiGianBay"]);
        Assert.False(lay<DAL_ChuyenBay>().kiemTraMaChuyenBay("CB900"));
    }

    [Fact(DisplayName = "NV01 giả định 12: sửa chuyến bay cũng chặn quá 1.000 ghế mỗi hạng, quá 1.440 phút")]
    public void SuaChuyenBay_CanTren()
    {
        taoChuyenBay("CB800", HOM_NAY.AddDays(5));

        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, batLoi(() => xl.suaChuyenBay("CB800", lich(ngayGio: HOM_NAY.AddDays(5)), ghe(1001, 3), bayThang())).Loai);
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe,
            batLoi(() => xl.suaChuyenBay("CB800", lich(ngayGio: HOM_NAY.AddDays(5), thoiGianBay: 1441), ghe(), bayThang())).Loai);
        xl.suaChuyenBay("CB800", lich(ngayGio: HOM_NAY.AddDays(5), thoiGianBay: 1440), ghe(1000, 1000), bayThang());
        Assert.Equal(1440, xl.layThongTin("CB800", out _, out _, out _).ThoiGianBay);
    }

    [Fact(DisplayName = "NV01 ngoại lệ S3a: số ghế mới của hạng không nhỏ hơn số vé Đã bán cộng số phiếu Chờ thanh toán")]
    public void SuaChuyenBay_SoGheNhoHonDaBanVaDat()
    {
        taoChuyenBay("CB800", HOM_NAY.AddDays(5), gheH1: 4, gheH2: 20);
        lay<XL_BanVe>().banVe("CB800", "H2", khach(1));
        lay<XL_BanVe>().banVe("CB800", "H2", khach(2));
        lay<XL_DatVe>().datVe("CB800", "H2", khach(3), out _);

        LoiNghiepVu loi = batLoi(() => xl.suaChuyenBay("CB800", lich(ngayGio: HOM_NAY.AddDays(5)), ghe(4, 2), bayThang()));
        Assert.Equal(MaLoi.DA_CO_VE_HOAC_PHIEU, loi.Ma);
        Assert.Contains("không được nhỏ hơn 3", loi.Message);

        // đúng bằng số vé Đã bán cộng số phiếu Chờ thanh toán thì được
        xl.suaChuyenBay("CB800", lich(ngayGio: HOM_NAY.AddDays(5)), ghe(4, 3), bayThang());
        Assert.Equal(0, lay<DAL_ChuyenBay>().laySoGheTrong("CB800", "H2"));
    }

    [Fact(DisplayName = "NV01 ngoại lệ S3a: không bỏ được hạng vé đã có vé, kể cả vé đã hủy")]
    public void SuaChuyenBay_BoHangDaCoVe()
    {
        taoChuyenBay("CB800", HOM_NAY.AddDays(5), gheH1: 4, gheH2: 20);
        Ve ve = lay<XL_BanVe>().banVe("CB800", "H1", khach(1));
        lay<XL_BanVe>().huyVe(ve.MaVe);

        LoiNghiepVu loi = batLoi(() => xl.suaChuyenBay("CB800", lich(ngayGio: HOM_NAY.AddDays(5)), ghe(0, 20), bayThang()));
        Assert.Equal(MaLoi.DA_CO_VE_HOAC_PHIEU, loi.Ma);

        // giao dịch bị hủy nên dữ liệu giữ nguyên
        xl.layThongTin("CB800", out var dsGhe, out _, out _);
        Assert.Equal(2, dsGhe.Count);
    }

    [Fact(DisplayName = "NV01 UC03.3: xóa chuyến bay chưa có vé, phiếu thì xóa cả số ghế và sân bay trung gian")]
    public void XoaChuyenBay()
    {
        xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", 15)));

        xl.xoaChuyenBay("CB900");

        Assert.False(lay<DAL_ChuyenBay>().kiemTraMaChuyenBay("CB900"));
        Assert.Equal(0, csdl.dem("SELECT COUNT(*) FROM GHETHEOHANG") + csdl.dem("SELECT COUNT(*) FROM CHITIETSANBAYTRUNGGIAN"));
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.xoaChuyenBay("CB900")).Loai);
    }

    [Fact(DisplayName = "AT02 ngoại lệ X2a: không xóa chuyến bay đã có vé hoặc phiếu đặt chỗ, kể cả đã hủy")]
    public void XoaChuyenBayDaCoVeHoacPhieu()
    {
        taoChuyenBay("CB801", HOM_NAY.AddDays(5));
        taoChuyenBay("CB802", HOM_NAY.AddDays(5));
        Ve ve = lay<XL_BanVe>().banVe("CB801", "H2", khach(1));
        lay<XL_BanVe>().huyVe(ve.MaVe);
        lay<XL_DatVe>().datVe("CB802", "H2", khach(2), out _);

        LoiNghiepVu coVe = batLoi(() => xl.xoaChuyenBay("CB801"));
        LoiNghiepVu coPhieu = batLoi(() => xl.xoaChuyenBay("CB802"));

        Assert.Equal(MaLoi.DA_CO_VE_HOAC_PHIEU, coVe.Ma);
        Assert.Equal(MaLoi.DA_CO_VE_HOAC_PHIEU, coPhieu.Ma);
        Assert.True(lay<DAL_ChuyenBay>().kiemTraMaChuyenBay("CB801"));
    }

    [Fact(DisplayName = "NV04 công thức (1.5), (1.6): tra cứu theo BM4, số ghế trống cộng số ghế đặt bằng tổng số ghế")]
    public void TraCuuTheoBM4()
    {
        taoChuyenBay("CB801", HOM_NAY.AddDays(3).AddHours(7), gheH1: 2, gheH2: 5, di: "SGN", den: "HAN");
        taoChuyenBay("CB802", HOM_NAY.AddDays(4).AddHours(7), gheH1: 2, gheH2: 5, di: "SGN", den: "DAD");
        taoChuyenBay("CB803", HOM_NAY.AddDays(9).AddHours(7), gheH1: 2, gheH2: 5, di: "HAN", den: "SGN");
        var xlBanVe = lay<XL_BanVe>();
        xlBanVe.banVe("CB801", "H1", khach(1));
        xlBanVe.banVe("CB801", "H2", khach(2));
        Ve veHuy = xlBanVe.banVe("CB801", "H2", khach(3));
        xlBanVe.huyVe(veHuy.MaVe);                                  // vé hủy không tính
        lay<XL_DatVe>().datVe("CB801", "H2", khach(4), out _);       // phiếu Chờ thanh toán có tính
        PhieuDatCho phieuHuy = lay<XL_DatVe>().datVe("CB801", "H2", khach(5), out _);
        lay<XL_DatVe>().huyPhieuDat(phieuHuy.MaPhieuDat);            // phiếu hủy không tính

        DataTable tatCa = xl.timKiem(new TieuChiTim());
        Assert.Equal(new[] { "CB801", "CB802", "CB803" }, tatCa.Rows.Cast<DataRow>().Select(d => (string)d["MaChuyenBay"]));
        DataRow dong = tatCa.Rows[0];
        Assert.Equal(3, dong["SoGheDat"]);
        Assert.Equal(4, dong["SoGheTrong"]);
        Assert.Equal("Tân Sơn Nhất", dong["TenSanBayDi"]);
        Assert.Equal(3, lay<DAL_ChuyenBay>().tinhSoGheDat("CB801"));
        Assert.Equal(4, lay<DAL_ChuyenBay>().tongSoGheTrong("CB801"));

        Assert.Equal(2, xl.timKiem(new TieuChiTim { MaSanBayDi = "SGN" }).Rows.Count);
        Assert.Single(xl.timKiem(new TieuChiTim { MaSanBayDi = "SGN", MaSanBayDen = "DAD" }).Rows);
        Assert.Equal(2, xl.timKiem(new TieuChiTim { TuNgay = HOM_NAY.AddDays(3), DenNgay = HOM_NAY.AddDays(4) }).Rows.Count);
        Assert.Single(xl.timKiem(new TieuChiTim { MaChuyenBay = "803" }).Rows);
        Assert.Empty(xl.timKiem(new TieuChiTim { MaSanBayDi = "PQC" }).Rows);
    }

    [Fact(DisplayName = "TT01 luồng T1a: nhập Excel lưu dòng hợp lệ, trả số đã thêm và danh sách dòng lỗi kèm lý do")]
    public void NhapTuExcel()
    {
        taoChuyenBay("CB700", HOM_NAY.AddDays(5));
        using var tapBang = new XLWorkbook(new MemoryStream(xl.taoTapTinMau()));
        IXLWorksheet chuyenBay = tapBang.Worksheet(XL_ChuyenBay.TRANG_CHUYEN_BAY);
        IXLWorksheet tg = tapBang.Worksheet(XL_ChuyenBay.TRANG_TRUNG_GIAN);
        Assert.Equal("Số ghế H1", chuyenBay.Cell(1, 7).GetString());
        Assert.Equal("Số ghế H2", chuyenBay.Cell(1, 8).GetString());

        void dong(int soDong, string ma, object giaVe, string di, string den, object ngayGio, object thoiGianBay, object h1, object h2)
        {
            object[] giaTri = { ma, giaVe, di, den, ngayGio, thoiGianBay, h1, h2 };
            for (int cot = 0; cot < giaTri.Length; cot++)
                chuyenBay.Cell(soDong, cot + 1).Value = XLCellValue.FromObject(giaTri[cot]);
        }
        dong(2, "CB901", 1500000, "SGN", "HAN", NGAY_MAI, 120, 10, 60);                       // hợp lệ, ngày giờ kiểu ngày
        dong(3, "CB902", "1.200.000", "SGN", "DAD", "25/12/2026 08:30", 85, 0, 40);           // hợp lệ, ngày giờ kiểu chữ
        dong(4, "CB700", 1500000, "SGN", "HAN", NGAY_MAI, 120, 10, 60);                       // trùng mã đã có
        dong(5, "CB903", 1500000, "SGN", "HAN", NGAY_MAI, 20, 10, 60);                        // vi phạm QĐ1
        dong(6, "CB904", 1500000, "SGN", "SGN", NGAY_MAI, 120, 10, 60);                       // sân bay đến trùng sân bay đi
        dong(7, "CB905", "abc", "SGN", "HAN", "ngày mai", 120, 10, 60);                       // sai kiểu dữ liệu
        dong(8, "CB906", 1500000, "SGN", "HAN", NGAY_MAI, 120, 10, 60);                       // trung gian dừng quá lâu
        dong(9, "CB901", 1500000, "SGN", "HAN", NGAY_MAI, 120, 10, 60);                       // trùng mã ngay trong tập tin

        void diemDung(int soDong, string ma, int thuTu, string sanBay, int thoiGianDung, string? ghiChu = null)
        {
            tg.Cell(soDong, 1).Value = ma;
            tg.Cell(soDong, 2).Value = thuTu;
            tg.Cell(soDong, 3).Value = sanBay;
            tg.Cell(soDong, 4).Value = thoiGianDung;
            tg.Cell(soDong, 5).Value = ghiChu;
        }
        diemDung(2, "CB901", 1, "DAD", 15, "Đón khách");
        diemDung(3, "CB906", 1, "DAD", 45);
        diemDung(4, "CB999", 1, "DAD", 15);                                                   // không có ở trang ChuyenBay

        using var boNho = new MemoryStream();
        tapBang.SaveAs(boNho);
        boNho.Position = 0;
        (int soDaThem, List<(int Dong, string LyDo)> dongLoi) = xl.nhapTuExcel(boNho);

        Assert.Equal(2, soDaThem);
        Assert.Equal(new[] { 4, 5, 6, 7, 8, 9, 4 }, dongLoi.Select(l => l.Dong));
        Assert.Equal("Mã chuyến bay đã tồn tại.", dongLoi[0].LyDo);
        Assert.Contains("QĐ1", dongLoi[1].LyDo);
        Assert.Equal("Sân bay đến phải khác sân bay đi.", dongLoi[2].LyDo);
        Assert.Contains("Giá vé", dongLoi[3].LyDo);
        Assert.Contains("Ngày giờ khởi hành", dongLoi[3].LyDo);
        Assert.Contains("từ 10 đến 20 phút", dongLoi[4].LyDo);
        Assert.Equal("Mã chuyến bay đã tồn tại.", dongLoi[5].LyDo);
        Assert.Contains("CB999", dongLoi[6].LyDo);

        xl.layThongTin("CB901", out var ghe901, out var trungGian901, out _);
        Assert.Equal(2, ghe901.Count);
        Assert.Equal("Đón khách", Assert.Single(trungGian901).GhiChu);
        ChuyenBay cb902 = xl.layThongTin("CB902", out var ghe902, out _, out _);
        Assert.Equal(1_200_000m, cb902.GiaVe);
        Assert.Equal(new DateTime(2026, 12, 25, 8, 30, 0), cb902.NgayGioKhoiHanh);
        Assert.Equal("H2", Assert.Single(ghe902).MaHangVe);
    }

    [Fact(DisplayName = "TT01 giả định 12: nhập Excel cũng chặn quá 1.000 ghế mỗi hạng, quá 1.440 phút")]
    public void NhapTuExcel_CanTren()
    {
        using var tapBang = new XLWorkbook(new MemoryStream(xl.taoTapTinMau()));
        IXLWorksheet chuyenBay = tapBang.Worksheet(XL_ChuyenBay.TRANG_CHUYEN_BAY);
        void dong(int soDong, string ma, int thoiGianBay, int h1, int h2)
        {
            object[] giaTri = { ma, 1500000, "SGN", "HAN", NGAY_MAI, thoiGianBay, h1, h2 };
            for (int cot = 0; cot < giaTri.Length; cot++)
                chuyenBay.Cell(soDong, cot + 1).Value = XLCellValue.FromObject(giaTri[cot]);
        }
        dong(2, "CB901", 1440, 1000, 1000); // đúng cận trên
        dong(3, "CB902", 1441, 10, 60);
        dong(4, "CB903", 120, 1001, 60);

        using var boNho = new MemoryStream();
        tapBang.SaveAs(boNho);
        boNho.Position = 0;
        (int soDaThem, List<(int Dong, string LyDo)> dongLoi) = xl.nhapTuExcel(boNho);

        Assert.Equal(1, soDaThem);
        Assert.Equal(new[] { 3, 4 }, dongLoi.Select(l => l.Dong));
        Assert.Contains("1440 phút", dongLoi[0].LyDo);
        Assert.Contains("1000", dongLoi[1].LyDo);
        Assert.True(lay<DAL_ChuyenBay>().kiemTraMaChuyenBay("CB901"));
    }

    [Fact(DisplayName = "TT01: tập tin không phải Excel theo mẫu thì báo lỗi, không thêm chuyến bay nào")]
    public void NhapTuExcel_TapTinSai()
    {
        LoiNghiepVu khongPhaiExcel = batLoi(() => xl.nhapTuExcel(new MemoryStream(new byte[] { 1, 2, 3, 4 })));
        Assert.Contains("tapTin", khongPhaiExcel.ChiTiet.Keys);

        using var tapBang = new XLWorkbook();
        tapBang.AddWorksheet("Sheet1").Cell(1, 1).Value = "x";
        using var boNho = new MemoryStream();
        tapBang.SaveAs(boNho);
        boNho.Position = 0;
        LoiNghiepVu thieuTrang = batLoi(() => xl.nhapTuExcel(boNho));
        Assert.Contains("ChuyenBay", thieuTrang.Message);
    }

    [Fact(DisplayName = "TT02 luồng 3a: xuất danh sách chuyến bay ra Excel đúng các cột của BM4")]
    public void XuatExcel()
    {
        taoChuyenBay("CB801", HOM_NAY.AddDays(3).AddHours(7), gheH1: 2, gheH2: 5);
        taoChuyenBay("CB802", HOM_NAY.AddDays(4).AddHours(7), gheH1: 2, gheH2: 5);
        lay<XL_BanVe>().banVe("CB801", "H2", khach(1));

        byte[] noiDung = xl.xuatExcel(new TieuChiTim());

        using var tapBang = new XLWorkbook(new MemoryStream(noiDung));
        IXLWorksheet trang = tapBang.Worksheets.First();
        Assert.Equal("Danh sách chuyến bay", trang.Cell(1, 1).GetString());
        int dongTieuDe = 4;
        Assert.Equal(new[] { "STT", "Mã chuyến bay", "Sân bay đi", "Sân bay đến", "Khởi hành", "Thời gian bay (phút)", "Số ghế trống", "Số ghế đặt" },
            Enumerable.Range(1, 8).Select(cot => trang.Cell(dongTieuDe, cot).GetString()));
        Assert.Equal("CB801", trang.Cell(dongTieuDe + 1, 2).GetString());
        Assert.Equal(6, trang.Cell(dongTieuDe + 1, 7).GetValue<int>());
        Assert.Equal(1, trang.Cell(dongTieuDe + 1, 8).GetValue<int>());
        Assert.Equal("CB802", trang.Cell(dongTieuDe + 2, 2).GetString());
    }

    // Tính tiến hóa (TH-03 đến TH-08), làm lộ lỗi (LO-05) và các nhánh chưa chạy (CT-02)

    /// <summary>Điền tập tin mẫu đang có rồi nhập lại; dien nhận trang ChuyenBay và trang TrungGian.</summary>
    private (int SoDaThem, List<(int Dong, string LyDo)> DongLoi) nhapExcel(Action<IXLWorksheet, IXLWorksheet> dien)
    {
        using var tapBang = new XLWorkbook(new MemoryStream(xl.taoTapTinMau()));
        dien(tapBang.Worksheet(XL_ChuyenBay.TRANG_CHUYEN_BAY), tapBang.Worksheet(XL_ChuyenBay.TRANG_TRUNG_GIAN));
        return nhapExcel(tapBang);
    }

    private (int SoDaThem, List<(int Dong, string LyDo)> DongLoi) nhapExcel(XLWorkbook tapBang)
    {
        using var boNho = new MemoryStream();
        tapBang.SaveAs(boNho);
        boNho.Position = 0;
        return xl.nhapTuExcel(boNho);
    }

    private static void dongExcel(IXLWorksheet trang, int soDong, params object[] giaTri)
    {
        for (int cot = 0; cot < giaTri.Length; cot++)
            trang.Cell(soDong, cot + 1).Value = XLCellValue.FromObject(giaTri[cot]);
    }

    private bool coChuyenBay(string ma) => lay<DAL_ChuyenBay>().kiemTraMaChuyenBay(ma);

    [Fact(DisplayName = "TH02 (TH-03): đổi thời gian bay tối thiểu thành 45 thì 44 bị từ chối, 45 và 46 lưu được, cả khi nhập Excel")]
    public void TH03_ThoiGianBayToiThieuMoi_LuuThat()
    {
        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianBayToiThieu", 45);

        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich("CB901", thoiGianBay: 44), ghe(), bayThang()));
        xl.themChuyenBay(lich("CB902", thoiGianBay: 45), ghe(), bayThang());
        xl.themChuyenBay(lich("CB903", thoiGianBay: 46), ghe(), bayThang());
        var (soDaThem, dongLoi) = nhapExcel((cb, _) =>
        {
            dongExcel(cb, 2, "CB911", 1500000, "SGN", "HAN", NGAY_MAI, 44, 10, 60);
            dongExcel(cb, 3, "CB912", 1500000, "SGN", "HAN", NGAY_MAI, 45, 10, 60);
        });

        Assert.Equal(MaLoi.VI_PHAM_QD1, loi.Ma);
        Assert.Equal("Thời gian bay phải từ 45 phút trở lên (QĐ1).", loi.Message);
        Assert.False(coChuyenBay("CB901"));
        Assert.True(coChuyenBay("CB902") && coChuyenBay("CB903"));
        Assert.Equal(1, soDaThem);
        Assert.Equal(2, Assert.Single(dongLoi).Dong);
        Assert.Contains("45 phút", dongLoi[0].LyDo);
        Assert.True(coChuyenBay("CB912"));
    }

    [Fact(DisplayName = "TH02 (TH-04): thời gian bay tối thiểu nhận giá trị 0, khi đó chuyến bay 1 phút lưu được")]
    public void TH04_ThoiGianBayToiThieuBang0()
    {
        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianBayToiThieu", 0);

        xl.themChuyenBay(lich(thoiGianBay: 1), ghe(), bayThang());

        Assert.Equal(0, lay<DAL_ThamSoQuyDinh>().layThamSoNhanLich().ThoiGianBayToiThieu);
        Assert.Equal(1, xl.layThongTin("CB900", out _, out _, out _).ThoiGianBay);
    }

    [Fact(DisplayName = "TH03 (TH-05): tăng số trung gian tối đa lên 3 thì lưu được 3 trung gian; giảm lại thì chuyến đó vẫn xem, sửa phần khác được")]
    public void TH05_TangRoiGiamSoTrungGian()
    {
        var qd = lay<XL_ThayDoiQD>();
        qd.capNhatThamSo("SoSanBayTrungGianToiDa", 3);
        xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", 15), ("CXR", 15), ("PQC", 15)));
        qd.capNhatThamSo("SoSanBayTrungGianToiDa", 2);

        xl.layThongTin("CB900", out _, out var dsTrungGian, out _);
        xl.suaChuyenBay("CB900", lich(giaVe: 2_000_000m), ghe(), trungGian(("DAD", 15), ("CXR", 15), ("PQC", 15)));
        // đổi phần trung gian thì QĐ1 mới được xét
        LoiNghiepVu loi = batLoi(() => xl.suaChuyenBay("CB900", lich(), ghe(), trungGian(("DAD", 16), ("CXR", 15), ("PQC", 15))));

        Assert.Equal(3, dsTrungGian.Count);
        ChuyenBay cb = xl.layThongTin("CB900", out _, out var sauKhiSua, out _);
        Assert.Equal(2_000_000m, cb.GiaVe);
        Assert.Equal(3, sauKhiSua.Count);
        Assert.Equal(MaLoi.VI_PHAM_QD1, loi.Ma);
    }

    [Theory(DisplayName = "TH04 (TH-06): đổi khoảng dừng thành 15 đến 45 phút thì 14, 46 bị từ chối; 15, 45 lưu được")]
    [InlineData(14, false)]
    [InlineData(15, true)]
    [InlineData(45, true)]
    [InlineData(46, false)]
    public void TH06_KhoangDungMoi(int thoiGianDung, bool hopLe)
    {
        var qd = lay<XL_ThayDoiQD>();
        qd.capNhatThamSo("ThoiGianDungToiDa", 45);
        qd.capNhatThamSo("ThoiGianDungToiThieu", 15);

        if (hopLe)
        {
            xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", thoiGianDung)));
            xl.layThongTin("CB900", out _, out var dsTrungGian, out _);
            Assert.Equal(thoiGianDung, Assert.Single(dsTrungGian).ThoiGianDung);
            return;
        }
        LoiNghiepVu loi = batLoi(() => xl.themChuyenBay(lich(), ghe(), trungGian(("DAD", thoiGianDung))));
        Assert.Equal(MaLoi.VI_PHAM_QD1, loi.Ma);
        Assert.Contains("từ 15 đến 45 phút", loi.Message);
        Assert.False(coChuyenBay("CB900"));
    }

    [Fact(DisplayName = "TH05 (TH-08): hạng vé mới có cột trong tập tin Excel mẫu, nhập được, đặt vé, bán vé được và có trong báo cáo doanh thu")]
    public void TH08_HangVeMoiDungDuocMoiNoi()
    {
        lay<XL_ThayDoiQD>().themHangVe("H3", "Hạng thử ba", 120m);

        string tieuDeCot = "";
        var (soDaThem, dongLoi) = nhapExcel((cb, _) =>
        {
            tieuDeCot = cb.Cell(1, 9).GetString();
            dongExcel(cb, 2, "CB901", 1000000, "SGN", "HAN", NGAY_MAI, 120, 0, 0, 5);
        });
        PhieuDatCho phieu = lay<XL_DatVe>().datVe("CB901", "H3", khach(1), out _);
        Ve ve = lay<XL_BanVe>().banVe("CB901", "H3", khach(2));
        lay<XL_BaoCao>().lapBaoCaoThang(NGAY_MAI.Month, NGAY_MAI.Year, out int tongSoVe, out decimal tongDoanhThu);

        Assert.Equal("Số ghế H3", tieuDeCot);
        Assert.Equal(1, soDaThem);
        Assert.Empty(dongLoi);
        xl.layThongTin("CB901", out var dsGhe, out _, out _);
        Assert.Equal(5, Assert.Single(dsGhe).SoLuongGhe);
        Assert.Equal(1_200_000m, phieu.GiaTien);
        Assert.Equal(1_200_000m, ve.GiaTien);
        Assert.Equal(1, tongSoVe);
        Assert.Equal(1_200_000m, tongDoanhThu);
    }

    [Fact(DisplayName = "LO-05: hạng vé tỉ lệ 999,99% với chuyến bay giá cao thì báo giá vé quá lớn, không cấp ghế cho hạng đó")]
    public void LO05_HangTiLeLonNhatVoiGiaVeCao()
    {
        lay<XL_ThayDoiQD>().themHangVe("H9", "Hạng thử cao nhất", 999.99m);
        taoChuyenBay("CB800", HOM_NAY.AddDays(5), giaVe: 200_000_000_000m);
        var gheCoH9 = new List<GheTheoHang> { new("", "H2", 3), new("", "H9", 1) };

        LoiNghiepVu loi = batLoi(() => xl.suaChuyenBay("CB800", lich(giaVe: 200_000_000_000m, ngayGio: HOM_NAY.AddDays(5)), gheCoH9, bayThang()));
        xl.layThongTin("CB800", out var gheSauLoi, out _, out _);
        // 100 tỉ x 999,99% = 999.990.000.000 vẫn vừa cột tiền
        xl.suaChuyenBay("CB800", lich(giaVe: 100_000_000_000m, ngayGio: HOM_NAY.AddDays(5)), gheCoH9, bayThang());

        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Contains("999.99% giá vé", loi.ChiTiet["giaVe"]);
        Assert.Contains("vượt quá 999.999.999.999 đồng", loi.ChiTiet["giaVe"]);
        Assert.DoesNotContain(gheSauLoi, g => g.MaHangVe == "H9");
        xl.layThongTin("CB800", out var gheSauSua, out _, out _);
        Assert.Contains(gheSauSua, g => g.MaHangVe == "H9");
        Assert.Equal(999_990_000_000m, lay<XL_BanVe>().layThongTinBan("CB800").Hang.Single(h => h.MaHangVe == "H9").GiaTien);
    }

    [Fact(DisplayName = "CT-02: các nhánh báo lỗi của biểu mẫu chuyến bay ở máy chủ: ngày giờ, hạng vé, sân bay trung gian, thời gian dừng, ghi chú")]
    public void CT02_NhanhBaoLoiBieuMau()
    {
        string loiO(string truong, ChuyenBay cb, List<GheTheoHang> dsGhe, List<ChiTietSanBayTrungGian> dsTrungGian)
            => batLoi(() => xl.themChuyenBay(cb, dsGhe, dsTrungGian)).ChiTiet[truong];
        List<ChiTietSanBayTrungGian> qua255 = Enumerable.Range(0, 256).Select(_ => new ChiTietSanBayTrungGian("", 1, "DAD", 15, null)).ToList();

        Assert.Equal("Ngày giờ khởi hành không hợp lệ.", loiO("ngayGioKhoiHanh", lich(ngayGio: new DateTime(2101, 1, 1)), ghe(), bayThang()));
        Assert.Equal("Có hạng vé không có trong danh sách hạng vé.",
            loiO("gheTheoHang", lich(), new List<GheTheoHang> { new("", "HX", 5) }, bayThang()));
        Assert.Equal("Mỗi hạng vé chỉ nhập số lượng ghế một lần.",
            loiO("gheTheoHang", lich(), new List<GheTheoHang> { new("", "H1", 5), new("", "H1", 6) }, bayThang()));
        Assert.Equal("Số sân bay trung gian quá lớn.", loiO("trungGian", lich(), ghe(), qua255));
        Assert.Equal("Chưa chọn sân bay trung gian.", loiO("trungGian", lich(), ghe(), trungGian(("", 15))));
        Assert.Equal("Có sân bay trung gian không có trong danh sách sân bay.", loiO("trungGian", lich(), ghe(), trungGian(("ZZZ", 15))));
        Assert.Equal("Thời gian dừng phải là số nguyên không âm (phút).", loiO("trungGian", lich(), ghe(), trungGian(("DAD", -1))));
        Assert.Equal("Ghi chú của sân bay trung gian tối đa 200 ký tự.", loiO("trungGian", lich(), ghe(),
            new List<ChiTietSanBayTrungGian> { new("", 1, "DAD", 15, new string('a', 201)) }));
        Assert.False(coChuyenBay("CB900"));
    }

    [Fact(DisplayName = "CT-02: nhập Excel thiếu cột, không có dòng, cột hạng vé lạ thì báo lỗi cả tập tin")]
    public void CT02_NhapExcel_LoiCaTapTin()
    {
        using var thieuCot = new XLWorkbook();
        IXLWorksheet trang = thieuCot.AddWorksheet(XL_ChuyenBay.TRANG_CHUYEN_BAY);
        dongExcel(trang, 1, "Mã chuyến bay", "Giá vé", "Mã sân bay đi", "Mã sân bay đến", "Ngày giờ khởi hành", "Thời gian bay (phút)");
        dongExcel(trang, 2, "CB901", 1500000, "SGN", "HAN", NGAY_MAI, 120);
        LoiNghiepVu loiThieuCot = batLoi(() => nhapExcel(thieuCot));

        LoiNghiepVu loiRong = batLoi(() => nhapExcel((_, _) => { }));

        LoiNghiepVu loiCotLa = batLoi(() => nhapExcel((cb, _) =>
        {
            cb.Cell(1, 9).Value = "Số ghế HX";
            dongExcel(cb, 2, "CB901", 1500000, "SGN", "HAN", NGAY_MAI, 120, 10, 60);
        }));

        Assert.Equal("Trang ChuyenBay thiếu cột so với tập tin mẫu.", loiThieuCot.Message);
        Assert.Contains("chưa có dòng chuyến bay nào", loiRong.Message);
        Assert.Equal("Cột \"Số ghế HX\" của trang ChuyenBay không ứng với hạng vé nào.", loiCotLa.Message);
        Assert.False(coChuyenBay("CB901"));
    }

    [Fact(DisplayName = "CT-02: nhập Excel ghi lỗi từng dòng: thời gian bay, số ghế, ô kiểu lạ, thứ tự dừng, thời gian dừng, trung gian thiếu mã")]
    public void CT02_NhapExcel_LoiTungDong()
    {
        var (soDaThem, dongLoi) = nhapExcel((cb, tg) =>
        {
            dongExcel(cb, 2, "CB901", 1500000, "SGN", "HAN", NGAY_MAI, "abc", 10, 60);
            dongExcel(cb, 3, "CB902", 1500000, "SGN", "HAN", NGAY_MAI, 120, -1, 60);
            dongExcel(cb, 4, "CB903", true, "SGN", "HAN", NGAY_MAI, 120, 10, 60);
            dongExcel(cb, 5, "CB904", 1500000, "SGN", "HAN", NGAY_MAI, 120, 10, 60);
            dongExcel(cb, 6, "CB905", 1500000, "SGN", "HAN", NGAY_MAI, 120, 10, 60);
            dongExcel(tg, 2, "CB904", 0, "DAD", 15);
            dongExcel(tg, 3, "CB905", 1, "DAD", -5);
            dongExcel(tg, 4, "", 1, "DAD", 15);
        });
        List<string> lyDo = dongLoi.Select(l => l.LyDo).ToList();

        Assert.Equal(0, soDaThem);
        Assert.Equal(6, dongLoi.Count);
        Assert.Contains("Trang TrungGian: chưa nhập mã chuyến bay.", lyDo);
        Assert.Contains("Thời gian bay phải là số nguyên dương (phút).", lyDo);
        Assert.Contains("Số lượng ghế của mỗi hạng phải là số nguyên không âm.", lyDo);
        Assert.Contains("Giá vé phải là số nguyên dương (đồng).", lyDo);
        Assert.Contains("Trang TrungGian dòng 2: thứ tự dừng phải là số nguyên từ 1.", lyDo);
        Assert.Contains("Trang TrungGian dòng 3: thời gian dừng phải là số nguyên không âm (phút).", lyDo);
    }
}
