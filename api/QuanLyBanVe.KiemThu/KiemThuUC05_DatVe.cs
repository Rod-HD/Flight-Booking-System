using System.Data;
using Microsoft.Extensions.DependencyInjection;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC05_DatVe : KiemThuCoSo
{
    private static readonly DateTime KHOI_HANH = HOM_NAY.AddDays(8).AddHours(6.5); // 20/11/2026 06:30
    private readonly XL_DatVe xl;
    private readonly DAL_ChuyenBay dalChuyenBay;
    private readonly DAL_PhieuDatCho dalPhieu;

    public KiemThuUC05_DatVe(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_DatVe>();
        dalChuyenBay = lay<DAL_ChuyenBay>();
        dalPhieu = lay<DAL_PhieuDatCho>();
        taoChuyenBay("CB500", KHOI_HANH, giaVe: 1_500_000m, gheH1: 2, gheH2: 3);
    }

    [Fact(DisplayName = "NV03 UC05.1: lập phiếu Chờ thanh toán, cấp mã phiếu, giá tiền (1.1), hạn thanh toán 24 giờ, số ghế đặt tăng 1")]
    public void LapPhieuDatCho()
    {
        PhieuDatCho phieu = xl.datVe("CB500", "H1", khach(1), out DateTime hanThanhToan);

        Assert.Matches("^PD[0-9]{8}$", phieu.MaPhieuDat);
        Assert.Equal(1_575_000m, phieu.GiaTien);
        Assert.Equal(dongHo.BayGio, phieu.ThoiDiemDat);
        Assert.Equal(dongHo.BayGio.AddHours(24), hanThanhToan);

        PhieuDatCho daLuu = dalPhieu.layThongTinPhieu(phieu.MaPhieuDat)!;
        Assert.Equal(PhieuDatCho.CHO_THANH_TOAN, daLuu.TinhTrang);
        Assert.Equal(1, dalChuyenBay.laySoGheTrong("CB500", "H1"));
        Assert.Equal(1, dalChuyenBay.tinhSoGheDat("CB500"));
        Assert.Equal(1, csdl.dem("SELECT COUNT(*) FROM HANHKHACH"));
    }

    [Fact(DisplayName = "NV03 QĐ3: nhận đặt vé đến hết ngày trước ngày khởi hành, ngày khởi hành thì không")]
    public void QD3_ThoiHanDatVe()
    {
        taoChuyenBay("CB501", HOM_NAY.AddDays(1).AddHours(0.5)); // 00:30 ngày mai
        taoChuyenBay("CB502", HOM_NAY.AddHours(23));             // 23:00 hôm nay
        dongHo.BayGio = HOM_NAY.AddHours(23.5);                  // 23:30 hôm nay

        // còn 1 giờ nữa bay nhưng khác ngày lịch nên vẫn nhận đặt (giả định 6)
        xl.datVe("CB501", "H2", khach(1), out DateTime han);
        Assert.Equal(HOM_NAY.AddDays(1), han);

        dongHo.BayGio = HOM_NAY.AddHours(9);
        LoiNghiepVu loi = batLoi(() => xl.datVe("CB502", "H2", khach(2), out _));
        Assert.Equal(MaLoi.QUA_HAN_DAT_VE, loi.Ma);
        Assert.Equal("Đã quá thời hạn đặt vé: chỉ nhận đặt vé chậm nhất 1 ngày trước ngày khởi hành.", loi.Message);
        Assert.Equal(MaLoi.QUA_HAN_DAT_VE, batLoi(() => xl.kiemTraChuyenBay("CB502")).Ma);
    }

    [Fact(DisplayName = "TH06, HQ07: thời hạn đặt vé theo tham số đọc từ CSDL, thông báo kèm số ngày hiện hành")]
    public void QD3_DocThamSoMoiLanKiemTra()
    {
        taoChuyenBay("CB501", HOM_NAY.AddDays(2).AddHours(10));
        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianDatVeChamNhat", 3);

        LoiNghiepVu loi = batLoi(() => xl.datVe("CB501", "H2", khach(1), out _));
        Assert.Equal(MaLoi.QUA_HAN_DAT_VE, loi.Ma);
        Assert.Contains("chậm nhất 3 ngày", loi.Message);
        ThongTinBan thongTin = xl.layThongTinDat("CB501");
        Assert.False(thongTin.DuocPhep);
        Assert.Equal(MaLoi.QUA_HAN_DAT_VE, thongTin.MaLoi);

        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianDatVeChamNhat", 2);
        xl.datVe("CB501", "H2", khach(1), out _);
    }

    [Fact(DisplayName = "TH07 giả định 7: hạn thanh toán theo thời gian hủy đặt vé hiện hành")]
    public void HanThanhToanTheoThoiGianHuy()
    {
        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianDatVeChamNhat", 3);
        lay<XL_ThayDoiQD>().capNhatThamSo("ThoiGianHuyDatVe", 2);
        taoChuyenBay("CB501", HOM_NAY.AddDays(3).AddHours(10)); // khởi hành ngày 15, mốc hủy 0 giờ ngày 13

        xl.datVe("CB501", "H2", khach(1), out DateTime han);

        Assert.Equal(HOM_NAY.AddDays(1), han);
        Assert.Equal(han, xl.layThongTinDat("CB501").HanThanhToanDuKien);
    }

    [Fact(DisplayName = "NV03 ngoại lệ L5a, L2b: hạng vé hết chỗ, chuyến bay hết chỗ")]
    public void HetCho()
    {
        xl.datVe("CB500", "H1", khach(1), out _);
        lay<XL_BanVe>().banVe("CB500", "H1", khach(2));

        LoiNghiepVu hetHang = batLoi(() => xl.datVe("CB500", "H1", khach(3), out _));
        Assert.Equal(MaLoi.HET_CHO, hetHang.Ma);
        Assert.Equal("Hạng vé đã hết chỗ.", hetHang.Message);
        Assert.Equal(MaLoi.HET_CHO, batLoi(() => xl.kiemTraChoTrong("CB500", "H1")).Ma);

        for (int i = 3; i <= 5; i++) xl.datVe("CB500", "H2", khach(i), out _);
        LoiNghiepVu hetChuyen = batLoi(() => xl.kiemTraChuyenBay("CB500"));
        Assert.Equal("Chuyến bay đã hết chỗ.", hetChuyen.Message);
    }

    [Fact(DisplayName = "NV03 ngoại lệ L3a: thông tin hành khách sai định dạng thì không lưu phiếu")]
    public void ThongTinHanhKhachSai()
    {
        LoiNghiepVu loi = batLoi(() => xl.datVe("CB500", "H2", new HanhKhach("", "", HanhKhach.CAN_CUOC, "123", "abc"), out _));

        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Equal(new[] { "dienThoai", "hoTen", "soGiayTo" }, loi.ChiTiet.Keys.OrderBy(k => k));
        Assert.Equal(0, csdl.dem("SELECT COUNT(*) FROM PHIEUDATCHO"));
    }

    [Fact(DisplayName = "NV03 UC05.2: tra cứu phiếu theo mã phiếu, CCCD/hộ chiếu, chuyến bay, tình trạng; có hạn thanh toán")]
    public void TraCuuPhieu()
    {
        taoChuyenBay("CB501", KHOI_HANH.AddDays(1));
        PhieuDatCho phieu1 = xl.datVe("CB500", "H1", khach(1), out DateTime han1);
        PhieuDatCho phieu2 = xl.datVe("CB501", "H2", khach(1), out _);
        PhieuDatCho phieu3 = xl.datVe("CB500", "H2", khach(2), out _);
        xl.huyPhieuDat(phieu3.MaPhieuDat);

        Assert.Equal(3, xl.timPhieuDat(new TieuChiTim()).Rows.Count);
        DataTable choThanhToan = xl.timPhieuDat(new TieuChiTim { TinhTrang = PhieuDatCho.CHO_THANH_TOAN });
        Assert.Equal(2, choThanhToan.Rows.Count);
        DataRow dong = choThanhToan.Rows.Cast<DataRow>().Single(d => (string)d["MaPhieuDat"] == phieu1.MaPhieuDat);
        Assert.Equal(han1, dong["HanThanhToan"]);
        Assert.Equal("Khách Thứ 1", dong["HoTen"]);
        Assert.Equal("Hạng 1", dong["TenHangVe"]);
        Assert.Equal(1_575_000m, dong["GiaTien"]);

        Assert.Single(xl.timPhieuDat(new TieuChiTim { TinhTrang = PhieuDatCho.DA_HUY }).Rows);
        Assert.Single(xl.timPhieuDat(new TieuChiTim { MaSo = phieu2.MaPhieuDat }).Rows);
        Assert.Equal(2, xl.timPhieuDat(new TieuChiTim { SoGiayTo = khach(1).SoGiayTo }).Rows.Count);
        Assert.Equal(2, xl.timPhieuDat(new TieuChiTim { MaChuyenBay = "CB500" }).Rows.Count);
        Assert.Empty(xl.timPhieuDat(new TieuChiTim { MaSo = "PD99999999" }).Rows);
    }

    [Fact(DisplayName = "NV03: phiếu sắp hết hạn xếp theo hạn thanh toán, không gồm phiếu đã quá hạn hoặc đã hủy")]
    public void PhieuSapHetHan()
    {
        taoChuyenBay("CB501", HOM_NAY.AddDays(2).AddHours(7)); // mốc hủy 0 giờ ngày 14
        dongHo.BayGio = HOM_NAY.AddHours(8);
        PhieuDatCho som = xl.datVe("CB500", "H2", khach(1), out _);    // hạn 08:00 ngày 13
        dongHo.BayGio = HOM_NAY.AddHours(20);
        PhieuDatCho muon = xl.datVe("CB500", "H2", khach(2), out _);   // hạn 20:00 ngày 13
        PhieuDatCho theoMoc = xl.datVe("CB501", "H2", khach(3), out _); // hạn 20:00 ngày 13 theo 24 giờ
        PhieuDatCho daHuy = xl.datVe("CB500", "H1", khach(4), out _);
        xl.huyPhieuDat(daHuy.MaPhieuDat);

        DataTable ds = xl.laySapHetHan(5);
        Assert.Equal(3, ds.Rows.Count);
        Assert.Equal(som.MaPhieuDat, ds.Rows[0]["MaPhieuDat"]);
        Assert.Equal(new[] { muon.MaPhieuDat, theoMoc.MaPhieuDat }.OrderBy(m => m),
            ds.Rows.Cast<DataRow>().Skip(1).Select(d => (string)d["MaPhieuDat"]).OrderBy(m => m));
        Assert.Single(xl.laySapHetHan(1).Rows);

        dongHo.BayGio = HOM_NAY.AddDays(1).AddHours(9); // phiếu đầu đã quá 24 giờ nhưng chưa được hủy định kỳ
        Assert.Equal(2, xl.laySapHetHan(5).Rows.Count);
    }

    [Fact(DisplayName = "NV03 UC05.3: sửa phiếu chỉ sửa thông tin hành khách; giấy tờ thuộc người khác thì không lưu")]
    public void SuaPhieu()
    {
        PhieuDatCho phieu = xl.datVe("CB500", "H2", khach(1), out _);
        xl.datVe("CB500", "H2", khach(2), out _);

        xl.suaPhieuDat(phieu.MaPhieuDat, new HanhKhach("", "Trần Thị Sửa", HanhKhach.CAN_CUOC, "079099001234", "0987654321"));
        HanhKhach hk = lay<DAL_HanhKhach>().layHanhKhach(phieu.MaHanhKhach)!;
        Assert.Equal("Trần Thị Sửa", hk.HoTen);
        Assert.Equal("079099001234", hk.SoGiayTo);
        Assert.Equal("0987654321", hk.DienThoai);
        PhieuDatCho sauKhiSua = dalPhieu.layThongTinPhieu(phieu.MaPhieuDat)!;
        Assert.Equal("H2", sauKhiSua.MaHangVe);
        Assert.Equal(phieu.GiaTien, sauKhiSua.GiaTien);

        LoiNghiepVu loi = batLoi(() => xl.suaPhieuDat(phieu.MaPhieuDat, khach(2)));
        Assert.Equal(MaLoi.GIAY_TO_DA_THUOC_NGUOI_KHAC, loi.Ma);
        Assert.Equal("Số giấy tờ này đã thuộc một hành khách khác.", loi.Message);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.suaPhieuDat("PD99999999", khach(9))).Loai);
    }

    [Fact(DisplayName = "NV03 UC05.4, AT03: hủy phiếu chỉ đổi tình trạng sang Đã hủy, số ghế trống tăng 1")]
    public void HuyPhieu()
    {
        PhieuDatCho phieu = xl.datVe("CB500", "H1", khach(1), out _);
        Assert.Equal(1, dalChuyenBay.laySoGheTrong("CB500", "H1"));

        xl.huyPhieuDat(phieu.MaPhieuDat);

        Assert.Equal(PhieuDatCho.DA_HUY, dalPhieu.layThongTinPhieu(phieu.MaPhieuDat)!.TinhTrang);
        Assert.Equal(1, csdl.dem("SELECT COUNT(*) FROM PHIEUDATCHO"));
        Assert.Equal(2, dalChuyenBay.laySoGheTrong("CB500", "H1"));
    }

    [Fact(DisplayName = "NV03 ngoại lệ S3b, H2a: phiếu đã chuyển sang Đã hủy thì không sửa, không hủy lại được")]
    public void PhieuDaBiHuy()
    {
        PhieuDatCho phieu = xl.datVe("CB500", "H1", khach(1), out _);
        taoMay().GetRequiredService<XL_DatVe>().huyPhieuDat(phieu.MaPhieuDat);

        Assert.Equal(MaLoi.DU_LIEU_DA_THAY_DOI, batLoi(() => xl.huyPhieuDat(phieu.MaPhieuDat)).Ma);
        Assert.Equal(MaLoi.DU_LIEU_DA_THAY_DOI, batLoi(() => xl.suaPhieuDat(phieu.MaPhieuDat, khach(1))).Ma);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.huyPhieuDat("PD99999999")).Loai);
    }

    [Fact(DisplayName = "AT04 UC05.5: xóa hẳn phiếu Đã hủy đặt trước mốc, giữ phiếu đã thành vé và phiếu Chờ thanh toán")]
    public void XoaPhieuDaHuy()
    {
        dongHo.BayGio = HOM_NAY.AddDays(-10).AddHours(9);
        PhieuDatCho huyCu = xl.datVe("CB500", "H2", khach(1), out _);
        xl.huyPhieuDat(huyCu.MaPhieuDat);
        PhieuDatCho thanhVe = xl.datVe("CB500", "H2", khach(2), out _);
        Ve ve = lay<XL_BanVe>().banVeTuPhieu(thanhVe.MaPhieuDat);

        dongHo.BayGio = HOM_NAY.AddHours(9);
        PhieuDatCho huyMoi = xl.datVe("CB500", "H1", khach(3), out _);
        xl.huyPhieuDat(huyMoi.MaPhieuDat);
        PhieuDatCho dangCho = xl.datVe("CB500", "H1", khach(4), out _);

        DateTime moc = HOM_NAY.AddDays(-1);
        Assert.Equal(1, xl.demPhieuDaHuy(moc));
        Assert.Equal(1, xl.xoaPhieuDaHuy(moc));

        Assert.Null(dalPhieu.layThongTinPhieu(huyCu.MaPhieuDat));
        Assert.NotNull(dalPhieu.layThongTinPhieu(thanhVe.MaPhieuDat));  // vé còn tham chiếu mã phiếu
        Assert.Equal(thanhVe.MaPhieuDat, lay<DAL_Ve>().layVe(ve.MaVe)!.MaPhieuDat);
        Assert.NotNull(dalPhieu.layThongTinPhieu(huyMoi.MaPhieuDat));   // đặt sau mốc
        Assert.Equal(PhieuDatCho.CHO_THANH_TOAN, dalPhieu.layThongTinPhieu(dangCho.MaPhieuDat)!.TinhTrang);
        Assert.Equal(0, xl.demPhieuDaHuy(moc));
        Assert.Equal(0, xl.xoaPhieuDaHuy(moc));

        // mốc sau hôm nay: xóa thêm phiếu vừa hủy, vẫn không xóa phiếu Chờ thanh toán và phiếu đã thành vé
        Assert.Equal(1, xl.xoaPhieuDaHuy(HOM_NAY.AddDays(1)));
        Assert.Equal(2, csdl.dem("SELECT COUNT(*) FROM PHIEUDATCHO"));
    }
}
