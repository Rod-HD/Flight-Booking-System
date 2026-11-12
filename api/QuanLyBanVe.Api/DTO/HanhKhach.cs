namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng HANHKHACH, dùng chung cho vé và phiếu đặt chỗ.</summary>
public class HanhKhach
{
    public const string CAN_CUOC = "Căn cước";
    public const string HO_CHIEU = "Hộ chiếu";

    public string MaHanhKhach { get; set; } = "";
    public string HoTen { get; set; } = "";
    public string LoaiGiayTo { get; set; } = CAN_CUOC;
    public string SoGiayTo { get; set; } = "";
    public string DienThoai { get; set; } = "";

    public HanhKhach() { }

    public HanhKhach(string maHanhKhach, string hoTen, string loaiGiayTo, string soGiayTo, string dienThoai)
    {
        MaHanhKhach = maHanhKhach;
        HoTen = hoTen;
        LoaiGiayTo = loaiGiayTo;
        SoGiayTo = soGiayTo;
        DienThoai = dienThoai;
    }
}
