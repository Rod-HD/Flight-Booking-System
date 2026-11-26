using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng CHITIETSANBAYTRUNGGIAN; được DAL_ChuyenBay gọi khi lưu, đọc chuyến bay.</summary>
public class DAL_ChiTietSanBayTrungGian
{
    private readonly KetNoiCSDL ketNoi;

    public DAL_ChiTietSanBayTrungGian(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    public List<ChiTietSanBayTrungGian> layTheoChuyenBay(string maCB)
    {
        return ketNoi.docDanhSach(
            "SELECT MaChuyenBay, ThuTu, MaSanBay, ThoiGianDung, GhiChu FROM CHITIETSANBAYTRUNGGIAN "
            + "WHERE MaChuyenBay = @maCB ORDER BY ThuTu",
            dong => new ChiTietSanBayTrungGian(dong.GetString(0), dong.GetByte(1), dong.GetString(2), dong.GetInt32(3),
                dong.IsDBNull(4) ? null : dong.GetString(4)),
            ThamSo.Chuoi("@maCB", maCB, 10));
    }

    public void them(List<ChiTietSanBayTrungGian> ds)
    {
        foreach (ChiTietSanBayTrungGian chiTiet in ds)
        {
            ketNoi.thucThi(
                "INSERT INTO CHITIETSANBAYTRUNGGIAN (MaChuyenBay, ThuTu, MaSanBay, ThoiGianDung, GhiChu) "
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
        ketNoi.thucThi("DELETE FROM CHITIETSANBAYTRUNGGIAN WHERE MaChuyenBay = @maCB", ThamSo.Chuoi("@maCB", maCB, 10));
    }
}
