namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng SANBAY.</summary>
public class SanBay
{
    public string MaSanBay { get; set; } = "";
    public string TenSanBay { get; set; } = "";

    public SanBay() { }

    public SanBay(string maSanBay, string tenSanBay)
    {
        MaSanBay = maSanBay;
        TenSanBay = tenSanBay;
    }
}
