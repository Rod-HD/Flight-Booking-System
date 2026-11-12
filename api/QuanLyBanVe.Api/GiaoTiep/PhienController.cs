using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Phiên làm việc (UC01): đăng nhập, đăng xuất, xem phiên hiện tại.</summary>
[ApiController]
public class PhienController : ControllerBase
{
    private readonly XL_DangNhap xlDangNhap;
    private readonly PhienLamViec phien;

    public PhienController(XL_DangNhap xlDangNhap, PhienLamViec phien)
    {
        this.xlDangNhap = xlDangNhap;
        this.phien = phien;
    }

    [HttpPost("api/dang-nhap")]
    [AllowAnonymous]
    public async Task<IActionResult> dangNhap([FromBody] YeuCauDangNhap yeuCau)
    {
        TaiKhoan taiKhoan = xlDangNhap.dangNhap(yeuCau.TenDangNhap, yeuCau.MatKhau);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, XacThuc.taoDanhTinh(taiKhoan));
        return Ok(new { tenDangNhap = taiKhoan.TenDangNhap, nhomQuyen = ChuyenDoi.ma(taiKhoan.NhomQuyen) });
    }

    [HttpPost("api/dang-xuat")]
    [AllowAnonymous]
    public async Task<IActionResult> dangXuat()
    {
        xlDangNhap.dangXuat();
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("api/phien")]
    [Authorize]
    public IActionResult layPhien()
    {
        return Ok(new { tenDangNhap = phien.TenDangNhap, nhomQuyen = ChuyenDoi.ma(phien.NhomQuyen ?? "") });
    }
}
