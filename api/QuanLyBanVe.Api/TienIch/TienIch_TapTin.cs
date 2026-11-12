using System.Data;
using System.Globalization;
using ClosedXML.Excel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace QuanLyBanVe.Api.TienIch;

/// <summary>
/// Đọc tập tin Excel theo tập tin mẫu (TT01), tạo nội dung tập tin Excel (TT02, TT03) bằng ClosedXML
/// và tập tin PDF (TT03) bằng QuestPDF. Tiêu đề cột lấy từ Caption của cột trong bảng.
/// </summary>
public static class TienIch_TapTin
{
    /// <summary>Tên thuộc tính mở rộng của cột chứa mẫu định dạng số, ví dụ 0.00"%".</summary>
    public const string DINH_DANG = "DinhDang";

    /// <summary>Tên cột chứa số thứ tự dòng trên trang tính trong bảng do docExcel trả về.</summary>
    public const string COT_DONG = "Dong";

    private const string DINH_DANG_TIEN = "#,##0";
    private const string DINH_DANG_NGAY_GIO = "dd/MM/yyyy HH:mm";

    // số viết kiểu Việt Nam: dấu chấm ngăn hàng nghìn, dấu phẩy thập phân
    private static readonly NumberFormatInfo kieuSoViet = new()
    {
        NumberGroupSeparator = ".",
        NumberDecimalSeparator = ","
    };

    /// <summary>Tập tin Excel đọc được nhưng không có trang tính theo tập tin mẫu.</summary>
    public class TapTinKhongDungMau : Exception
    {
        public TapTinKhongDungMau(string thongBao) : base(thongBao) { }
    }

    static TienIch_TapTin()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    /// <summary>
    /// Đọc một trang tính thành bảng: dòng 1 là tiêu đề cột, mỗi dòng sau là một dòng dữ liệu.
    /// Cột đầu của bảng (Dong) là số thứ tự dòng trên trang tính để báo lỗi. Dòng trống bị bỏ qua.
    /// </summary>
    public static DataTable docExcel(Stream tapTin, string tenTrang)
    {
        using var tapBang = new XLWorkbook(tapTin);
        if (!tapBang.TryGetWorksheet(tenTrang, out IXLWorksheet? trang) || trang == null)
            throw new TapTinKhongDungMau("Tập tin không có trang tính " + tenTrang + " như tập tin mẫu.");

        var bang = new DataTable(tenTrang);
        bang.Columns.Add(COT_DONG, typeof(int));
        IXLRange? vung = trang.RangeUsed();
        if (vung == null) return bang;

        int cotCuoi = vung.LastColumn().ColumnNumber();
        int dongCuoi = vung.LastRow().RowNumber();
        for (int cot = 1; cot <= cotCuoi; cot++)
        {
            string ten = trang.Cell(1, cot).GetString().Trim();
            if (ten.Length == 0 || bang.Columns.Contains(ten)) ten = "Cot" + cot;
            bang.Columns.Add(ten, typeof(object));
        }
        for (int dong = 2; dong <= dongCuoi; dong++)
        {
            var giaTri = new object[cotCuoi + 1];
            giaTri[0] = dong;
            bool coDuLieu = false;
            for (int cot = 1; cot <= cotCuoi; cot++)
            {
                object? o = docO(trang.Cell(dong, cot));
                giaTri[cot] = o ?? DBNull.Value;
                if (o != null) coDuLieu = true;
            }
            if (coDuLieu) bang.Rows.Add(giaTri);
        }
        return bang;
    }

    private static object? docO(IXLCell o)
    {
        XLCellValue giaTri = o.Value;
        switch (giaTri.Type)
        {
            case XLDataType.Number:
                return giaTri.GetNumber();
            case XLDataType.DateTime:
                return giaTri.GetDateTime();
            case XLDataType.Boolean:
                return giaTri.GetBoolean();
            case XLDataType.Text:
                string chuoi = giaTri.GetText().Trim();
                return chuoi.Length == 0 ? null : chuoi;
            case XLDataType.Blank:
                return null;
            default:
                return giaTri.ToString(CultureInfo.InvariantCulture);
        }
    }

    /// <summary>Tạo tập tin Excel một trang tính từ bảng, có thể kèm tiêu đề và các dòng ghi chú phía trên.</summary>
    public static byte[] taoExcel(DataTable bang, string? tieuDe = null, IEnumerable<string>? dongPhu = null)
    {
        using var tapBang = new XLWorkbook();
        themTrang(tapBang, bang, tieuDe, dongPhu);
        return luu(tapBang);
    }

    /// <summary>Tạo tập tin Excel nhiều trang tính, mỗi bảng một trang mang tên của bảng.</summary>
    public static byte[] taoExcel(IEnumerable<DataTable> cacBang)
    {
        using var tapBang = new XLWorkbook();
        foreach (DataTable bang in cacBang) themTrang(tapBang, bang, null, null);
        return luu(tapBang);
    }

