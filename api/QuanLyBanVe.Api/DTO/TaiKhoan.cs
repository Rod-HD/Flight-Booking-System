namespace QuanLyBanVe.Api.DTO;

/// <summary>Một dòng của bảng TAIKHOAN. MatKhau là chuỗi băm PBKDF2, không phải mật khẩu gốc.</summary>
public class TaiKhoan
{
    public const string QUAN_LY = "Quản lý";
    public const string NHAN_VIEN = "Nhân viên bán vé";
    public const string HOAT_DONG = "Hoạt động";
    public const string DA_KHOA = "Đã khóa";

    public string TenDangNhap { get; set; } = "";
    public string MatKhau { get; set; } = "";
    public string NhomQuyen { get; set; } = NHAN_VIEN;
    public string TrangThai { get; set; } = HOAT_DONG;

    public TaiKhoan() { }

    public TaiKhoan(string tenDangNhap, string matKhau, string nhomQuyen, string trangThai)
    {
        TenDangNhap = tenDangNhap;
        MatKhau = matKhau;
        NhomQuyen = nhomQuyen;
        TrangThai = trangThai;
    }
}
