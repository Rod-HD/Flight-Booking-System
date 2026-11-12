using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Bán vé (UC04): Nhân viên bán vé và Quản lý.</summary>
[ApiController]
[Authorize]
public class VeController : ControllerBase
{
    private readonly XL_BanVe xlBanVe;
    private readonly XL_DatVe xlDatVe;

    public VeController(XL_BanVe xlBanVe, XL_DatVe xlDatVe)
    {
        this.xlBanVe = xlBanVe;
        this.xlDatVe = xlDatVe;
    }

    /// <summary>
    /// Kiểm tra chuyến bay khi nhân viên chọn để bán vé hoặc đặt vé: có được phép không (chưa khởi hành,
    /// còn hạn đặt vé theo QĐ3, còn chỗ), số ghế trống và giá tiền của từng hạng vé.
    /// </summary>
    [HttpGet("api/chuyen-bay/{ma}/thong-tin-ban")]
    public IActionResult layThongTinBan(string ma, string? mucDich = "banVe")
    {
        ThongTinBan thongTin = mucDich switch
        {
            "banVe" or null or "" => xlBanVe.layThongTinBan(ma),
            "datVe" => xlDatVe.layThongTinDat(ma),
            _ => throw LoiNghiepVu.khongHopLe("mucDich", "Mục đích phải là banVe hoặc datVe.")
        };
        return Ok(new
        {
            duocPhep = thongTin.DuocPhep,
            maLoi = thongTin.MaLoi,
            thongBao = thongTin.ThongBao,
            tongSoGheTrong = thongTin.TongSoGheTrong,
            hanThanhToanDuKien = thongTin.HanThanhToanDuKien,
            hang = thongTin.Hang.Select(h => new
            {
                maHangVe = h.MaHangVe,
                tenHangVe = h.TenHangVe,
                soGheTrong = h.SoGheTrong,
                giaTien = ChuyenDoi.tien(h.GiaTien)
            })
        });
    }

    /// <summary>Bán vé trực tiếp theo BM2 (UC04.1).</summary>
    [HttpPost("api/ve")]
    public IActionResult banVe([FromBody] YeuCauLapVe yeuCau)
    {
        Ve ve = xlBanVe.banVe(yeuCau.MaChuyenBay, yeuCau.MaHangVe, ChuyenDoi.thanhHanhKhach(yeuCau.HanhKhach));
        return StatusCode(StatusCodes.Status201Created, taoKetQua(ve));
    }

    /// <summary>Bán vé từ phiếu đặt chỗ (UC04.2).</summary>
    [HttpPost("api/ve/tu-phieu")]
    public IActionResult banVeTuPhieu([FromBody] YeuCauBanTuPhieu yeuCau)
    {
        Ve ve = xlBanVe.banVeTuPhieu(yeuCau.MaPhieuDat);
        return StatusCode(StatusCodes.Status201Created, taoKetQua(ve));
    }

    /// <summary>Tìm các phiếu đặt chỗ còn hạn để bán vé từ phiếu (UC04.2 bước P2).</summary>
    [HttpGet("api/phieu-dat/con-han")]
    public IActionResult timPhieuConHan(string? loaiGiayTo, string? soGiayTo, string? maPhieuDat)
    {
        return Ok(ChuyenDoi.thanhDanhSach(xlBanVe.timPhieuDat(ChuyenDoi.loaiGiayToTuMa(loaiGiayTo), soGiayTo, maPhieuDat)));
    }

    /// <summary>Tra cứu vé (UC04.3); không có tiêu chí thì trả các vé bán trong ngày.</summary>
    [HttpGet("api/ve")]
    public IActionResult traCuu(string? maVe, string? soGiayTo, string? maChuyenBay, string? tuNgay, string? denNgay)
    {
        var tieuChi = new TieuChiTim
        {
            MaSo = maVe,
            SoGiayTo = soGiayTo,
            MaChuyenBay = maChuyenBay,
            TuNgay = ChuyenDoi.docNgayGio(tuNgay, "tuNgay"),
            DenNgay = ChuyenDoi.docNgayGio(denNgay, "denNgay")
        };
        return Ok(ChuyenDoi.thanhDanhSach(xlBanVe.timVe(tieuChi)));
    }

    /// <summary>Sửa thông tin hành khách trên vé (UC04.4).</summary>
    [HttpPut("api/ve/{maVe}/hanh-khach")]
    public IActionResult suaHanhKhach(string maVe, [FromBody] YeuCauHanhKhach yeuCau)
    {
        xlBanVe.suaVe(maVe, ChuyenDoi.thanhHanhKhach(yeuCau));
        return NoContent();
    }

    /// <summary>Hủy vé của chuyến bay chưa khởi hành (UC04.5).</summary>
    [HttpPost("api/ve/{maVe}/huy")]
    public IActionResult huy(string maVe)
    {
        xlBanVe.huyVe(maVe);
        return NoContent();
    }

    private static object taoKetQua(Ve ve)
    {
        return new { maVe = ve.MaVe, giaTien = ChuyenDoi.tien(ve.GiaTien), ngayBan = ve.NgayBan };
    }
}
