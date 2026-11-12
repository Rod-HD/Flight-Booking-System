using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.TienIch;

/// <summary>
/// Dịch vụ nền đóng vai tác nhân Đồng hồ hệ thống của UC06: gọi XL_HuyPhieuDat.kichHoatDinhKy
/// ngay khi máy chủ khởi động và lặp lại sau mỗi chu kỳ (mặc định 15 phút, giả định 7).
/// </summary>
public class BoDinhThoi : BackgroundService
{
    private readonly int chuKy;
    private readonly bool bat;
    private readonly IServiceScopeFactory nhaMayPhamVi;
    private readonly ILogger<BoDinhThoi> nhatKyMayChu;

    public BoDinhThoi(IServiceScopeFactory nhaMayPhamVi, IConfiguration cauHinh, ILogger<BoDinhThoi> nhatKyMayChu)
    {
        this.nhaMayPhamVi = nhaMayPhamVi;
        this.nhatKyMayChu = nhatKyMayChu;
        chuKy = Math.Max(1, cauHinh.GetValue("BoDinhThoi:ChuKyPhut", 15));
        bat = cauHinh.GetValue("BoDinhThoi:Bat", true);
    }

    protected override async Task ExecuteAsync(CancellationToken dungLai)
    {
        // BoDinhThoi:Bat = false chỉ dùng khi kiểm thử, để việc hủy tự động không chen vào dữ liệu thử
        if (!bat) return;

        // nhường để máy chủ khởi động xong rồi mới chạy lần kiểm tra đầu tiên
        await Task.Yield();
        xuLyDenChuKy();

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(chuKy));
        try
        {
            while (await timer.WaitForNextTickAsync(dungLai))
                xuLyDenChuKy();
        }
        catch (OperationCanceledException)
        {
            // máy chủ đang dừng
        }
    }

    private void xuLyDenChuKy()
    {
        try
        {
            // mỗi lần kiểm tra dùng một phạm vi dịch vụ riêng, giống một yêu cầu của máy khách
            using IServiceScope phamVi = nhaMayPhamVi.CreateScope();
            var dongHo = phamVi.ServiceProvider.GetRequiredService<DongHoHeThong>();
            var xuLy = phamVi.ServiceProvider.GetRequiredService<XL_HuyPhieuDat>();
            int soPhieuDaHuy = xuLy.kichHoatDinhKy(dongHo.layThoiDiemHienTai());
            if (soPhieuDaHuy > 0)
                nhatKyMayChu.LogInformation("Tu dong huy {SoPhieu} phieu dat cho qua han.", soPhieuDaHuy);
        }
        catch (Exception loi)
        {
            // lỗi của một lần kiểm tra (ví dụ mất kết nối CSDL) không làm dừng bộ định thời
            nhatKyMayChu.LogError(loi, "Khong chay duoc lan kiem tra huy phieu dinh ky.");
        }
    }
}
