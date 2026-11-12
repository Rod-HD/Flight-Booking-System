using System.Text.Json;
using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.TienIch;

namespace QuanLyBanVe.KiemThu;

/// <summary>
/// Cơ sở dữ liệu thử QLBANVE_KIEMTHU, tạo một lần cho cả đợt kiểm thử từ script db/01_tao_csdl.sql
/// trên cùng máy chủ SQL Server với chuỗi kết nối của dự án QuanLyBanVe.Api
/// (hoặc biến môi trường QLBV_CHUOI_KET_NOI nếu có). Không đụng tới QLBANVECHUYENBAY.
/// </summary>
public class CoSoDuLieuThu
{
    public const string TEN_CSDL = "QLBANVE_KIEMTHU";

    public string ChuoiKetNoi { get; }
    public string ThuMucNhatKy { get; }
    public string TapTinNhatKy => Path.Combine(ThuMucNhatKy, "huy_phieu_tu_dong.log");

    public CoSoDuLieuThu()
    {
        string chuoiGoc = timChuoiKetNoiGoc();
        ChuoiKetNoi = new SqlConnectionStringBuilder(chuoiGoc) { InitialCatalog = TEN_CSDL }.ConnectionString;
        taoCoSoDuLieu(new SqlConnectionStringBuilder(chuoiGoc) { InitialCatalog = "master" }.ConnectionString);

        ThuMucNhatKy = Path.Combine(AppContext.BaseDirectory, "nhat_ky_kiem_thu");
        TienIch_NhatKy.datDuongDan(TapTinNhatKy);
    }

    /// <summary>Đưa dữ liệu về trạng thái ban đầu trước mỗi trường hợp kiểm thử: 5 sân bay, 2 hạng vé, tham số mặc định.</summary>
    public void lamSach()
    {
        thucThi(@"
            DELETE FROM VE; DELETE FROM PHIEUDATCHO; DELETE FROM HANHKHACH; DELETE FROM CHITIETTRUNGGIAN;
            DELETE FROM GHETHEOHANG; DELETE FROM CHUYENBAY; DELETE FROM HANGVE; DELETE FROM SANBAY; DELETE FROM TAIKHOAN;
            UPDATE THAMSOQUYDINH SET ThoiGianBayToiThieu = 30, SoSanBayTrungGianToiDa = 2, ThoiGianDungToiThieu = 10,
                ThoiGianDungToiDa = 20, ThoiGianDatVeChamNhat = 1, ThoiGianHuyDatVe = 0;
            INSERT INTO SANBAY (MaSanBay, TenSanBay) VALUES
                ('SGN', N'Tân Sơn Nhất'), ('HAN', N'Nội Bài'), ('DAD', N'Đà Nẵng'), ('PQC', N'Phú Quốc'), ('CXR', N'Cam Ranh');
            INSERT INTO HANGVE (MaHangVe, TenHangVe, TiLeDonGia) VALUES ('H1', N'Hạng 1', 105.00), ('H2', N'Hạng 2', 100.00);");
        if (File.Exists(TapTinNhatKy)) File.Delete(TapTinNhatKy);
    }

    public int thucThi(string sql)
    {
        using var ketNoi = new SqlConnection(ChuoiKetNoi);
        ketNoi.Open();
        using var lenh = new SqlCommand(sql, ketNoi);
        return lenh.ExecuteNonQuery();
    }

    public object? docGiaTri(string sql)
    {
        using var ketNoi = new SqlConnection(ChuoiKetNoi);
        ketNoi.Open();
        using var lenh = new SqlCommand(sql, ketNoi);
        object? giaTri = lenh.ExecuteScalar();
        return giaTri is DBNull ? null : giaTri;
    }

    public int dem(string sql)
    {
        return Convert.ToInt32(docGiaTri(sql));
    }

    /// <summary>Chạy script tạo cơ sở dữ liệu với tên QLBANVE_KIEMTHU, từng đoạn ngăn bởi dòng GO.</summary>
    private static void taoCoSoDuLieu(string chuoiKetNoiMaster)
    {
        string script = File.ReadAllText(Path.Combine(timThuMucGoc(), "db", "01_tao_csdl.sql"))
            .Replace("QLBANVECHUYENBAY", TEN_CSDL);

        using var ketNoi = new SqlConnection(chuoiKetNoiMaster);
        ketNoi.Open();
        var doan = new List<string>();
        foreach (string dong in script.Split('\n').Append("GO"))
        {
            if (dong.Trim().Equals("GO", StringComparison.OrdinalIgnoreCase))
            {
                string lenhSql = string.Join("\n", doan);
                doan.Clear();
                if (string.IsNullOrWhiteSpace(lenhSql)) continue;
                using var lenh = new SqlCommand(lenhSql, ketNoi) { CommandTimeout = 120 };
                lenh.ExecuteNonQuery();
            }
            else
            {
                doan.Add(dong.TrimEnd('\r'));
            }
        }
        // các kết nối cũ trong vùng đệm trỏ tới cơ sở dữ liệu vừa bị xóa và tạo lại
        SqlConnection.ClearAllPools();
    }

    private static string timChuoiKetNoiGoc()
    {
        string? tuBienMoiTruong = Environment.GetEnvironmentVariable("QLBV_CHUOI_KET_NOI");
        if (!string.IsNullOrWhiteSpace(tuBienMoiTruong)) return tuBienMoiTruong;

        string thuMucApi = Path.Combine(timThuMucGoc(), "api", "QuanLyBanVe.Api");
        foreach (string ten in new[] { "appsettings.Development.json", "appsettings.json" })
        {
            string duongDan = Path.Combine(thuMucApi, ten);
            if (!File.Exists(duongDan)) continue;
            using JsonDocument cauHinh = JsonDocument.Parse(File.ReadAllText(duongDan));
            if (cauHinh.RootElement.TryGetProperty("ConnectionStrings", out JsonElement muc)
                && muc.TryGetProperty("QLBANVE", out JsonElement chuoi)
                && !string.IsNullOrWhiteSpace(chuoi.GetString()))
                return chuoi.GetString()!;
        }
        throw new InvalidOperationException("Không tìm thấy chuỗi kết nối để kiểm thử.");
    }

    /// <summary>Thư mục gốc của repo: thư mục có cả api và db.</summary>
    private static string timThuMucGoc()
    {
        DirectoryInfo? thuMuc = new(AppContext.BaseDirectory);
        while (thuMuc != null)
        {
            if (File.Exists(Path.Combine(thuMuc.FullName, "db", "01_tao_csdl.sql"))) return thuMuc.FullName;
            thuMuc = thuMuc.Parent;
        }
        throw new InvalidOperationException("Không tìm thấy thư mục db chứa script tạo cơ sở dữ liệu.");
    }
}

/// <summary>Mọi lớp kiểm thử dùng cơ sở dữ liệu đều thuộc nhóm này nên chạy lần lượt, không chen dữ liệu của nhau.</summary>
[CollectionDefinition(TEN)]
public class NhomCoSoDuLieu : ICollectionFixture<CoSoDuLieuThu>
{
    public const string TEN = "CSDL";
}
