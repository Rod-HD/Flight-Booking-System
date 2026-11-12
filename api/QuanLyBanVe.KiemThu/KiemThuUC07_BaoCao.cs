using System.Data;
using ClosedXML.Excel;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC07_BaoCao : KiemThuCoSo
{
    private readonly XL_BaoCao xl;
    private readonly XL_BanVe xlBanVe;

    public KiemThuUC07_BaoCao(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_BaoCao>();
        xlBanVe = lay<XL_BanVe>();
    }

    /// <summary>
    /// Tháng 12/2026: CB801 có 2 vé Hạng 1 và 1 vé Hạng 2 Đã bán, 1 vé Đã hủy, 1 phiếu Chờ thanh toán;
    /// CB802 có 1 vé Hạng 2; CB803 chưa có vé. Tháng 1/2027: CB901 có 1 vé bán từ tháng 11/2026.
    /// </summary>
    private void taoDuLieu()
    {
        taoChuyenBay("CB801", new DateTime(2026, 12, 5, 8, 0, 0), giaVe: 1_000_000m, gheH1: 5, gheH2: 5);
        taoChuyenBay("CB802", new DateTime(2026, 12, 20, 8, 0, 0), giaVe: 700_000m, gheH1: 5, gheH2: 5);
        taoChuyenBay("CB803", new DateTime(2026, 12, 31, 23, 59, 0), giaVe: 900_000m, gheH1: 5, gheH2: 5);
        taoChuyenBay("CB901", new DateTime(2027, 1, 1, 0, 0, 0), giaVe: 2_000_000m, gheH1: 5, gheH2: 5);

        xlBanVe.banVe("CB801", "H1", khach(1));                    // 1.050.000
        xlBanVe.banVe("CB801", "H1", khach(2));                    // 1.050.000
        xlBanVe.banVe("CB801", "H2", khach(3));                    // 1.000.000
        Ve veHuy = xlBanVe.banVe("CB801", "H2", khach(4));
        xlBanVe.huyVe(veHuy.MaVe);                                 // vé hủy không tính doanh thu
        lay<XL_DatVe>().datVe("CB801", "H2", khach(5), out _);     // phiếu đặt chỗ không tính doanh thu
        xlBanVe.banVe("CB802", "H2", khach(1));                    // 700.000
        xlBanVe.banVe("CB901", "H2", khach(1));                    // 2.000.000, bán tháng 11/2026 nhưng bay tháng 1/2027
    }

    [Fact(DisplayName = "NV05 BM5.1, công thức (1.3): báo cáo tháng theo tháng khởi hành, chỉ tính vé Đã bán, tỉ lệ làm tròn hai chữ số")]
    public void BaoCaoThang()
    {
        taoDuLieu();

        DataTable bang = xl.lapBaoCaoThang(12, 2026, out int tongSoVe, out decimal tongDoanhThu);

        Assert.Equal(4, tongSoVe);
        Assert.Equal(3_800_000m, tongDoanhThu);
        Assert.Equal(3, bang.Rows.Count);
        Assert.Equal(new object[] { 1, "CB801", 3, 3_100_000m, 81.58m }, bang.Rows[0].ItemArray);
        Assert.Equal(new object[] { 2, "CB802", 1, 700_000m, 18.42m }, bang.Rows[1].ItemArray);
        // giả định 4: chuyến bay khởi hành trong tháng nhưng chưa có vé Đã bán vẫn được liệt kê với 0 và 0%
        Assert.Equal(new object[] { 3, "CB803", 0, 0m, 0m }, bang.Rows[2].ItemArray);
    }

    [Fact(DisplayName = "NV05 giả định 4: doanh thu tính theo tháng khởi hành, không theo ngày bán vé")]
    public void DoanhThuTheoThangKhoiHanh()
    {
        taoDuLieu();

        // vé của CB901 bán ngày 12/11/2026 nhưng không thuộc báo cáo tháng 11/2026
        DataTable thang11 = xl.lapBaoCaoThang(11, 2026, out int soVeThang11, out decimal doanhThuThang11);
        Assert.Empty(thang11.Rows);
        Assert.Equal(0, soVeThang11);
        Assert.Equal(0m, doanhThuThang11);

        DataTable thang1 = xl.lapBaoCaoThang(1, 2027, out _, out decimal doanhThuThang1);
        Assert.Equal("CB901", Assert.Single(thang1.Rows.Cast<DataRow>())["MaChuyenBay"]);
        Assert.Equal(2_000_000m, doanhThuThang1);
        Assert.Equal(100m, thang1.Rows[0]["TiLe"]);
    }

    [Fact(DisplayName = "NV05 mục 1.3.2: tổng doanh thu bằng 0 thì tỉ lệ của mọi dòng là 0%")]
    public void TongDoanhThuBangKhong()
    {
        taoChuyenBay("CB801", new DateTime(2026, 12, 5, 8, 0, 0));
        taoChuyenBay("CB802", new DateTime(2026, 12, 6, 8, 0, 0));
        Ve ve = xlBanVe.banVe("CB801", "H2", khach(1));
        xlBanVe.huyVe(ve.MaVe);

        DataTable thang = xl.lapBaoCaoThang(12, 2026, out int tongSoVe, out decimal tongDoanhThu);
        Assert.Equal(2, thang.Rows.Count);
        Assert.Equal(0, tongSoVe);
        Assert.Equal(0m, tongDoanhThu);
        Assert.All(thang.Rows.Cast<DataRow>(), dong => Assert.Equal(0m, dong["TiLe"]));

        DataTable nam = xl.lapBaoCaoNam(2026, out decimal tongNam);
        Assert.Equal(0m, tongNam);
        Assert.All(nam.Rows.Cast<DataRow>(), dong => Assert.Equal(0m, dong["TiLe"]));
        Assert.Equal(2, nam.Rows[11]["SoChuyenBay"]);
    }

    [Fact(DisplayName = "NV05 BM5.2, công thức (1.4): báo cáo năm có 12 dòng, số chuyến bay khởi hành và doanh thu từng tháng")]
    public void BaoCaoNam()
    {
        taoDuLieu();
        taoChuyenBay("CB701", new DateTime(2026, 11, 25, 8, 0, 0), giaVe: 1_200_000m);
        xlBanVe.banVe("CB701", "H2", khach(1)); // 1.200.000

        DataTable bang = xl.lapBaoCaoNam(2026, out decimal tongDoanhThu);

        Assert.Equal(5_000_000m, tongDoanhThu);
        Assert.Equal(12, bang.Rows.Count);
        Assert.Equal(Enumerable.Range(1, 12), bang.Rows.Cast<DataRow>().Select(d => (int)d["Thang"]));
        Assert.Equal(new object[] { 11, 1, 1_200_000m, 24m }, bang.Rows[10].ItemArray);
        Assert.Equal(new object[] { 12, 3, 3_800_000m, 76m }, bang.Rows[11].ItemArray);
        Assert.Equal(new object[] { 1, 0, 0m, 0m }, bang.Rows[0].ItemArray);

        // chuyến bay 00:00 ngày 01/01/2027 thuộc năm 2027
        DataTable nam2027 = xl.lapBaoCaoNam(2027, out decimal tong2027);
        Assert.Equal(2_000_000m, tong2027);
        Assert.Equal(1, nam2027.Rows[0]["SoChuyenBay"]);
    }

    [Fact(DisplayName = "NV05 ngoại lệ 3a: không có chuyến bay khởi hành trong kỳ thì báo cáo rỗng")]
    public void BaoCaoRong()
    {
        DataTable thang = xl.lapBaoCaoThang(6, 2026, out int tongSoVe, out decimal tongDoanhThu);
        Assert.Empty(thang.Rows);
        Assert.Equal(0, tongSoVe);
        Assert.Equal(0m, tongDoanhThu);

        Assert.Contains("thang", batLoi(() => xl.lapBaoCaoThang(13, 2026, out _, out _)).ChiTiet.Keys);
        Assert.Contains("nam", batLoi(() => xl.lapBaoCaoNam(1800, out _)).ChiTiet.Keys);
    }

    [Fact(DisplayName = "TT03: xuất báo cáo tháng và năm ra tập tin Excel")]
    public void XuatExcel()
    {
        taoDuLieu();

        using var thang = new XLWorkbook(new MemoryStream(xl.xuatTapTinThang(12, 2026, XL_BaoCao.EXCEL)));
        IXLWorksheet trang = thang.Worksheets.First();
        Assert.Equal("Báo cáo doanh thu bán vé các chuyến bay", trang.Cell(1, 1).GetString());
        Assert.Equal("Tháng 12 năm 2026", trang.Cell(2, 1).GetString());
        Assert.Contains("Tổng doanh thu: 3.800.000 đồng", trang.Cell(3, 1).GetString());
        int dongTieuDe = 6;
        Assert.Equal(new[] { "STT", "Chuyến bay", "Số vé", "Doanh thu", "Tỉ lệ" },
            Enumerable.Range(1, 5).Select(cot => trang.Cell(dongTieuDe, cot).GetString()));
        Assert.Equal("CB801", trang.Cell(dongTieuDe + 1, 2).GetString());
        Assert.Equal(3_100_000d, trang.Cell(dongTieuDe + 1, 4).GetDouble());
        Assert.Equal(81.58d, trang.Cell(dongTieuDe + 1, 5).GetDouble());
        Assert.Equal("CB803", trang.Cell(dongTieuDe + 3, 2).GetString());

        using var nam = new XLWorkbook(new MemoryStream(xl.xuatTapTinNam(2026, XL_BaoCao.EXCEL)));
        IXLWorksheet trangNam = nam.Worksheets.First();
        Assert.Equal("Báo cáo doanh thu năm", trangNam.Cell(1, 1).GetString());
        Assert.Equal(new[] { "Tháng", "Số chuyến bay", "Doanh thu", "Tỉ lệ" },
            Enumerable.Range(1, 4).Select(cot => trangNam.Cell(dongTieuDe, cot).GetString()));
        Assert.Equal(12d, trangNam.Cell(dongTieuDe + 12, 1).GetDouble());
        Assert.Equal(3_800_000d, trangNam.Cell(dongTieuDe + 12, 3).GetDouble());
    }

    [Fact(DisplayName = "TT03: xuất báo cáo tháng và năm ra tập tin PDF")]
    public void XuatPdf()
    {
        taoDuLieu();

        byte[] thang = xl.xuatTapTinThang(12, 2026, XL_BaoCao.PDF);
        byte[] nam = xl.xuatTapTinNam(2026, XL_BaoCao.PDF);
        byte[] rong = xl.xuatTapTinThang(6, 2026, XL_BaoCao.PDF);

        foreach (byte[] tapTin in new[] { thang, nam, rong })
        {
            Assert.True(tapTin.Length > 1000);
            Assert.Equal("%PDF-", System.Text.Encoding.ASCII.GetString(tapTin, 0, 5));
        }
        Assert.Contains("dinhDang", batLoi(() => xl.xuatTapTinNam(2026, "docx")).ChiTiet.Keys);
    }
}
