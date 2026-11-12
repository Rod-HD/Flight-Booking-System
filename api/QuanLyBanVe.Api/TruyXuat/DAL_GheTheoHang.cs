using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng GHETHEOHANG.</summary>
public class DAL_GheTheoHang
{
    /// <summary>
    /// Khóa dòng số ghế đến hết giao dịch: yêu cầu bán vé, đặt vé khác trên cùng hạng của chuyến bay
    /// phải chờ, nên hai máy không cùng bán chiếc ghế cuối.
    /// </summary>
    private const string KHOA_DONG = " WITH (UPDLOCK, HOLDLOCK)";

    private readonly KetNoiCSDL ketNoi;

    public DAL_GheTheoHang(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    public List<GheTheoHang> layTheoChuyenBay(string maCB, bool khoaDong = false)
    {
        return ketNoi.docDanhSach(
            "SELECT MaChuyenBay, MaHangVe, SoLuongGhe FROM GHETHEOHANG" + (khoaDong ? KHOA_DONG : "")
            + " WHERE MaChuyenBay = @maCB ORDER BY MaHangVe",
            dong => new GheTheoHang(dong.GetString(0), dong.GetString(1), dong.GetInt32(2)),
            ThamSo.Chuoi("@maCB", maCB, 10));
    }

    /// <summary>Tổng số lượng ghế các hạng của chuyến bay.</summary>
    public int laySoLuongGhe(string maCB)
    {
        return ketNoi.docSoNguyen(
            "SELECT ISNULL(SUM(SoLuongGhe), 0) FROM GHETHEOHANG WHERE MaChuyenBay = @maCB",
            ThamSo.Chuoi("@maCB", maCB, 10));
    }

    /// <summary>Số lượng ghế của một hạng trên chuyến bay; 0 nếu chuyến bay không có hạng này.</summary>
    public int laySoLuongGhe(string maCB, string maHang, bool khoaDong = false)
    {
        return ketNoi.docSoNguyen(
            "SELECT SoLuongGhe FROM GHETHEOHANG" + (khoaDong ? KHOA_DONG : "")
            + " WHERE MaChuyenBay = @maCB AND MaHangVe = @maHang",
            ThamSo.Chuoi("@maCB", maCB, 10),
            ThamSo.Chuoi("@maHang", maHang, 5));
    }

    public void them(List<GheTheoHang> ds)
    {
        foreach (GheTheoHang ghe in ds)
        {
            ketNoi.thucThi(
                "INSERT INTO GHETHEOHANG (MaChuyenBay, MaHangVe, SoLuongGhe) VALUES (@maCB, @maHang, @soLuong)",
                ThamSo.Chuoi("@maCB", ghe.MaChuyenBay, 10),
                ThamSo.Chuoi("@maHang", ghe.MaHangVe, 5),
                ThamSo.SoNguyen("@soLuong", ghe.SoLuongGhe));
        }
    }

    /// <summary>
    /// Sửa số ghế của các hạng đã có, thêm dòng cho hạng mới và chỉ xóa dòng của hạng không còn
    /// vé, phiếu nào (cặp chuyến bay, hạng vé của VE, PHIEUDATCHO phải tồn tại trong bảng này).
    /// </summary>
    public void capNhat(string maCB, List<GheTheoHang> ds)
    {
        foreach (GheTheoHang ghe in ds)
        {
            int soDong = ketNoi.thucThi(
                "UPDATE GHETHEOHANG SET SoLuongGhe = @soLuong WHERE MaChuyenBay = @maCB AND MaHangVe = @maHang",
                ThamSo.Chuoi("@maCB", maCB, 10),
                ThamSo.Chuoi("@maHang", ghe.MaHangVe, 5),
                ThamSo.SoNguyen("@soLuong", ghe.SoLuongGhe));
            if (soDong == 0)
                them(new List<GheTheoHang> { new GheTheoHang(maCB, ghe.MaHangVe, ghe.SoLuongGhe) });
        }

        var conLai = new HashSet<string>(ds.Select(ghe => ghe.MaHangVe));
        foreach (GheTheoHang cu in layTheoChuyenBay(maCB))
        {
            if (conLai.Contains(cu.MaHangVe)) continue;
            ketNoi.thucThi(
                "DELETE FROM GHETHEOHANG WHERE MaChuyenBay = @maCB AND MaHangVe = @maHang "
                + "AND NOT EXISTS (SELECT 1 FROM VE WHERE MaChuyenBay = @maCB AND MaHangVe = @maHang) "
                + "AND NOT EXISTS (SELECT 1 FROM PHIEUDATCHO WHERE MaChuyenBay = @maCB AND MaHangVe = @maHang)",
                ThamSo.Chuoi("@maCB", maCB, 10),
                ThamSo.Chuoi("@maHang", cu.MaHangVe, 5));
        }
    }

    public void xoaTheoChuyenBay(string maCB)
    {
        ketNoi.thucThi("DELETE FROM GHETHEOHANG WHERE MaChuyenBay = @maCB", ThamSo.Chuoi("@maCB", maCB, 10));
    }
}
