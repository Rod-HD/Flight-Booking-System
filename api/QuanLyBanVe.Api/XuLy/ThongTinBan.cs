namespace QuanLyBanVe.Api.XuLy;

/// <summary>Kết quả kiểm tra một chuyến bay trước khi bán vé hoặc đặt vé, kèm số ghế trống và giá tiền từng hạng.</summary>
public class ThongTinBan
{
    /// <summary>Chuyến bay có được bán vé (hoặc đặt vé) tại thời điểm kiểm tra hay không.</summary>
    public bool DuocPhep { get; set; }
    public string? MaLoi { get; set; }
    public string? ThongBao { get; set; }
    public int TongSoGheTrong { get; set; }
    /// <summary>Hạn thanh toán nếu lập phiếu ngay lúc này (chỉ có khi kiểm tra để đặt vé).</summary>
    public DateTime? HanThanhToanDuKien { get; set; }
    public List<ThongTinHang> Hang { get; set; } = new();
}

/// <summary>Số ghế trống theo công thức (1.2) và giá tiền theo công thức (1.1) của một hạng vé trên chuyến bay.</summary>
public class ThongTinHang
{
    public string MaHangVe { get; set; } = "";
    public string TenHangVe { get; set; } = "";
    public int SoGheTrong { get; set; }
    public decimal GiaTien { get; set; }
}
