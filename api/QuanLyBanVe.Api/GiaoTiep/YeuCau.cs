namespace QuanLyBanVe.Api.GiaoTiep;

// Thân yêu cầu JSON của các đường dẫn trong docs/API.md. Mọi trường đều cho phép rỗng
// để tầng xử lý kiểm tra và trả về câu thông báo của từng ô.

public class YeuCauDangNhap
{
    public string? TenDangNhap { get; set; }
    public string? MatKhau { get; set; }
}

public class YeuCauThemTaiKhoan
{
    public string? TenDangNhap { get; set; }
    public string? MatKhau { get; set; }
    public string? NhomQuyen { get; set; }
}

public class YeuCauSuaTaiKhoan
{
    public string? NhomQuyen { get; set; }
    public string? MatKhauMoi { get; set; }
}

public class YeuCauThamSo
{
    public int? GiaTriMoi { get; set; }
}

public class YeuCauSanBay
{
    public string? MaSanBay { get; set; }
    public string? TenSanBay { get; set; }
}

public class YeuCauHangVe
{
    public string? MaHangVe { get; set; }
    public string? TenHangVe { get; set; }
    public decimal? TiLeDonGia { get; set; }
}

public class YeuCauGheTheoHang
{
    public string? MaHangVe { get; set; }
    public int? SoLuongGhe { get; set; }
}

public class YeuCauTrungGian
{
    public int? ThuTu { get; set; }
    public string? MaSanBay { get; set; }
    public int? ThoiGianDung { get; set; }
    public string? GhiChu { get; set; }
}

public class YeuCauChuyenBay
{
    public string? MaChuyenBay { get; set; }
    public decimal? GiaVe { get; set; }
    public string? MaSanBayDi { get; set; }
    public string? MaSanBayDen { get; set; }
    public DateTime? NgayGioKhoiHanh { get; set; }
    public int? ThoiGianBay { get; set; }
    public List<YeuCauGheTheoHang>? GheTheoHang { get; set; }
    public List<YeuCauTrungGian>? TrungGian { get; set; }
}

public class YeuCauHanhKhach
{
    public string? HoTen { get; set; }
    public string? LoaiGiayTo { get; set; }
    public string? SoGiayTo { get; set; }
    public string? DienThoai { get; set; }
}

/// <summary>Thân yêu cầu bán vé trực tiếp và lập phiếu đặt chỗ (BM2, BM3).</summary>
public class YeuCauLapVe
{
    public string? MaChuyenBay { get; set; }
    public string? MaHangVe { get; set; }
    public YeuCauHanhKhach? HanhKhach { get; set; }
}

public class YeuCauBanTuPhieu
{
    public string? MaPhieuDat { get; set; }
}
