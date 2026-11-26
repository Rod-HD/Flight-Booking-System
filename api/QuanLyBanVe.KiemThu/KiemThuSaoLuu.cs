using System.Data;
using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TruyXuat;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.KiemThu;

/// <summary>
/// Sao lưu dữ liệu ngay trên giao diện (bổ sung cho AT01). Tập tin do SQL Server ghi vào thư mục của nó nên ca kiểm thử
/// kiểm tra và xóa tập tin qua SQL Server (sys.dm_os_file_exists, xp_delete_files), không qua hệ thống tập tin.
/// </summary>
public class KiemThuSaoLuu : KiemThuCoSo
{
    private readonly XL_SaoLuu xl;

    public KiemThuSaoLuu(CoSoDuLieuThu csdl) : base(csdl)
    {
        xl = lay<XL_SaoLuu>();
    }

    private bool coTapTin(string tapTin) =>
        csdl.dem($"SELECT file_exists FROM sys.dm_os_file_exists(N'{tapTin.Replace("'", "''")}')") == 1;

    [Fact(DisplayName = "AT01: phục hồi bản sao lưu giữ nguyên số dòng 10 bảng và tổng kiểm nội dung VE, TAIKHOAN")]
    public void SaoLuuPhucHoiGiuNguyenDuLieu()
    {
        const string tenPhucHoi = "QLBANVE_KIEMTHU_PHUCHOI";
        Assert.Equal(CoSoDuLieuThu.TEN_CSDL, new SqlConnectionStringBuilder(csdl.ChuoiKetNoi).InitialCatalog);
        Assert.Null(csdl.docGiaTri($"SELECT DB_ID(N'{tenPhucHoi}')"));

        taoChuyenBay("CB610", HOM_NAY.AddDays(5).AddHours(8));
        taoChuyenBay("CB611", HOM_NAY.AddDays(6).AddHours(14), giaVe: 1_500_000m);
        lay<XL_BanVe>().banVe("CB610", "H1", khach(1));
        lay<XL_BanVe>().banVe("CB611", "H2", khach(2));
        lay<XL_DatVe>().datVe("CB611", "H1", khach(3), out _);
        lay<XL_PhanQuyen>().taoTaiKhoanBanDau(new[]
        {
            ("at01_quanly", "Quanly@123", TaiKhoan.QUAN_LY, false),
            ("at01_nhanvien", "Nhanvien@123", TaiKhoan.NHAN_VIEN, true)
        });
        csdl.thucThi("INSERT INTO CHITIETSANBAYTRUNGGIAN VALUES ('CB610', 1, 'DAD', 15, N'Dừng thử phục hồi')");

        string[] cacBang = { "SANBAY", "CHUYENBAY", "CHITIETSANBAYTRUNGGIAN", "HANGVE", "GHETHEOHANG",
            "HANHKHACH", "PHIEUDATCHO", "VE", "THAMSOQUYDINH", "TAIKHOAN" };
        var soDongGoc = cacBang.ToDictionary(b => b, b => csdl.dem($"SELECT COUNT(*) FROM dbo.[{b}]"));
        Assert.All(soDongGoc.Values, soDong => Assert.True(soDong > 0));

        byte[] tongKiem(string tenCsdl, string bang, string khoa) => (byte[])csdl.docGiaTri($"""
            SELECT HASHBYTES('SHA2_256', (SELECT * FROM [{tenCsdl}].dbo.[{bang}]
                ORDER BY [{khoa}] FOR JSON PATH, INCLUDE_NULL_VALUES))
            """)!;
        byte[] veGoc = tongKiem(CoSoDuLieuThu.TEN_CSDL, "VE", "MaVe");
        byte[] taiKhoanGoc = tongKiem(CoSoDuLieuThu.TEN_CSDL, "TAIKHOAN", "TenDangNhap");
        string tapTin = Path.Combine(lay<DAL_SaoLuu>().layThuMucMacDinh(),
            $"{CoSoDuLieuThu.TEN_CSDL}_phuchoi_{Guid.NewGuid():N}.bak");

        using var ketNoi = new SqlConnection(new SqlConnectionStringBuilder(csdl.ChuoiKetNoi)
            { InitialCatalog = "master" }.ConnectionString);
        ketNoi.Open();
        void thucThi(string sql)
        {
            using var lenh = new SqlCommand(sql, ketNoi) { CommandTimeout = 120 };
            lenh.Parameters.AddWithValue("@tapTin", tapTin);
            lenh.ExecuteNonQuery();
        }

        try
        {
            thucThi($"BACKUP DATABASE [{CoSoDuLieuThu.TEN_CSDL}] TO DISK = @tapTin WITH COPY_ONLY, INIT, CHECKSUM");
            Assert.True(coTapTin(tapTin));
            var cacTep = new DataTable();
            using (var lenh = new SqlCommand("RESTORE FILELISTONLY FROM DISK = @tapTin", ketNoi))
            {
                lenh.Parameters.AddWithValue("@tapTin", tapTin);
                using SqlDataReader doc = lenh.ExecuteReader();
                cacTep.Load(doc);
            }
            Assert.True(cacTep.Rows.Count >= 2);
            // Đường dẫn riêng tránh ghi đè các tệp của cơ sở dữ liệu nguồn.
            string[] diChuyen = cacTep.Rows.Cast<DataRow>().Select((tep, i) =>
            {
                string tenLogic = ((string)tep["LogicalName"]).Replace("'", "''");
                string duongDan = Path.Combine(Path.GetDirectoryName((string)tep["PhysicalName"])!,
                    $"{tenPhucHoi}_{i}{Path.GetExtension((string)tep["PhysicalName"])}").Replace("'", "''");
                return $"MOVE N'{tenLogic}' TO N'{duongDan}'";
            }).ToArray();
            thucThi($"RESTORE DATABASE [{tenPhucHoi}] FROM DISK = @tapTin WITH CHECKSUM, RECOVERY, {string.Join(", ", diChuyen)}");

            foreach (string bang in cacBang)
                Assert.Equal(soDongGoc[bang], csdl.dem($"SELECT COUNT(*) FROM [{tenPhucHoi}].dbo.[{bang}]"));
            Assert.Equal(veGoc, tongKiem(tenPhucHoi, "VE", "MaVe"));
            Assert.Equal(taiKhoanGoc, tongKiem(tenPhucHoi, "TAIKHOAN", "TenDangNhap"));
        }
        finally
        {
            try
            {
                thucThi($"""
                    IF DB_ID(N'{tenPhucHoi}') IS NOT NULL
                    BEGIN
                        ALTER DATABASE [{tenPhucHoi}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                        DROP DATABASE [{tenPhucHoi}];
                    END
                    """);
            }
            finally
            {
                thucThi("EXEC master.sys.xp_delete_files @tapTin");
            }
        }
        Assert.Null(csdl.docGiaTri($"SELECT DB_ID(N'{tenPhucHoi}')"));
        Assert.False(coTapTin(tapTin));
    }

