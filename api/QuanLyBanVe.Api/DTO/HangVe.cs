namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng HANGVE: hạng vé và tỉ lệ đơn giá (QĐ2).</summary>
public class HangVe
{
    public string MaHangVe { get; set; } = "";
    public string TenHangVe { get; set; } = "";
    /// <summary>Tỉ lệ so với đơn giá, tính theo phần trăm (105.00 nghĩa là 105%).</summary>
    public decimal TiLeDonGia { get; set; }

    public HangVe() { }

    public HangVe(string maHangVe, string tenHangVe, decimal tiLeDonGia)
    {
        MaHangVe = maHangVe;
        TenHangVe = tenHangVe;
        TiLeDonGia = tiLeDonGia;
    }

    /// <summary>
    /// Công thức (1.1): giá tiền vé = giá vé của chuyến bay x tỉ lệ đơn giá của hạng vé,
    /// làm tròn đến đồng, phần lẻ từ 0,5 đồng trở lên được làm tròn lên (giả định 3).
    /// </summary>
    public decimal tinhGiaTien(decimal giaVe)
    {
        return Math.Round(giaVe * TiLeDonGia / 100m, 0, MidpointRounding.AwayFromZero);
    }
}
