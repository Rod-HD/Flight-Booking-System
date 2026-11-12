using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng CHITIETTRUNGGIAN; được DAL_ChuyenBay gọi khi lưu, đọc chuyến bay.</summary>
public class DAL_ChiTietTrungGian
{
    private readonly KetNoiCSDL ketNoi;

    public DAL_ChiTietTrungGian(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    public List<ChiTietTrungGian> layTheoChuyenBay(string maCB)
    {
        return ketNoi.docDanhSach(
            "SELECT MaChuyenBay, ThuTu, MaSanBay, ThoiGianDung, GhiChu FROM CHITIETTRUNGGIAN "
            + "WHERE MaChuyenBay = @maCB ORDER BY ThuTu",
            dong => new ChiTietTrungGian(dong.GetString(0), dong.GetByte(1), dong.GetString(2), dong.GetInt32(3),
                dong.IsDBNull(4) ? null : dong.GetString(4)),
            ThamSo.Chuoi("@maCB", maCB, 10));
    }

    public void them(List<ChiTietTrungGian> ds)
    {
        foreach (ChiTietTrungGian chiTiet in ds)
        {
            ketNoi.thucThi(
                "INSERT INTO CHITIETTRUNGGIAN (MaChuyenBay, ThuTu, MaSanBay, ThoiGianDung, GhiChu) "
                + "VALUES (@maCB, @thuTu, @maSanBay, @thoiGianDung, @ghiChu)",
                ThamSo.Chuoi("@maCB", chiTiet.MaChuyenBay, 10),
                ThamSo.SoNguyen("@thuTu", chiTiet.ThuTu),
                ThamSo.Chuoi("@maSanBay", chiTiet.MaSanBay, 3),
                ThamSo.SoNguyen("@thoiGianDung", chiTiet.ThoiGianDung),
                ThamSo.ChuoiCoDau("@ghiChu", chiTiet.GhiChu, 200));
        }
    }

    public void xoaTheoChuyenBay(string maCB)
    {
        ketNoi.thucThi("DELETE FROM CHITIETTRUNGGIAN WHERE MaChuyenBay = @maCB", ThamSo.Chuoi("@maCB", maCB, 10));
    }
}