    [Fact(DisplayName = "AT01 bổ sung: sao lưu ngay tạo tập tin .bak mang thời điểm tạo, là bản COPY_ONLY có tổng kiểm, không đổi dữ liệu")]
    public void SaoLuuNgay()
    {
        taoChuyenBay("CB600", HOM_NAY.AddDays(5).AddHours(8));
        int soChuyenBay = csdl.dem("SELECT COUNT(*) FROM CHUYENBAY");

        KetQuaSaoLuu kq = xl.saoLuu(null);
        try
        {
            Assert.EndsWith($"{CoSoDuLieuThu.TEN_CSDL}_20261112_090000_tay.bak", kq.TapTin);
            Assert.Equal(dongHo.BayGio, kq.ThoiDiem);
            Assert.True(coTapTin(kq.TapTin));
            // bản sao lưu thêm không làm đổi chuỗi sao lưu hằng ngày và được SQL Server kiểm tra từng trang khi ghi
            Assert.Equal(1, csdl.dem(
                "SELECT TOP (1) CASE WHEN s.is_copy_only = 1 AND s.has_backup_checksums = 1 THEN 1 ELSE 0 END " +
                "FROM msdb.dbo.backupset s JOIN msdb.dbo.backupmediafamily m ON m.media_set_id = s.media_set_id " +
                $"WHERE m.physical_device_name = N'{kq.TapTin}' ORDER BY s.backup_finish_date DESC"));
            Assert.Equal(soChuyenBay, csdl.dem("SELECT COUNT(*) FROM CHUYENBAY"));
        }
        finally
        {
            csdl.thucThi($"EXEC master.sys.xp_delete_files N'{kq.TapTin}'");
        }
    }

    [Fact(DisplayName = "AT01 bổ sung: thư mục sao lưu không có thì báo KHONG_SAO_LUU_DUOC kèm tên thư mục, không tạo tập tin")]
    public void ThuMucKhongCo()
    {
        string thuMuc = @"D:\khong_co_thu_muc_sao_luu_" + Guid.NewGuid().ToString("N");

        LoiNghiepVu loi = Assert.Throws<LoiNghiepVu>(() => xl.saoLuu(thuMuc));

        Assert.Equal(MaLoi.KHONG_SAO_LUU_DUOC, loi.Ma);
        Assert.Contains(thuMuc, loi.Message);
        Assert.False(coTapTin(Path.Combine(thuMuc, $"{CoSoDuLieuThu.TEN_CSDL}_20261112_090000_tay.bak")));
    }
}
