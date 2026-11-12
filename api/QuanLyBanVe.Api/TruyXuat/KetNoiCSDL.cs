using System.Data;
using Microsoft.Data.SqlClient;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>
/// Quản lý chuỗi kết nối và giao dịch đang mở. Mỗi yêu cầu của máy khách dùng một đối tượng riêng,
/// nên giao dịch của yêu cầu này không lẫn với yêu cầu khác. Lớp XL_ chỉ gọi batDauGiaoDich,
/// xacNhanGiaoDich, huyGiaoDich; các lớp DAL_ lấy kết nối và giao dịch ở đây để chạy câu lệnh.
/// </summary>
public class KetNoiCSDL : IDisposable
{
    private readonly string chuoiKetNoi;
    private SqlConnection? ketNoiGiaoDich;
    private SqlTransaction? giaoDichHienTai;

    public KetNoiCSDL(string chuoiKetNoi)
    {
        this.chuoiKetNoi = chuoiKetNoi;
    }

    /// <summary>Mở một kết nối mới tới cơ sở dữ liệu.</summary>
    public SqlConnection layKetNoi()
    {
        var ketNoi = new SqlConnection(chuoiKetNoi);
        try
        {
            ketNoi.Open();
        }
        catch (SqlException loi)
        {
            ketNoi.Dispose();
            throw new LoiKetNoiCSDL(loi);
        }
        return ketNoi;
    }

    public bool dangCoGiaoDich => giaoDichHienTai != null;

    public void batDauGiaoDich()
    {
        if (giaoDichHienTai != null)
            throw new InvalidOperationException("Đang có một giao dịch chưa kết thúc.");
        ketNoiGiaoDich = layKetNoi();
        giaoDichHienTai = ketNoiGiaoDich.BeginTransaction(IsolationLevel.ReadCommitted);
    }

    public void xacNhanGiaoDich()
    {
        if (giaoDichHienTai == null)
            throw new InvalidOperationException("Chưa mở giao dịch.");
        try
        {
            giaoDichHienTai.Commit();
        }
        finally
        {
            dongGiaoDich();
        }
    }

    public void huyGiaoDich()
    {
        if (giaoDichHienTai == null) return;
        try
        {
            giaoDichHienTai.Rollback();
        }
        catch (Exception)
        {
            // kết nối đã hỏng thì máy chủ CSDL tự hủy giao dịch
        }
        finally
        {
            dongGiaoDich();
        }
    }

    /// <summary>
    /// Chạy một nghiệp vụ ghi nhiều bảng trong một giao dịch: xác nhận khi xong, hủy khi có lỗi.
    /// Nếu đang ở trong một giao dịch thì chạy chung giao dịch đó.
    /// </summary>
    public T thucHienTrongGiaoDich<T>(Func<T> congViec)
    {
        if (dangCoGiaoDich) return congViec();
        batDauGiaoDich();
        try
        {
            T ketQua = congViec();
            xacNhanGiaoDich();
            return ketQua;
        }
        catch
        {
            huyGiaoDich();
            throw;
        }
    }

    public void thucHienTrongGiaoDich(Action congViec)
    {
        thucHienTrongGiaoDich(() =>
        {
            congViec();
            return true;
        });
    }

    // Các hàm chạy câu lệnh SQL có tham số bên dưới chỉ dùng trong tầng truy xuất.

    /// <summary>Chạy câu lệnh thêm, sửa, xóa; trả về số dòng bị ảnh hưởng.</summary>
    internal int thucThi(string sql, params SqlParameter[] thamSo)
    {
        return chay(sql, thamSo, lenh => lenh.ExecuteNonQuery());
    }

    /// <summary>Đọc một giá trị đơn; trả về null nếu không có dòng nào hoặc giá trị là NULL.</summary>
    internal object? docGiaTri(string sql, params SqlParameter[] thamSo)
    {
        return chay(sql, thamSo, lenh =>
        {
            object? giaTri = lenh.ExecuteScalar();
            return giaTri is DBNull ? null : giaTri;
        });
    }

    internal int docSoNguyen(string sql, params SqlParameter[] thamSo)
    {
        return Convert.ToInt32(docGiaTri(sql, thamSo) ?? 0);
    }

    internal List<T> docDanhSach<T>(string sql, Func<SqlDataReader, T> taoDoiTuong, params SqlParameter[] thamSo)
    {
        return chay(sql, thamSo, lenh =>
        {
            var ds = new List<T>();
            using SqlDataReader dong = lenh.ExecuteReader();
            while (dong.Read()) ds.Add(taoDoiTuong(dong));
            return ds;
        });
    }

    internal T? docMot<T>(string sql, Func<SqlDataReader, T> taoDoiTuong, params SqlParameter[] thamSo) where T : class
    {
        return chay(sql, thamSo, lenh =>
        {
            using SqlDataReader dong = lenh.ExecuteReader();
            return dong.Read() ? taoDoiTuong(dong) : null;
        });
    }

    internal DataTable docBang(string sql, params SqlParameter[] thamSo)
    {
        return chay(sql, thamSo, lenh =>
        {
            var bang = new DataTable();
            using SqlDataReader dong = lenh.ExecuteReader();
            bang.Load(dong);
            // bảng kết quả chỉ để hiển thị, bỏ ràng buộc để lớp xử lý thêm được cột tính toán
            bang.Constraints.Clear();
            foreach (DataColumn cot in bang.Columns)
            {
                cot.ReadOnly = false;
                cot.AllowDBNull = true;
            }
            return bang;
        });
    }

    private T chay<T>(string sql, SqlParameter[] thamSo, Func<SqlCommand, T> thucHien)
    {
        try
        {
            if (giaoDichHienTai != null)
            {
                using var lenh = new SqlCommand(sql, ketNoiGiaoDich, giaoDichHienTai);
                lenh.Parameters.AddRange(thamSo);
                return thucHien(lenh);
            }
            using SqlConnection ketNoi = layKetNoi();
            using var lenhRieng = new SqlCommand(sql, ketNoi);
            lenhRieng.Parameters.AddRange(thamSo);
            return thucHien(lenhRieng);
        }
        // đổi mã lỗi của SQL Server thành ngoại lệ riêng để lớp xử lý không phụ thuộc ADO.NET
        catch (SqlException loi) when (loi.Number == 2627 || loi.Number == 2601)
        {
            throw new LoiTrungDuLieu(loi);
        }
        catch (SqlException loi) when (loi.Number == 547)
        {
            throw new LoiRangBuocDuLieu(loi);
        }
        catch (SqlException loi) when (loi.Number == 1205)
        {
            throw new LoiTranhChap(loi);
        }
    }

    private void dongGiaoDich()
    {
        giaoDichHienTai?.Dispose();
        giaoDichHienTai = null;
        ketNoiGiaoDich?.Dispose();
        ketNoiGiaoDich = null;
    }

    public void Dispose()
    {
        // giao dịch còn mở khi kết thúc yêu cầu thì hủy
        huyGiaoDich();
        GC.SuppressFinalize(this);
    }
}
