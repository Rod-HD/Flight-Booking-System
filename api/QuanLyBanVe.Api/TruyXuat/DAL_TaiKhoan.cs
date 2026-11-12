using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng TAIKHOAN.</summary>
public class DAL_TaiKhoan
{
    private readonly KetNoiCSDL ketNoi;

    public DAL_TaiKhoan(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    private static TaiKhoan taoTaiKhoan(SqlDataReader dong)
    {
        return new TaiKhoan(dong.GetString(0), dong.GetString(1), dong.GetString(2), dong.GetString(3));
    }

    public TaiKhoan? timTaiKhoan(string tenDN)
    {
        return ketNoi.docMot(
            "SELECT TenDangNhap, MatKhau, NhomQuyen, TrangThai FROM TAIKHOAN WHERE TenDangNhap = @ten",
            taoTaiKhoan, ThamSo.Chuoi("@ten", tenDN, 30));
    }

    public string? layNhomQuyen(string tenDN)
    {
        return ketNoi.docGiaTri(
            "SELECT NhomQuyen FROM TAIKHOAN WHERE TenDangNhap = @ten",
            ThamSo.Chuoi("@ten", tenDN, 30)) as string;
    }

    public List<TaiKhoan> layDanhSach()
    {
        return ketNoi.docDanhSach(
            "SELECT TenDangNhap, MatKhau, NhomQuyen, TrangThai FROM TAIKHOAN ORDER BY TenDangNhap", taoTaiKhoan);
    }

    public bool kiemTraTrungTen(string tenDN)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM TAIKHOAN WHERE TenDangNhap = @ten",
            ThamSo.Chuoi("@ten", tenDN, 30)) > 0;
    }

    public int demTaiKhoan()
    {
        return ketNoi.docSoNguyen("SELECT COUNT(*) FROM TAIKHOAN");
    }

    /// <summary>
    /// Số tài khoản Quản lý đang Hoạt động, không tính tenDN. Có khóa để hai Quản lý
    /// không cùng lúc khóa hoặc hạ quyền lẫn nhau làm hệ thống hết tài khoản Quản lý.
    /// </summary>
    public int demQuanLyHoatDongKhac(string tenDN)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM TAIKHOAN WITH (UPDLOCK, HOLDLOCK) "
            + "WHERE NhomQuyen = N'Quản lý' AND TrangThai = N'Hoạt động' AND TenDangNhap <> @ten",
            ThamSo.Chuoi("@ten", tenDN, 30));
    }

    /// <summary>Thêm tài khoản mới ở trạng thái Hoạt động; matKhau là chuỗi đã băm.</summary>
    public void them(string tenDN, string matKhau, string nhomQuyen)
    {
        ketNoi.thucThi(
            "INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, NhomQuyen, TrangThai) VALUES (@ten, @matKhau, @nhom, N'Hoạt động')",
            ThamSo.Chuoi("@ten", tenDN, 30),
            ThamSo.Chuoi("@matKhau", matKhau, 200),
            ThamSo.ChuoiCoDau("@nhom", nhomQuyen, 16));
    }

    /// <summary>Đổi nhóm quyền; matKhau (đã băm) bằng null thì giữ chuỗi băm cũ.</summary>
    public int capNhat(string tenDN, string nhomQuyen, string? matKhau)
    {
        return ketNoi.thucThi(
            "UPDATE TAIKHOAN SET NhomQuyen = @nhom, MatKhau = ISNULL(@matKhau, MatKhau) WHERE TenDangNhap = @ten",
            ThamSo.Chuoi("@ten", tenDN, 30),
            ThamSo.ChuoiCoDau("@nhom", nhomQuyen, 16),
            ThamSo.Chuoi("@matKhau", matKhau, 200));
    }

    public int khoa(string tenDN)
    {
        return ketNoi.thucThi(
            "UPDATE TAIKHOAN SET TrangThai = N'Đã khóa' WHERE TenDangNhap = @ten",
            ThamSo.Chuoi("@ten", tenDN, 30));
    }

    public int moKhoa(string tenDN)
    {
        return ketNoi.thucThi(
            "UPDATE TAIKHOAN SET TrangThai = N'Hoạt động' WHERE TenDangNhap = @ten",
            ThamSo.Chuoi("@ten", tenDN, 30));
    }
}
