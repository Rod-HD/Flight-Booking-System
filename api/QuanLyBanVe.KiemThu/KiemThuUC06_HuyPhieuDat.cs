using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC06_HuyPhieuDat : KiemThuCoSo
{
    private readonly XL_HuyPhieuDat xl;
    private readonly XL_DatVe xlDatVe;
    private readonly DAL_PhieuDatCho dalPhieu;

    public KiemThuUC06_HuyPhieuDat(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_HuyPhieuDat>();
        xlDatVe = lay<XL_DatVe>();
        dalPhieu = lay<DAL_PhieuDatCho>();
    }

    private string tinhTrang(PhieuDatCho phieu) => dalPhieu.layThongTinPhieu(phieu.MaPhieuDat)!.TinhTrang;

    [Fact(DisplayName = "NV03 giả định 7: phiếu Chờ thanh toán quá 24 giờ bị hủy, phiếu chưa quá 24 giờ được giữ")]
    public void HuyPhieuQua24Gio()
    {
        taoChuyenBay("CB500", HOM_NAY.AddDays(8).AddHours(7), gheH1: 0, gheH2: 5);
        dongHo.BayGio = HOM_NAY.AddHours(8);
        PhieuDatCho cu = xlDatVe.datVe("CB500", "H2", khach(1), out _);
        dongHo.BayGio = HOM_NAY.AddHours(8).AddMinutes(1);
        PhieuDatCho moi = xlDatVe.datVe("CB500", "H2", khach(2), out _);
        Assert.Equal(3, lay<DAL_ChuyenBay>().laySoGheTrong("CB500", "H2"));

        Assert.Equal(0, xl.kichHoatDinhKy(HOM_NAY.AddDays(1).AddHours(8).AddSeconds(-1)));
        int soDaHuy = xl.kichHoatDinhKy(HOM_NAY.AddDays(1).AddHours(8));

        Assert.Equal(1, soDaHuy);
        Assert.Equal(PhieuDatCho.DA_HUY, tinhTrang(cu));
        Assert.Equal(PhieuDatCho.CHO_THANH_TOAN, tinhTrang(moi));
        // AT03: phiếu chỉ đổi tình trạng, chỗ được trả lại theo công thức (1.2)
        Assert.Equal(2, csdl.dem("SELECT COUNT(*) FROM PHIEUDATCHO"));
        Assert.Equal(4, lay<DAL_ChuyenBay>().laySoGheTrong("CB500", "H2"));
    }

    [Fact(DisplayName = "NV03 QĐ3: đến ngày khởi hành mọi phiếu chưa thanh toán của chuyến bay bị hủy")]
    public void HuyPhieuDenNgayKhoiHanh()
    {
        taoChuyenBay("CB501", HOM_NAY.AddDays(1).AddHours(18)); // khởi hành 18:00 ngày 13
        taoChuyenBay("CB502", HOM_NAY.AddDays(2).AddHours(6));  // khởi hành ngày 14
        dongHo.BayGio = HOM_NAY.AddHours(22);
        PhieuDatCho denHan1 = xlDatVe.datVe("CB501", "H1", khach(1), out _);
        PhieuDatCho denHan2 = xlDatVe.datVe("CB501", "H2", khach(2), out _);
        PhieuDatCho chuaDenHan = xlDatVe.datVe("CB502", "H2", khach(3), out _);

        Assert.Equal(0, xl.kichHoatDinhKy(HOM_NAY.AddHours(23.9)));
        // 0 giờ 5 phút ngày khởi hành: phiếu mới đặt 2 giờ trước vẫn bị hủy theo mốc của QĐ3
        int soDaHuy = xl.kichHoatDinhKy(HOM_NAY.AddDays(1).AddMinutes(5));

        Assert.Equal(2, soDaHuy);
        Assert.Equal(PhieuDatCho.DA_HUY, tinhTrang(denHan1));
        Assert.Equal(PhieuDatCho.DA_HUY, tinhTrang(denHan2));
        Assert.Equal(PhieuDatCho.CHO_THANH_TOAN, tinhTrang(chuaDenHan));
    }

    [Fact(DisplayName = "TH07: mốc hủy theo tham số thời gian hủy đặt vé đọc từ CSDL")]
    public void HuyTheoThamSoThoiGianHuy()
    {
        taoChuyenBay("CB501", HOM_NAY.AddDays(3).AddHours(6)); // khởi hành ngày 15
        dongHo.BayGio = HOM_NAY.AddHours(22);
        PhieuDatCho phieu = xlDatVe.datVe("CB501", "H2", khach(1), out _);

        // thời gian hủy 0 ngày: 0 giờ 5 phút ngày 13 chưa đến mốc
        Assert.Equal(0, xl.kichHoatDinhKy(HOM_NAY.AddDays(1).AddMinutes(5)));

        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianDatVeChamNhat", 3);
        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianHuyDatVe", 2); // mốc hủy là 0 giờ ngày 13
        Assert.Equal(1, xl.kichHoatDinhKy(HOM_NAY.AddDays(1).AddMinutes(5)));
        Assert.Equal(PhieuDatCho.DA_HUY, tinhTrang(phieu));
    }

    [Fact(DisplayName = "UC06 bước 5, luồng 5a: chỉ ghi nhật ký khi có phiếu bị hủy, kèm thời điểm và số phiếu")]
    public void GhiNhatKy()
    {
        taoChuyenBay("CB500", HOM_NAY.AddDays(8), gheH1: 0, gheH2: 5);
        dongHo.BayGio = HOM_NAY.AddHours(8);
        xlDatVe.datVe("CB500", "H2", khach(1), out _);
        xlDatVe.datVe("CB500", "H2", khach(2), out _);

        xl.kichHoatDinhKy(HOM_NAY.AddHours(9));
        Assert.False(File.Exists(csdl.TapTinNhatKy));
        Assert.Empty(xl.layThongBao(20));

        DateTime lanChay = HOM_NAY.AddDays(1).AddHours(8).AddMinutes(15);
        Assert.Equal(2, xl.kichHoatDinhKy(lanChay));
        // chạy lại (hoặc máy khác cùng chạy): phiếu không bị hủy hai lần, không ghi thêm nhật ký
        Assert.Equal(0, xl.kichHoatDinhKy(lanChay.AddMinutes(15)));

        string[] cacDong = File.ReadAllLines(csdl.TapTinNhatKy);
        Assert.Single(cacDong);
        Assert.Equal("2026-11-13 08:15:00 | Hệ thống đã tự động hủy 2 phiếu đặt chỗ quá hạn.", cacDong[0]);
        (DateTime thoiDiem, string noiDung) = Assert.Single(xl.layThongBao(20));
        Assert.Equal(lanChay, thoiDiem);
        Assert.Contains("2 phiếu", noiDung);
    }

    [Fact(DisplayName = "HQ04: một lần kiểm tra hủy xong 1.000 phiếu đến hạn trong không quá 10 giây")]
    public void Huy1000PhieuTrong10Giay()
    {
        taoChuyenBay("CB500", HOM_NAY.AddDays(8), gheH1: 0, gheH2: 2000);
        csdl.thucThi(@"
            INSERT INTO HANHKHACH (HoTen, LoaiGiayTo, SoGiayTo, DienThoai)
            SELECT TOP (1000) N'Khách', N'Căn cước', RIGHT('000000000000' + CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS varchar(12)), 12), '0901234567'
            FROM sys.all_objects a CROSS JOIN sys.all_objects b;
            INSERT INTO PHIEUDATCHO (MaChuyenBay, MaHanhKhach, MaHangVe, GiaTien, ThoiDiemDat)
            SELECT 'CB500', MaHanhKhach, 'H2', 1000000, '2026-11-10T08:00:00' FROM HANHKHACH;");

        var dongHoBam = System.Diagnostics.Stopwatch.StartNew();
        int soDaHuy = xl.kichHoatDinhKy(HOM_NAY.AddHours(9));
        dongHoBam.Stop();

        Assert.Equal(1000, soDaHuy);
        Assert.True(dongHoBam.Elapsed < TimeSpan.FromSeconds(10), "Mất " + dongHoBam.Elapsed.TotalSeconds + " giây");
        Assert.Equal(0, csdl.dem("SELECT COUNT(*) FROM PHIEUDATCHO WHERE TinhTrang = N'Chờ thanh toán'"));
    }
}
