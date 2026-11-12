namespace QuanLyBanVe.Api.DTO;

/// <summary>
/// Tiêu chí tìm chuyến bay, vé, phiếu đặt chỗ. Thuộc tính nào để trống (null) thì không lọc theo thuộc tính đó.
/// </summary>
public class TieuChiTim
{
    public string? MaSanBayDi { get; set; }
    public string? MaSanBayDen { get; set; }
    /// <summary>Từ thời điểm này trở đi (ngày giờ khởi hành với chuyến bay, ngày bán với vé).</summary>
    public DateTime? TuNgay { get; set; }
    /// <summary>Trước thời điểm này.</summary>
    public DateTime? DenNgay { get; set; }
    public string? MaChuyenBay { get; set; }
    /// <summary>Mã vé hoặc mã phiếu đặt.</summary>
    public string? MaSo { get; set; }
    public string? SoGiayTo { get; set; }
    public string? TinhTrang { get; set; }
}
