using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using QuanLyBanVe.Api;
using QuanLyBanVe.Api.GiaoTiep;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.XuLy;

var builder = WebApplication.CreateBuilder(args);

builder.Services.themTangXuLyVaTruyXuat();

builder.Services
    .AddControllers(tuyChon => tuyChon.Filters.Add<BoLocLoi>())
    .AddJsonOptions(tuyChon =>
    {
        tuyChon.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        tuyChon.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString;
        tuyChon.JsonSerializerOptions.Converters.Add(new BoChuyenNgayGio());
    })
    .ConfigureApiBehaviorOptions(tuyChon =>
    {
        // thân yêu cầu sai kiểu dữ liệu cũng trả lỗi đúng dạng { ma, thongBao, chiTiet }
        tuyChon.InvalidModelStateResponseFactory = nguCanh =>
        {
            var chiTiet = new Dictionary<string, string>();
            foreach (var muc in nguCanh.ModelState.Where(muc => muc.Value?.Errors.Count > 0))
            {
                string ten = muc.Key.Split('.').Last().TrimStart('$');
                chiTiet[ten.Length == 0 ? "yeuCau" : ChuyenDoi.tenCamelCase(ten)] = "Giá trị không hợp lệ.";
            }
            return new BadRequestObjectResult(new PhanHoiLoi(MaLoi.DU_LIEU_KHONG_HOP_LE, "Dữ liệu gửi lên không hợp lệ.", chiTiet));
        };
    });

builder.Services.themXacThucCookie();

string[] nguonChoPhep = builder.Configuration.GetSection("Cors:NguonChoPhep").Get<string[]>()
    ?? new[] { "http://localhost:5173" };
builder.Services.AddCors(tuyChon => tuyChon.AddDefaultPolicy(chinhSach => chinhSach
    .WithOrigins(nguonChoPhep)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
    .WithExposedHeaders("Content-Disposition")));

builder.Services.AddHostedService<BoDinhThoi>();

var app = builder.Build();

string thuMucNhatKy = Path.Combine(app.Environment.ContentRootPath, app.Configuration["NhatKy:ThuMuc"] ?? "nhat_ky");
TienIch_NhatKy.datDuongDan(Path.Combine(thuMucNhatKy, "huy_phieu_tu_dong.log"));

taoTaiKhoanBanDau(app);

app.UseMiddleware<BatLoiChung>();
// đường dẫn không có hoặc sai phương thức cũng trả JSON đúng dạng lỗi
app.UseStatusCodePages(nguCanh =>
{
    HttpResponse phanHoi = nguCanh.HttpContext.Response;
    return phanHoi.StatusCode == StatusCodes.Status404NotFound
        ? PhanHoiLoi.ghi(phanHoi, phanHoi.StatusCode, MaLoi.KHONG_TIM_THAY, "Không tìm thấy đường dẫn.")
        : PhanHoiLoi.ghi(phanHoi, phanHoi.StatusCode, MaLoi.DU_LIEU_KHONG_HOP_LE, "Yêu cầu không hợp lệ.");
});
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Lần chạy đầu, bảng TAIKHOAN còn rỗng thì tạo các tài khoản ban đầu khai báo ở mục TaiKhoanBanDau của cấu hình.
static void taoTaiKhoanBanDau(WebApplication app)
{
    var danhSach = new List<(string, string, string, bool)>();
    foreach (IConfigurationSection muc in app.Configuration.GetSection("TaiKhoanBanDau").GetChildren())
    {
        string? tenDangNhap = muc["TenDangNhap"];
        string? matKhau = muc["MatKhau"];
        string? nhomQuyen = ChuyenDoi.nhomQuyenTuMa(muc["NhomQuyen"]);
        if (string.IsNullOrWhiteSpace(tenDangNhap) || string.IsNullOrEmpty(matKhau) || nhomQuyen == null) continue;
        danhSach.Add((tenDangNhap, matKhau, nhomQuyen, muc.GetValue("DaKhoa", false)));
    }
    if (danhSach.Count == 0) return;

    try
    {
        using IServiceScope phamVi = app.Services.CreateScope();
        int soDaTao = phamVi.ServiceProvider.GetRequiredService<XL_PhanQuyen>().taoTaiKhoanBanDau(danhSach);
        if (soDaTao > 0) app.Logger.LogInformation("Da tao {SoTaiKhoan} tai khoan ban dau.", soDaTao);
    }
    catch (Exception loi)
    {
        app.Logger.LogError(loi, "Khong tao duoc tai khoan ban dau. Kiem tra chuoi ket noi va da chay script trong thu muc db chua.");
    }
}

// để dự án kiểm thử khởi động được máy chủ trong bộ nhớ
public partial class Program { }
