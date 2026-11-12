using System.Data;
using Microsoft.Data.SqlClient;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>
/// Tạo tham số cho câu lệnh SQL đúng kiểu của cột, để SQL Server dùng được chỉ mục
/// (tham số nvarchar so với cột varchar sẽ làm mất chỉ mục).
/// </summary>
internal static class ThamSo
{
    /// <summary>Chuỗi không dấu (cột char, varchar): các mã, số giấy tờ, điện thoại.</summary>
    public static SqlParameter Chuoi(string ten, string? giaTri, int doDai)
    {
        return new SqlParameter(ten, SqlDbType.VarChar, Math.Max(doDai, giaTri?.Length ?? 0))
        {
            Value = (object?)giaTri ?? DBNull.Value
        };
    }

    /// <summary>Chuỗi tiếng Việt có dấu (cột nvarchar): tên, ghi chú, tình trạng.</summary>
    public static SqlParameter ChuoiCoDau(string ten, string? giaTri, int doDai)
    {
        return new SqlParameter(ten, SqlDbType.NVarChar, Math.Max(doDai, giaTri?.Length ?? 0))
        {
            Value = (object?)giaTri ?? DBNull.Value
        };
    }

    public static SqlParameter SoNguyen(string ten, int giaTri)
    {
        return new SqlParameter(ten, SqlDbType.Int) { Value = giaTri };
    }

    /// <summary>Số tiền tính bằng đồng, decimal(12,0).</summary>
    public static SqlParameter Tien(string ten, decimal giaTri)
    {
        return new SqlParameter(ten, SqlDbType.Decimal) { Precision = 12, Scale = 0, Value = giaTri };
    }

    /// <summary>Tỉ lệ đơn giá theo phần trăm, decimal(5,2).</summary>
    public static SqlParameter TiLe(string ten, decimal giaTri)
    {
        return new SqlParameter(ten, SqlDbType.Decimal) { Precision = 5, Scale = 2, Value = giaTri };
    }

    public static SqlParameter NgayGio(string ten, DateTime giaTri)
    {
        return new SqlParameter(ten, SqlDbType.DateTime2) { Scale = 0, Value = giaTri };
    }

    /// <summary>Bỏ ý nghĩa đặc biệt của các ký tự %, _, [ trong mẫu LIKE.</summary>
    public static string thoatLike(string giaTri)
    {
        return giaTri.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");
    }
}
