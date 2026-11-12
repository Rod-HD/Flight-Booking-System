using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Chuyến bay (UC03): tra cứu và xuất Excel cho mọi vai trò, các thao tác còn lại chỉ Quản lý.</summary>
[ApiController]
[Authorize]
[Route("api/chuyen-bay")]
public class ChuyenBayController : ControllerBase
{
    private const string KIEU_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private const long KICH_THUOC_TAP_TIN_TOI_DA = 5 * 1024 * 1024;

    private readonly XL_ChuyenBay xlChuyenBay;

    public ChuyenBayController(XL_ChuyenBay xlChuyenBay)
    {
        this.xlChuyenBay = xlChuyenBay;
    }

    /// <summary>Tra cứu chuyến bay theo BM4 (UC03.4).</summary>
    [HttpGet]
    public IActionResult traCuu(string? sanBayDi, string? sanBayDen, string? tuNgay, string? denNgay, string? maChuyenBay)
    {
        return Ok(ChuyenDoi.thanhDanhSach(xlChuyenBay.timKiem(taoTieuChi(sanBayDi, sanBayDen, tuNgay, denNgay, maChuyenBay))));
    }

    [HttpGet("sap-khoi-hanh")]
    public IActionResult sapKhoiHanh(int soLuong = 5)
    {
        return Ok(ChuyenDoi.thanhDanhSach(xlChuyenBay.laySapKhoiHanh(soLuong)));
    }

    [HttpGet("xuat-excel")]
    public IActionResult xuatExcel(string? sanBayDi, string? sanBayDen, string? tuNgay, string? denNgay, string? maChuyenBay)
    {
        byte[] noiDung = xlChuyenBay.xuatExcel(taoTieuChi(sanBayDi, sanBayDen, tuNgay, denNgay, maChuyenBay));
        return File(noiDung, KIEU_XLSX, "danh_sach_chuyen_bay.xlsx");
    }

