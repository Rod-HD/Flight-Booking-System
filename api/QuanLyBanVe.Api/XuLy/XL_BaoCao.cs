using System.Data;
using System.Globalization;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>UC07 Lập báo cáo doanh thu theo tháng (BM5.1) và theo năm (BM5.2).</summary>
public class XL_BaoCao
{
    public const string EXCEL = "excel";
    public const string PDF = "pdf";

    private readonly DAL_ChuyenBay dalChuyenBay;
    private readonly DAL_Ve dalVe;
    private readonly DongHoHeThong dongHo;

    public XL_BaoCao(DAL_ChuyenBay dalChuyenBay, DAL_Ve dalVe, DongHoHeThong dongHo)
    {
        this.dalChuyenBay = dalChuyenBay;
        this.dalVe = dalVe;
        this.dongHo = dongHo;
    }

    /// <summary>
    /// BM5.1: mỗi chuyến bay khởi hành trong tháng một dòng (STT, chuyến bay, số vé, doanh thu, tỉ lệ),
    /// kể cả chuyến bay chưa có vé Đã bán (số vé 0, doanh thu 0, tỉ lệ 0%).
    /// </summary>
    public DataTable lapBaoCaoThang(int thang, int nam, out int tongSoVe, out decimal tongDoanhThu)
    {
        kiemTraKy(thang, nam);
        List<ChuyenBay> dsChuyenBay = dalChuyenBay.layChuyenBayKhoiHanhTrongThang(thang, nam);
        Dictionary<string, (int SoVe, decimal DoanhThu)> tongHop = dalVe.tongHopVe(thang, nam);

        tongSoVe = tongHop.Values.Sum(t => t.SoVe);
        tongDoanhThu = tongHop.Values.Sum(t => t.DoanhThu);

        var bang = new DataTable("BaoCaoThang");
        bang.Columns.Add("STT", typeof(int));
        bang.Columns.Add("MaChuyenBay", typeof(string)).Caption = "Chuyến bay";
        bang.Columns.Add("SoVe", typeof(int)).Caption = "Số vé";
        bang.Columns.Add("DoanhThu", typeof(decimal)).Caption = "Doanh thu";
        themCotTiLe(bang);

        int stt = 1;
        foreach (ChuyenBay cb in dsChuyenBay)
        {
            // chuyến bay chưa có vé Đã bán được ghi 0
            (int soVe, decimal doanhThu) = tongHop.GetValueOrDefault(cb.MaChuyenBay);
            // công thức (1.3): tỉ lệ = doanh thu chuyến bay / tổng doanh thu tháng x 100%
            bang.Rows.Add(stt++, cb.MaChuyenBay, soVe, doanhThu, tinhTiLe(doanhThu, tongDoanhThu));
        }
        return bang;
    }

    /// <summary>BM5.2: mỗi tháng trong năm một dòng (tháng, số chuyến bay khởi hành, doanh thu, tỉ lệ).</summary>
    public DataTable lapBaoCaoNam(int nam, out decimal tongDoanhThu)
    {
        kiemTraKy(1, nam);
        var soChuyenBay = new int[13];
        var doanhThu = new decimal[13];
        for (int thang = 1; thang <= 12; thang++)
        {
            soChuyenBay[thang] = dalChuyenBay.demChuyenBayKhoiHanh(thang, nam);
            doanhThu[thang] = dalVe.tongDoanhThu(thang, nam);
        }
        tongDoanhThu = doanhThu.Sum();

        var bang = new DataTable("BaoCaoNam");
        bang.Columns.Add("Thang", typeof(int)).Caption = "Tháng";
        bang.Columns.Add("SoChuyenBay", typeof(int)).Caption = "Số chuyến bay";
        bang.Columns.Add("DoanhThu", typeof(decimal)).Caption = "Doanh thu";
        themCotTiLe(bang);
        for (int thang = 1; thang <= 12; thang++)
        {
            // công thức (1.4): tỉ lệ = doanh thu tháng / tổng doanh thu năm x 100%
            bang.Rows.Add(thang, soChuyenBay[thang], doanhThu[thang], tinhTiLe(doanhThu[thang], tongDoanhThu));
        }
        return bang;
    }

