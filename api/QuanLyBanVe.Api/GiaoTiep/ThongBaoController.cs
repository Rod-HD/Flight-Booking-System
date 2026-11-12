using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Thông báo của UC06: các lần hệ thống tự động hủy phiếu đặt chỗ quá hạn.</summary>
[ApiController]
[Authorize]
public class ThongBaoController : ControllerBase
{
    private const int SO_DONG_TOI_DA = 20;

    private readonly XL_HuyPhieuDat xlHuyPhieuDat;

    public ThongBaoController(XL_HuyPhieuDat xlHuyPhieuDat)
    {
        this.xlHuyPhieuDat = xlHuyPhieuDat;
    }

    [HttpGet("api/thong-bao")]
    public IActionResult layThongBao()
    {
        return Ok(xlHuyPhieuDat.layThongBao(SO_DONG_TOI_DA)
            .Select(dong => new { thoiDiem = dong.ThoiDiem, noiDung = dong.NoiDung }));
    }
}
