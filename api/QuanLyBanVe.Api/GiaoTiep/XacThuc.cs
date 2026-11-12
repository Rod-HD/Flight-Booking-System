using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Xác thực bằng cookie HttpOnly qlbv_phien sau khi đăng nhập (UC01).</summary>
public static class XacThuc
{
    public const string TEN_COOKIE = "qlbv_phien";

    public static void themXacThucCookie(this IServiceCollection dichVu)
    {
        dichVu.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(tuyChon =>
            {
                tuyChon.Cookie.Name = TEN_COOKIE;
                tuyChon.Cookie.HttpOnly = true;
                tuyChon.Cookie.SameSite = SameSiteMode.Lax;
                tuyChon.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                tuyChon.ExpireTimeSpan = TimeSpan.FromHours(8);
                tuyChon.SlidingExpiration = true;

                // API trả mã 401, 403 kèm JSON thay vì chuyển hướng sang trang đăng nhập
                tuyChon.Events.OnRedirectToLogin = nguCanh => PhanHoiLoi.ghi(nguCanh.Response,
                    StatusCodes.Status401Unauthorized, MaLoi.CHUA_DANG_NHAP, "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.");
                tuyChon.Events.OnRedirectToAccessDenied = nguCanh => PhanHoiLoi.ghi(nguCanh.Response,
                    StatusCodes.Status403Forbidden, MaLoi.KHONG_CO_QUYEN, "Bạn không có quyền thực hiện chức năng này.");
                tuyChon.Events.OnValidatePrincipal = kiemTraPhien;
            });
        dichVu.AddAuthorization();
    }

    /// <summary>Thông tin ghi vào cookie phiên: tên đăng nhập và nhóm quyền.</summary>
    public static ClaimsPrincipal taoDanhTinh(TaiKhoan taiKhoan)
    {
        var danhTinh = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Name, taiKhoan.TenDangNhap),
            new Claim(ClaimTypes.Role, ChuyenDoi.ma(taiKhoan.NhomQuyen))
        }, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(danhTinh);
    }

    /// <summary>
    /// Ở mỗi yêu cầu, đối chiếu cookie với bảng TAIKHOAN: tài khoản đã bị khóa, bị xóa hoặc đã đổi nhóm quyền
    /// thì phiên không còn hiệu lực, người dùng phải đăng nhập lại. Phiên hợp lệ được nạp vào PhienLamViec.
    /// </summary>
    private static async Task kiemTraPhien(CookieValidatePrincipalContext nguCanh)
    {
        string? tenDangNhap = nguCanh.Principal?.Identity?.Name;
        string? nhomQuyen = nguCanh.Principal?.FindFirstValue(ClaimTypes.Role);
        var dalTaiKhoan = nguCanh.HttpContext.RequestServices.GetRequiredService<DAL_TaiKhoan>();
        TaiKhoan? taiKhoan = tenDangNhap == null ? null : dalTaiKhoan.timTaiKhoan(tenDangNhap);

        if (taiKhoan == null || taiKhoan.TrangThai != TaiKhoan.HOAT_DONG || ChuyenDoi.ma(taiKhoan.NhomQuyen) != nhomQuyen)
        {
            nguCanh.RejectPrincipal();
            await nguCanh.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }
        nguCanh.HttpContext.RequestServices.GetRequiredService<PhienLamViec>().batDau(taiKhoan);
    }
}
