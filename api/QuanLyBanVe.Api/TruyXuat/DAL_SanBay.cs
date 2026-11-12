using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng SANBAY.</summary>
public class DAL_SanBay
{
    private readonly KetNoiCSDL ketNoi;

    public DAL_SanBay(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    private static SanBay taoSanBay(SqlDataReader dong)
    {
        return new SanBay(dong.GetString(0), dong.GetString(1));
    }

    public List<SanBay> layDanhSachSanBay()
    {
        return ketNoi.docDanhSach(
            "SELECT MaSanBay, TenSanBay FROM SANBAY ORDER BY MaSanBay", taoSanBay);
    }

    public SanBay? laySanBay(string maSanBay)
    {
        return ketNoi.docMot(
            "SELECT MaSanBay, TenSanBay FROM SANBAY WHERE MaSanBay = @ma", taoSanBay,
            ThamSo.Chuoi("@ma", maSanBay, 3));
    }

    /// <summary>Có sân bay khác (khác maBoQua) đã dùng tên này chưa.</summary>
    public bool kiemTraTrungTen(string tenSanBay, string? maBoQua)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM SANBAY WHERE TenSanBay = @ten AND (@boQua IS NULL OR MaSanBay <> @boQua)",
            ThamSo.ChuoiCoDau("@ten", tenSanBay, 100),
            ThamSo.Chuoi("@boQua", maBoQua, 3)) > 0;
    }

    /// <summary>Đếm số sân bay; khoaBang = true khi cần giữ danh sách không đổi đến hết giao dịch.</summary>
    public int demSanBay(bool khoaBang = false)
    {
        string khoa = khoaBang ? " WITH (UPDLOCK, HOLDLOCK)" : "";
        return ketNoi.docSoNguyen("SELECT COUNT(*) FROM SANBAY" + khoa);
    }

    public void them(SanBay sanBay)
    {
        ketNoi.thucThi(
            "INSERT INTO SANBAY (MaSanBay, TenSanBay) VALUES (@ma, @ten)",
            ThamSo.Chuoi("@ma", sanBay.MaSanBay, 3),
            ThamSo.ChuoiCoDau("@ten", sanBay.TenSanBay, 100));
    }

    /// <summary>Sửa tên sân bay (mã không sửa sau khi lưu); trả về số dòng đã sửa.</summary>
    public int sua(SanBay sanBay)
    {
        return ketNoi.thucThi(
            "UPDATE SANBAY SET TenSanBay = @ten WHERE MaSanBay = @ma",
            ThamSo.Chuoi("@ma", sanBay.MaSanBay, 3),
            ThamSo.ChuoiCoDau("@ten", sanBay.TenSanBay, 100));
    }

    public int xoa(string maSanBay)
    {
        return ketNoi.thucThi(
            "DELETE FROM SANBAY WHERE MaSanBay = @ma",
            ThamSo.Chuoi("@ma", maSanBay, 3));
    }
}
