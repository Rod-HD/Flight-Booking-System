namespace QuanLyBanVe.Api.DTO;

/// <summary>Dòng duy nhất của bảng THAMSOQUYDINH: sáu tham số của QĐ1 và QĐ3 (thay đổi theo QĐ6).</summary>
public class ThamSoQuyDinh
{
    public int ThoiGianBayToiThieu { get; set; }
    public int SoSanBayTrungGianToiDa { get; set; }
    public int ThoiGianDungToiThieu { get; set; }
    public int ThoiGianDungToiDa { get; set; }
    public int ThoiGianDatVeChamNhat { get; set; }
    public int ThoiGianHuyDatVe { get; set; }

    public ThamSoQuyDinh() { }

    public ThamSoQuyDinh(int thoiGianBayToiThieu, int soSanBayTrungGianToiDa, int thoiGianDungToiThieu,
        int thoiGianDungToiDa, int thoiGianDatVeChamNhat, int thoiGianHuyDatVe)
    {
        ThoiGianBayToiThieu = thoiGianBayToiThieu;
        SoSanBayTrungGianToiDa = soSanBayTrungGianToiDa;
        ThoiGianDungToiThieu = thoiGianDungToiThieu;
        ThoiGianDungToiDa = thoiGianDungToiDa;
        ThoiGianDatVeChamNhat = thoiGianDatVeChamNhat;
        ThoiGianHuyDatVe = thoiGianHuyDatVe;
    }
}
