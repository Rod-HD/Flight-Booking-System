using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TienIch;

/// <summary>
/// Giữ tài khoản và nhóm quyền đang đăng nhập của yêu cầu hiện tại để tầng giao tiếp và tầng xử lý
/// kiểm tra quyền. Với web, mỗi yêu cầu có một đối tượng riêng, được nạp lại từ cookie phiên.
/// </summary>
public class PhienLamViec
{
    public string? TenDangNhap { get; private set; }
    public string? NhomQuyen { get; private set; }

    public bool daDangNhap => TenDangNhap != null;

    public void batDau(TaiKhoan taiKhoan)
    {
        TenDangNhap = taiKhoan.TenDangNhap;
        NhomQuyen = taiKhoan.NhomQuyen;
    }

    public void ketThuc()
    {
        TenDangNhap = null;
        NhomQuyen = null;
    }
}
