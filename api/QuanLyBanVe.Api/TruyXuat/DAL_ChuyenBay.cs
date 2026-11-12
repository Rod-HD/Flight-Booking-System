using System.Data;
using System.Text;
using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>
/// Truy xuất bảng CHUYENBAY. Số ghế trống, số ghế đặt không lưu mà được đếm từ GHETHEOHANG,
/// VE và PHIEUDATCHO qua các lớp DAL_ tương ứng.
/// </summary>
public class DAL_ChuyenBay
{
    private const string COT_CHUYEN_BAY = "cb.MaChuyenBay, cb.GiaVe, cb.MaSanBayDi, cb.MaSanBayDen, cb.NgayGioKhoiHanh, cb.ThoiGianBay";

    private readonly KetNoiCSDL ketNoi;
    private readonly DAL_GheTheoHang dalGheTheoHang;
    private readonly DAL_ChiTietTrungGian dalChiTietTrungGian;
    private readonly DAL_Ve dalVe;
    private readonly DAL_PhieuDatCho dalPhieuDatCho;

    public DAL_ChuyenBay(KetNoiCSDL ketNoi, DAL_GheTheoHang dalGheTheoHang, DAL_ChiTietTrungGian dalChiTietTrungGian,
        DAL_Ve dalVe, DAL_PhieuDatCho dalPhieuDatCho)
    {
        this.ketNoi = ketNoi;
        this.dalGheTheoHang = dalGheTheoHang;
        this.dalChiTietTrungGian = dalChiTietTrungGian;
        this.dalVe = dalVe;
        this.dalPhieuDatCho = dalPhieuDatCho;
    }

    private static ChuyenBay taoChuyenBay(SqlDataReader dong)
    {
        return new ChuyenBay(dong.GetString(0), dong.GetDecimal(1), dong.GetString(2), dong.GetString(3),
            dong.GetDateTime(4), dong.GetInt32(5));
    }

