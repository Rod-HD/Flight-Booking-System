using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng HANGVE.</summary>
public class DAL_HangVe
{
    private readonly KetNoiCSDL ketNoi;

    public DAL_HangVe(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    private static HangVe taoHangVe(SqlDataReader dong)
    {
        return new HangVe(dong.GetString(0), dong.GetString(1), dong.GetDecimal(2));
    }

    public List<HangVe> layDanhSachHangVe()
    {
        return ketNoi.docDanhSach(
            "SELECT MaHangVe, TenHangVe, TiLeDonGia FROM HANGVE ORDER BY MaHangVe", taoHangVe);
    }

    public HangVe? layHangVe(string maHang)
    {
        return ketNoi.docMot(
            "SELECT MaHangVe, TenHangVe, TiLeDonGia FROM HANGVE WHERE MaHangVe = @ma", taoHangVe,
            ThamSo.Chuoi("@ma", maHang, 5));
    }

    public bool kiemTraTrungTen(string tenHangVe, string? maBoQua)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM HANGVE WHERE TenHangVe = @ten AND (@boQua IS NULL OR MaHangVe <> @boQua)",
            ThamSo.ChuoiCoDau("@ten", tenHangVe, 30),
            ThamSo.Chuoi("@boQua", maBoQua, 5)) > 0;
    }

    public int demHangVe(bool khoaBang = false)
    {
        string khoa = khoaBang ? " WITH (UPDLOCK, HOLDLOCK)" : "";
        return ketNoi.docSoNguyen("SELECT COUNT(*) FROM HANGVE" + khoa);
    }

    /// <summary>Thêm hạng vé kèm tỉ lệ đơn giá; tỉ lệ chỉ được nhập ở đây (QĐ6, giả định 11).</summary>
    public void them(HangVe hangVe)
    {
        ketNoi.thucThi(
            "INSERT INTO HANGVE (MaHangVe, TenHangVe, TiLeDonGia) VALUES (@ma, @ten, @tiLe)",
            ThamSo.Chuoi("@ma", hangVe.MaHangVe, 5),
            ThamSo.ChuoiCoDau("@ten", hangVe.TenHangVe, 30),
            ThamSo.TiLe("@tiLe", hangVe.TiLeDonGia));
    }

    /// <summary>Chỉ sửa tên hạng vé; mã và tỉ lệ đơn giá không sửa sau khi lưu.</summary>
    public int suaTen(string maHang, string tenHangVe)
    {
        return ketNoi.thucThi(
            "UPDATE HANGVE SET TenHangVe = @ten WHERE MaHangVe = @ma",
            ThamSo.Chuoi("@ma", maHang, 5),
            ThamSo.ChuoiCoDau("@ten", tenHangVe, 30));
    }

    public int xoa(string maHang)
    {
        return ketNoi.thucThi(
            "DELETE FROM HANGVE WHERE MaHangVe = @ma",
            ThamSo.Chuoi("@ma", maHang, 5));
    }
}
