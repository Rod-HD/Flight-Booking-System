using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Tài khoản (UC02 Phân quyền), chỉ Quản lý.</summary>
[ApiController]
[Authorize(Roles = VaiTro.QUAN_LY)]
[Route("api/tai-khoan")]
public class TaiKhoanController : ControllerBase
{
    private readonly XL_PhanQuyen xlPhanQuyen;

    public TaiKhoanController(XL_PhanQuyen xlPhanQuyen)
    {
        this.xlPhanQuyen = xlPhanQuyen;
    }

    [HttpGet]
    public IActionResult layDanhSach()
    {
        // không trả chuỗi băm mật khẩu ra ngoài
        return Ok(xlPhanQuyen.layDanhSachTaiKhoan().Select(tk => new
        {
            tenDangNhap = tk.TenDangNhap,
            nhomQuyen = ChuyenDoi.ma(tk.NhomQuyen),
            trangThai = ChuyenDoi.ma(tk.TrangThai)
        }));
    }

    [HttpPost]
    public IActionResult them([FromBody] YeuCauThemTaiKhoan yeuCau)
    {
        xlPhanQuyen.themTaiKhoan(yeuCau.TenDangNhap, yeuCau.MatKhau, ChuyenDoi.nhomQuyenTuMa(yeuCau.NhomQuyen));
        return StatusCode(StatusCodes.Status201Created, new { tenDangNhap = yeuCau.TenDangNhap?.Trim() });
    }

    [HttpPut("{tenDangNhap}")]
    public IActionResult sua(string tenDangNhap, [FromBody] YeuCauSuaTaiKhoan yeuCau)
    {
        xlPhanQuyen.suaTaiKhoan(tenDangNhap, ChuyenDoi.nhomQuyenTuMa(yeuCau.NhomQuyen), yeuCau.MatKhauMoi);
        return NoContent();
    }

    [HttpPost("{tenDangNhap}/khoa")]
    public IActionResult khoa(string tenDangNhap)
    {
        xlPhanQuyen.khoaTaiKhoan(tenDangNhap);
        return NoContent();
    }

    [HttpPost("{tenDangNhap}/mo-khoa")]
    public IActionResult moKhoa(string tenDangNhap)
    {
        xlPhanQuyen.moKhoaTaiKhoan(tenDangNhap);
        return NoContent();
    }
}