    /// <summary>Mã chuyến bay đã tồn tại hay chưa.</summary>
    public bool kiemTraMaChuyenBay(string maCB)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM CHUYENBAY WHERE MaChuyenBay = @maCB", ThamSo.Chuoi("@maCB", maCB, 10)) > 0;
    }

    /// <summary>Ghi CHUYENBAY rồi ghi số ghế từng hạng và các sân bay trung gian; lớp xử lý mở giao dịch trước khi gọi.</summary>
    public void themChuyenBay(ChuyenBay cb, List<GheTheoHang> dsGhe, List<ChiTietTrungGian> dsTrungGian)
    {
        ketNoi.thucThi(
            "INSERT INTO CHUYENBAY (MaChuyenBay, GiaVe, MaSanBayDi, MaSanBayDen, NgayGioKhoiHanh, ThoiGianBay) "
            + "VALUES (@maCB, @giaVe, @di, @den, @ngayGio, @thoiGianBay)",
            ThamSo.Chuoi("@maCB", cb.MaChuyenBay, 10),
            ThamSo.Tien("@giaVe", cb.GiaVe),
            ThamSo.Chuoi("@di", cb.MaSanBayDi, 3),
            ThamSo.Chuoi("@den", cb.MaSanBayDen, 3),
            ThamSo.NgayGio("@ngayGio", cb.NgayGioKhoiHanh),
            ThamSo.SoNguyen("@thoiGianBay", cb.ThoiGianBay));
        dalGheTheoHang.them(dsGhe);
        dalChiTietTrungGian.them(dsTrungGian);
    }

    /// <summary>Đọc dòng CHUYENBAY; null nếu không có chuyến bay.</summary>
    public ChuyenBay? layThongTin(string maCB)
    {
        return ketNoi.docMot(
            "SELECT " + COT_CHUYEN_BAY + " FROM CHUYENBAY cb WHERE cb.MaChuyenBay = @maCB",
            taoChuyenBay, ThamSo.Chuoi("@maCB", maCB, 10));
    }

    /// <summary>Đọc chuyến bay kèm số ghế từng hạng và các sân bay trung gian.</summary>
    public ChuyenBay? layThongTin(string maCB, out List<GheTheoHang> dsGhe, out List<ChiTietTrungGian> dsTrungGian)
    {
        ChuyenBay? cb = layThongTin(maCB);
        dsGhe = cb == null ? new List<GheTheoHang>() : dalGheTheoHang.layTheoChuyenBay(maCB);
        dsTrungGian = cb == null ? new List<ChiTietTrungGian>() : dalChiTietTrungGian.layTheoChuyenBay(maCB);
        return cb;
    }

    /// <summary>Số vé Đã bán cộng số phiếu Chờ thanh toán của từng hạng vé trên chuyến bay.</summary>
    public Dictionary<string, int> laySoGheDaBanVaDat(string maCB)
    {
        var ketQua = new Dictionary<string, int>();
        foreach (GheTheoHang ghe in dalGheTheoHang.layTheoChuyenBay(maCB))
        {
            ketQua[ghe.MaHangVe] = dalVe.demVeDaBan(maCB, ghe.MaHangVe)
                + dalPhieuDatCho.demPhieuChoThanhToan(maCB, ghe.MaHangVe);
        }
        return ketQua;
    }

    public void capNhat(string maCB, ChuyenBay cb, List<GheTheoHang> dsGhe, List<ChiTietTrungGian> dsTrungGian)
    {
        ketNoi.thucThi(
            "UPDATE CHUYENBAY SET GiaVe = @giaVe, MaSanBayDi = @di, MaSanBayDen = @den, "
            + "NgayGioKhoiHanh = @ngayGio, ThoiGianBay = @thoiGianBay WHERE MaChuyenBay = @maCB",
            ThamSo.Chuoi("@maCB", maCB, 10),
            ThamSo.Tien("@giaVe", cb.GiaVe),
            ThamSo.Chuoi("@di", cb.MaSanBayDi, 3),
            ThamSo.Chuoi("@den", cb.MaSanBayDen, 3),
            ThamSo.NgayGio("@ngayGio", cb.NgayGioKhoiHanh),
            ThamSo.SoNguyen("@thoiGianBay", cb.ThoiGianBay));
        dalGheTheoHang.capNhat(maCB, dsGhe);
        dalChiTietTrungGian.xoaTheoChuyenBay(maCB);
        dalChiTietTrungGian.them(dsTrungGian);
    }

    /// <summary>Chuyến bay đã có vé hoặc phiếu đặt chỗ nào chưa, kể cả vé, phiếu đã hủy (AT02).</summary>
    public bool kiemTraCoVeHoacPhieu(string maCB)
    {
        return dalVe.kiemTraCoVe(maCB) || dalPhieuDatCho.kiemTraCoPhieu(maCB);
    }

    /// <summary>Xóa chuyến bay cùng số ghế theo hạng và các sân bay trung gian.</summary>
    public void xoa(string maCB)
    {
        dalChiTietTrungGian.xoaTheoChuyenBay(maCB);
        dalGheTheoHang.xoaTheoChuyenBay(maCB);
        ketNoi.thucThi("DELETE FROM CHUYENBAY WHERE MaChuyenBay = @maCB", ThamSo.Chuoi("@maCB", maCB, 10));
    }

    /// <summary>
    /// Tra cứu chuyến bay theo BM4. Số ghế đặt tính theo công thức (1.5), số ghế trống theo công thức (1.6),
    /// đếm ngay trong một câu truy vấn để danh sách dài vẫn trả kết quả nhanh (HQ05).
    /// soDongToiDa > 0 thì chỉ lấy bấy nhiêu chuyến bay đầu theo giờ khởi hành.
    /// </summary>
    public DataTable timChuyenBay(TieuChiTim tieuChi, int soDongToiDa = 0)
    {
        var sql = new StringBuilder("SELECT ");
        var thamSo = new List<SqlParameter>();
        if (soDongToiDa > 0)
        {
            sql.Append("TOP (@soDong) ");
            thamSo.Add(ThamSo.SoNguyen("@soDong", soDongToiDa));
        }
        sql.Append(
            "cb.MaChuyenBay, cb.MaSanBayDi, di.TenSanBay AS TenSanBayDi, cb.MaSanBayDen, den.TenSanBay AS TenSanBayDen, "
            + "cb.NgayGioKhoiHanh, cb.ThoiGianBay, "
            // (1.6) số ghế trống = tổng số lượng ghế các hạng - số ghế đặt
            + "ISNULL(g.TongSoGhe, 0) - (ISNULL(v.SoVe, 0) + ISNULL(p.SoPhieu, 0)) AS SoGheTrong, "
            // (1.5) số ghế đặt = số vé Đã bán + số phiếu Chờ thanh toán
            + "ISNULL(v.SoVe, 0) + ISNULL(p.SoPhieu, 0) AS SoGheDat "
            + "FROM CHUYENBAY cb "
            + "JOIN SANBAY di ON di.MaSanBay = cb.MaSanBayDi "
            + "JOIN SANBAY den ON den.MaSanBay = cb.MaSanBayDen "
            + "OUTER APPLY (SELECT SUM(SoLuongGhe) AS TongSoGhe FROM GHETHEOHANG WHERE MaChuyenBay = cb.MaChuyenBay) g "
            + "OUTER APPLY (SELECT COUNT(*) AS SoVe FROM VE WHERE MaChuyenBay = cb.MaChuyenBay AND TinhTrang = N'Đã bán') v "
            + "OUTER APPLY (SELECT COUNT(*) AS SoPhieu FROM PHIEUDATCHO WHERE MaChuyenBay = cb.MaChuyenBay AND TinhTrang = N'Chờ thanh toán') p "
            + "WHERE 1 = 1");

        if (!string.IsNullOrEmpty(tieuChi.MaSanBayDi))
        {
            sql.Append(" AND cb.MaSanBayDi = @di");
            thamSo.Add(ThamSo.Chuoi("@di", tieuChi.MaSanBayDi, 3));
        }
        if (!string.IsNullOrEmpty(tieuChi.MaSanBayDen))
        {
            sql.Append(" AND cb.MaSanBayDen = @den");
            thamSo.Add(ThamSo.Chuoi("@den", tieuChi.MaSanBayDen, 3));
        }
        if (tieuChi.TuNgay != null)
        {
            sql.Append(" AND cb.NgayGioKhoiHanh >= @tuNgay");
            thamSo.Add(ThamSo.NgayGio("@tuNgay", tieuChi.TuNgay.Value));
        }
        if (tieuChi.DenNgay != null)
        {
            sql.Append(" AND cb.NgayGioKhoiHanh < @denNgay");
            thamSo.Add(ThamSo.NgayGio("@denNgay", tieuChi.DenNgay.Value));
        }
        if (!string.IsNullOrEmpty(tieuChi.MaChuyenBay))
        {
            sql.Append(" AND cb.MaChuyenBay LIKE @maCB");
            thamSo.Add(ThamSo.Chuoi("@maCB", "%" + ThamSo.thoatLike(tieuChi.MaChuyenBay) + "%", 40));
        }
        sql.Append(" ORDER BY cb.NgayGioKhoiHanh, cb.MaChuyenBay");
        return ketNoi.docBang(sql.ToString(), thamSo.ToArray());
    }

    /// <summary>Công thức (1.5): số ghế đặt = số vé Đã bán + số phiếu đặt chỗ Chờ thanh toán của chuyến bay.</summary>
    public int tinhSoGheDat(string maCB)
    {
        return dalVe.demVeDaBan(maCB) + dalPhieuDatCho.demPhieuChoThanhToan(maCB);
    }

    /// <summary>Công thức (1.6): số ghế trống của chuyến bay = tổng số lượng ghế các hạng - số ghế đặt.</summary>
    public int tongSoGheTrong(string maCB)
    {
        return dalGheTheoHang.laySoLuongGhe(maCB) - tinhSoGheDat(maCB);
    }

    /// <summary>
    /// Công thức (1.2): số ghế trống của hạng = số lượng ghế của hạng - số vé Đã bán - số phiếu Chờ thanh toán.
    /// khoaDong = true (trong giao dịch bán vé, đặt vé, sửa số ghế): khóa dòng GHETHEOHANG trước khi đếm.
    /// </summary>
    public int laySoGheTrong(string maCB, string maHang, bool khoaDong = false)
    {
        int soLuongGhe = dalGheTheoHang.laySoLuongGhe(maCB, maHang, khoaDong);
        return soLuongGhe - dalVe.demVeDaBan(maCB, maHang) - dalPhieuDatCho.demPhieuChoThanhToan(maCB, maHang);
    }

    public decimal layGiaVe(string maCB)
    {
        return Convert.ToDecimal(ketNoi.docGiaTri(
            "SELECT GiaVe FROM CHUYENBAY WHERE MaChuyenBay = @maCB", ThamSo.Chuoi("@maCB", maCB, 10)) ?? 0m);
    }

    public DateTime? layNgayKhoiHanh(string maCB)
    {
        return ketNoi.docGiaTri(
            "SELECT NgayGioKhoiHanh FROM CHUYENBAY WHERE MaChuyenBay = @maCB", ThamSo.Chuoi("@maCB", maCB, 10)) as DateTime?;
    }

    /// <summary>
    /// Các chuyến bay đã đến mốc hủy đặt vé theo QĐ3 tại ngayHienTai (ngày khởi hành không quá
    /// thoiGianHuy ngày sau ngày hiện tại) và còn phiếu Chờ thanh toán.
    /// </summary>
    public List<ChuyenBay> layChuyenBayDenHanHuy(DateTime ngayHienTai, int thoiGianHuy)
    {
        return ketNoi.docDanhSach(
            "SELECT " + COT_CHUYEN_BAY + " FROM CHUYENBAY cb "
            + "WHERE cb.NgayGioKhoiHanh < @moc AND cb.MaChuyenBay IN "
            + "(SELECT MaChuyenBay FROM PHIEUDATCHO WHERE TinhTrang = N'Chờ thanh toán')",
            taoChuyenBay,
            ThamSo.NgayGio("@moc", ngayHienTai.Date.AddDays(thoiGianHuy + 1)));
    }

    /// <summary>Các chuyến bay khởi hành trong tháng (BM5.1), kể cả chuyến bay chưa có vé.</summary>
    public List<ChuyenBay> layChuyenBayKhoiHanhTrongThang(int thang, int nam)
    {
        var dauThang = new DateTime(nam, thang, 1);
        return ketNoi.docDanhSach(
            "SELECT " + COT_CHUYEN_BAY + " FROM CHUYENBAY cb "
            + "WHERE cb.NgayGioKhoiHanh >= @tu AND cb.NgayGioKhoiHanh < @den ORDER BY cb.MaChuyenBay",
            taoChuyenBay,
            ThamSo.NgayGio("@tu", dauThang),
            ThamSo.NgayGio("@den", dauThang.AddMonths(1)));
    }

    /// <summary>Số chuyến bay khởi hành trong tháng (BM5.2).</summary>
    public int demChuyenBayKhoiHanh(int thang, int nam)
    {
        var dauThang = new DateTime(nam, thang, 1);
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM CHUYENBAY WHERE NgayGioKhoiHanh >= @tu AND NgayGioKhoiHanh < @den",
            ThamSo.NgayGio("@tu", dauThang),
            ThamSo.NgayGio("@den", dauThang.AddMonths(1)));
    }

    /// <summary>
    /// Có sân bay hoặc hạng vé nào trong danh sách sắp xóa đang được chuyến bay sử dụng không (AT02).
    /// Sân bay được dùng khi là sân bay đi, đến hoặc trung gian; hạng vé được dùng khi chuyến bay có ghế hạng đó.
    /// </summary>
    public bool kiemTraDangSuDung(List<string> dsSanBayXoa, List<string> dsHangVeXoa)
    {
        foreach (string maSanBay in dsSanBayXoa)
        {
            int soLan = ketNoi.docSoNguyen(
                "SELECT (SELECT COUNT(*) FROM CHUYENBAY WHERE MaSanBayDi = @ma OR MaSanBayDen = @ma) "
                + "+ (SELECT COUNT(*) FROM CHITIETTRUNGGIAN WHERE MaSanBay = @ma)",
                ThamSo.Chuoi("@ma", maSanBay, 3));
            if (soLan > 0) return true;
        }
        foreach (string maHang in dsHangVeXoa)
        {
            int soLan = ketNoi.docSoNguyen(
                "SELECT COUNT(*) FROM GHETHEOHANG WHERE MaHangVe = @ma", ThamSo.Chuoi("@ma", maHang, 5));
            if (soLan > 0) return true;
        }
        return false;
    }
}
