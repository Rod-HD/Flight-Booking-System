using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>UC01 Đăng nhập.</summary>
public class XL_DangNhap
{
    // chuỗi băm giả để khi tên đăng nhập không tồn tại vẫn tốn thời gian băm như khi có tài khoản
    private static readonly Lazy<string> bamGia = new(() => TienIch_BaoMat.maHoa(Guid.NewGuid().ToString()));

    private readonly DAL_TaiKhoan dalTaiKhoan;
    private readonly PhienLamViec phien;

    public XL_DangNhap(DAL_TaiKhoan dalTaiKhoan, PhienLamViec phien)
    {
        this.dalTaiKhoan = dalTaiKhoan;
        this.phien = phien;
    }

    /// <summary>Kiểm tra tài khoản, mật khẩu; đúng thì ghi vào phiên làm việc và trả về tài khoản kèm nhóm quyền.</summary>
    public TaiKhoan dangNhap(string? tenDN, string? matKhau)
    {
        var loi = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(tenDN)) loi["tenDangNhap"] = "Chưa nhập tên đăng nhập.";
        if (string.IsNullOrEmpty(matKhau)) loi["matKhau"] = "Chưa nhập mật khẩu.";
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);

        TaiKhoan? taiKhoan = dalTaiKhoan.timTaiKhoan(tenDN!.Trim());
        kiemTraTaiKhoan(taiKhoan, matKhau!);

        taiKhoan!.NhomQuyen = dalTaiKhoan.layNhomQuyen(taiKhoan.TenDangNhap) ?? taiKhoan.NhomQuyen;
        phien.batDau(taiKhoan);
        return taiKhoan;
    }

    public void dangXuat()
    {
        phien.ketThuc();
    }

    private static void kiemTraTaiKhoan(TaiKhoan? taiKhoan, string matKhau)
    {
        // BMT01: thông báo không chỉ rõ sai tên đăng nhập hay sai mật khẩu
        var sai = new LoiNghiepVu(LoaiLoi.ChuaXacThuc, MaLoi.SAI_THONG_TIN_DANG_NHAP, "Sai tên đăng nhập hoặc mật khẩu.");
        if (taiKhoan == null)
        {
            TienIch_BaoMat.kiemTraMatKhau(matKhau, bamGia.Value);
            throw sai;
        }
        if (!TienIch_BaoMat.kiemTraMatKhau(matKhau, taiKhoan.MatKhau)) throw sai;

        // chỉ báo tài khoản bị khóa khi mật khẩu đúng
        if (taiKhoan.TrangThai != TaiKhoan.HOAT_DONG)
            throw new LoiNghiepVu(LoaiLoi.KhongCoQuyen, MaLoi.TAI_KHOAN_BI_KHOA, "Tài khoản đã bị khóa.");
    }
}
