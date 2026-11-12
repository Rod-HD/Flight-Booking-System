using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Thân phản hồi của mọi lỗi: mã lỗi, câu thông báo tiếng Việt và lỗi theo từng ô nhập.</summary>
public class PhanHoiLoi
{
    public string Ma { get; }
    public string ThongBao { get; }
    public Dictionary<string, string> ChiTiet { get; }

    public PhanHoiLoi(string ma, string thongBao, Dictionary<string, string>? chiTiet = null)
    {
        Ma = ma;
        ThongBao = thongBao;
        ChiTiet = chiTiet ?? new Dictionary<string, string>();
    }

    /// <summary>Ghi phản hồi lỗi dạng JSON cho các chỗ không đi qua Controller (xác thực, đường dẫn không có).</summary>
    public static Task ghi(HttpResponse phanHoi, int maTrangThai, string ma, string thongBao)
    {
        phanHoi.StatusCode = maTrangThai;
        return phanHoi.WriteAsJsonAsync(new PhanHoiLoi(ma, thongBao));
    }

    /// <summary>Đổi một ngoại lệ thành mã trạng thái HTTP và thân phản hồi lỗi.</summary>
    public static (int MaTrangThai, PhanHoiLoi NoiDung) tuNgoaiLe(Exception loi, ILogger nhatKy)
    {
        switch (loi)
        {
            case LoiNghiepVu nghiepVu:
                int maTrangThai = nghiepVu.Loai switch
                {
                    LoaiLoi.DuLieuKhongHopLe => StatusCodes.Status400BadRequest,
                    LoaiLoi.ChuaXacThuc => StatusCodes.Status401Unauthorized,
                    LoaiLoi.KhongCoQuyen => StatusCodes.Status403Forbidden,
                    LoaiLoi.KhongTimThay => StatusCodes.Status404NotFound,
                    _ => StatusCodes.Status409Conflict
                };
                return (maTrangThai, new PhanHoiLoi(nghiepVu.Ma, nghiepVu.Message, nghiepVu.ChiTiet));

            case LoiTrungDuLieu:
                return (StatusCodes.Status409Conflict, new PhanHoiLoi(MaLoi.TRUNG_MA, "Dữ liệu bị trùng với dữ liệu đã có."));

            case LoiRangBuocDuLieu or LoiTranhChap:
                return (StatusCodes.Status409Conflict, new PhanHoiLoi(MaLoi.DU_LIEU_DA_THAY_DOI,
                    "Dữ liệu vừa được thay đổi ở máy khác. Vui lòng tải lại và thử lại."));

            case LoiKetNoiCSDL:
                nhatKy.LogError(loi, "Khong ket noi duoc co so du lieu.");
                return (StatusCodes.Status503ServiceUnavailable, new PhanHoiLoi(MaLoi.LOI_HE_THONG,
                    "Không kết nối được cơ sở dữ liệu. Vui lòng thử lại sau."));

            case BadHttpRequestException yeuCauSai:
                return (yeuCauSai.StatusCode, new PhanHoiLoi(MaLoi.DU_LIEU_KHONG_HOP_LE, "Yêu cầu gửi lên không hợp lệ."));

            default:
                // không đưa chi tiết lỗi nội bộ ra ngoài, chỉ ghi vào nhật ký máy chủ
                nhatKy.LogError(loi, "Loi chua xu ly.");
                return (StatusCodes.Status500InternalServerError, new PhanHoiLoi(MaLoi.LOI_HE_THONG,
                    "Có lỗi hệ thống. Vui lòng thử lại."));
        }
    }
}

/// <summary>
/// Bộ lọc lỗi của các Controller: bắt ngoại lệ do tầng xử lý phát sinh và trả về đúng dạng
/// { ma, thongBao, chiTiet } (thay cho việc form bắt ngoại lệ rồi mở hộp thoại thông báo).
/// </summary>
public class BoLocLoi : IExceptionFilter
{
    private readonly ILogger<BoLocLoi> nhatKy;

    public BoLocLoi(ILogger<BoLocLoi> nhatKy)
    {
        this.nhatKy = nhatKy;
    }

    public void OnException(ExceptionContext nguCanh)
    {
        (int maTrangThai, PhanHoiLoi noiDung) = PhanHoiLoi.tuNgoaiLe(nguCanh.Exception, nhatKy);
        nguCanh.Result = new ObjectResult(noiDung) { StatusCode = maTrangThai };
        nguCanh.ExceptionHandled = true;
    }
}

/// <summary>Bắt các lỗi xảy ra ngoài Controller (ví dụ lúc kiểm tra cookie phiên) để vẫn trả về JSON đúng dạng.</summary>
public class BatLoiChung
{
    private readonly RequestDelegate buocKe;
    private readonly ILogger<BatLoiChung> nhatKy;

    public BatLoiChung(RequestDelegate buocKe, ILogger<BatLoiChung> nhatKy)
    {
        this.buocKe = buocKe;
        this.nhatKy = nhatKy;
    }

    public async Task InvokeAsync(HttpContext nguCanh)
    {
        try
        {
            await buocKe(nguCanh);
        }
        catch (Exception loi) when (!nguCanh.Response.HasStarted)
        {
            (int maTrangThai, PhanHoiLoi noiDung) = PhanHoiLoi.tuNgoaiLe(loi, nhatKy);
            nguCanh.Response.Clear();
            nguCanh.Response.StatusCode = maTrangThai;
            await nguCanh.Response.WriteAsJsonAsync(noiDung);
        }
    }
}
