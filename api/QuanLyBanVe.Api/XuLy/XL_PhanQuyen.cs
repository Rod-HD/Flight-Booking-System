using System.Text.RegularExpressions;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>UC02 Phân quyền: thêm, sửa, khóa, mở khóa tài khoản (chỉ Quản lý).</summary>
public class XL_PhanQuyen
{
    private const int DO_DAI_MAT_KHAU_TOI_THIEU = 6;
    private static readonly Regex mauTenDangNhap = new("^[A-Za-z0-9._-]{1,30}$", RegexOptions.Compiled);

    private readonly KetNoiCSDL ketNoi;
    private readonly DAL_TaiKhoan dalTaiKhoan;
    private readonly PhienLamViec phien;

    public XL_PhanQuyen(KetNoiCSDL ketNoi, DAL_TaiKhoan dalTaiKhoan, PhienLamViec phien)
    {
        this.ketNoi = ketNoi;
        this.dalTaiKhoan = dalTaiKhoan;
        this.phien = phien;
    }

    public List<TaiKhoan> layDanhSachTaiKhoan()
    {
        return dalTaiKhoan.layDanhSach();
    }

    public void themTaiKhoan(string? tenDN, string? matKhau, string? nhomQuyen)
    {
        tenDN = (tenDN ?? "").Trim();
        kiemTraHopLe(tenDN, matKhau, nhomQuyen, laThemMoi: true);

        var trung = LoiNghiepVu.viPham(MaLoi.TRUNG_MA, "Tên đăng nhập đã tồn tại.", "tenDangNhap");
        if (dalTaiKhoan.kiemTraTrungTen(tenDN)) throw trung;
        try
        {
            // mật khẩu được băm một chiều trước khi lưu
            dalTaiKhoan.them(tenDN, TienIch_BaoMat.maHoa(matKhau!), nhomQuyen!);
        }
        catch (LoiTrungDuLieu)
        {
            throw trung;
        }
    }

    /// <summary>Đổi nhóm quyền và đặt lại mật khẩu; matKhauMoi để trống thì giữ mật khẩu cũ.</summary>
    public void suaTaiKhoan(string tenDN, string? nhomQuyen, string? matKhauMoi)
    {
        TaiKhoan taiKhoan = dalTaiKhoan.timTaiKhoan(tenDN) ?? throw khongCoTaiKhoan();
        kiemTraHopLe(taiKhoan.TenDangNhap, matKhauMoi, nhomQuyen, laThemMoi: false);

        // ngoại lệ 6b: không tự đổi nhóm quyền của tài khoản đang đăng nhập
        if (kiemTraTaiKhoanDangDangNhap(taiKhoan.TenDangNhap) && nhomQuyen != taiKhoan.NhomQuyen)
            throw LoiNghiepVu.viPham(MaLoi.KHONG_DUOC_TU_DOI_QUYEN,
                "Không được đổi nhóm quyền của tài khoản đang đăng nhập.", "nhomQuyen");

        string? matKhauDaMaHoa = string.IsNullOrEmpty(matKhauMoi) ? null : TienIch_BaoMat.maHoa(matKhauMoi);
        ketNoi.thucHienTrongGiaoDich(() =>
        {
            bool haQuyenQuanLy = taiKhoan.NhomQuyen == TaiKhoan.QUAN_LY && nhomQuyen != TaiKhoan.QUAN_LY
                && taiKhoan.TrangThai == TaiKhoan.HOAT_DONG;
            if (haQuyenQuanLy) kiemTraConQuanLyKhac(taiKhoan.TenDangNhap);
            dalTaiKhoan.capNhat(taiKhoan.TenDangNhap, nhomQuyen!, matKhauDaMaHoa);
        });
    }

