using System.Collections.Concurrent;
using System.Data;
using Microsoft.Extensions.DependencyInjection;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC04_BanVe : KiemThuCoSo
{
    private static readonly DateTime KHOI_HANH = HOM_NAY.AddDays(8).AddHours(6.5); // 20/11/2026 06:30
    private readonly XL_BanVe xl;
    private readonly XL_DatVe xlDatVe;
    private readonly DAL_ChuyenBay dalChuyenBay;

    public KiemThuUC04_BanVe(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_BanVe>();
        xlDatVe = lay<XL_DatVe>();
        dalChuyenBay = lay<DAL_ChuyenBay>();
        taoChuyenBay("CB500", KHOI_HANH, giaVe: 1_500_000m, gheH1: 2, gheH2: 3);
    }

    [Fact(DisplayName = "NV02 UC04.1: bán vé trực tiếp lưu vé Đã bán, cấp mã vé, giá tiền theo công thức (1.1), số ghế trống giảm 1")]
    public void BanVeTrucTiep()
    {
        Ve veHang1 = xl.banVe("CB500", "H1", khach(1));
        Ve veHang2 = xl.banVe("cb500", "h2", khach(2));

        Assert.Matches("^VE[0-9]{8}$", veHang1.MaVe);
        Assert.Equal(1_575_000m, veHang1.GiaTien); // 105% của 1.500.000
        Assert.Equal(1_500_000m, veHang2.GiaTien); // 100%
        Assert.Equal(dongHo.BayGio, veHang1.NgayBan);

        Ve daLuu = lay<DAL_Ve>().layVe(veHang1.MaVe)!;
        Assert.Equal(Ve.DA_BAN, daLuu.TinhTrang);
        Assert.Null(daLuu.MaPhieuDat);
        Assert.Equal(1, dalChuyenBay.laySoGheTrong("CB500", "H1"));
        Assert.Equal(2, dalChuyenBay.laySoGheTrong("CB500", "H2"));
        Assert.Equal(3, dalChuyenBay.tongSoGheTrong("CB500"));
    }

    [Fact(DisplayName = "NV02 bước B8: hành khách chưa có thì được lưu, đã có theo giấy tờ thì dùng lại")]
    public void LuuHanhKhachNeuChuaCo()
    {
        taoChuyenBay("CB501", KHOI_HANH.AddDays(1));
        Ve ve1 = xl.banVe("CB500", "H2", khach(1));
        Ve ve2 = xl.banVe("CB501", "H2", khach(1));

        Assert.Equal(ve1.MaHanhKhach, ve2.MaHanhKhach);
        Assert.Matches("^HK[0-9]{8}$", ve1.MaHanhKhach);
        Assert.Equal(1, csdl.dem("SELECT COUNT(*) FROM HANHKHACH"));
    }

    [Fact(DisplayName = "NV02 QĐ2 ngoại lệ B5a: hạng vé đã hết chỗ thì không bán, hạng khác vẫn bán được")]
    public void HangVeHetCho()
    {
        xl.banVe("CB500", "H1", khach(1));
        xl.banVe("CB500", "H1", khach(2));

        LoiNghiepVu loi = batLoi(() => xl.banVe("CB500", "H1", khach(3)));
        Assert.Equal(MaLoi.HET_CHO, loi.Ma);
        Assert.Equal("Hạng vé đã hết chỗ.", loi.Message);
        Assert.Equal(MaLoi.HET_CHO, batLoi(() => xl.kiemTraChoTrong("CB500", "H1")).Ma);

        xl.banVe("CB500", "H2", khach(3));
        Assert.Equal(1_500_000m, xl.kiemTraChoTrong("CB500", "H2"));
    }

    [Fact(DisplayName = "NV02 giả định 2: phiếu Chờ thanh toán cũng giữ chỗ, hết chỗ thì không bán")]
    public void PhieuChoThanhToanGiuCho()
    {
        xl.banVe("CB500", "H1", khach(1));
        xlDatVe.datVe("CB500", "H1", khach(2), out _);

        Assert.Equal(MaLoi.HET_CHO, batLoi(() => xl.banVe("CB500", "H1", khach(3))).Ma);
    }

    [Fact(DisplayName = "NV02 ngoại lệ B2a: chuyến bay hết chỗ ở mọi hạng")]
    public void ChuyenBayHetCho()
    {
        for (int i = 1; i <= 2; i++) xl.banVe("CB500", "H1", khach(i));
        Assert.Equal(3, xl.kiemTraChuyenBay("CB500"));
        for (int i = 3; i <= 5; i++) xl.banVe("CB500", "H2", khach(i));

        LoiNghiepVu loi = batLoi(() => xl.kiemTraChuyenBay("CB500"));
        Assert.Equal(MaLoi.HET_CHO, loi.Ma);
        Assert.Equal("Chuyến bay đã hết chỗ.", loi.Message);

        ThongTinBan thongTin = xl.layThongTinBan("CB500");
        Assert.False(thongTin.DuocPhep);
        Assert.Equal(MaLoi.HET_CHO, thongTin.MaLoi);
        Assert.Equal(0, thongTin.TongSoGheTrong);
    }

    [Fact(DisplayName = "NV02 giả định 13 ngoại lệ B2b: không bán vé cho chuyến bay đã khởi hành")]
    public void ChuyenBayDaKhoiHanh()
    {
        dongHo.BayGio = KHOI_HANH; // đúng giờ khởi hành

        LoiNghiepVu loi = batLoi(() => xl.banVe("CB500", "H2", khach(1)));
        Assert.Equal(MaLoi.CHUYEN_BAY_DA_KHOI_HANH, loi.Ma);
        Assert.Equal("Không bán vé cho chuyến bay đã khởi hành.", loi.Message);
        Assert.Equal(MaLoi.CHUYEN_BAY_DA_KHOI_HANH, xl.layThongTinBan("CB500").MaLoi);

        dongHo.BayGio = KHOI_HANH.AddSeconds(-1); // còn 1 giây vẫn bán được
        xl.banVe("CB500", "H2", khach(1));
    }

    [Fact(DisplayName = "NV02: thông tin bán của chuyến bay gồm số ghế trống (1.2) và giá tiền (1.1) từng hạng")]
    public void ThongTinBan()
    {
        xl.banVe("CB500", "H2", khach(1));

        ThongTinBan thongTin = xl.layThongTinBan("CB500");

        Assert.True(thongTin.DuocPhep);
        Assert.Null(thongTin.MaLoi);
        Assert.Equal(4, thongTin.TongSoGheTrong);
        Assert.Equal(new[] { "H1", "H2" }, thongTin.Hang.Select(h => h.MaHangVe));
        Assert.Equal(new[] { 2, 2 }, thongTin.Hang.Select(h => h.SoGheTrong));
        Assert.Equal(new[] { 1_575_000m, 1_500_000m }, thongTin.Hang.Select(h => h.GiaTien));
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.layThongTinBan("KHONGCO")).Loai);
    }

    [Fact(DisplayName = "NV02 giả định 9, 10 ngoại lệ B3a: họ tên trống, giấy tờ hoặc điện thoại sai định dạng")]
    public void ThongTinHanhKhachSai()
    {
        void kiemTra(HanhKhach hk, string truong)
        {
            LoiNghiepVu loi = batLoi(() => xl.banVe("CB500", "H2", hk));
            Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
            Assert.Contains(truong, loi.ChiTiet.Keys);
        }
        kiemTra(new HanhKhach("", " ", HanhKhach.CAN_CUOC, "012345678901", "0901234567"), "hoTen");
        kiemTra(new HanhKhach("", "An", HanhKhach.CAN_CUOC, "01234567890", "0901234567"), "soGiayTo");   // 11 chữ số
        kiemTra(new HanhKhach("", "An", HanhKhach.CAN_CUOC, "01234567890A", "0901234567"), "soGiayTo");  // có chữ
        kiemTra(new HanhKhach("", "An", HanhKhach.HO_CHIEU, "B1234", "0901234567"), "soGiayTo");         // 5 ký tự
        kiemTra(new HanhKhach("", "An", HanhKhach.HO_CHIEU, "B12-3456", "0901234567"), "soGiayTo");      // ký tự lạ
        kiemTra(new HanhKhach("", "An", HanhKhach.CAN_CUOC, "012345678901", "0901234"), "dienThoai");    // 7 chữ số
        kiemTra(new HanhKhach("", "An", HanhKhach.CAN_CUOC, "012345678901", "09012345678901234"), "dienThoai");
        kiemTra(new HanhKhach("", "An", HanhKhach.CAN_CUOC, "012345678901", "0901 234 567"), "dienThoai");
        kiemTra(new HanhKhach("", "An", "CMND", "012345678901", "0901234567"), "loaiGiayTo");
        Assert.Equal(0, csdl.dem("SELECT COUNT(*) FROM VE") + csdl.dem("SELECT COUNT(*) FROM HANHKHACH"));

        // hộ chiếu và điện thoại có mã quốc gia hợp lệ
        Ve ve = xl.banVe("CB500", "H2", new HanhKhach("", "Kim Min Jun", HanhKhach.HO_CHIEU, "m12345678", "+821012345678"));
        Assert.Equal("M12345678", csdl.docGiaTri("SELECT SoGiayTo FROM HANHKHACH"));
        Assert.NotNull(ve.MaVe);
    }

    [Fact(DisplayName = "NV02 UC04.2: bán vé từ phiếu lấy giá ghi trên phiếu, lưu mã phiếu, hủy phiếu, số ghế trống không đổi")]
    public void BanVeTuPhieu()
    {
        PhieuDatCho phieu = xlDatVe.datVe("CB500", "H1", khach(1), out _);
        // giá vé chuyến bay được sửa sau khi đặt: vé vẫn lấy giá tiền đã ghi trên phiếu (giả định 3)
        csdl.thucThi("UPDATE CHUYENBAY SET GiaVe = 2000000 WHERE MaChuyenBay = 'CB500'");
        int gheTrongTruoc = dalChuyenBay.laySoGheTrong("CB500", "H1");
        dongHo.BayGio = dongHo.BayGio.AddHours(5);

        Ve ve = xl.banVeTuPhieu(phieu.MaPhieuDat);

        Assert.Equal(1_575_000m, ve.GiaTien);
        Assert.Equal(phieu.MaPhieuDat, ve.MaPhieuDat);
        Assert.Equal(phieu.MaHanhKhach, ve.MaHanhKhach);
        Assert.Equal(dongHo.BayGio, ve.NgayBan);
        Assert.Equal(Ve.DA_BAN, lay<DAL_Ve>().layVe(ve.MaVe)!.TinhTrang);
        Assert.Equal(PhieuDatCho.DA_HUY, lay<DAL_PhieuDatCho>().layThongTinPhieu(phieu.MaPhieuDat)!.TinhTrang);
        Assert.Equal(gheTrongTruoc, dalChuyenBay.laySoGheTrong("CB500", "H1"));
    }

    [Fact(DisplayName = "NV02 giả định 5: mỗi phiếu chỉ chuyển thành nhiều nhất một vé")]
    public void PhieuChiThanhMotVe()
    {
        PhieuDatCho phieu = xlDatVe.datVe("CB500", "H2", khach(1), out _);
        xl.banVeTuPhieu(phieu.MaPhieuDat);

        Assert.Equal(MaLoi.PHIEU_HET_HAN, batLoi(() => xl.banVeTuPhieu(phieu.MaPhieuDat)).Ma);
        Assert.Equal(1, csdl.dem("SELECT COUNT(*) FROM VE"));
    }

    [Fact(DisplayName = "NV02 ngoại lệ P2a: phiếu quá 24 giờ không bán được dù lần kiểm tra định kỳ chưa kịp hủy")]
    public void PhieuQua24Gio()
    {
        PhieuDatCho phieu = xlDatVe.datVe("CB500", "H2", khach(1), out _);

        dongHo.BayGio = phieu.ThoiDiemDat.AddHours(24).AddSeconds(-1);
        Assert.Single(xl.timPhieuDat(null, null, phieu.MaPhieuDat).Rows);

        dongHo.BayGio = phieu.ThoiDiemDat.AddHours(24);
        Assert.Empty(xl.timPhieuDat(null, null, phieu.MaPhieuDat).Rows);
        LoiNghiepVu loi = batLoi(() => xl.banVeTuPhieu(phieu.MaPhieuDat));
        Assert.Equal(MaLoi.PHIEU_HET_HAN, loi.Ma);
        Assert.Equal(PhieuDatCho.CHO_THANH_TOAN, lay<DAL_PhieuDatCho>().layThongTinPhieu(phieu.MaPhieuDat)!.TinhTrang);
    }

    [Fact(DisplayName = "NV02 QĐ3 ngoại lệ P2a: phiếu của chuyến bay đã đến mốc hủy đặt vé không bán được")]
    public void PhieuDenMocHuy()
    {
        taoChuyenBay("CB501", HOM_NAY.AddDays(1).AddHours(15)); // khởi hành 15:00 ngày mai
        PhieuDatCho phieu = xlDatVe.datVe("CB501", "H2", khach(1), out DateTime han);
        Assert.Equal(HOM_NAY.AddDays(1), han); // mốc hủy 0 giờ ngày khởi hành đến trước 24 giờ

        dongHo.BayGio = HOM_NAY.AddDays(1).AddSeconds(-1);
        Assert.Single(xl.timPhieuDat(null, null, phieu.MaPhieuDat).Rows);

        dongHo.BayGio = HOM_NAY.AddDays(1); // 0 giờ ngày khởi hành
        Assert.Equal(MaLoi.PHIEU_HET_HAN, batLoi(() => xl.banVeTuPhieu(phieu.MaPhieuDat)).Ma);
    }

    [Fact(DisplayName = "NV02 ngoại lệ P2a: phiếu đã bị hủy hoặc mã phiếu không có")]
    public void PhieuDaHuyHoacKhongCo()
    {
        PhieuDatCho phieu = xlDatVe.datVe("CB500", "H2", khach(1), out _);
        xlDatVe.huyPhieuDat(phieu.MaPhieuDat);

        Assert.Equal(MaLoi.PHIEU_HET_HAN, batLoi(() => xl.banVeTuPhieu(phieu.MaPhieuDat)).Ma);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.banVeTuPhieu("PD99999999")).Loai);
        Assert.Empty(xl.timPhieuDat(null, null, "PD99999999").Rows);
    }

    [Fact(DisplayName = "NV02 bước P2: tìm phiếu còn hạn theo CCCD/hộ chiếu hoặc theo mã phiếu đặt")]
    public void TimPhieuConHan()
    {
        taoChuyenBay("CB501", KHOI_HANH.AddDays(2), giaVe: 900_000m, di: "DAD", den: "PQC");
        PhieuDatCho phieu1 = xlDatVe.datVe("CB500", "H1", khach(1), out DateTime han1);
        PhieuDatCho phieu2 = xlDatVe.datVe("CB501", "H2", khach(1), out _);
        PhieuDatCho phieuHuy = xlDatVe.datVe("CB501", "H2", khach(1), out _);
        xlDatVe.huyPhieuDat(phieuHuy.MaPhieuDat);
        xlDatVe.datVe("CB500", "H2", khach(2), out _);

        DataTable theoGiayTo = xl.timPhieuDat(HanhKhach.CAN_CUOC, khach(1).SoGiayTo, null);
        Assert.Equal(new[] { phieu1.MaPhieuDat, phieu2.MaPhieuDat }, theoGiayTo.Rows.Cast<DataRow>().Select(d => (string)d["MaPhieuDat"]));
        DataRow dong = theoGiayTo.Rows[0];
        Assert.Equal("SGN - HAN", dong["TuyenBay"]);
        Assert.Equal("Hạng 1", dong["TenHangVe"]);
        Assert.Equal("Khách Thứ 1", dong["HoTen"]);
        Assert.Equal(1_575_000m, dong["GiaTien"]);
        Assert.Equal(han1, dong["HanThanhToan"]);
        Assert.Equal(KHOI_HANH, dong["NgayGioKhoiHanh"]);

        // không cho biết loại giấy tờ thì tìm ở cả hai loại
        Assert.Equal(2, xl.timPhieuDat(null, khach(1).SoGiayTo, null).Rows.Count);
        Assert.Single(xl.timPhieuDat(null, null, phieu2.MaPhieuDat.ToLowerInvariant()).Rows);
        Assert.Empty(xl.timPhieuDat(HanhKhach.CAN_CUOC, "999999999999", null).Rows);
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, batLoi(() => xl.timPhieuDat(null, " ", null)).Loai);
    }

    [Fact(DisplayName = "NV02 UC04.3: tra cứu vé theo mã vé, CCCD/hộ chiếu, chuyến bay; mặc định là vé bán trong ngày")]
    public void TraCuuVe()
    {
        taoChuyenBay("CB501", KHOI_HANH.AddDays(1));
        dongHo.BayGio = HOM_NAY.AddDays(-1).AddHours(10);
        Ve homQua = xl.banVe("CB500", "H1", khach(1));
        dongHo.BayGio = HOM_NAY.AddHours(9);
        Ve homNay1 = xl.banVe("CB500", "H2", khach(2));
        Ve homNay2 = xl.banVe("CB501", "H2", khach(1));
        xl.huyVe(homNay2.MaVe);

        DataTable trongNgay = xl.timVe(new TieuChiTim());
        Assert.Equal(2, trongNgay.Rows.Count);
        DataRow veHuy = trongNgay.Rows.Cast<DataRow>().Single(d => (string)d["MaVe"] == homNay2.MaVe);
        Assert.Equal(Ve.DA_HUY, veHuy["TinhTrang"]);
        Assert.Equal("Khách Thứ 1", veHuy["HoTen"]);
        Assert.Equal(HanhKhach.CAN_CUOC, veHuy["LoaiGiayTo"]);
        Assert.Equal("Hạng 2", veHuy["TenHangVe"]);

        Assert.Equal(homQua.MaVe, Assert.Single(xl.timVe(new TieuChiTim { MaSo = homQua.MaVe }).Rows.Cast<DataRow>())["MaVe"]);
        Assert.Equal(2, xl.timVe(new TieuChiTim { SoGiayTo = khach(1).SoGiayTo }).Rows.Count);
        Assert.Equal(2, xl.timVe(new TieuChiTim { MaChuyenBay = "CB500" }).Rows.Count);
        Assert.Single(xl.timVe(new TieuChiTim { TuNgay = HOM_NAY.AddDays(-1), DenNgay = HOM_NAY.AddDays(-1) }).Rows);
        Assert.Equal(3, xl.timVe(new TieuChiTim { TuNgay = HOM_NAY.AddDays(-1), DenNgay = HOM_NAY }).Rows.Count);
        Assert.Empty(xl.timVe(new TieuChiTim { MaSo = "VE99999999" }).Rows);
        Assert.Equal(homNay1.MaVe, Assert.Single(xl.timVe(new TieuChiTim { SoGiayTo = khach(2).SoGiayTo }).Rows.Cast<DataRow>())["MaVe"]);
    }

    [Fact(DisplayName = "NV02 UC04.4: sửa vé chỉ sửa họ tên, giấy tờ, điện thoại của hành khách")]
    public void SuaVe()
    {
        Ve ve = xl.banVe("CB500", "H2", khach(1));

        xl.suaVe(ve.MaVe, new HanhKhach("", "Nguyễn Văn Sửa", HanhKhach.HO_CHIEU, "C7654321", "+84901234567"));

        HanhKhach hk = lay<DAL_HanhKhach>().layHanhKhach(ve.MaHanhKhach)!;
        Assert.Equal("Nguyễn Văn Sửa", hk.HoTen);
        Assert.Equal(HanhKhach.HO_CHIEU, hk.LoaiGiayTo);
        Assert.Equal("C7654321", hk.SoGiayTo);
        Assert.Equal("+84901234567", hk.DienThoai);
        Ve sauKhiSua = lay<DAL_Ve>().layVe(ve.MaVe)!;
        Assert.Equal("CB500", sauKhiSua.MaChuyenBay);
        Assert.Equal("H2", sauKhiSua.MaHangVe);
        Assert.Equal(ve.GiaTien, sauKhiSua.GiaTien);
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, batLoi(() => xl.suaVe(ve.MaVe, new HanhKhach("", "", HanhKhach.CAN_CUOC, "1", "2"))).Loai);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.suaVe("VE99999999", khach(9))).Loai);
    }

    [Fact(DisplayName = "NV02 ngoại lệ S3a: giấy tờ mới đã thuộc hành khách khác thì không lưu")]
    public void SuaVe_GiayToThuocNguoiKhac()
    {
        Ve ve1 = xl.banVe("CB500", "H2", khach(1));
        xl.banVe("CB500", "H2", khach(2));

        HanhKhach moi = khach(2);
        moi.HoTen = "Tên Mới";
        LoiNghiepVu loi = batLoi(() => xl.suaVe(ve1.MaVe, moi));

        Assert.Equal(MaLoi.GIAY_TO_DA_THUOC_NGUOI_KHAC, loi.Ma);
        Assert.Equal("Khách Thứ 1", lay<DAL_HanhKhach>().layHanhKhach(ve1.MaHanhKhach)!.HoTen);

        // giữ nguyên giấy tờ của chính mình, chỉ sửa họ tên thì được
        HanhKhach chinhMinh = khach(1);
        chinhMinh.HoTen = "Tên Mới";
        xl.suaVe(ve1.MaVe, chinhMinh);
        Assert.Equal("Tên Mới", lay<DAL_HanhKhach>().layHanhKhach(ve1.MaHanhKhach)!.HoTen);
    }

    [Fact(DisplayName = "NV02 UC04.5, AT03: hủy vé chỉ đổi tình trạng sang Đã hủy, số ghế trống tăng 1")]
    public void HuyVe()
    {
        Ve ve = xl.banVe("CB500", "H1", khach(1));
        Assert.Equal(1, dalChuyenBay.laySoGheTrong("CB500", "H1"));

        xl.huyVe(ve.MaVe);

        Assert.Equal(Ve.DA_HUY, lay<DAL_Ve>().layVe(ve.MaVe)!.TinhTrang);
        Assert.Equal(1, csdl.dem("SELECT COUNT(*) FROM VE"));
        Assert.Equal(2, dalChuyenBay.laySoGheTrong("CB500", "H1"));
    }

    [Fact(DisplayName = "NV02 ngoại lệ H2a: không hủy vé khi chuyến bay đã khởi hành")]
    public void HuyVe_ChuyenBayDaKhoiHanh()
    {
        Ve ve = xl.banVe("CB500", "H1", khach(1));
        dongHo.BayGio = KHOI_HANH.AddMinutes(1);

        LoiNghiepVu loi = batLoi(() => xl.huyVe(ve.MaVe));

        Assert.Equal(MaLoi.CHUYEN_BAY_DA_KHOI_HANH, loi.Ma);
        Assert.Equal(Ve.DA_BAN, lay<DAL_Ve>().layVe(ve.MaVe)!.TinhTrang);
    }

    [Fact(DisplayName = "NV02 ngoại lệ S3b, H3a: vé đã bị hủy ở máy khác thì không sửa, không hủy lại được")]
    public void VeDaBiHuy()
    {
        Ve ve = xl.banVe("CB500", "H1", khach(1));
        taoMay().GetRequiredService<XL_BanVe>().huyVe(ve.MaVe);

        Assert.Equal(MaLoi.DU_LIEU_DA_THAY_DOI, batLoi(() => xl.huyVe(ve.MaVe)).Ma);
        Assert.Equal(MaLoi.DU_LIEU_DA_THAY_DOI, batLoi(() => xl.suaVe(ve.MaVe, khach(1))).Ma);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.huyVe("VE99999999")).Loai);
    }

    [Fact(DisplayName = "NV02 QĐ2: nhiều máy cùng bán chiếc ghế cuối thì chỉ một máy bán được")]
    public async Task NhieuMayCungBanGheCuoi()
    {
        taoChuyenBay("CB600", KHOI_HANH, gheH1: 0, gheH2: 1);
        const int soMay = 8;
        List<XL_BanVe> cacMay = Enumerable.Range(0, soMay).Select(_ => taoMay().GetRequiredService<XL_BanVe>()).ToList();
        var ketQua = new ConcurrentBag<string>();
        using var xuatPhat = new ManualResetEventSlim(false);

        Task[] cacLuong = cacMay.Select((may, i) => Task.Run(() =>
        {
            xuatPhat.Wait();
            try
            {
                may.banVe("CB600", "H2", khach(100 + i));
                ketQua.Add("OK");
            }
            catch (LoiNghiepVu loi)
            {
                ketQua.Add(loi.Ma);
            }
        })).ToArray();
        xuatPhat.Set();
        await Task.WhenAll(cacLuong);

        Assert.Equal(1, ketQua.Count(k => k == "OK"));
        Assert.Equal(soMay - 1, ketQua.Count(k => k == MaLoi.HET_CHO));
        Assert.Equal(1, lay<DAL_Ve>().demVeDaBan("CB600"));
        Assert.Equal(0, dalChuyenBay.laySoGheTrong("CB600", "H2"));
    }

    [Fact(DisplayName = "NV02, NV03: bán vé và đặt vé đồng thời trên 3 ghế cuối không vượt quá số ghế")]
    public async Task BanVaDatDongThoiKhongVuotSoGhe()
    {
        taoChuyenBay("CB600", KHOI_HANH, gheH1: 0, gheH2: 3);
        const int soMay = 12;
        List<IServiceProvider> cacMay = Enumerable.Range(0, soMay).Select(_ => taoMay()).ToList();
        var ketQua = new ConcurrentBag<string>();
        using var xuatPhat = new ManualResetEventSlim(false);

        Task[] cacLuong = cacMay.Select((may, i) => Task.Run(() =>
        {
            xuatPhat.Wait();
            try
            {
                // máy chẵn bán vé, máy lẻ đặt vé; hai máy liền nhau dùng chung một hành khách mới
                if (i % 2 == 0) may.GetRequiredService<XL_BanVe>().banVe("CB600", "H2", khach(200 + i / 2));
                else may.GetRequiredService<XL_DatVe>().datVe("CB600", "H2", khach(200 + i / 2), out _);
                ketQua.Add("OK");
            }
            catch (LoiNghiepVu loi)
            {
                ketQua.Add(loi.Ma);
            }
        })).ToArray();
        xuatPhat.Set();
        await Task.WhenAll(cacLuong);

        Assert.Equal(3, ketQua.Count(k => k == "OK"));
        Assert.Equal(soMay - 3, ketQua.Count(k => k == MaLoi.HET_CHO));
        Assert.Equal(3, dalChuyenBay.tinhSoGheDat("CB600"));
        Assert.Equal(0, dalChuyenBay.tongSoGheTrong("CB600"));
        // không có hành khách nào bị lưu trùng giấy tờ
        Assert.Equal(csdl.dem("SELECT COUNT(DISTINCT SoGiayTo) FROM HANHKHACH"), csdl.dem("SELECT COUNT(*) FROM HANHKHACH"));
    }

    [Fact(DisplayName = "NV02: hai máy cùng bán vé cho một hành khách mới trên hai chuyến bay chỉ lưu một hành khách")]
    public async Task HaiMayCungThemMotHanhKhach()
    {
        taoChuyenBay("CB601", KHOI_HANH, gheH1: 0, gheH2: 50);
        taoChuyenBay("CB602", KHOI_HANH, gheH1: 0, gheH2: 50);
        List<XL_BanVe> cacMay = Enumerable.Range(0, 6).Select(_ => taoMay().GetRequiredService<XL_BanVe>()).ToList();
        using var xuatPhat = new ManualResetEventSlim(false);

        Task[] cacLuong = cacMay.Select((may, i) => Task.Run(() =>
        {
            xuatPhat.Wait();
            may.banVe(i % 2 == 0 ? "CB601" : "CB602", "H2", khach(300));
        })).ToArray();
        xuatPhat.Set();
        await Task.WhenAll(cacLuong);

        Assert.Equal(1, csdl.dem("SELECT COUNT(*) FROM HANHKHACH"));
        Assert.Equal(6, csdl.dem("SELECT COUNT(*) FROM VE WHERE TinhTrang = N'Đã bán'"));
    }
}
