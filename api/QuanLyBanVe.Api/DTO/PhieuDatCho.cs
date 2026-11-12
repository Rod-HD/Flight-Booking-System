namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng PHIEUDATCHO: phiếu Chờ thanh toán hoặc Đã hủy.</summary>
public class PhieuDatCho
{
    public const string CHO_THANH_TOAN = "Chờ thanh toán";
    public const string DA_HUY = "Đã hủy";

    /// <summary>Thời gian giữ chỗ tối đa kể từ lúc lập phiếu (giả định 7), không thay đổi theo QĐ6.</summary>
    public const int SO_GIO_GIU_CHO = 24;

    public string MaPhieuDat { get; set; } = "";
    public string MaChuyenBay { get; set; } = "";
    public string MaHanhKhach { get; set; } = "";
    public string MaHangVe { get; set; } = "";
    public decimal GiaTien { get; set; }
    public DateTime ThoiDiemDat { get; set; }
    public string TinhTrang { get; set; } = CHO_THANH_TOAN;

    public PhieuDatCho() { }

    public PhieuDatCho(string maPhieuDat, string maChuyenBay, string maHanhKhach, string maHangVe,
        decimal giaTien, DateTime thoiDiemDat, string tinhTrang)
    {
        MaPhieuDat = maPhieuDat;
        MaChuyenBay = maChuyenBay;
        MaHanhKhach = maHanhKhach;
        MaHangVe = maHangVe;
        GiaTien = giaTien;
        ThoiDiemDat = thoiDiemDat;
        TinhTrang = tinhTrang;
    }

    /// <summary>
    /// Mốc hủy đặt vé theo QĐ3 (giả định 6): 0 giờ của ngày cách ngày khởi hành thoiGianHuyDatVe ngày.
    /// </summary>
    public static DateTime mocHuyDatVe(DateTime ngayGioKhoiHanh, int thoiGianHuyDatVe)
    {
        return ngayGioKhoiHanh.Date.AddDays(-thoiGianHuyDatVe);
    }

    /// <summary>
    /// Hạn thanh toán: thời điểm sớm hơn giữa lúc đặt cộng 24 giờ và mốc hủy đặt vé theo QĐ3 (giả định 7).
    /// </summary>
    public DateTime hanThanhToan(DateTime ngayGioKhoiHanh, int thoiGianHuyDatVe)
    {
        DateTime het24Gio = ThoiDiemDat.AddHours(SO_GIO_GIU_CHO);
        DateTime mocHuy = mocHuyDatVe(ngayGioKhoiHanh, thoiGianHuyDatVe);
        return het24Gio < mocHuy ? het24Gio : mocHuy;
    }

    /// <summary>Phiếu còn hạn khi đang Chờ thanh toán và thoiDiem chưa đến hạn thanh toán (giả định 5).</summary>
    public bool conHan(DateTime thoiDiem, DateTime ngayGioKhoiHanh, int thoiGianHuyDatVe)
    {
        return TinhTrang == CHO_THANH_TOAN && thoiDiem < hanThanhToan(ngayGioKhoiHanh, thoiGianHuyDatVe);
    }
}
