using Microsoft.Extensions.DependencyInjection;
using QuanLyBanVe.Api;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

/// <summary>Đồng hồ đặt được thời điểm, thay cho Đồng hồ hệ thống khi kiểm thử.</summary>
public class DongHoGia : DongHoHeThong
{
    public DateTime BayGio { get; set; }

    public DongHoGia(DateTime bayGio)
    {
        BayGio = bayGio;
    }

    public override DateTime layThoiDiemHienTai() => BayGio;
}

/// <summary>
/// Lớp cha của các lớp kiểm thử tầng xử lý. Mỗi trường hợp kiểm thử bắt đầu với dữ liệu sạch,
/// thời điểm hiện tại là 09:00 ngày 12/11/2026 và gọi thẳng các lớp XL_ mà không cần giao diện (CN06).
/// </summary>
[Collection(NhomCoSoDuLieu.TEN)]
public abstract class KiemThuCoSo : IDisposable
{
    protected static readonly DateTime HOM_NAY = new(2026, 11, 12);

    protected readonly CoSoDuLieuThu csdl;
    protected readonly DongHoGia dongHo = new(HOM_NAY.AddHours(9));
    private readonly ServiceProvider nhaCungCap;
    private readonly List<IServiceScope> cacPhamVi = new();
    private readonly IServiceProvider mayChinh;

    protected KiemThuCoSo(CoSoDuLieuThu csdl)
    {
        this.csdl = csdl;
        csdl.lamSach();

        var dichVu = new ServiceCollection();
        dichVu.themTangXuLyVaTruyXuat(csdl.ChuoiKetNoi);
        dichVu.AddSingleton<DongHoHeThong>(dongHo);
        nhaCungCap = dichVu.BuildServiceProvider();
        mayChinh = taoMay();
    }

    /// <summary>Mỗi máy ứng với một yêu cầu riêng: có kết nối, giao dịch và phiên làm việc riêng.</summary>
    protected IServiceProvider taoMay()
    {
        IServiceScope phamVi = nhaCungCap.CreateScope();
        lock (cacPhamVi) cacPhamVi.Add(phamVi);
        return phamVi.ServiceProvider;
    }

    protected T lay<T>() where T : notnull => mayChinh.GetRequiredService<T>();

    /// <summary>Thêm thẳng một chuyến bay vào cơ sở dữ liệu, không qua kiểm tra của XL_ChuyenBay.</summary>
    protected void taoChuyenBay(string ma, DateTime ngayGio, decimal giaVe = 1_000_000m, int gheH1 = 2, int gheH2 = 3,
        string di = "SGN", string den = "HAN")
    {
        var dsGhe = new List<GheTheoHang>();
        if (gheH1 > 0) dsGhe.Add(new GheTheoHang(ma, "H1", gheH1));
        if (gheH2 > 0) dsGhe.Add(new GheTheoHang(ma, "H2", gheH2));
        lay<KetNoiCSDL>().thucHienTrongGiaoDich(() => lay<DAL_ChuyenBay>().themChuyenBay(
            new ChuyenBay(ma, giaVe, di, den, ngayGio, 60), dsGhe, new List<ChiTietTrungGian>()));
    }

    /// <summary>Hành khách hợp lệ thứ n: căn cước 12 chữ số khác nhau theo n.</summary>
    protected static HanhKhach khach(int n)
    {
        return new HanhKhach("", "Khách Thứ " + n, HanhKhach.CAN_CUOC, n.ToString("D12"), "09012345" + (n % 100).ToString("D2"));
    }

    protected static LoiNghiepVu batLoi(Action hanhDong)
    {
        return Assert.Throws<LoiNghiepVu>(hanhDong);
    }

    public void Dispose()
    {
        foreach (IServiceScope phamVi in cacPhamVi) phamVi.Dispose();
        nhaCungCap.Dispose();
        GC.SuppressFinalize(this);
    }
}