    public void khoaTaiKhoan(string tenDN)
    {
        TaiKhoan taiKhoan = dalTaiKhoan.timTaiKhoan(tenDN) ?? throw khongCoTaiKhoan();

        // ngoại lệ 3a1: không khóa chính tài khoản đang đăng nhập
        if (kiemTraTaiKhoanDangDangNhap(taiKhoan.TenDangNhap))
            throw LoiNghiepVu.viPham(MaLoi.KHONG_DUOC_TU_KHOA, "Không được khóa tài khoản đang đăng nhập.");

        ketNoi.thucHienTrongGiaoDich(() =>
        {
            if (taiKhoan.NhomQuyen == TaiKhoan.QUAN_LY && taiKhoan.TrangThai == TaiKhoan.HOAT_DONG)
                kiemTraConQuanLyKhac(taiKhoan.TenDangNhap);
            dalTaiKhoan.khoa(taiKhoan.TenDangNhap);
        });
    }

    public void moKhoaTaiKhoan(string tenDN)
    {
        TaiKhoan taiKhoan = dalTaiKhoan.timTaiKhoan(tenDN) ?? throw khongCoTaiKhoan();
        dalTaiKhoan.moKhoa(taiKhoan.TenDangNhap);
    }

    /// <summary>
    /// Tạo các tài khoản ban đầu khi bảng TAIKHOAN còn rỗng (lần chạy đầu sau khi cài đặt).
    /// Trả về số tài khoản đã tạo.
    /// </summary>
    public int taoTaiKhoanBanDau(IEnumerable<(string TenDangNhap, string MatKhau, string NhomQuyen, bool DaKhoa)> danhSach)
    {
        if (dalTaiKhoan.demTaiKhoan() > 0) return 0;
        int soDaTao = 0;
        foreach (var (tenDN, matKhau, nhomQuyen, daKhoa) in danhSach)
        {
            dalTaiKhoan.them(tenDN, TienIch_BaoMat.maHoa(matKhau), nhomQuyen);
            if (daKhoa) dalTaiKhoan.khoa(tenDN);
            soDaTao++;
        }
        return soDaTao;
    }

    private static void kiemTraHopLe(string tenDN, string? matKhau, string? nhomQuyen, bool laThemMoi)
    {
        var loi = new Dictionary<string, string>();
        if (laThemMoi)
        {
            if (tenDN.Length == 0) loi["tenDangNhap"] = "Chưa nhập tên đăng nhập.";
            else if (!mauTenDangNhap.IsMatch(tenDN))
                loi["tenDangNhap"] = "Tên đăng nhập tối đa 30 ký tự, không chứa khoảng trắng, chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới, gạch nối.";
        }

        string truongMatKhau = laThemMoi ? "matKhau" : "matKhauMoi";
        if (string.IsNullOrEmpty(matKhau))
        {
            // khi sửa, để trống mật khẩu nghĩa là giữ mật khẩu cũ
            if (laThemMoi) loi[truongMatKhau] = "Chưa nhập mật khẩu.";
        }
        else if (matKhau.Length < DO_DAI_MAT_KHAU_TOI_THIEU || matKhau.Length > 100)
        {
            loi[truongMatKhau] = "Mật khẩu phải có từ " + DO_DAI_MAT_KHAU_TOI_THIEU + " đến 100 ký tự.";
        }

        if (nhomQuyen != TaiKhoan.QUAN_LY && nhomQuyen != TaiKhoan.NHAN_VIEN)
            loi["nhomQuyen"] = "Nhóm quyền phải là Quản lý hoặc Nhân viên bán vé.";

        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
    }

    private bool kiemTraTaiKhoanDangDangNhap(string tenDN)
    {
        return string.Equals(tenDN, phien.TenDangNhap, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Hệ thống luôn còn ít nhất một tài khoản Quản lý đang hoạt động.</summary>
    private void kiemTraConQuanLyKhac(string tenDN)
    {
        if (dalTaiKhoan.demQuanLyHoatDongKhac(tenDN) == 0)
            throw LoiNghiepVu.viPham(MaLoi.DU_LIEU_DA_THAY_DOI,
                "Hệ thống phải còn ít nhất một tài khoản Quản lý đang hoạt động.");
    }

    private static LoiNghiepVu khongCoTaiKhoan()
    {
        return LoiNghiepVu.khongTimThay("Không tìm thấy tài khoản.");
    }
}
