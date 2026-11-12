using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;

namespace QuanLyBanVe.KiemThu;

/// <summary>Các phép tính của lớp DTO và tiện ích bảo mật, không cần cơ sở dữ liệu.</summary>
public class KiemThuDTO
{
    [Theory(DisplayName = "NV02 công thức (1.1): giá tiền = giá vé x tỉ lệ đơn giá, làm tròn đến đồng")]
    [InlineData(1_500_000, 105.00, 1_575_000)]
    [InlineData(1_500_000, 100.00, 1_500_000)]
    [InlineData(1_000_010, 105.00, 1_050_011)] // 1.050.010,5 làm tròn lên
    [InlineData(999_999, 105.00, 1_049_999)]   // 1.049.998,95 làm tròn lên
    [InlineData(1_000_004, 105.00, 1_050_004)] // 1.050.004,2 làm tròn xuống
    [InlineData(2_000_000, 87.50, 1_750_000)]
    public void TinhGiaTien(decimal giaVe, decimal tiLe, decimal mongDoi)
    {
        Assert.Equal(mongDoi, new HangVe("H", "Hạng", tiLe).tinhGiaTien(giaVe));
    }

    [Fact(DisplayName = "NV03 giả định 7: hạn thanh toán là 24 giờ sau lúc đặt khi mốc hủy còn xa")]
    public void HanThanhToan_24Gio()
    {
        var phieu = new PhieuDatCho { ThoiDiemDat = new DateTime(2026, 11, 12, 9, 0, 0) };
        DateTime han = phieu.hanThanhToan(new DateTime(2026, 11, 20, 6, 30, 0), 0);
        Assert.Equal(new DateTime(2026, 11, 13, 9, 0, 0), han);
    }

    [Fact(DisplayName = "NV03 giả định 7: hạn thanh toán là mốc hủy theo QĐ3 khi mốc này đến trước 24 giờ")]
    public void HanThanhToan_MocHuyDenTruoc()
    {
        var phieu = new PhieuDatCho { ThoiDiemDat = new DateTime(2026, 11, 12, 9, 0, 0) };
        // khởi hành ngày 13, thời gian hủy 0 ngày: phiếu bị hủy từ 0 giờ ngày 13
        Assert.Equal(new DateTime(2026, 11, 13), phieu.hanThanhToan(new DateTime(2026, 11, 13, 15, 0, 0), 0));
        // thời gian hủy 2 ngày: mốc hủy là 0 giờ ngày 13 với chuyến bay ngày 15
        Assert.Equal(new DateTime(2026, 11, 13), phieu.hanThanhToan(new DateTime(2026, 11, 15, 15, 0, 0), 2));
    }

    [Fact(DisplayName = "NV02 giả định 5: phiếu còn hạn khi Chờ thanh toán và chưa đến hạn thanh toán")]
    public void ConHan()
    {
        DateTime khoiHanh = new(2026, 11, 20, 6, 30, 0);
        var phieu = new PhieuDatCho { ThoiDiemDat = new DateTime(2026, 11, 12, 9, 0, 0) };

        Assert.True(phieu.conHan(new DateTime(2026, 11, 13, 8, 59, 59), khoiHanh, 0));
        Assert.False(phieu.conHan(new DateTime(2026, 11, 13, 9, 0, 0), khoiHanh, 0));

        phieu.TinhTrang = PhieuDatCho.DA_HUY;
        Assert.False(phieu.conHan(new DateTime(2026, 11, 12, 10, 0, 0), khoiHanh, 0));
    }

    [Fact(DisplayName = "BMT01: mật khẩu được băm PBKDF2 kèm muối ngẫu nhiên, không lưu mật khẩu gốc")]
    public void BamMatKhau()
    {
        string bam1 = TienIch_BaoMat.maHoa("Quanly@123");
        string bam2 = TienIch_BaoMat.maHoa("Quanly@123");

        Assert.StartsWith("PBKDF2-SHA256$", bam1);
        Assert.DoesNotContain("Quanly@123", bam1);
        Assert.NotEqual(bam1, bam2); // muối khác nhau nên chuỗi băm khác nhau
        Assert.True(bam1.Length <= 200);
        Assert.True(TienIch_BaoMat.kiemTraMatKhau("Quanly@123", bam1));
        Assert.True(TienIch_BaoMat.kiemTraMatKhau("Quanly@123", bam2));
        Assert.False(TienIch_BaoMat.kiemTraMatKhau("quanly@123", bam1));
        Assert.False(TienIch_BaoMat.kiemTraMatKhau("Quanly@123", "khong-phai-chuoi-bam"));
    }
}
