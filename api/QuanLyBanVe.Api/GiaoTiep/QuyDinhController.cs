using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Quy định, sân bay, hạng vé (UC08): mọi vai trò được đọc, chỉ Quản lý được ghi.</summary>
[ApiController]
[Authorize]
public class QuyDinhController : ControllerBase
{
    private readonly XL_ThayDoiQD xlThayDoiQD;

    public QuyDinhController(XL_ThayDoiQD xlThayDoiQD)
    {
        this.xlThayDoiQD = xlThayDoiQD;
    }

    [HttpGet("api/quy-dinh")]
    public IActionResult layQuyDinh()
    {
        ThamSoQuyDinh thamSo = xlThayDoiQD.layDanhSachQuyDinh(out List<SanBay> dsSanBay, out List<HangVe> dsHangVe);
        return Ok(new
        {
            thamSo = new
            {
                thoiGianBayToiThieu = thamSo.ThoiGianBayToiThieu,
                soSanBayTrungGianToiDa = thamSo.SoSanBayTrungGianToiDa,
                thoiGianDungToiThieu = thamSo.ThoiGianDungToiThieu,
                thoiGianDungToiDa = thamSo.ThoiGianDungToiDa,
                thoiGianDatVeChamNhat = thamSo.ThoiGianDatVeChamNhat,
                thoiGianHuyDatVe = thamSo.ThoiGianHuyDatVe
            },
            sanBay = dsSanBay.Select(sb => new { maSanBay = sb.MaSanBay, tenSanBay = sb.TenSanBay }),
            hangVe = dsHangVe.Select(h => new { maHangVe = h.MaHangVe, tenHangVe = h.TenHangVe, tiLeDonGia = h.TiLeDonGia })
        });
    }

    [HttpPut("api/quy-dinh/tham-so/{tenThamSo}")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult suaThamSo(string tenThamSo, [FromBody] YeuCauThamSo yeuCau)
    {
        xlThayDoiQD.capNhatThamSo(tenThamSo, yeuCau.GiaTriMoi);
        return NoContent();
    }

    [HttpPost("api/san-bay")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult themSanBay([FromBody] YeuCauSanBay yeuCau)
    {
        xlThayDoiQD.themSanBay(yeuCau.MaSanBay, yeuCau.TenSanBay);
        return StatusCode(StatusCodes.Status201Created, new { maSanBay = yeuCau.MaSanBay?.Trim().ToUpperInvariant() });
    }

    [HttpPut("api/san-bay/{maSanBay}")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult suaSanBay(string maSanBay, [FromBody] YeuCauSanBay yeuCau)
    {
        xlThayDoiQD.suaSanBay(maSanBay, yeuCau.TenSanBay);
        return NoContent();
    }

    [HttpDelete("api/san-bay/{maSanBay}")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult xoaSanBay(string maSanBay)
    {
        xlThayDoiQD.xoaSanBay(maSanBay);
        return NoContent();
    }

    [HttpPost("api/hang-ve")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult themHangVe([FromBody] YeuCauHangVe yeuCau)
    {
        xlThayDoiQD.themHangVe(yeuCau.MaHangVe, yeuCau.TenHangVe, yeuCau.TiLeDonGia);
        return StatusCode(StatusCodes.Status201Created, new { maHangVe = yeuCau.MaHangVe?.Trim().ToUpperInvariant() });
    }

    /// <summary>Chỉ sửa tên hạng vé; tỉ lệ đơn giá gửi kèm (nếu có) bị bỏ qua vì không sửa sau khi lưu (QĐ6).</summary>
    [HttpPut("api/hang-ve/{maHangVe}")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult suaHangVe(string maHangVe, [FromBody] YeuCauHangVe yeuCau)
    {
        xlThayDoiQD.suaHangVe(maHangVe, yeuCau.TenHangVe);
        return NoContent();
    }

    [HttpDelete("api/hang-ve/{maHangVe}")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult xoaHangVe(string maHangVe)
    {
        xlThayDoiQD.xoaHangVe(maHangVe);
        return NoContent();
    }
}
