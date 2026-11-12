using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api;

/// <summary>Đăng ký các lớp của tầng xử lý, tầng truy xuất và tiện ích để máy chủ tự tạo cho mỗi yêu cầu.</summary>
public static class DangKyDichVu
{
    /// <summary>Tên chuỗi kết nối trong mục ConnectionStrings của cấu hình.</summary>
    public const string TEN_CHUOI_KET_NOI = "QLBANVE";

    /// <summary>Đăng ký với chuỗi kết nối đọc từ cấu hình của máy chủ.</summary>
    public static IServiceCollection themTangXuLyVaTruyXuat(this IServiceCollection dichVu)
    {
        return dichVu.themTangXuLyVaTruyXuat(nhaCungCap =>
            nhaCungCap.GetRequiredService<IConfiguration>().GetConnectionString(TEN_CHUOI_KET_NOI)
            ?? throw new InvalidOperationException("Chưa cấu hình chuỗi kết nối ConnectionStrings:" + TEN_CHUOI_KET_NOI + "."));
    }

    /// <summary>Đăng ký với một chuỗi kết nối cho trước (dùng khi kiểm thử).</summary>
    public static IServiceCollection themTangXuLyVaTruyXuat(this IServiceCollection dichVu, string chuoiKetNoi)
    {
        return dichVu.themTangXuLyVaTruyXuat(_ => chuoiKetNoi);
    }

    private static IServiceCollection themTangXuLyVaTruyXuat(this IServiceCollection dichVu,
        Func<IServiceProvider, string> layChuoiKetNoi)
    {
        // mỗi yêu cầu có kết nối, giao dịch và phiên làm việc riêng
        dichVu.AddScoped(nhaCungCap => new KetNoiCSDL(layChuoiKetNoi(nhaCungCap)));
        dichVu.AddScoped<PhienLamViec>();
        dichVu.AddSingleton<DongHoHeThong>();

        dichVu.AddScoped<DAL_SanBay>();
        dichVu.AddScoped<DAL_ChuyenBay>();
        dichVu.AddScoped<DAL_ChiTietTrungGian>();
        dichVu.AddScoped<DAL_HangVe>();
        dichVu.AddScoped<DAL_GheTheoHang>();
        dichVu.AddScoped<DAL_HanhKhach>();
        dichVu.AddScoped<DAL_Ve>();
        dichVu.AddScoped<DAL_PhieuDatCho>();
        dichVu.AddScoped<DAL_ThamSoQuyDinh>();
        dichVu.AddScoped<DAL_TaiKhoan>();

        dichVu.AddScoped<XL_DangNhap>();
        dichVu.AddScoped<XL_PhanQuyen>();
        dichVu.AddScoped<XL_ChuyenBay>();
        dichVu.AddScoped<XL_BanVe>();
        dichVu.AddScoped<XL_DatVe>();
        dichVu.AddScoped<XL_HuyPhieuDat>();
        dichVu.AddScoped<XL_BaoCao>();
        dichVu.AddScoped<XL_ThayDoiQD>();
        return dichVu;
    }
}
