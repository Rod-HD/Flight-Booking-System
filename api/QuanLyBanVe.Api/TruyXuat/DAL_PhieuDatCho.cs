using System.Data;
using System.Text;
using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng PHIEUDATCHO.</summary>
public class DAL_PhieuDatCho
{
    /// <summary>Số dòng tối đa trả về cho một lần tra cứu phiếu.</summary>
    public const int SO_DONG_TOI_DA = 1000;

    private const string COT_PHIEU = "p.MaPhieuDat, p.MaChuyenBay, p.MaHanhKhach, p.MaHangVe, p.GiaTien, p.ThoiDiemDat, p.TinhTrang";

    private readonly KetNoiCSDL ketNoi;

    public DAL_PhieuDatCho(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    private static PhieuDatCho taoPhieu(SqlDataReader dong)
    {
        return new PhieuDatCho(dong.GetString(0), dong.GetString(1), dong.GetString(2), dong.GetString(3),
            dong.GetDecimal(4), dong.GetDateTime(5), dong.GetString(6));
    }

    /// <summary>Lưu phiếu và trả về mã phiếu đặt vừa cấp (PD và 8 chữ số).</summary>
    public string themPhieuDat(PhieuDatCho phieu)
    {
        return (string)ketNoi.docGiaTri(
            "INSERT INTO PHIEUDATCHO (MaChuyenBay, MaHanhKhach, MaHangVe, GiaTien, ThoiDiemDat, TinhTrang) "
            + "OUTPUT inserted.MaPhieuDat "
            + "VALUES (@maCB, @maHK, @maHang, @giaTien, @thoiDiemDat, @tinhTrang)",
            ThamSo.Chuoi("@maCB", phieu.MaChuyenBay, 10),
            ThamSo.Chuoi("@maHK", phieu.MaHanhKhach, 10),
            ThamSo.Chuoi("@maHang", phieu.MaHangVe, 5),
            ThamSo.Tien("@giaTien", phieu.GiaTien),
            ThamSo.NgayGio("@thoiDiemDat", phieu.ThoiDiemDat),
            ThamSo.ChuoiCoDau("@tinhTrang", phieu.TinhTrang, 14))!;
    }

    private const string CAU_TRA_CUU =
        "SELECT TOP (@soDong) p.MaPhieuDat, p.MaChuyenBay, hk.HoTen, hk.LoaiGiayTo, hk.SoGiayTo, hk.DienThoai, "
        + "p.MaHangVe, hv.TenHangVe, p.GiaTien, p.ThoiDiemDat, p.TinhTrang, "
        + "cb.NgayGioKhoiHanh, cb.MaSanBayDi, cb.MaSanBayDen "
        + "FROM PHIEUDATCHO p "
        + "JOIN HANHKHACH hk ON hk.MaHanhKhach = p.MaHanhKhach "
        + "JOIN HANGVE hv ON hv.MaHangVe = p.MaHangVe "
        + "JOIN CHUYENBAY cb ON cb.MaChuyenBay = p.MaChuyenBay";

    /// <summary>Tra cứu phiếu, ghép thêm thông tin hành khách, hạng vé và chuyến bay.</summary>
    public DataTable timPhieu(TieuChiTim tieuChi)
    {
        var sql = new StringBuilder(CAU_TRA_CUU + " WHERE 1 = 1");
        var thamSo = new List<SqlParameter> { ThamSo.SoNguyen("@soDong", SO_DONG_TOI_DA) };

        if (!string.IsNullOrEmpty(tieuChi.MaSo))
        {
            sql.Append(" AND p.MaPhieuDat LIKE @maPhieu");
            thamSo.Add(ThamSo.Chuoi("@maPhieu", ThamSo.thoatLike(tieuChi.MaSo) + "%", 40));
        }
        if (!string.IsNullOrEmpty(tieuChi.SoGiayTo))
        {
            sql.Append(" AND hk.SoGiayTo = @soGiayTo");
            thamSo.Add(ThamSo.Chuoi("@soGiayTo", tieuChi.SoGiayTo, 20));
        }
        if (!string.IsNullOrEmpty(tieuChi.MaChuyenBay))
        {
            sql.Append(" AND p.MaChuyenBay = @maCB");
            thamSo.Add(ThamSo.Chuoi("@maCB", tieuChi.MaChuyenBay, 10));
        }
        if (!string.IsNullOrEmpty(tieuChi.TinhTrang))
        {
            sql.Append(" AND p.TinhTrang = @tinhTrang");
            thamSo.Add(ThamSo.ChuoiCoDau("@tinhTrang", tieuChi.TinhTrang, 14));
        }
        sql.Append(" ORDER BY p.ThoiDiemDat DESC, p.MaPhieuDat DESC");
        return ketNoi.docBang(sql.ToString(), thamSo.ToArray());
    }

    /// <summary>
    /// Điều kiện phiếu còn hạn tại @thoiDiem: đang Chờ thanh toán, chưa quá 24 giờ kể từ lúc đặt
    /// (giả định 7) và chưa đến mốc hủy đặt vé theo QĐ3 (0 giờ của ngày cách ngày khởi hành @huy ngày).
    /// </summary>
    private const string DIEU_KIEN_CON_HAN =
        "p.TinhTrang = N'Chờ thanh toán' "
        + "AND p.ThoiDiemDat > DATEADD(HOUR, -24, @thoiDiem) "
        + "AND @thoiDiem < DATEADD(DAY, -@huy, CAST(CAST(cb.NgayGioKhoiHanh AS date) AS datetime2(0)))";

    /// <summary>
    /// Các phiếu còn hạn tại thoiDiem, phiếu có hạn thanh toán gần nhất đứng trước; cùng các cột như timPhieu.
    /// Hạn thanh toán là thời điểm sớm hơn giữa lúc đặt cộng 24 giờ và mốc hủy đặt vé theo QĐ3.
    /// </summary>
    public DataTable timPhieuSapHetHan(DateTime thoiDiem, int thoiGianHuyDatVe, int soLuong)
    {
        const string mocHuy = "DATEADD(DAY, -@huy, CAST(CAST(cb.NgayGioKhoiHanh AS date) AS datetime2(0)))";
        return ketNoi.docBang(
            CAU_TRA_CUU + " WHERE " + DIEU_KIEN_CON_HAN
            + " ORDER BY CASE WHEN DATEADD(HOUR, 24, p.ThoiDiemDat) < " + mocHuy
            + " THEN DATEADD(HOUR, 24, p.ThoiDiemDat) ELSE " + mocHuy + " END, p.MaPhieuDat",
            ThamSo.SoNguyen("@soDong", soLuong),
            ThamSo.NgayGio("@thoiDiem", thoiDiem),
            ThamSo.SoNguyen("@huy", thoiGianHuyDatVe));
    }

    /// <summary>Các phiếu còn hạn của một hành khách.</summary>
    public List<PhieuDatCho> layPhieuConHan(string maHanhKhach, DateTime thoiDiem, int thoiGianHuyDatVe)
    {
        return ketNoi.docDanhSach(
            "SELECT " + COT_PHIEU + " FROM PHIEUDATCHO p JOIN CHUYENBAY cb ON cb.MaChuyenBay = p.MaChuyenBay "
            + "WHERE p.MaHanhKhach = @maHK AND " + DIEU_KIEN_CON_HAN + " ORDER BY p.ThoiDiemDat, p.MaPhieuDat",
            taoPhieu,
            ThamSo.Chuoi("@maHK", maHanhKhach, 10),
            ThamSo.NgayGio("@thoiDiem", thoiDiem),
            ThamSo.SoNguyen("@huy", thoiGianHuyDatVe));
    }

    /// <summary>Tìm phiếu còn hạn theo mã phiếu đặt; null nếu không có hoặc phiếu hết hạn.</summary>
    public PhieuDatCho? timPhieuConHan(string maPhieuDat, DateTime thoiDiem, int thoiGianHuyDatVe)
    {
        return ketNoi.docMot(
            "SELECT " + COT_PHIEU + " FROM PHIEUDATCHO p JOIN CHUYENBAY cb ON cb.MaChuyenBay = p.MaChuyenBay "
            + "WHERE p.MaPhieuDat = @maPhieu AND " + DIEU_KIEN_CON_HAN,
            taoPhieu,
            ThamSo.Chuoi("@maPhieu", maPhieuDat, 10),
            ThamSo.NgayGio("@thoiDiem", thoiDiem),
            ThamSo.SoNguyen("@huy", thoiGianHuyDatVe));
    }

    /// <summary>Đọc một phiếu; khoaDong = true khi sắp sửa, hủy hoặc chuyển phiếu thành vé trong cùng giao dịch.</summary>
    public PhieuDatCho? layThongTinPhieu(string maPhieuDat, bool khoaDong = false)
    {
        return ketNoi.docMot(
            "SELECT " + COT_PHIEU + " FROM PHIEUDATCHO p" + (khoaDong ? " WITH (UPDLOCK, HOLDLOCK)" : "")
            + " WHERE p.MaPhieuDat = @maPhieu",
            taoPhieu, ThamSo.Chuoi("@maPhieu", maPhieuDat, 10));
    }

    /// <summary>
    /// Chuyển phiếu sang Đã hủy (AT03: không xóa phiếu). Chỉ cập nhật phiếu còn Chờ thanh toán
    /// nên một phiếu không bị hủy hai lần; trả về số phiếu thực sự được hủy (0 hoặc 1).
    /// </summary>
    public int huy(string maPhieuDat)
    {
        return ketNoi.thucThi(
            "UPDATE PHIEUDATCHO SET TinhTrang = N'Đã hủy' WHERE MaPhieuDat = @maPhieu AND TinhTrang = N'Chờ thanh toán'",
            ThamSo.Chuoi("@maPhieu", maPhieuDat, 10));
    }

    /// <summary>Các phiếu Chờ thanh toán đã quá 24 giờ kể từ lúc đặt, tính đến thoiDiem (giả định 7).</summary>
    public List<PhieuDatCho> layPhieuQuaHan(DateTime thoiDiem)
    {
        return ketNoi.docDanhSach(
            "SELECT " + COT_PHIEU + " FROM PHIEUDATCHO p "
            + "WHERE p.TinhTrang = N'Chờ thanh toán' AND p.ThoiDiemDat <= DATEADD(HOUR, -24, @thoiDiem)",
            taoPhieu, ThamSo.NgayGio("@thoiDiem", thoiDiem));
    }

    /// <summary>Các phiếu Chờ thanh toán của một chuyến bay.</summary>
    public List<PhieuDatCho> layPhieuChoThanhToan(string maCB)
    {
        return ketNoi.docDanhSach(
            "SELECT " + COT_PHIEU + " FROM PHIEUDATCHO p WHERE p.MaChuyenBay = @maCB AND p.TinhTrang = N'Chờ thanh toán'",
            taoPhieu, ThamSo.Chuoi("@maCB", maCB, 10));
    }

    public int demPhieuChoThanhToan(string maCB)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM PHIEUDATCHO WHERE MaChuyenBay = @maCB AND TinhTrang = N'Chờ thanh toán'",
            ThamSo.Chuoi("@maCB", maCB, 10));
    }

    public int demPhieuChoThanhToan(string maCB, string maHang)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM PHIEUDATCHO WHERE MaChuyenBay = @maCB AND MaHangVe = @maHang AND TinhTrang = N'Chờ thanh toán'",
            ThamSo.Chuoi("@maCB", maCB, 10),
            ThamSo.Chuoi("@maHang", maHang, 5));
    }

    /// <summary>Chuyến bay đã có phiếu nào chưa, kể cả phiếu Đã hủy được giữ lại để lưu vết.</summary>
    public bool kiemTraCoPhieu(string maCB)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM (SELECT TOP (1) MaPhieuDat FROM PHIEUDATCHO WHERE MaChuyenBay = @maCB) t",
            ThamSo.Chuoi("@maCB", maCB, 10)) > 0;
    }

    /// <summary>
    /// Điều kiện của phiếu được xóa hẳn (AT04): Đã hủy, đặt trước mốc thời gian
    /// và chưa được vé nào tham chiếu qua MaPhieuDat.
    /// </summary>
    private const string DIEU_KIEN_XOA =
        "TinhTrang = N'Đã hủy' AND ThoiDiemDat < @moc "
        + "AND NOT EXISTS (SELECT 1 FROM VE v WHERE v.MaPhieuDat = PHIEUDATCHO.MaPhieuDat)";

    public int demPhieuDaHuy(DateTime mocThoiGian)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM PHIEUDATCHO WHERE " + DIEU_KIEN_XOA, ThamSo.NgayGio("@moc", mocThoiGian));
    }

    /// <summary>Xóa hẳn các phiếu Đã hủy trước mốc; trả về số phiếu đã xóa.</summary>
    public int xoaPhieuDaHuy(DateTime mocThoiGian)
    {
        return ketNoi.thucThi(
            "DELETE FROM PHIEUDATCHO WHERE " + DIEU_KIEN_XOA, ThamSo.NgayGio("@moc", mocThoiGian));
    }
}
