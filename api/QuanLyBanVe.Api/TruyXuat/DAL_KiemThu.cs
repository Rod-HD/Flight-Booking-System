using System.Data;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>
/// Chỉ dùng cho trang Kiểm thử: đọc thẳng các dòng của một bảng để bộ kiểm thử giao diện mở ra cho người xem
/// thấy dữ liệu đã thật sự đổi trong cơ sở dữ liệu. Tên bảng và tên cột phải có thật, giá trị lọc là tham số,
/// cột mật khẩu không bao giờ được trả ra.
/// </summary>
public class DAL_KiemThu
{
    private static readonly string[] CAC_BANG =
    {
        "SANBAY", "CHUYENBAY", "CHITIETSANBAYTRUNGGIAN", "HANGVE", "GHETHEOHANG",
        "HANHKHACH", "PHIEUDATCHO", "VE", "THAMSOQUYDINH", "TAIKHOAN",
    };

    private readonly KetNoiCSDL ketNoi;

    public DAL_KiemThu(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    /// <summary>Tối đa 50 dòng của bảng, lọc theo cột = giá trị nếu có cột; null nếu tên bảng hoặc cột không có.</summary>
    public KetQuaXemBang? xemBang(string bang, string? cot, string? giaTri)
    {
        bang = bang.ToUpperInvariant();
        if (!CAC_BANG.Contains(bang)) return null;
        List<string> cacCot = ketNoi.docDanhSach(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @bang ORDER BY ORDINAL_POSITION",
            dong => dong.GetString(0), ThamSo.Chuoi("@bang", bang, 30));
        string? cotLoc = cot == null ? null : cacCot.FirstOrDefault(c => c.Equals(cot, StringComparison.OrdinalIgnoreCase));
        if (cot != null && cotLoc == null) return null;

        string chon = string.Join(", ", cacCot.Select(c => c == "MatKhau" ? "N'(đã ẩn)' AS [MatKhau]" : $"[{c}]"));
        string dieuKien = cotLoc == null ? "" : $" WHERE [{cotLoc}] = @giaTri";
        DataTable kq = ketNoi.docBang($"SELECT TOP (50) {chon} FROM [{bang}]{dieuKien} ORDER BY 1",
            ThamSo.ChuoiCoDau("@giaTri", giaTri ?? "", 200));

        var cacDong = kq.Rows.Cast<DataRow>()
            .Select(d => d.ItemArray.Select(o => o switch
            {
                DBNull => null,
                DateTime t => t.ToString("yyyy-MM-dd HH:mm:ss"),
                _ => o,
            }).ToArray())
            .ToList();
        string cauLenh = $"SELECT * FROM {bang}" + (cotLoc == null ? "" : $" WHERE {cotLoc} = N'{giaTri}'");
        return new KetQuaXemBang(cauLenh, cacCot, cacDong);
    }
}

public record KetQuaXemBang(string CauLenh, List<string> CacCot, List<object?[]> CacDong);
