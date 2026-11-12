namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng CHITIETTRUNGGIAN: một sân bay trung gian của chuyến bay.</summary>
public class ChiTietTrungGian
{
    public string MaChuyenBay { get; set; } = "";
    public byte ThuTu { get; set; }
    public string MaSanBay { get; set; } = "";
    public int ThoiGianDung { get; set; }
    public string? GhiChu { get; set; }

    public ChiTietTrungGian() { }

    public ChiTietTrungGian(string maChuyenBay, byte thuTu, string maSanBay, int thoiGianDung, string? ghiChu)
    {
        MaChuyenBay = maChuyenBay;
        ThuTu = thuTu;
        MaSanBay = maSanBay;
        ThoiGianDung = thoiGianDung;
        GhiChu = ghiChu;
    }
}
