using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace QuanLyBanVe.KiemThu;

/// <summary>
/// Kiểm thử tầng giao tiếp qua HTTP trên máy chủ chạy trong bộ nhớ: cookie phiên, phân quyền,
/// dạng lỗi { ma, thongBao, chiTiet }, JSON camelCase theo docs/API.md.
/// Máy chủ tự tạo ba tài khoản ban đầu vì bảng TAIKHOAN của cơ sở dữ liệu thử đang rỗng.
/// </summary>
[Collection(NhomCoSoDuLieu.TEN)]
public class KiemThuGiaoTiep : IDisposable
{
    private readonly WebApplicationFactory<Program> mayChu;

    public KiemThuGiaoTiep(CoSoDuLieuThu csdl)
    {
        csdl.lamSach();
        mayChu = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, cauHinh) => cauHinh.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:QLBANVE"] = csdl.ChuoiKetNoi,
                ["BoDinhThoi:Bat"] = "false",
                ["NhatKy:ThuMuc"] = csdl.ThuMucNhatKy
            })));
    }

    public void Dispose()
    {
        mayChu.Dispose();
        GC.SuppressFinalize(this);
    }

    private HttpClient taoMayKhach()
    {
        return mayChu.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
    }

    private async Task<HttpClient> dangNhap(string tenDangNhap, string matKhau)
    {
        HttpClient mayKhach = taoMayKhach();
        HttpResponseMessage phanHoi = await mayKhach.PostAsJsonAsync("/api/dang-nhap", new { tenDangNhap, matKhau });
        Assert.Equal(HttpStatusCode.OK, phanHoi.StatusCode);
        return mayKhach;
    }

    private Task<HttpClient> dangNhapQuanLy() => dangNhap("quanly", "Quanly@123");

    private Task<HttpClient> dangNhapNhanVien() => dangNhap("nhanvien", "Nhanvien@123");

    private static async Task<JsonElement> docJson(HttpResponseMessage phanHoi)
    {
        string noiDung = await phanHoi.Content.ReadAsStringAsync();
        return JsonDocument.Parse(noiDung).RootElement.Clone();
    }

    /// <summary>Kiểm tra phản hồi lỗi đúng mã trạng thái và đúng dạng { ma, thongBao, chiTiet }.</summary>
    private static async Task<JsonElement> kiemTraLoi(HttpResponseMessage phanHoi, HttpStatusCode maTrangThai, string ma)
    {
        Assert.Equal(maTrangThai, phanHoi.StatusCode);
        Assert.Equal("application/json", phanHoi.Content.Headers.ContentType?.MediaType);
        JsonElement loi = await docJson(phanHoi);
        Assert.Equal(ma, loi.GetProperty("ma").GetString());
        Assert.False(string.IsNullOrWhiteSpace(loi.GetProperty("thongBao").GetString()));
        Assert.Equal(JsonValueKind.Object, loi.GetProperty("chiTiet").ValueKind);
        return loi;
    }

    private static object lichChuyenBay(string ma, int thoiGianBay = 120, int gheH1 = 2, int gheH2 = 3)
    {
        return new
        {
            maChuyenBay = ma,
            giaVe = 1500000,
            maSanBayDi = "SGN",
            maSanBayDen = "HAN",
            ngayGioKhoiHanh = DateTime.Now.AddDays(10).ToString("yyyy-MM-dd'T'HH:mm:ss"),
            thoiGianBay,
            gheTheoHang = new[] { new { maHangVe = "H1", soLuongGhe = gheH1 }, new { maHangVe = "H2", soLuongGhe = gheH2 } },
            trungGian = new[] { new { thuTu = 1, maSanBay = "DAD", thoiGianDung = 15, ghiChu = "Đón khách" } }
        };
    }

    private static object lapVe(string maChuyenBay, string maHangVe, int n)
    {
        return new
        {
            maChuyenBay,
            maHangVe,
            hanhKhach = new { hoTen = "Khách Thứ " + n, loaiGiayTo = "CCCD", soGiayTo = n.ToString("D12"), dienThoai = "0901234567" }
        };
    }

    [Fact(DisplayName = "BMT01: chưa đăng nhập thì mọi đường dẫn nghiệp vụ trả 401 đúng dạng lỗi")]
    public async Task ChuaDangNhap()
    {
        HttpClient mayKhach = taoMayKhach();
        foreach (string duongDan in new[] { "/api/phien", "/api/chuyen-bay", "/api/ve", "/api/phieu-dat", "/api/quy-dinh",
                     "/api/tai-khoan", "/api/bao-cao/nam?nam=2026", "/api/thong-bao" })
        {
            await kiemTraLoi(await mayKhach.GetAsync(duongDan), HttpStatusCode.Unauthorized, "CHUA_DANG_NHAP");
        }
        await kiemTraLoi(await mayKhach.PostAsJsonAsync("/api/ve", lapVe("CB1", "H1", 1)), HttpStatusCode.Unauthorized, "CHUA_DANG_NHAP");
    }

    [Fact(DisplayName = "BMT01: đăng nhập cấp cookie HttpOnly qlbv_phien, SameSite Lax; đăng xuất thì phiên hết hiệu lực")]
    public async Task DangNhapDangXuat()
    {
        HttpClient mayKhach = taoMayKhach();
        HttpResponseMessage phanHoi = await mayKhach.PostAsJsonAsync("/api/dang-nhap", new { tenDangNhap = "quanly", matKhau = "Quanly@123" });

        Assert.Equal(HttpStatusCode.OK, phanHoi.StatusCode);
        string cookie = Assert.Single(phanHoi.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("qlbv_phien=", cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", cookie, StringComparison.OrdinalIgnoreCase);
        JsonElement taiKhoan = await docJson(phanHoi);
        Assert.Equal("quanly", taiKhoan.GetProperty("tenDangNhap").GetString());
        Assert.Equal("QuanLy", taiKhoan.GetProperty("nhomQuyen").GetString());

        JsonElement phien = await docJson(await mayKhach.GetAsync("/api/phien"));
        Assert.Equal("quanly", phien.GetProperty("tenDangNhap").GetString());
        Assert.Equal("QuanLy", phien.GetProperty("nhomQuyen").GetString());

        Assert.Equal(HttpStatusCode.NoContent, (await mayKhach.PostAsync("/api/dang-xuat", null)).StatusCode);
        await kiemTraLoi(await mayKhach.GetAsync("/api/phien"), HttpStatusCode.Unauthorized, "CHUA_DANG_NHAP");
    }

    [Fact(DisplayName = "BMT01: sai thông tin trả 401 SAI_THONG_TIN_DANG_NHAP, tài khoản khóa trả 403 TAI_KHOAN_BI_KHOA")]
    public async Task DangNhapKhongThanhCong()
    {
        HttpClient mayKhach = taoMayKhach();

        JsonElement sai = await kiemTraLoi(
            await mayKhach.PostAsJsonAsync("/api/dang-nhap", new { tenDangNhap = "quanly", matKhau = "sai" }),
            HttpStatusCode.Unauthorized, "SAI_THONG_TIN_DANG_NHAP");
        Assert.Equal("Sai tên đăng nhập hoặc mật khẩu.", sai.GetProperty("thongBao").GetString());

        await kiemTraLoi(
            await mayKhach.PostAsJsonAsync("/api/dang-nhap", new { tenDangNhap = "nhanvien2", matKhau = "Nhanvien2@123" }),
            HttpStatusCode.Forbidden, "TAI_KHOAN_BI_KHOA");

        JsonElement thieu = await kiemTraLoi(
            await mayKhach.PostAsJsonAsync("/api/dang-nhap", new { tenDangNhap = "", matKhau = "" }),
            HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
        Assert.True(thieu.GetProperty("chiTiet").TryGetProperty("tenDangNhap", out _));
        Assert.True(thieu.GetProperty("chiTiet").TryGetProperty("matKhau", out _));

        await kiemTraLoi(await mayKhach.GetAsync("/api/phien"), HttpStatusCode.Unauthorized, "CHUA_DANG_NHAP");
    }

    [Fact(DisplayName = "BMT02 đến BMT09: Nhân viên bán vé bị từ chối 403 ở các chức năng chỉ dành cho Quản lý")]
    public async Task PhanQuyenNhanVien()
    {
        HttpClient nhanVien = await dangNhapNhanVien();
        var tuChoi = new List<HttpResponseMessage>
        {
            await nhanVien.GetAsync("/api/tai-khoan"),
            await nhanVien.PostAsJsonAsync("/api/tai-khoan", new { tenDangNhap = "moi", matKhau = "MatKhau@1", nhomQuyen = "QuanLy" }),
            await nhanVien.PostAsync("/api/tai-khoan/quanly/khoa", null),
            await nhanVien.PostAsJsonAsync("/api/chuyen-bay", lichChuyenBay("CB900")),
            await nhanVien.PutAsJsonAsync("/api/chuyen-bay/CB900", lichChuyenBay("CB900")),
            await nhanVien.DeleteAsync("/api/chuyen-bay/CB900"),
            await nhanVien.GetAsync("/api/chuyen-bay/mau-excel"),
            await nhanVien.PostAsync("/api/chuyen-bay/nhap-excel", new MultipartFormDataContent()),
            await nhanVien.GetAsync("/api/bao-cao/thang?thang=11&nam=2026"),
            await nhanVien.GetAsync("/api/bao-cao/nam/xuat?nam=2026&dinhDang=pdf"),
            await nhanVien.PutAsJsonAsync("/api/quy-dinh/tham-so/thoiGianBayToiThieu", new { giaTriMoi = 1 }),
            await nhanVien.PostAsJsonAsync("/api/san-bay", new { maSanBay = "VII", tenSanBay = "Vinh" }),
            await nhanVien.DeleteAsync("/api/hang-ve/H1"),
            await nhanVien.GetAsync("/api/phieu-dat/da-huy/dem?truocNgay=2026-01-01"),
            await nhanVien.DeleteAsync("/api/phieu-dat/da-huy?truocNgay=2026-01-01")
        };
        foreach (HttpResponseMessage phanHoi in tuChoi)
            await kiemTraLoi(phanHoi, HttpStatusCode.Forbidden, "KHONG_CO_QUYEN");

        // các chức năng của Nhân viên bán vé: tra cứu chuyến bay (kể cả xuất tập tin), bán vé, đặt vé, xem quy định
        foreach (string duongDan in new[] { "/api/quy-dinh", "/api/chuyen-bay", "/api/chuyen-bay/sap-khoi-hanh", "/api/chuyen-bay/xuat-excel",
                     "/api/ve", "/api/phieu-dat", "/api/phieu-dat/sap-het-han", "/api/thong-bao" })
        {
            Assert.Equal(HttpStatusCode.OK, (await nhanVien.GetAsync(duongDan)).StatusCode);
        }
    }

    [Fact(DisplayName = "BMT02: tài khoản bị khóa hoặc đổi nhóm quyền thì phiên đang mở hết hiệu lực; không tự khóa, không tự đổi quyền")]
    public async Task QuanLyTaiKhoan()
    {
        HttpClient quanLy = await dangNhapQuanLy();
        HttpClient nhanVien = await dangNhapNhanVien();

        JsonElement ds = await docJson(await quanLy.GetAsync("/api/tai-khoan"));
        Assert.Equal(3, ds.GetArrayLength());
        JsonElement khoa = ds.EnumerateArray().Single(tk => tk.GetProperty("tenDangNhap").GetString() == "nhanvien2");
        Assert.Equal("NhanVien", khoa.GetProperty("nhomQuyen").GetString());
        Assert.Equal("DaKhoa", khoa.GetProperty("trangThai").GetString());
        Assert.False(khoa.TryGetProperty("matKhau", out _));

        await kiemTraLoi(await quanLy.PostAsync("/api/tai-khoan/quanly/khoa", null), HttpStatusCode.Conflict, "KHONG_DUOC_TU_KHOA");
        await kiemTraLoi(await quanLy.PutAsJsonAsync("/api/tai-khoan/quanly", new { nhomQuyen = "NhanVien" }),
            HttpStatusCode.Conflict, "KHONG_DUOC_TU_DOI_QUYEN");
        await kiemTraLoi(await quanLy.PostAsJsonAsync("/api/tai-khoan", new { tenDangNhap = "nhanvien", matKhau = "MatKhau@1", nhomQuyen = "NhanVien" }),
            HttpStatusCode.Conflict, "TRUNG_MA");

        Assert.Equal(HttpStatusCode.Created, (await quanLy.PostAsJsonAsync("/api/tai-khoan",
            new { tenDangNhap = "banve01", matKhau = "MatKhau@1", nhomQuyen = "NhanVien" })).StatusCode);
        HttpClient banVe01 = await dangNhap("banve01", "MatKhau@1");

        // khóa nhanvien: phiên đang mở của nhanvien không dùng tiếp được
        Assert.Equal(HttpStatusCode.OK, (await nhanVien.GetAsync("/api/ve")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await quanLy.PostAsync("/api/tai-khoan/nhanvien/khoa", null)).StatusCode);
        await kiemTraLoi(await nhanVien.GetAsync("/api/ve"), HttpStatusCode.Unauthorized, "CHUA_DANG_NHAP");
        Assert.Equal(HttpStatusCode.NoContent, (await quanLy.PostAsync("/api/tai-khoan/nhanvien/mo-khoa", null)).StatusCode);
        await dangNhapNhanVien();

        // đổi nhóm quyền của banve01: phải đăng nhập lại mới có quyền mới
        Assert.Equal(HttpStatusCode.NoContent,
            (await quanLy.PutAsJsonAsync("/api/tai-khoan/banve01", new { nhomQuyen = "QuanLy", matKhauMoi = "" })).StatusCode);
        await kiemTraLoi(await banVe01.GetAsync("/api/phien"), HttpStatusCode.Unauthorized, "CHUA_DANG_NHAP");
        HttpClient banVe01Moi = await dangNhap("banve01", "MatKhau@1");
        Assert.Equal(HttpStatusCode.OK, (await banVe01Moi.GetAsync("/api/tai-khoan")).StatusCode);
    }

    [Fact(DisplayName = "UC03 đến UC07 qua HTTP: nhận lịch, bán vé, đặt vé, bán từ phiếu, sửa, hủy, báo cáo đúng tên trường của API.md")]
    public async Task LuongNghiepVuChinh()
    {
        HttpClient quanLy = await dangNhapQuanLy();
        HttpClient nhanVien = await dangNhapNhanVien();

        HttpResponseMessage them = await quanLy.PostAsJsonAsync("/api/chuyen-bay", lichChuyenBay("cb900"));
        Assert.Equal(HttpStatusCode.Created, them.StatusCode);

        JsonElement chiTiet = await docJson(await nhanVien.GetAsync("/api/chuyen-bay/CB900"));
        Assert.Equal("CB900", chiTiet.GetProperty("maChuyenBay").GetString());
        Assert.Equal(1500000, chiTiet.GetProperty("giaVe").GetInt64());
        Assert.Equal(120, chiTiet.GetProperty("thoiGianBay").GetInt32());
        Assert.Matches(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$", chiTiet.GetProperty("ngayGioKhoiHanh").GetString()!);
        JsonElement hang2 = chiTiet.GetProperty("gheTheoHang").EnumerateArray().Single(g => g.GetProperty("maHangVe").GetString() == "H2");
        Assert.Equal("Hạng 2", hang2.GetProperty("tenHangVe").GetString());
        Assert.Equal(3, hang2.GetProperty("soLuongGhe").GetInt32());
        Assert.Equal(3, hang2.GetProperty("soGheTrong").GetInt32());
        Assert.Equal(0, hang2.GetProperty("soDaBanVaDat").GetInt32());
        JsonElement diemDung = Assert.Single(chiTiet.GetProperty("trungGian").EnumerateArray());
        Assert.Equal(1, diemDung.GetProperty("thuTu").GetInt32());
        Assert.Equal("Đà Nẵng", diemDung.GetProperty("tenSanBay").GetString());
        Assert.Equal("Đón khách", diemDung.GetProperty("ghiChu").GetString());

        JsonElement thongTinBan = await docJson(await nhanVien.GetAsync("/api/chuyen-bay/CB900/thong-tin-ban?mucDich=banVe"));
        Assert.True(thongTinBan.GetProperty("duocPhep").GetBoolean());
        Assert.Equal(5, thongTinBan.GetProperty("tongSoGheTrong").GetInt32());
        Assert.Equal(1575000, thongTinBan.GetProperty("hang")[0].GetProperty("giaTien").GetInt64());
        JsonElement thongTinDat = await docJson(await nhanVien.GetAsync("/api/chuyen-bay/CB900/thong-tin-ban?mucDich=datVe"));
        Assert.Equal(JsonValueKind.String, thongTinDat.GetProperty("hanThanhToanDuKien").ValueKind);

        // bán vé trực tiếp
        HttpResponseMessage ban = await nhanVien.PostAsJsonAsync("/api/ve", lapVe("CB900", "H1", 1));
        Assert.Equal(HttpStatusCode.Created, ban.StatusCode);
        JsonElement ve = await docJson(ban);
        string maVe = ve.GetProperty("maVe").GetString()!;
        Assert.Matches("^VE[0-9]{8}$", maVe);
        Assert.Equal(1575000, ve.GetProperty("giaTien").GetInt64());
        Assert.Matches(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$", ve.GetProperty("ngayBan").GetString()!);

        // đặt vé rồi bán vé từ phiếu
        HttpResponseMessage dat = await nhanVien.PostAsJsonAsync("/api/phieu-dat", lapVe("CB900", "H2", 2));
        Assert.Equal(HttpStatusCode.Created, dat.StatusCode);
        JsonElement phieu = await docJson(dat);
        string maPhieu = phieu.GetProperty("maPhieuDat").GetString()!;
        Assert.Equal(1500000, phieu.GetProperty("giaTien").GetInt64());
        Assert.True(phieu.TryGetProperty("thoiDiemDat", out _) && phieu.TryGetProperty("hanThanhToan", out _));

        JsonElement conHan = await docJson(await nhanVien.GetAsync("/api/phieu-dat/con-han?loaiGiayTo=CCCD&soGiayTo=000000000002"));
        JsonElement phieuConHan = Assert.Single(conHan.EnumerateArray());
        Assert.Equal(maPhieu, phieuConHan.GetProperty("maPhieuDat").GetString());
        Assert.Equal("SGN - HAN", phieuConHan.GetProperty("tuyenBay").GetString());
        foreach (string truong in new[] { "maChuyenBay", "ngayGioKhoiHanh", "tenHangVe", "hoTen", "giaTien", "hanThanhToan" })
            Assert.True(phieuConHan.TryGetProperty(truong, out _), truong);

        JsonElement dsPhieu = await docJson(await nhanVien.GetAsync("/api/phieu-dat?tinhTrang=ChoThanhToan"));
        JsonElement dongPhieu = Assert.Single(dsPhieu.EnumerateArray());
        Assert.Equal("ChoThanhToan", dongPhieu.GetProperty("tinhTrang").GetString());
        Assert.Equal("CCCD", dongPhieu.GetProperty("loaiGiayTo").GetString());

        HttpResponseMessage tuPhieu = await nhanVien.PostAsJsonAsync("/api/ve/tu-phieu", new { maPhieuDat = maPhieu });
        Assert.Equal(HttpStatusCode.Created, tuPhieu.StatusCode);
        string maVeTuPhieu = (await docJson(tuPhieu)).GetProperty("maVe").GetString()!;
        await kiemTraLoi(await nhanVien.PostAsJsonAsync("/api/ve/tu-phieu", new { maPhieuDat = maPhieu }),
            HttpStatusCode.Conflict, "PHIEU_HET_HAN");

        // danh sách vé mặc định là vé bán trong ngày
        JsonElement dsVe = await docJson(await nhanVien.GetAsync("/api/ve"));
        Assert.Equal(2, dsVe.GetArrayLength());
        JsonElement dongVe = dsVe.EnumerateArray().Single(v => v.GetProperty("maVe").GetString() == maVeTuPhieu);
        Assert.Equal("DaBan", dongVe.GetProperty("tinhTrang").GetString());
        Assert.Equal(maPhieu, dongVe.GetProperty("maPhieuDat").GetString());
        Assert.Equal("Khách Thứ 2", dongVe.GetProperty("hoTen").GetString());
        foreach (string truong in new[] { "maChuyenBay", "loaiGiayTo", "soGiayTo", "dienThoai", "tenHangVe", "giaTien", "ngayBan" })
            Assert.True(dongVe.TryGetProperty(truong, out _), truong);

        // sửa thông tin hành khách, giấy tờ của người khác thì bị từ chối
        Assert.Equal(HttpStatusCode.NoContent, (await nhanVien.PutAsJsonAsync("/api/ve/" + maVe + "/hanh-khach",
            new { hoTen = "Nguyễn Văn Sửa", loaiGiayTo = "HoChieu", soGiayTo = "C1234567", dienThoai = "+84901234567" })).StatusCode);
        await kiemTraLoi(await nhanVien.PutAsJsonAsync("/api/ve/" + maVe + "/hanh-khach",
                new { hoTen = "Nguyễn Văn Sửa", loaiGiayTo = "CCCD", soGiayTo = "000000000002", dienThoai = "0901234567" }),
            HttpStatusCode.Conflict, "GIAY_TO_DA_THUOC_NGUOI_KHAC");

        // danh sách BM4: 2 vé Đã bán, 3 ghế trống
        JsonElement dsChuyenBay = await docJson(await nhanVien.GetAsync("/api/chuyen-bay?sanBayDi=SGN&maChuyenBay=CB900"));
        JsonElement bm4 = Assert.Single(dsChuyenBay.EnumerateArray());
        Assert.Equal(2, bm4.GetProperty("soGheDat").GetInt32());
        Assert.Equal(3, bm4.GetProperty("soGheTrong").GetInt32());
        Assert.Equal("Tân Sơn Nhất", bm4.GetProperty("tenSanBayDi").GetString());
        Assert.Equal("Nội Bài", bm4.GetProperty("tenSanBayDen").GetString());

        // báo cáo tháng của tháng khởi hành
        DateTime khoiHanh = DateTime.Now.AddDays(10);
        JsonElement baoCao = await docJson(await quanLy.GetAsync("/api/bao-cao/thang?thang=" + khoiHanh.Month + "&nam=" + khoiHanh.Year));
        Assert.Equal(1, baoCao.GetProperty("soChuyenBay").GetInt32());
        Assert.Equal(2, baoCao.GetProperty("tongSoVe").GetInt32());
        Assert.Equal(3075000, baoCao.GetProperty("tongDoanhThu").GetInt64());
        JsonElement dongBaoCao = Assert.Single(baoCao.GetProperty("dong").EnumerateArray());
        Assert.Equal(1, dongBaoCao.GetProperty("stt").GetInt32());
        Assert.Equal("CB900", dongBaoCao.GetProperty("maChuyenBay").GetString());
        Assert.Equal(2, dongBaoCao.GetProperty("soVe").GetInt32());
        Assert.Equal(3075000, dongBaoCao.GetProperty("doanhThu").GetInt64());
        Assert.Equal(100m, dongBaoCao.GetProperty("tiLe").GetDecimal());

        JsonElement baoCaoNam = await docJson(await quanLy.GetAsync("/api/bao-cao/nam?nam=" + khoiHanh.Year));
        Assert.Equal(12, baoCaoNam.GetProperty("dong").GetArrayLength());
        JsonElement dongThang = baoCaoNam.GetProperty("dong")[khoiHanh.Month - 1];
        Assert.Equal(khoiHanh.Month, dongThang.GetProperty("thang").GetInt32());
        Assert.Equal(1, dongThang.GetProperty("soChuyenBay").GetInt32());
        Assert.Equal(3075000, dongThang.GetProperty("doanhThu").GetInt64());

        // hủy vé, hủy lại thì báo dữ liệu đã thay đổi; chuyến bay đã có vé không xóa được
        Assert.Equal(HttpStatusCode.NoContent, (await nhanVien.PostAsync("/api/ve/" + maVe + "/huy", null)).StatusCode);
        await kiemTraLoi(await nhanVien.PostAsync("/api/ve/" + maVe + "/huy", null), HttpStatusCode.Conflict, "DU_LIEU_DA_THAY_DOI");
        await kiemTraLoi(await quanLy.DeleteAsync("/api/chuyen-bay/CB900"), HttpStatusCode.Conflict, "DA_CO_VE_HOAC_PHIEU");

        // xóa phiếu đã hủy: phiếu đã chuyển thành vé được giữ lại
        string ngayMai = DateTime.Now.AddDays(1).ToString("yyyy-MM-dd");
        Assert.Equal(0, (await docJson(await quanLy.GetAsync("/api/phieu-dat/da-huy/dem?truocNgay=" + ngayMai))).GetProperty("soPhieu").GetInt32());
        Assert.Equal(0, (await docJson(await quanLy.DeleteAsync("/api/phieu-dat/da-huy?truocNgay=" + ngayMai))).GetProperty("soDaXoa").GetInt32());
        await kiemTraLoi(await quanLy.GetAsync("/api/phieu-dat/da-huy/dem"), HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
    }

    [Fact(DisplayName = "Dạng lỗi: 400 kèm chiTiet từng ô, 409 vi phạm quy định, 404 không tìm thấy, kể cả thân yêu cầu sai kiểu")]
    public async Task DangLoi()
    {
        HttpClient quanLy = await dangNhapQuanLy();

        // QĐ1: thời gian bay tối thiểu 30 phút
        JsonElement qd1 = await kiemTraLoi(await quanLy.PostAsJsonAsync("/api/chuyen-bay", lichChuyenBay("CB900", thoiGianBay: 20)),
            HttpStatusCode.Conflict, "VI_PHAM_QD1");
        Assert.Equal("Thời gian bay phải từ 30 phút trở lên (QĐ1).", qd1.GetProperty("chiTiet").GetProperty("thoiGianBay").GetString());

        // dữ liệu không hợp lệ ở nhiều ô
        JsonElement khongHopLe = await kiemTraLoi(await quanLy.PostAsJsonAsync("/api/chuyen-bay", new
        {
            maChuyenBay = "vj 900!",
            giaVe = 0,
            maSanBayDi = "SGN",
            maSanBayDen = "SGN",
            thoiGianBay = 100
        }), HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
        JsonElement chiTiet = khongHopLe.GetProperty("chiTiet");
        foreach (string truong in new[] { "maChuyenBay", "giaVe", "maSanBayDen", "ngayGioKhoiHanh", "gheTheoHang" })
            Assert.True(chiTiet.TryGetProperty(truong, out _), truong);

        // thân yêu cầu sai kiểu dữ liệu
        var saiKieu = new StringContent("{\"maChuyenBay\":\"CB900\",\"thoiGianBay\":\"hai gio\"}", System.Text.Encoding.UTF8, "application/json");
        JsonElement loiKieu = await kiemTraLoi(await quanLy.PostAsync("/api/chuyen-bay", saiKieu), HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
        Assert.True(loiKieu.GetProperty("chiTiet").TryGetProperty("thoiGianBay", out _));

        // số gửi dạng chuỗi vẫn được nhận
        var soDangChuoi = new StringContent("{\"giaTriMoi\":\"35\"}", System.Text.Encoding.UTF8, "application/json");
        Assert.Equal(HttpStatusCode.NoContent, (await quanLy.PutAsync("/api/quy-dinh/tham-so/thoiGianBayToiThieu", soDangChuoi)).StatusCode);
        JsonElement quyDinh = await docJson(await quanLy.GetAsync("/api/quy-dinh"));
        Assert.Equal(35, quyDinh.GetProperty("thamSo").GetProperty("thoiGianBayToiThieu").GetInt32());
        Assert.Equal(5, quyDinh.GetProperty("sanBay").GetArrayLength());
        Assert.Equal(105m, quyDinh.GetProperty("hangVe")[0].GetProperty("tiLeDonGia").GetDecimal());

        await kiemTraLoi(await quanLy.PutAsJsonAsync("/api/quy-dinh/tham-so/thoiGianHuyDatVe", new { giaTriMoi = 1 }),
            HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
        await kiemTraLoi(await quanLy.PutAsJsonAsync("/api/quy-dinh/tham-so/khongCo", new { giaTriMoi = 1 }),
            HttpStatusCode.NotFound, "KHONG_TIM_THAY");

        // sân bay, hạng vé đang được chuyến bay sử dụng
        Assert.Equal(HttpStatusCode.Created, (await quanLy.PostAsJsonAsync("/api/chuyen-bay", lichChuyenBay("CB900", gheH1: 0))).StatusCode);
        await kiemTraLoi(await quanLy.DeleteAsync("/api/san-bay/DAD"), HttpStatusCode.Conflict, "DANG_DUOC_SU_DUNG");
        await kiemTraLoi(await quanLy.DeleteAsync("/api/hang-ve/H2"), HttpStatusCode.Conflict, "DANG_DUOC_SU_DUNG");
        Assert.Equal(HttpStatusCode.NoContent, (await quanLy.DeleteAsync("/api/san-bay/PQC")).StatusCode);
        await kiemTraLoi(await quanLy.PostAsJsonAsync("/api/san-bay", new { maSanBay = "SGN", tenSanBay = "Trùng mã" }),
            HttpStatusCode.Conflict, "TRUNG_MA");
        Assert.Equal(HttpStatusCode.Created, (await quanLy.PostAsJsonAsync("/api/hang-ve",
            new { maHangVe = "H3", tenHangVe = "Hạng 3", tiLeDonGia = 90 })).StatusCode);
        // sửa hạng vé chỉ đổi tên, tỉ lệ gửi kèm bị bỏ qua
        Assert.Equal(HttpStatusCode.NoContent, (await quanLy.PutAsJsonAsync("/api/hang-ve/H3",
            new { tenHangVe = "Tiết kiệm", tiLeDonGia = 50 })).StatusCode);
        JsonElement hang3 = (await docJson(await quanLy.GetAsync("/api/quy-dinh"))).GetProperty("hangVe")
            .EnumerateArray().Single(h => h.GetProperty("maHangVe").GetString() == "H3");
        Assert.Equal("Tiết kiệm", hang3.GetProperty("tenHangVe").GetString());
        Assert.Equal(90m, hang3.GetProperty("tiLeDonGia").GetDecimal());

        // hết chỗ, không tìm thấy, đường dẫn không có
        JsonElement hetCho = await kiemTraLoi(await quanLy.PostAsJsonAsync("/api/ve", lapVe("CB900", "H1", 1)),
            HttpStatusCode.Conflict, "HET_CHO");
        Assert.Equal("Hạng vé đã hết chỗ.", hetCho.GetProperty("thongBao").GetString());
        await kiemTraLoi(await quanLy.GetAsync("/api/chuyen-bay/KHONGCO"), HttpStatusCode.NotFound, "KHONG_TIM_THAY");
        await kiemTraLoi(await quanLy.PostAsync("/api/ve/VE99999999/huy", null), HttpStatusCode.NotFound, "KHONG_TIM_THAY");
        await kiemTraLoi(await quanLy.GetAsync("/api/khong-co-duong-dan-nay"), HttpStatusCode.NotFound, "KHONG_TIM_THAY");
        await kiemTraLoi(await quanLy.GetAsync("/api/ve?tuNgay=khong-phai-ngay"), HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
        await kiemTraLoi(await quanLy.GetAsync("/api/phieu-dat?tinhTrang=DaBan"), HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
    }

    [Fact(DisplayName = "TT01 đến TT03 qua HTTP: tải tập tin mẫu, nhập Excel bằng multipart tapTin, xuất Excel và PDF")]
    public async Task NhapXuatTapTin()
    {
        HttpClient quanLy = await dangNhapQuanLy();
        const string kieuXlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        HttpResponseMessage mau = await quanLy.GetAsync("/api/chuyen-bay/mau-excel");
        Assert.Equal(HttpStatusCode.OK, mau.StatusCode);
        Assert.Equal(kieuXlsx, mau.Content.Headers.ContentType?.MediaType);
        Assert.Equal("mau_lich_chuyen_bay.xlsx", mau.Content.Headers.ContentDisposition?.FileName);

        using var tapBang = new XLWorkbook(new MemoryStream(await mau.Content.ReadAsByteArrayAsync()));
        IXLWorksheet trang = tapBang.Worksheet("ChuyenBay");
        object[][] cacDong =
        {
            new object[] { "CB901", 1500000, "SGN", "HAN", DateTime.Now.AddDays(20), 120, 10, 60 },
            new object[] { "CB902", 1500000, "SGN", "HAN", DateTime.Now.AddDays(20), 10, 10, 60 }
        };
        for (int i = 0; i < cacDong.Length; i++)
            for (int cot = 0; cot < cacDong[i].Length; cot++)
                trang.Cell(i + 2, cot + 1).Value = XLCellValue.FromObject(cacDong[i][cot]);
        using var boNho = new MemoryStream();
        tapBang.SaveAs(boNho);

        var noiDung = new MultipartFormDataContent();
        var tapTin = new ByteArrayContent(boNho.ToArray());
        tapTin.Headers.ContentType = new MediaTypeHeaderValue(kieuXlsx);
        noiDung.Add(tapTin, "tapTin", "lich_chuyen_bay.xlsx");
        HttpResponseMessage nhap = await quanLy.PostAsync("/api/chuyen-bay/nhap-excel", noiDung);

        Assert.Equal(HttpStatusCode.OK, nhap.StatusCode);
        JsonElement ketQua = await docJson(nhap);
        Assert.Equal(1, ketQua.GetProperty("soDaThem").GetInt32());
        JsonElement dongLoi = Assert.Single(ketQua.GetProperty("dongLoi").EnumerateArray());
        Assert.Equal(3, dongLoi.GetProperty("dong").GetInt32());
        Assert.Contains("QĐ1", dongLoi.GetProperty("lyDo").GetString());

        var saiDuoi = new MultipartFormDataContent { { new ByteArrayContent(new byte[] { 1, 2, 3 }), "tapTin", "lich.txt" } };
        await kiemTraLoi(await quanLy.PostAsync("/api/chuyen-bay/nhap-excel", saiDuoi), HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");

        HttpResponseMessage xuat = await quanLy.GetAsync("/api/chuyen-bay/xuat-excel?sanBayDi=SGN");
        Assert.Equal(kieuXlsx, xuat.Content.Headers.ContentType?.MediaType);
        using var danhSach = new XLWorkbook(new MemoryStream(await xuat.Content.ReadAsByteArrayAsync()));
        Assert.Equal("CB901", danhSach.Worksheets.First().Cell(5, 2).GetString());

        DateTime khoiHanh = DateTime.Now.AddDays(20);
        string ky = "thang=" + khoiHanh.Month + "&nam=" + khoiHanh.Year;
        HttpResponseMessage pdf = await quanLy.GetAsync("/api/bao-cao/thang/xuat?" + ky + "&dinhDang=pdf");
        Assert.Equal("application/pdf", pdf.Content.Headers.ContentType?.MediaType);
        Assert.Equal("%PDF-", System.Text.Encoding.ASCII.GetString(await pdf.Content.ReadAsByteArrayAsync(), 0, 5));
        HttpResponseMessage excel = await quanLy.GetAsync("/api/bao-cao/nam/xuat?nam=" + khoiHanh.Year + "&dinhDang=excel");
        Assert.Equal(kieuXlsx, excel.Content.Headers.ContentType?.MediaType);
        Assert.Equal("bao_cao_nam_" + khoiHanh.Year + ".xlsx", excel.Content.Headers.ContentDisposition?.FileName);
        await kiemTraLoi(await quanLy.GetAsync("/api/bao-cao/thang/xuat?" + ky + "&dinhDang=docx"),
            HttpStatusCode.BadRequest, "DU_LIEU_KHONG_HOP_LE");
    }

    [Fact(DisplayName = "CORS: chỉ nguồn http://localhost:5173 được gửi yêu cầu kèm cookie")]
    public async Task Cors()
    {
        HttpClient mayKhach = taoMayKhach();

        var choPhep = new HttpRequestMessage(HttpMethod.Options, "/api/dang-nhap");
        choPhep.Headers.Add("Origin", "http://localhost:5173");
        choPhep.Headers.Add("Access-Control-Request-Method", "POST");
        choPhep.Headers.Add("Access-Control-Request-Headers", "content-type");
        HttpResponseMessage phanHoi = await mayKhach.SendAsync(choPhep);
        Assert.Equal("http://localhost:5173", Assert.Single(phanHoi.Headers.GetValues("Access-Control-Allow-Origin")));
        Assert.Equal("true", Assert.Single(phanHoi.Headers.GetValues("Access-Control-Allow-Credentials")));

        var nguonLa = new HttpRequestMessage(HttpMethod.Options, "/api/dang-nhap");
        nguonLa.Headers.Add("Origin", "http://nguon-la.example");
        nguonLa.Headers.Add("Access-Control-Request-Method", "POST");
        HttpResponseMessage tuChoi = await mayKhach.SendAsync(nguonLa);
        Assert.False(tuChoi.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
