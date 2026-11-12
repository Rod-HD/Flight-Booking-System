using Microsoft.Extensions.DependencyInjection;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC02_PhanQuyen : KiemThuCoSo
{
    private readonly XL_PhanQuyen xl;

    public KiemThuUC02_PhanQuyen(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_PhanQuyen>();
        xl.taoTaiKhoanBanDau(new[]
        {
            ("quanly", "Quanly@123", TaiKhoan.QUAN_LY, false),
            ("nhanvien", "Nhanvien@123", TaiKhoan.NHAN_VIEN, false)
        });
        // Quản lý quanly đang đăng nhập
        lay<PhienLamViec>().batDau(lay<DAL_TaiKhoan>().timTaiKhoan("quanly")!);
    }

    private TaiKhoan dangNhap(string tenDN, string matKhau)
    {
        return taoMay().GetRequiredService<XL_DangNhap>().dangNhap(tenDN, matKhau);
    }

    [Fact(DisplayName = "BMT02: thêm tài khoản mới ở trạng thái Hoạt động, đăng nhập được với nhóm quyền đã gán")]
    public void ThemTaiKhoan()
    {
        xl.themTaiKhoan("banve01", "Banve@2026", TaiKhoan.NHAN_VIEN);

        TaiKhoan taiKhoan = lay<DAL_TaiKhoan>().timTaiKhoan("banve01")!;
        Assert.Equal(TaiKhoan.HOAT_DONG, taiKhoan.TrangThai);
        Assert.NotEqual("Banve@2026", taiKhoan.MatKhau);
        Assert.Equal(TaiKhoan.NHAN_VIEN, dangNhap("banve01", "Banve@2026").NhomQuyen);
        Assert.Equal(3, xl.layDanhSachTaiKhoan().Count);
    }

    [Fact(DisplayName = "BMT02 ngoại lệ 6a: tên đăng nhập đã tồn tại")]
    public void TrungTenDangNhap()
    {
        LoiNghiepVu loi = batLoi(() => xl.themTaiKhoan("nhanvien", "Matkhau@1", TaiKhoan.NHAN_VIEN));
        Assert.Equal(MaLoi.TRUNG_MA, loi.Ma);
        Assert.Equal("Tên đăng nhập đã tồn tại.", loi.Message);
    }

    [Fact(DisplayName = "BMT02 ngoại lệ 6a: thiếu thông tin hoặc tên đăng nhập có khoảng trắng")]
    public void ThieuThongTin()
    {
        LoiNghiepVu loi = batLoi(() => xl.themTaiKhoan("ten co khoang trang", "", null));
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Contains("tenDangNhap", loi.ChiTiet.Keys);
        Assert.Contains("matKhau", loi.ChiTiet.Keys);
        Assert.Contains("nhomQuyen", loi.ChiTiet.Keys);
    }

    [Fact(DisplayName = "BMT02: sửa tài khoản đổi nhóm quyền; mật khẩu mới để trống thì giữ mật khẩu cũ")]
    public void SuaNhomQuyenGiuMatKhau()
    {
        xl.suaTaiKhoan("nhanvien", TaiKhoan.QUAN_LY, null);

        Assert.Equal(TaiKhoan.QUAN_LY, dangNhap("nhanvien", "Nhanvien@123").NhomQuyen);
    }

    [Fact(DisplayName = "BMT02: đặt lại mật khẩu thì mật khẩu cũ hết hiệu lực")]
    public void DatLaiMatKhau()
    {
        xl.suaTaiKhoan("nhanvien", TaiKhoan.NHAN_VIEN, "MatKhauMoi@1");

        Assert.Equal(TaiKhoan.NHAN_VIEN, dangNhap("nhanvien", "MatKhauMoi@1").NhomQuyen);
        Assert.Equal(MaLoi.SAI_THONG_TIN_DANG_NHAP, batLoi(() => dangNhap("nhanvien", "Nhanvien@123")).Ma);
    }

    [Fact(DisplayName = "BMT02 ngoại lệ 6b: không đổi nhóm quyền của tài khoản đang đăng nhập")]
    public void KhongTuDoiQuyen()
    {
        LoiNghiepVu loi = batLoi(() => xl.suaTaiKhoan("quanly", TaiKhoan.NHAN_VIEN, null));
        Assert.Equal(MaLoi.KHONG_DUOC_TU_DOI_QUYEN, loi.Ma);
        Assert.Equal(TaiKhoan.QUAN_LY, lay<DAL_TaiKhoan>().layNhomQuyen("quanly"));

        // vẫn được tự đặt lại mật khẩu khi giữ nguyên nhóm quyền
        xl.suaTaiKhoan("quanly", TaiKhoan.QUAN_LY, "QuanLyMoi@1");
        Assert.Equal(TaiKhoan.QUAN_LY, dangNhap("quanly", "QuanLyMoi@1").NhomQuyen);
    }

    [Fact(DisplayName = "BMT02 ngoại lệ 3a1: không khóa chính tài khoản đang đăng nhập")]
    public void KhongTuKhoa()
    {
        LoiNghiepVu loi = batLoi(() => xl.khoaTaiKhoan("quanly"));
        Assert.Equal(MaLoi.KHONG_DUOC_TU_KHOA, loi.Ma);
        Assert.Equal(TaiKhoan.HOAT_DONG, lay<DAL_TaiKhoan>().timTaiKhoan("quanly")!.TrangThai);
    }

    [Fact(DisplayName = "BMT02 luồng 3a, 3b: khóa thì không đăng nhập được, mở khóa thì đăng nhập lại được")]
    public void KhoaVaMoKhoa()
    {
        xl.khoaTaiKhoan("nhanvien");
        Assert.Equal(MaLoi.TAI_KHOAN_BI_KHOA, batLoi(() => dangNhap("nhanvien", "Nhanvien@123")).Ma);

        xl.moKhoaTaiKhoan("nhanvien");
        Assert.Equal(TaiKhoan.NHAN_VIEN, dangNhap("nhanvien", "Nhanvien@123").NhomQuyen);
    }

    [Fact(DisplayName = "BMT02: sửa, khóa, mở khóa tài khoản không tồn tại thì báo không tìm thấy")]
    public void KhongTimThayTaiKhoan()
    {
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.suaTaiKhoan("khongco", TaiKhoan.NHAN_VIEN, null)).Loai);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.khoaTaiKhoan("khongco")).Loai);
        Assert.Equal(LoaiLoi.KhongTimThay, batLoi(() => xl.moKhoaTaiKhoan("khongco")).Loai);
    }
}
