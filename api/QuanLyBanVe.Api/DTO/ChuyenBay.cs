namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng CHUYENBAY: thông tin chung của chuyến bay theo BM1.</summary>
public class ChuyenBay
{
    public string MaChuyenBay { get; set; } = "";
    public decimal GiaVe { get; set; }
    public string MaSanBayDi { get; set; } = "";
    public string MaSanBayDen { get; set; } = "";
    public DateTime NgayGioKhoiHanh { get; set; }
    public int ThoiGianBay { get; set; }

    public ChuyenBay() { }

    public ChuyenBay(string maChuyenBay, decimal giaVe, string maSanBayDi, string maSanBayDen,
        DateTime ngayGioKhoiHanh, int thoiGianBay)
    {
        MaChuyenBay = maChuyenBay;
        GiaVe = giaVe;
        MaSanBayDi = maSanBayDi;
        MaSanBayDen = maSanBayDen;
        NgayGioKhoiHanh = ngayGioKhoiHanh;
        ThoiGianBay = thoiGianBay;
    }
}