    [HttpGet("mau-excel")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult taiTapTinMau()
    {
        return File(xlChuyenBay.taoTapTinMau(), KIEU_XLSX, "mau_lich_chuyen_bay.xlsx");
    }

    /// <summary>Nhận nhiều lịch chuyến bay từ tập tin Excel theo tập tin mẫu (TT01).</summary>
    [HttpPost("nhap-excel")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    [RequestSizeLimit(KICH_THUOC_TAP_TIN_TOI_DA + 64 * 1024)]
    public IActionResult nhapExcel(IFormFile? tapTin)
    {
        if (tapTin == null || tapTin.Length == 0)
            throw LoiNghiepVu.khongHopLe("tapTin", "Chưa chọn tập tin Excel.");
        if (tapTin.Length > KICH_THUOC_TAP_TIN_TOI_DA)
            throw LoiNghiepVu.khongHopLe("tapTin", "Tập tin không được lớn hơn 5 MB.");
        if (!tapTin.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            throw LoiNghiepVu.khongHopLe("tapTin", "Chỉ nhận tập tin Excel có đuôi .xlsx.");

        using Stream noiDung = tapTin.OpenReadStream();
        (int soDaThem, List<(int Dong, string LyDo)> dongLoi) = xlChuyenBay.nhapTuExcel(noiDung);
        return Ok(new { soDaThem, dongLoi = dongLoi.Select(loi => new { dong = loi.Dong, lyDo = loi.LyDo }) });
    }

    [HttpGet("{ma}")]
    public IActionResult layChiTiet(string ma)
    {
        ChuyenBay cb = xlChuyenBay.layThongTin(ma, out List<GheTheoHang> dsGhe, out List<ChiTietTrungGian> dsTrungGian,
            out Dictionary<string, int> soDaBanVaDat);
        xlChuyenBay.taiDuLieu(out List<SanBay> dsSanBay, out List<HangVe> dsHangVe);
        Dictionary<string, string> tenSanBay = dsSanBay.ToDictionary(sb => sb.MaSanBay, sb => sb.TenSanBay);

        return Ok(new
        {
            maChuyenBay = cb.MaChuyenBay,
            giaVe = ChuyenDoi.tien(cb.GiaVe),
            maSanBayDi = cb.MaSanBayDi,
            tenSanBayDi = tenSanBay.GetValueOrDefault(cb.MaSanBayDi),
            maSanBayDen = cb.MaSanBayDen,
            tenSanBayDen = tenSanBay.GetValueOrDefault(cb.MaSanBayDen),
            ngayGioKhoiHanh = cb.NgayGioKhoiHanh,
            thoiGianBay = cb.ThoiGianBay,
            // mỗi hạng vé một dòng như trên BM1; hạng chuyến bay không bán có số lượng ghế 0
            gheTheoHang = dsHangVe.Select(hang =>
            {
                int soLuongGhe = dsGhe.FirstOrDefault(g => g.MaHangVe == hang.MaHangVe)?.SoLuongGhe ?? 0;
                int daBanVaDat = soDaBanVaDat.GetValueOrDefault(hang.MaHangVe);
                return new
                {
                    maHangVe = hang.MaHangVe,
                    tenHangVe = hang.TenHangVe,
                    soLuongGhe,
                    // công thức (1.2): số ghế trống = số lượng ghế - số vé Đã bán - số phiếu Chờ thanh toán
                    soGheTrong = soLuongGhe - daBanVaDat,
                    soDaBanVaDat = daBanVaDat
                };
            }),
            trungGian = dsTrungGian.Select(t => new
            {
                thuTu = (int)t.ThuTu,
                maSanBay = t.MaSanBay,
                tenSanBay = tenSanBay.GetValueOrDefault(t.MaSanBay),
                thoiGianDung = t.ThoiGianDung,
                ghiChu = t.GhiChu
            })
        });
    }

    /// <summary>Nhận lịch chuyến bay theo BM1 (UC03.1).</summary>
    [HttpPost]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult them([FromBody] YeuCauChuyenBay yeuCau)
    {
        ChuyenBay cb = taoChuyenBay(yeuCau, out List<GheTheoHang> dsGhe, out List<ChiTietTrungGian> dsTrungGian);
        xlChuyenBay.themChuyenBay(cb, dsGhe, dsTrungGian);
        return StatusCode(StatusCodes.Status201Created, new { maChuyenBay = cb.MaChuyenBay });
    }

    [HttpPut("{ma}")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult sua(string ma, [FromBody] YeuCauChuyenBay yeuCau)
    {
        ChuyenBay cb = taoChuyenBay(yeuCau, out List<GheTheoHang> dsGhe, out List<ChiTietTrungGian> dsTrungGian);
        xlChuyenBay.suaChuyenBay(ma, cb, dsGhe, dsTrungGian);
        return NoContent();
    }

    [HttpDelete("{ma}")]
    [Authorize(Roles = VaiTro.QUAN_LY)]
    public IActionResult xoa(string ma)
    {
        xlChuyenBay.xoaChuyenBay(ma);
        return NoContent();
    }

    private static TieuChiTim taoTieuChi(string? sanBayDi, string? sanBayDen, string? tuNgay, string? denNgay, string? maChuyenBay)
    {
        return new TieuChiTim
        {
            MaSanBayDi = sanBayDi,
            MaSanBayDen = sanBayDen,
            TuNgay = ChuyenDoi.docNgayGio(tuNgay, "tuNgay"),
            DenNgay = ChuyenDoi.docNgayGio(denNgay, "denNgay"),
            MaChuyenBay = maChuyenBay
        };
    }

    /// <summary>Đổi thân yêu cầu thành ChuyenBay, danh sách GheTheoHang và danh sách ChiTietTrungGian.</summary>
    private static ChuyenBay taoChuyenBay(YeuCauChuyenBay yeuCau, out List<GheTheoHang> dsGhe, out List<ChiTietTrungGian> dsTrungGian)
    {
        var cb = new ChuyenBay(yeuCau.MaChuyenBay ?? "", yeuCau.GiaVe ?? 0, yeuCau.MaSanBayDi ?? "", yeuCau.MaSanBayDen ?? "",
            yeuCau.NgayGioKhoiHanh ?? default, yeuCau.ThoiGianBay ?? 0);
        dsGhe = (yeuCau.GheTheoHang ?? new List<YeuCauGheTheoHang>())
            .Select(g => new GheTheoHang(cb.MaChuyenBay, g.MaHangVe ?? "", g.SoLuongGhe ?? 0))
            .ToList();
        dsTrungGian = (yeuCau.TrungGian ?? new List<YeuCauTrungGian>())
            .Select(t => new ChiTietTrungGian(cb.MaChuyenBay, (byte)Math.Clamp(t.ThuTu ?? 0, 0, 255), t.MaSanBay ?? "",
                t.ThoiGianDung ?? -1, t.GhiChu))
            .ToList();
        return cb;
    }
}
