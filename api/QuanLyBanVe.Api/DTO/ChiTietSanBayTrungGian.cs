namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng CHITIETSANBAYTRUNGGIAN: một sân bay trung gian của chuyến bay.</summary>
public class ChiTietSanBayTrungGian
{
    public string MaChuyenBay { get; set; } = "";
    public byte ThuTu { get; set; }
    public string MaSanBay { get; set; } = "";
    public int ThoiGianDung { get; set; }
    public string? GhiChu { get; set; }

    public ChiTietSanBayTrungGian() { }

    public ChiTietSanBayTrungGian(string maChuyenBay, byte thuTu, string maSanBay, int thoiGianDung, string? ghiChu)
    {
        MaChuyenBay = maChuyenBay;
        ThuTu = thuTu;
        MaSanBay = maSanBay;
        ThoiGianDung = thoiGianDung;
        GhiChu = ghiChu;
    }
}
