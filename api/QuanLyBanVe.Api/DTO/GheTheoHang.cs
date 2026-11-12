namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng GHETHEOHANG: số lượng ghế của một hạng vé trên một chuyến bay.</summary>
public class GheTheoHang
{
    public string MaChuyenBay { get; set; } = "";
    public string MaHangVe { get; set; } = "";
    public int SoLuongGhe { get; set; }

    public GheTheoHang() { }

    public GheTheoHang(string maChuyenBay, string maHangVe, int soLuongGhe)
    {
        MaChuyenBay = maChuyenBay;
        MaHangVe = maHangVe;
        SoLuongGhe = soLuongGhe;
    }
}
