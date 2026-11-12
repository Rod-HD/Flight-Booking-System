namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng VE: vé Đã bán hoặc Đã hủy.</summary>
public class Ve
{
    public const string DA_BAN = "Đã bán";
    public const string DA_HUY = "Đã hủy";

    public string MaVe { get; set; } = "";
    public string MaChuyenBay { get; set; } = "";
    public string MaHanhKhach { get; set; } = "";
    public string MaHangVe { get; set; } = "";
    /// <summary>Phiếu đặt chỗ được chuyển thành vé; null nếu bán trực tiếp.</summary>
    public string? MaPhieuDat { get; set; }
    public decimal GiaTien { get; set; }
    public DateTime NgayBan { get; set; }
    public string TinhTrang { get; set; } = DA_BAN;

    public Ve() { }

    public Ve(string maVe, string maChuyenBay, string maHanhKhach, string maHangVe, string? maPhieuDat,
        decimal giaTien, DateTime ngayBan, string tinhTrang)
    {
        MaVe = maVe;
        MaChuyenBay = maChuyenBay;
        MaHanhKhach = maHanhKhach;
        MaHangVe = maHangVe;
        MaPhieuDat = maPhieuDat;
        GiaTien = giaTien;
        NgayBan = ngayBan;
        TinhTrang = tinhTrang;
    }
}
