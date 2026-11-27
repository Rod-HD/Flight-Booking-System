using Microsoft.Data.SqlClient;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>
/// Sao lưu toàn bộ cơ sở dữ liệu đang kết nối thành một tập tin .bak. Chính SQL Server ghi tập tin nên đường dẫn
/// là đường dẫn trên máy chủ cơ sở dữ liệu, thư mục phải cho tài khoản dịch vụ của SQL Server quyền ghi.
/// </summary>
public class DAL_SaoLuu
{
    // 3201: không mở được tập tin (thư mục không có hoặc SQL Server không được ghi); 262: tài khoản thiếu quyền BACKUP
    private const int LOI_TAP_TIN = 3201;
    private const int LOI_QUYEN = 262;
    // 40510: câu lệnh không được hỗ trợ ở phiên bản này (Azure SQL Database không cho BACKUP DATABASE ra tập tin)
    private const int LOI_KHONG_HO_TRO = 40510;

    private readonly KetNoiCSDL ketNoi;

    public DAL_SaoLuu(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    /// <summary>Thư mục sao lưu mặc định của phiên bản SQL Server; null với cơ sở dữ liệu trên đám mây (Azure SQL Database).</summary>
    public string? layThuMucMacDinh()
    {
        return ketNoi.docGiaTri("SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(260))") as string;
    }

    public string layTenCSDL()
    {
        return (string)ketNoi.docGiaTri("SELECT DB_NAME()")!;
    }

    /// <summary>
    /// COPY_ONLY để bản sao lưu thêm này không làm đổi chuỗi sao lưu hằng ngày; CHECKSUM để SQL Server kiểm tra từng trang khi ghi.
    /// </summary>
    public void saoLuu(string tapTin)
    {
        using SqlConnection kn = ketNoi.layKetNoi();
        using var lenh = new SqlCommand(
            "DECLARE @csdl sysname = DB_NAME(); BACKUP DATABASE @csdl TO DISK = @tapTin WITH COPY_ONLY, INIT, CHECKSUM", kn)
        {
            // sao lưu dữ liệu ở mức Bảng 1.11 lâu hơn 30 giây mặc định của câu lệnh
            CommandTimeout = 600
        };
        lenh.Parameters.Add(ThamSo.ChuoiCoDau("@tapTin", tapTin, 260));
        try
        {
            lenh.ExecuteNonQuery();
        }
        catch (SqlException loi) when (loi.Errors.Cast<SqlError>().Any(e => e.Number is LOI_TAP_TIN or LOI_QUYEN or LOI_KHONG_HO_TRO))
        {
            if (loi.Errors.Cast<SqlError>().Any(e => e.Number == LOI_KHONG_HO_TRO)) throw new LoiKhongHoTroSaoLuu(loi);
            throw new LoiSaoLuu(loi.Errors.Cast<SqlError>().Any(e => e.Number == LOI_QUYEN), loi);
        }
    }
}

/// <summary>SQL Server không ghi được bản sao lưu: thiếu quyền BACKUP hoặc không ghi được vào thư mục.</summary>
public class LoiSaoLuu : Exception
{
    public bool ThieuQuyen { get; }

    public LoiSaoLuu(bool thieuQuyen, Exception loiGoc) : base("Không sao lưu được cơ sở dữ liệu.", loiGoc)
    {
        ThieuQuyen = thieuQuyen;
    }
}

/// <summary>Cơ sở dữ liệu không cho sao lưu ra tập tin (Azure SQL Database tự sao lưu theo chính sách của nhà cung cấp).</summary>
public class LoiKhongHoTroSaoLuu : Exception
{
    public LoiKhongHoTroSaoLuu(Exception? loiGoc = null) : base("Cơ sở dữ liệu không hỗ trợ sao lưu ra tập tin.", loiGoc)
    {
    }
}