    private static void themTrang(XLWorkbook tapBang, DataTable bang, string? tieuDe, IEnumerable<string>? dongPhu)
    {
        string tenTrang = string.IsNullOrWhiteSpace(bang.TableName) ? "DuLieu" : bang.TableName;
        IXLWorksheet trang = tapBang.Worksheets.Add(tenTrang.Length > 31 ? tenTrang[..31] : tenTrang);
        int soCot = bang.Columns.Count;
        int dong = 1;

        if (!string.IsNullOrEmpty(tieuDe))
        {
            trang.Cell(dong, 1).Value = tieuDe;
            trang.Cell(dong, 1).Style.Font.Bold = true;
            trang.Cell(dong, 1).Style.Font.FontSize = 14;
            if (soCot > 1) trang.Range(dong, 1, dong, soCot).Merge();
            dong++;
        }
        if (dongPhu != null)
        {
            foreach (string ghiChu in dongPhu)
            {
                trang.Cell(dong, 1).Value = ghiChu;
                if (soCot > 1) trang.Range(dong, 1, dong, soCot).Merge();
                dong++;
            }
        }
        if (dong > 1) dong++;

        int dongTieuDeCot = dong;
        for (int cot = 0; cot < soCot; cot++)
        {
            IXLCell o = trang.Cell(dong, cot + 1);
            o.Value = bang.Columns[cot].Caption;
            o.Style.Font.Bold = true;
            o.Style.Fill.BackgroundColor = XLColor.FromHtml("#F2F2F2");
            o.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
        }
        dong++;

        foreach (DataRow duLieu in bang.Rows)
        {
            for (int cot = 0; cot < soCot; cot++)
            {
                object giaTri = duLieu[cot];
                IXLCell o = trang.Cell(dong, cot + 1);
                switch (giaTri)
                {
                    case DBNull:
                        break;
                    case DateTime ngayGio:
                        o.Value = ngayGio;
                        o.Style.DateFormat.Format = DINH_DANG_NGAY_GIO;
                        break;
                    case decimal soThuc:
                        o.Value = soThuc;
                        o.Style.NumberFormat.Format = bang.Columns[cot].ExtendedProperties[DINH_DANG] as string ?? DINH_DANG_TIEN;
                        break;
                    case int or long or short or byte or double or float:
                        o.Value = Convert.ToDouble(giaTri, CultureInfo.InvariantCulture);
                        break;
                    default:
                        o.Value = giaTri.ToString();
                        break;
                }
            }
            dong++;
        }

        try
        {
            trang.Columns(1, soCot).AdjustToContents(dongTieuDeCot, Math.Max(dongTieuDeCot, dong - 1), 8, 60);
        }
        catch (Exception)
        {
            // máy không có phông chữ để đo bề rộng thì đặt bề rộng cố định
            trang.Columns(1, soCot).Width = 20;
        }
    }

    private static byte[] luu(XLWorkbook tapBang)
    {
        using var boNho = new MemoryStream();
        tapBang.SaveAs(boNho);
        return boNho.ToArray();
    }

    /// <summary>Tạo tập tin PDF khổ A4 gồm tiêu đề, các dòng ghi chú và bảng số liệu.</summary>
    public static byte[] taoPdf(DataTable bang, string tieuDe, IEnumerable<string>? dongPhu = null)
    {
        List<string> ghiChu = dongPhu?.ToList() ?? new List<string>();
        return Document.Create(taiLieu =>
        {
            taiLieu.Page(trang =>
            {
                trang.Size(PageSizes.A4);
                trang.Margin(1.5f, Unit.Centimetre);
                trang.DefaultTextStyle(kieu => kieu.FontSize(10));

                trang.Content().Column(cot =>
                {
                    cot.Item().AlignCenter().Text(tieuDe).FontSize(15).Bold();
                    foreach (string dong in ghiChu)
                        cot.Item().PaddingTop(3).AlignCenter().Text(dong);

                    cot.Item().PaddingTop(12).Table(b =>
                    {
                        b.ColumnsDefinition(dinhNghia =>
                        {
                            foreach (DataColumn c in bang.Columns)
                            {
                                if (laCotSo(c)) dinhNghia.RelativeColumn(2);
                                else dinhNghia.RelativeColumn(3);
                            }
                        });
                        b.Header(tieuDeCot =>
                        {
                            foreach (DataColumn c in bang.Columns)
                            {
                                var o = tieuDeCot.Cell().Background(Colors.Grey.Lighten3)
                                    .BorderBottom(1).BorderColor(Colors.Grey.Darken1).Padding(5);
                                if (laCotSo(c)) o.AlignRight().Text(c.Caption).Bold();
                                else o.Text(c.Caption).Bold();
                            }
                        });
                        foreach (DataRow duLieu in bang.Rows)
                        {
                            foreach (DataColumn c in bang.Columns)
                            {
                                var o = b.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(5);
                                string chu = dinhDang(duLieu[c], c);
                                if (laCotSo(c)) o.AlignRight().Text(chu);
                                else o.Text(chu);
                            }
                        }
                    });

                    if (bang.Rows.Count == 0)
                        cot.Item().PaddingTop(10).AlignCenter().Text("Không có dữ liệu.").Italic();
                });

                trang.Footer().AlignCenter().Text(chu =>
                {
                    chu.Span("Trang ");
                    chu.CurrentPageNumber();
                    chu.Span(" / ");
                    chu.TotalPages();
                });
            });
        }).GeneratePdf();
    }

    private static bool laCotSo(DataColumn cot)
    {
        Type kieu = cot.DataType;
        return kieu == typeof(int) || kieu == typeof(long) || kieu == typeof(decimal) || kieu == typeof(double);
    }

    private static string dinhDang(object giaTri, DataColumn cot)
    {
        switch (giaTri)
        {
            case DBNull:
                return "";
            case DateTime ngayGio:
                return ngayGio.ToString(DINH_DANG_NGAY_GIO, CultureInfo.InvariantCulture);
            case decimal soThuc:
                return soThuc.ToString(cot.ExtendedProperties[DINH_DANG] as string ?? DINH_DANG_TIEN, kieuSoViet);
            case int soNguyen:
                return soNguyen.ToString(DINH_DANG_TIEN, kieuSoViet);
            default:
                return giaTri.ToString() ?? "";
        }
    }
}
