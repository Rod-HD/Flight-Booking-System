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

    private static List<ChiTietTrungGian> trungGian(params (string MaSanBay, int ThoiGianDung)[] ds)
    {
        return ds.Select((t, i) => new ChiTietTrungGian("", (byte)(i + 1), t.MaSanBay, t.ThoiGianDung, null)).ToList();
    }

    private static List<ChiTietTrungGian> bayThang() => new();

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

    [Fact(DisplayName = "NV01 UC03.2: sửa chuyến bay cập nhật thông tin, không kiểm tra ngày giờ so với hiện tại")]
    public void SuaChuyenBay()
    {
        taoChuyenBay("CB800", HOM_NAY.AddDays(-2), gheH1: 4, gheH2: 20);

        xl.suaChuyenBay("CB800", lich(ma: "KHAC", giaVe: 2_000_000m, di: "DAD", den: "PQC", ngayGio: HOM_NAY.AddDays(-2), thoiGianBay: 90),
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
        Assert.Equal(0, csdl.dem("SELECT COUNT(*) FROM GHETHEOHANG") + csdl.dem("SELECT COUNT(*) FROM CHITIETTRUNGGIAN"));
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
}
