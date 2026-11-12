using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Báo cáo doanh thu (UC07), chỉ Quản lý.</summary>
[ApiController]
[Authorize(Roles = VaiTro.QUAN_LY)]
[Route("api/bao-cao")]
public class BaoCaoController : ControllerBase
{
    private const string KIEU_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private const string KIEU_PDF = "application/pdf";

    private readonly XL_BaoCao xlBaoCao;

    public BaoCaoController(XL_BaoCao xlBaoCao)
    {
        this.xlBaoCao = xlBaoCao;
    }

    /// <summary>Báo cáo doanh thu bán vé các chuyến bay trong tháng (BM5.1).</summary>
    [HttpGet("thang")]
    public IActionResult baoCaoThang(int? thang, int? nam)
    {
        kiemTraThamSo(thang, nam, canThang: true);
        DataTable bang = xlBaoCao.lapBaoCaoThang(thang!.Value, nam!.Value, out int tongSoVe, out decimal tongDoanhThu);
        return Ok(new
        {
            thang,
            nam,
            soChuyenBay = bang.Rows.Count,
            tongSoVe,
            tongDoanhThu = ChuyenDoi.tien(tongDoanhThu),
            dong = ChuyenDoi.thanhDanhSach(bang)
        });
    }

    /// <summary>Báo cáo doanh thu năm theo từng tháng (BM5.2).</summary>
    [HttpGet("nam")]
    public IActionResult baoCaoNam(int? nam)
    {
        kiemTraThamSo(1, nam, canThang: false);
        DataTable bang = xlBaoCao.lapBaoCaoNam(nam!.Value, out decimal tongDoanhThu);
        return Ok(new
        {
            nam,
            tongDoanhThu = ChuyenDoi.tien(tongDoanhThu),
            dong = ChuyenDoi.thanhDanhSach(bang)
        });
    }

    [HttpGet("thang/xuat")]
    public IActionResult xuatBaoCaoThang(int? thang, int? nam, string? dinhDang = XL_BaoCao.EXCEL)
    {
        kiemTraThamSo(thang, nam, canThang: true);
        string loai = (dinhDang ?? XL_BaoCao.EXCEL).ToLowerInvariant();
        byte[] noiDung = xlBaoCao.xuatTapTinThang(thang!.Value, nam!.Value, loai);
        return taoTapTin(noiDung, loai, "bao_cao_thang_" + thang + "_" + nam);
    }

    [HttpGet("nam/xuat")]
    public IActionResult xuatBaoCaoNam(int? nam, string? dinhDang = XL_BaoCao.EXCEL)
    {
        kiemTraThamSo(1, nam, canThang: false);
        string loai = (dinhDang ?? XL_BaoCao.EXCEL).ToLowerInvariant();
        byte[] noiDung = xlBaoCao.xuatTapTinNam(nam!.Value, loai);
        return taoTapTin(noiDung, loai, "bao_cao_nam_" + nam);
    }

    private FileContentResult taoTapTin(byte[] noiDung, string dinhDang, string ten)
    {
        return dinhDang == XL_BaoCao.PDF
            ? File(noiDung, KIEU_PDF, ten + ".pdf")
            : File(noiDung, KIEU_XLSX, ten + ".xlsx");
    }

    private static void kiemTraThamSo(int? thang, int? nam, bool canThang)
    {
        var loi = new Dictionary<string, string>();
        if (canThang && thang == null) loi["thang"] = "Chưa chọn tháng.";
        if (nam == null) loi["nam"] = "Chưa chọn năm.";
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
    }
}
