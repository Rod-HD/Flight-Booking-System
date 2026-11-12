using Microsoft.Extensions.DependencyInjection;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

public class KiemThuUC01_DangNhap : KiemThuCoSo
{
    public KiemThuUC01_DangNhap(CoSoDuLieuThu csdl) : base(csdl)
    {
        lay<XL_PhanQuyen>().taoTaiKhoanBanDau(new[]
        {
            ("quanly", "Quanly@123", TaiKhoan.QUAN_LY, false),
            ("nhanvien", "Nhanvien@123", TaiKhoan.NHAN_VIEN, false),
            ("nhanvien2", "Nhanvien2@123", TaiKhoan.NHAN_VIEN, true)
        });
    }

    [Fact(DisplayName = "BMT01: đăng nhập đúng trả về nhóm quyền và ghi vào phiên làm việc")]
    public void DangNhapDung()
    {
        TaiKhoan quanLy = lay<XL_DangNhap>().dangNhap("quanly", "Quanly@123");
        Assert.Equal(TaiKhoan.QUAN_LY, quanLy.NhomQuyen);
        Assert.Equal("quanly", lay<PhienLamViec>().TenDangNhap);
        Assert.Equal(TaiKhoan.QUAN_LY, lay<PhienLamViec>().NhomQuyen);

        TaiKhoan nhanVien = taoMay().GetRequiredService<XL_DangNhap>().dangNhap("nhanvien", "Nhanvien@123");
        Assert.Equal(TaiKhoan.NHAN_VIEN, nhanVien.NhomQuyen);
    }

    [Fact(DisplayName = "BMT01 ngoại lệ 4a: sai mật khẩu hoặc sai tên đăng nhập báo cùng một câu")]
    public void SaiThongTin()
    {
        LoiNghiepVu saiMatKhau = batLoi(() => lay<XL_DangNhap>().dangNhap("quanly", "sai-mat-khau"));
        LoiNghiepVu saiTen = batLoi(() => lay<XL_DangNhap>().dangNhap("khongco", "Quanly@123"));

        Assert.Equal(MaLoi.SAI_THONG_TIN_DANG_NHAP, saiMatKhau.Ma);
        Assert.Equal(MaLoi.SAI_THONG_TIN_DANG_NHAP, saiTen.Ma);
        Assert.Equal("Sai tên đăng nhập hoặc mật khẩu.", saiMatKhau.Message);
        Assert.Equal(saiMatKhau.Message, saiTen.Message);
        Assert.False(lay<PhienLamViec>().daDangNhap);
    }

    [Fact(DisplayName = "BMT01 ngoại lệ 4b: tài khoản đã bị khóa không đăng nhập được")]
    public void TaiKhoanBiKhoa()
    {
        LoiNghiepVu loi = batLoi(() => lay<XL_DangNhap>().dangNhap("nhanvien2", "Nhanvien2@123"));
        Assert.Equal(MaLoi.TAI_KHOAN_BI_KHOA, loi.Ma);
        Assert.Equal("Tài khoản đã bị khóa.", loi.Message);

        // sai mật khẩu thì không cho biết tài khoản đang bị khóa
        LoiNghiepVu saiMatKhau = batLoi(() => lay<XL_DangNhap>().dangNhap("nhanvien2", "sai"));
        Assert.Equal(MaLoi.SAI_THONG_TIN_DANG_NHAP, saiMatKhau.Ma);
    }

    [Fact(DisplayName = "BMT01: để trống tên đăng nhập hoặc mật khẩu thì báo lỗi từng ô")]
    public void DeTrong()
    {
        LoiNghiepVu loi = batLoi(() => lay<XL_DangNhap>().dangNhap(" ", ""));
        Assert.Equal(LoaiLoi.DuLieuKhongHopLe, loi.Loai);
        Assert.Contains("tenDangNhap", loi.ChiTiet.Keys);
        Assert.Contains("matKhau", loi.ChiTiet.Keys);
    }

    [Fact(DisplayName = "BMT01: mật khẩu lưu trong TAIKHOAN là chuỗi băm, không phải mật khẩu gốc")]
    public void MatKhauDuocBam()
    {
        TaiKhoan taiKhoan = lay<DAL_TaiKhoan>().timTaiKhoan("quanly")!;
        Assert.StartsWith("PBKDF2-SHA256$", taiKhoan.MatKhau);
        Assert.DoesNotContain("Quanly@123", taiKhoan.MatKhau);
    }
}
