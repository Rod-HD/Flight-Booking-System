using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Đặt vé (UC05): Nhân viên bán vé và Quản lý; riêng xóa phiếu đã hủy chỉ Quản lý.</summary>
[ApiController]
[Authorize]
[Route("api/phieu-dat")]
public class PhieuDatController : ControllerBase
{
    private readonly XL_DatVe xlDatVe;

    public PhieuDatController(XL_DatVe xlDatVe)
    {
        this.xlDatVe = xlDatVe;
    }

    /// <summary>Lập phiếu đặt chỗ theo BM3 (UC05.1).</summary>
    [HttpPost]
    public IActionResult datVe([FromBody] YeuCauLapVe yeuCau)
    {
        PhieuDatCho phieu = xlDatVe.datVe(yeuCau.MaChuyenBay, yeuCau.MaHangVe, ChuyenDoi.thanhHanhKhach(yeuCau.HanhKhach),
            out DateTime hanThanhToan);
        return StatusCode(StatusCodes.Status201Created, new
        {
            maPhieuDat = phieu.MaPhieuDat,
            giaTien = ChuyenDoi.tien(phieu.GiaTien),
            thoiDiemDat = phieu.ThoiDiemDat,
            hanThanhToan
        });
    }

    /// <summary>Tra cứu phiếu đặt chỗ (UC05.2).</summary>
    [HttpGet]
    public IActionResult traCuu(string? maPhieuDat, string? soGiayTo, string? maChuyenBay, string? tinhTrang)
    {
        var tieuChi = new TieuChiTim
        {
            MaSo = maPhieuDat,
            SoGiayTo = soGiayTo,
            MaChuyenBay = maChuyenBay,
            TinhTrang = ChuyenDoi.tinhTrangPhieuTuMa(tinhTrang)
        };
        return Ok(ChuyenDoi.thanhDanhSach(xlDatVe.timPhieuDat(tieuChi)));
    }

    [HttpGet("sap-het-han")]
    public IActionResult sapHetHan(int soLuong = 5)
    {
        return Ok(ChuyenDoi.thanhDanhSach(xlDatVe.laySapHetHan(soLuong)));
    }

    /// <summary>Sửa thông tin hành khách trên phiếu (UC05.3).</summary>
    [HttpPut("{ma}/hanh-khach")]
    public IActionResult suaHanhKhach(string ma, [FromBody] YeuCauHanhKhach yeuCau)
    {
        xlDatVe.suaPhieuDat(ma, ChuyenDoi.thanhHanhKhach(yeuCau));
        return NoContent();
    }

    /// <summary>Hủy phiếu theo yêu cầu của hành khách (UC05.4).</summary>
    [HttpPost("{ma}/huy")]
    public IActionResult huy(string ma)
    {
        xlDatVe.huyPhieuDat(ma);
        return NoContent();
    }

    /// <summary>Đếm số phiếu sẽ bị xóa để hỏi xác nhận (UC05.5 bước X2).</summary>
    [HttpGet("da-huy/dem")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult demDaHuy(string? truocNgay)
    {
        return Ok(new { soPhieu = xlDatVe.demPhieuDaHuy(docMoc(truocNgay)) });
    }

    /// <summary>Xóa hẳn các phiếu Đã hủy trước mốc và chưa chuyển thành vé (UC05.5, AT04).</summary>
    [HttpDelete("da-huy")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult xoaDaHuy(string? truocNgay)
    {
        return Ok(new { soDaXoa = xlDatVe.xoaPhieuDaHuy(docMoc(truocNgay)) });
    }

    private static DateTime docMoc(string? truocNgay)
    {
        return ChuyenDoi.docNgayGio(truocNgay, "truocNgay")
            ?? throw LoiNghiepVu.khongHopLe("truocNgay", "Chưa chọn mốc thời gian.");
    }
}
