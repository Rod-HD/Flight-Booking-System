using System.Data;
using System.Text;
using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng VE.</summary>
public class DAL_Ve
{
    /// <summary>Số dòng tối đa trả về cho một lần tra cứu vé.</summary>
    public const int SO_DONG_TOI_DA = 1000;

    private readonly KetNoiCSDL ketNoi;

    public DAL_Ve(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    /// <summary>Lưu vé và trả về mã vé vừa cấp (VE và 8 chữ số).</summary>
    public string themVe(Ve ve)
    {
        return (string)ketNoi.docGiaTri(
            "INSERT INTO VE (MaChuyenBay, MaHanhKhach, MaHangVe, MaPhieuDat, GiaTien, NgayBan, TinhTrang) "
            + "OUTPUT inserted.MaVe "
            + "VALUES (@maCB, @maHK, @maHang, @maPhieu, @giaTien, @ngayBan, @tinhTrang)",
            ThamSo.Chuoi("@maCB", ve.MaChuyenBay, 10),
            ThamSo.Chuoi("@maHK", ve.MaHanhKhach, 10),
            ThamSo.Chuoi("@maHang", ve.MaHangVe, 5),
            ThamSo.Chuoi("@maPhieu", ve.MaPhieuDat, 10),
            ThamSo.Tien("@giaTien", ve.GiaTien),
            ThamSo.NgayGio("@ngayBan", ve.NgayBan),
            ThamSo.ChuoiCoDau("@tinhTrang", ve.TinhTrang, 6))!;
    }

    /// <summary>Tra cứu vé, ghép thêm thông tin hành khách, hạng vé và ngày giờ khởi hành.</summary>
    public DataTable timVe(TieuChiTim tieuChi)
    {
        var sql = new StringBuilder(
            "SELECT TOP (@soDong) v.MaVe, v.MaChuyenBay, hk.HoTen, hk.LoaiGiayTo, hk.SoGiayTo, hk.DienThoai, "
            + "v.MaHangVe, hv.TenHangVe, v.GiaTien, v.NgayBan, v.TinhTrang, v.MaPhieuDat, cb.NgayGioKhoiHanh "
            + "FROM VE v "
            + "JOIN HANHKHACH hk ON hk.MaHanhKhach = v.MaHanhKhach "
            + "JOIN HANGVE hv ON hv.MaHangVe = v.MaHangVe "
            + "JOIN CHUYENBAY cb ON cb.MaChuyenBay = v.MaChuyenBay WHERE 1 = 1");
        var thamSo = new List<SqlParameter> { ThamSo.SoNguyen("@soDong", SO_DONG_TOI_DA) };

        if (!string.IsNullOrEmpty(tieuChi.MaSo))
        {
            sql.Append(" AND v.MaVe LIKE @maVe");
            thamSo.Add(ThamSo.Chuoi("@maVe", ThamSo.thoatLike(tieuChi.MaSo) + "%", 40));
        }
        if (!string.IsNullOrEmpty(tieuChi.SoGiayTo))
        {
            sql.Append(" AND hk.SoGiayTo = @soGiayTo");
            thamSo.Add(ThamSo.Chuoi("@soGiayTo", tieuChi.SoGiayTo, 20));
        }
        if (!string.IsNullOrEmpty(tieuChi.MaChuyenBay))
        {
            sql.Append(" AND v.MaChuyenBay = @maCB");
            thamSo.Add(ThamSo.Chuoi("@maCB", tieuChi.MaChuyenBay, 10));
        }
        if (tieuChi.TuNgay != null)
        {
            sql.Append(" AND v.NgayBan >= @tuNgay");
            thamSo.Add(ThamSo.NgayGio("@tuNgay", tieuChi.TuNgay.Value));
        }
        if (tieuChi.DenNgay != null)
        {
            sql.Append(" AND v.NgayBan < @denNgay");
            thamSo.Add(ThamSo.NgayGio("@denNgay", tieuChi.DenNgay.Value));
        }
        if (!string.IsNullOrEmpty(tieuChi.TinhTrang))
        {
            sql.Append(" AND v.TinhTrang = @tinhTrang");
            thamSo.Add(ThamSo.ChuoiCoDau("@tinhTrang", tieuChi.TinhTrang, 6));
        }
        sql.Append(" ORDER BY v.NgayBan DESC, v.MaVe DESC");
        return ketNoi.docBang(sql.ToString(), thamSo.ToArray());
    }

    /// <summary>Đọc một vé; khoaDong = true khi sắp sửa hoặc hủy vé trong cùng giao dịch.</summary>
    public Ve? layVe(string maVe, bool khoaDong = false)
    {
        return ketNoi.docMot(
            "SELECT MaVe, MaChuyenBay, MaHanhKhach, MaHangVe, MaPhieuDat, GiaTien, NgayBan, TinhTrang FROM VE"
            + (khoaDong ? " WITH (UPDLOCK, HOLDLOCK)" : "") + " WHERE MaVe = @maVe",
            dong => new Ve(dong.GetString(0), dong.GetString(1), dong.GetString(2), dong.GetString(3),
                dong.IsDBNull(4) ? null : dong.GetString(4), dong.GetDecimal(5), dong.GetDateTime(6), dong.GetString(7)),
            ThamSo.Chuoi("@maVe", maVe, 10));
    }

    /// <summary>
    /// Chuyển vé sang Đã hủy (AT03: không xóa vé). Chỉ cập nhật vé còn Đã bán;
    /// trả về 0 nếu vé đã bị hủy trước đó.
    /// </summary>
    public int huy(string maVe)
    {
        return ketNoi.thucThi(
            "UPDATE VE SET TinhTrang = N'Đã hủy' WHERE MaVe = @maVe AND TinhTrang = N'Đã bán'",
            ThamSo.Chuoi("@maVe", maVe, 10));
    }

    /// <summary>Số vé Đã bán của chuyến bay.</summary>
    public int demVeDaBan(string maCB)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM VE WHERE MaChuyenBay = @maCB AND TinhTrang = N'Đã bán'",
            ThamSo.Chuoi("@maCB", maCB, 10));
    }

    /// <summary>Số vé Đã bán của một hạng vé trên chuyến bay.</summary>
    public int demVeDaBan(string maCB, string maHang)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM VE WHERE MaChuyenBay = @maCB AND MaHangVe = @maHang AND TinhTrang = N'Đã bán'",
            ThamSo.Chuoi("@maCB", maCB, 10),
            ThamSo.Chuoi("@maHang", maHang, 5));
    }

    /// <summary>Chuyến bay đã có vé nào chưa, kể cả vé Đã hủy được giữ lại để lưu vết.</summary>
    public bool kiemTraCoVe(string maCB)
    {
        return ketNoi.docSoNguyen(
            "SELECT COUNT(*) FROM (SELECT TOP (1) MaVe FROM VE WHERE MaChuyenBay = @maCB) t",
            ThamSo.Chuoi("@maCB", maCB, 10)) > 0;
    }

    /// <summary>
    /// Số vé Đã bán và doanh thu của từng chuyến bay khởi hành trong tháng (BM5.1).
    /// Chuyến bay chưa có vé Đã bán không có trong kết quả, lớp xử lý ghi 0.
    /// </summary>
    public Dictionary<string, (int SoVe, decimal DoanhThu)> tongHopVe(int thang, int nam)
    {
        var dauThang = new DateTime(nam, thang, 1);
        var ketQua = new Dictionary<string, (int, decimal)>();
        // giả định 4: doanh thu chỉ tính vé Đã bán, theo tháng khởi hành của chuyến bay
        ketNoi.docDanhSach(
            "SELECT v.MaChuyenBay, COUNT(*), SUM(v.GiaTien) FROM VE v "
            + "JOIN CHUYENBAY cb ON cb.MaChuyenBay = v.MaChuyenBay "
            + "WHERE cb.NgayGioKhoiHanh >= @tu AND cb.NgayGioKhoiHanh < @den AND v.TinhTrang = N'Đã bán' "
            + "GROUP BY v.MaChuyenBay",
            dong =>
            {
                ketQua[dong.GetString(0)] = (dong.GetInt32(1), dong.GetDecimal(2));
                return true;
            },
            ThamSo.NgayGio("@tu", dauThang),
            ThamSo.NgayGio("@den", dauThang.AddMonths(1)));
        return ketQua;
    }

    /// <summary>Tổng doanh thu của các chuyến bay khởi hành trong tháng (BM5.2).</summary>
    public decimal tongDoanhThu(int thang, int nam)
    {
        var dauThang = new DateTime(nam, thang, 1);
        return Convert.ToDecimal(ketNoi.docGiaTri(
            "SELECT SUM(v.GiaTien) FROM VE v JOIN CHUYENBAY cb ON cb.MaChuyenBay = v.MaChuyenBay "
            + "WHERE cb.NgayGioKhoiHanh >= @tu AND cb.NgayGioKhoiHanh < @den AND v.TinhTrang = N'Đã bán'",
            ThamSo.NgayGio("@tu", dauThang),
            ThamSo.NgayGio("@den", dauThang.AddMonths(1))) ?? 0m);
    }
}