    /// <summary>Xuất báo cáo tháng ra tập tin Excel hoặc PDF kèm tiêu đề, tháng, năm (TT03).</summary>
    public byte[] xuatTapTinThang(int thang, int nam, string dinhDang)
    {
        DataTable bang = lapBaoCaoThang(thang, nam, out int tongSoVe, out decimal tongDoanhThu);
        string[] dongPhu =
        {
            "Tháng " + thang + " năm " + nam,
            "Số chuyến bay: " + bang.Rows.Count + ". Tổng số vé: " + tongSoVe + ". Tổng doanh thu: " + vietTien(tongDoanhThu) + " đồng.",
            "Ngày lập: " + ngayLap()
        };
        return xuatTapTin(bang, "Báo cáo doanh thu bán vé các chuyến bay", dongPhu, dinhDang);
    }

    /// <summary>Xuất báo cáo năm ra tập tin Excel hoặc PDF kèm tiêu đề, năm (TT03).</summary>
    public byte[] xuatTapTinNam(int nam, string dinhDang)
    {
        DataTable bang = lapBaoCaoNam(nam, out decimal tongDoanhThu);
        int tongSoChuyenBay = bang.Rows.Cast<DataRow>().Sum(dong => (int)dong["SoChuyenBay"]);
        string[] dongPhu =
        {
            "Năm " + nam,
            "Số chuyến bay: " + tongSoChuyenBay + ". Tổng doanh thu: " + vietTien(tongDoanhThu) + " đồng.",
            "Ngày lập: " + ngayLap()
        };
        return xuatTapTin(bang, "Báo cáo doanh thu năm", dongPhu, dinhDang);
    }

    private static byte[] xuatTapTin(DataTable bang, string tieuDe, string[] dongPhu, string dinhDang)
    {
        return dinhDang switch
        {
            EXCEL => TienIch_TapTin.taoExcel(bang, tieuDe, dongPhu),
            PDF => TienIch_TapTin.taoPdf(bang, tieuDe, dongPhu),
            _ => throw LoiNghiepVu.khongHopLe("dinhDang", "Định dạng tập tin phải là excel hoặc pdf.")
        };
    }

    /// <summary>
    /// Tỉ lệ phần trăm, làm tròn hai chữ số thập phân. Tổng doanh thu bằng 0 thì không chia,
    /// tỉ lệ của mọi dòng là 0% (mục 1.3.2).
    /// </summary>
    private static decimal tinhTiLe(decimal doanhThu, decimal tongDoanhThu)
    {
        if (tongDoanhThu == 0) return 0m;
        return Math.Round(doanhThu / tongDoanhThu * 100m, 2, MidpointRounding.AwayFromZero);
    }

    private static void themCotTiLe(DataTable bang)
    {
        DataColumn cot = bang.Columns.Add("TiLe", typeof(decimal));
        cot.Caption = "Tỉ lệ";
        cot.ExtendedProperties[TienIch_TapTin.DINH_DANG] = "0.00\"%\"";
    }

    private static void kiemTraKy(int thang, int nam)
    {
        var loi = new Dictionary<string, string>();
        if (thang < 1 || thang > 12) loi["thang"] = "Tháng phải từ 1 đến 12.";
        if (nam < 2000 || nam > 2100) loi["nam"] = "Năm phải từ 2000 đến 2100.";
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
    }

    private string ngayLap()
    {
        return dongHo.layThoiDiemHienTai().ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
    }

    private static string vietTien(decimal soTien)
    {
        return soTien.ToString("#,##0", new NumberFormatInfo { NumberGroupSeparator = "." });
    }
}
