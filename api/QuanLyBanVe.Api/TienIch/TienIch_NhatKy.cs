using System.Globalization;
using System.Text;

namespace QuanLyBanVe.Api.TienIch;

/// <summary>
/// Ghi và đọc tập tin nhật ký hủy phiếu tự động (UC06). Mỗi lần có phiếu bị hủy ghi một dòng:
/// thời điểm kiểm tra | nội dung kèm số phiếu đã hủy.
/// </summary>
public static class TienIch_NhatKy
{
    private const string DINH_DANG_THOI_DIEM = "yyyy-MM-dd HH:mm:ss";
    private const string DAU_NGAN = " | ";

    // UTF-8 không kèm dấu thứ tự byte ở đầu tập tin
    private static readonly Encoding bangMa = new UTF8Encoding(false);
    private static readonly object khoaTapTin = new();
    private static string duongDanTapTin = Path.Combine(AppContext.BaseDirectory, "nhat_ky", "huy_phieu_tu_dong.log");

    /// <summary>Đặt nơi lưu tập tin nhật ký (gọi một lần khi máy chủ khởi động).</summary>
    public static void datDuongDan(string duongDan)
    {
        lock (khoaTapTin)
        {
            duongDanTapTin = duongDan;
        }
    }

    public static void ghiNhatKy(DateTime thoiDiem, int soPhieuDaHuy)
    {
        string dong = thoiDiem.ToString(DINH_DANG_THOI_DIEM, CultureInfo.InvariantCulture) + DAU_NGAN
            + "Hệ thống đã tự động hủy " + soPhieuDaHuy + " phiếu đặt chỗ quá hạn.";
        lock (khoaTapTin)
        {
            string? thuMuc = Path.GetDirectoryName(duongDanTapTin);
            if (!string.IsNullOrEmpty(thuMuc)) Directory.CreateDirectory(thuMuc);
            File.AppendAllText(duongDanTapTin, dong + Environment.NewLine, bangMa);
        }
    }

    /// <summary>Đọc các dòng mới nhất của nhật ký, dòng mới nhất đứng đầu.</summary>
    public static List<(DateTime ThoiDiem, string NoiDung)> docNhatKy(int soDongToiDa)
    {
        string[] cacDong;
        lock (khoaTapTin)
        {
            if (!File.Exists(duongDanTapTin)) return new List<(DateTime, string)>();
            cacDong = File.ReadAllLines(duongDanTapTin, bangMa);
        }

        var ketQua = new List<(DateTime, string)>();
        foreach (string dong in cacDong.Reverse())
        {
            if (ketQua.Count >= soDongToiDa) break;
            int viTri = dong.IndexOf(DAU_NGAN, StringComparison.Ordinal);
            if (viTri <= 0) continue;
            if (!DateTime.TryParseExact(dong[..viTri], DINH_DANG_THOI_DIEM, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out DateTime thoiDiem)) continue;
            ketQua.Add((thoiDiem, dong[(viTri + DAU_NGAN.Length)..]));
        }
        return ketQua;
    }
}
