using System.Data;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.XuLy;

namespace QuanLyBanVe.Api.GiaoTiep;

/// <summary>Tên nhóm quyền dùng trong cookie phiên và trong thuộc tính Authorize.</summary>
public static class VaiTro
{
    public const string QUAN_LY = "QuanLy";
    public const string NHAN_VIEN = "NhanVien";
}

/// <summary>
/// Đổi qua lại giữa giá trị lưu trong cơ sở dữ liệu (tiếng Việt có dấu) và mã không dấu dùng trong JSON,
/// và đổi bảng kết quả của tầng xử lý thành danh sách để trả về dạng JSON camelCase.
/// </summary>
public static class ChuyenDoi
{
    private static readonly Dictionary<string, string> maTheoGiaTri = new()
    {
        [TaiKhoan.QUAN_LY] = VaiTro.QUAN_LY,
        [TaiKhoan.NHAN_VIEN] = VaiTro.NHAN_VIEN,
        [TaiKhoan.HOAT_DONG] = "HoatDong",
        [TaiKhoan.DA_KHOA] = "DaKhoa",
        [Ve.DA_BAN] = "DaBan",
        [Ve.DA_HUY] = "DaHuy",
        [PhieuDatCho.CHO_THANH_TOAN] = "ChoThanhToan",
        [HanhKhach.CAN_CUOC] = "CCCD",
        [HanhKhach.HO_CHIEU] = "HoChieu"
    };

    private static readonly HashSet<string> cotTien = new() { "GiaTien", "GiaVe", "DoanhThu" };
    private static readonly HashSet<string> cotCoMa = new() { "TinhTrang", "LoaiGiayTo", "NhomQuyen", "TrangThai" };

    /// <summary>Mã không dấu của một giá trị lưu trong CSDL, ví dụ Đã bán thành DaBan.</summary>
    public static string ma(string giaTri)
    {
        return maTheoGiaTri.GetValueOrDefault(giaTri, giaTri);
    }

    public static string? nhomQuyenTuMa(string? ma)
    {
        return ma switch
        {
            VaiTro.QUAN_LY => TaiKhoan.QUAN_LY,
            VaiTro.NHAN_VIEN => TaiKhoan.NHAN_VIEN,
            _ => null
        };
    }

    /// <summary>Đổi mã loại giấy tờ thành giá trị lưu trong CSDL; mã lạ được giữ nguyên để tầng xử lý báo lỗi.</summary>
    public static string? loaiGiayToTuMa(string? ma)
    {
        return ma switch
        {
            null or "" => null,
            "CCCD" => HanhKhach.CAN_CUOC,
            "HoChieu" => HanhKhach.HO_CHIEU,
            _ => ma
        };
    }

    public static string? tinhTrangPhieuTuMa(string? ma)
    {
        return ma switch
        {
            null or "" => null,
            "ChoThanhToan" => PhieuDatCho.CHO_THANH_TOAN,
            "DaHuy" => PhieuDatCho.DA_HUY,
            _ => throw LoiNghiepVu.khongHopLe("tinhTrang", "Tình trạng phải là ChoThanhToan hoặc DaHuy.")
        };
    }

    public static HanhKhach thanhHanhKhach(YeuCauHanhKhach? yeuCau)
    {
        return new HanhKhach
        {
            HoTen = yeuCau?.HoTen ?? "",
            LoaiGiayTo = loaiGiayToTuMa(yeuCau?.LoaiGiayTo) ?? HanhKhach.CAN_CUOC,
            SoGiayTo = yeuCau?.SoGiayTo ?? "",
            DienThoai = yeuCau?.DienThoai ?? ""
        };
    }

    /// <summary>Số tiền là số nguyên VND.</summary>
    public static long tien(decimal soTien)
    {
        return decimal.ToInt64(soTien);
    }

    /// <summary>
    /// Đọc ngày hoặc ngày giờ ISO 8601 theo giờ địa phương (2026-11-12 hoặc 2026-11-12T14:30:00).
    /// Chuỗi có kèm múi giờ được đổi về giờ của máy chủ.
    /// </summary>
    public static DateTime? docNgayGio(string? chuoi, string tenTruong)
    {
        if (string.IsNullOrWhiteSpace(chuoi)) return null;
        if (!thuDocNgayGio(chuoi, out DateTime ngayGio))
            throw LoiNghiepVu.khongHopLe(tenTruong, "Ngày giờ không hợp lệ, cần theo dạng 2026-11-12 hoặc 2026-11-12T14:30:00.");
        return ngayGio;
    }

    public static bool thuDocNgayGio(string chuoi, out DateTime ngayGio)
    {
        if (!DateTime.TryParse(chuoi.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out ngayGio))
            return false;
        if (ngayGio.Kind == DateTimeKind.Utc) ngayGio = ngayGio.ToLocalTime();
        ngayGio = DateTime.SpecifyKind(ngayGio, DateTimeKind.Unspecified);
        return true;
    }

    /// <summary>
    /// Đổi bảng kết quả thành danh sách đối tượng JSON: tên cột thành camelCase, tiền thành số nguyên,
    /// tình trạng và loại giấy tờ thành mã không dấu.
    /// </summary>
    public static List<Dictionary<string, object?>> thanhDanhSach(DataTable bang)
    {
        var ketQua = new List<Dictionary<string, object?>>(bang.Rows.Count);
        string[] tenTruong = bang.Columns.Cast<DataColumn>().Select(cot => tenCamelCase(cot.ColumnName)).ToArray();
        foreach (DataRow dong in bang.Rows)
        {
            var doiTuong = new Dictionary<string, object?>(bang.Columns.Count);
            for (int i = 0; i < bang.Columns.Count; i++)
            {
                object giaTri = dong[i];
                string tenCot = bang.Columns[i].ColumnName;
                if (giaTri is DBNull) doiTuong[tenTruong[i]] = null;
                else if (giaTri is decimal soTien && cotTien.Contains(tenCot)) doiTuong[tenTruong[i]] = tien(soTien);
                else if (giaTri is string chuoi && cotCoMa.Contains(tenCot)) doiTuong[tenTruong[i]] = ma(chuoi);
                else doiTuong[tenTruong[i]] = giaTri;
            }
            ketQua.Add(doiTuong);
        }
        return ketQua;
    }

    /// <summary>MaChuyenBay thành maChuyenBay, STT thành stt.</summary>
    public static string tenCamelCase(string ten)
    {
        if (ten.Length == 0) return ten;
        if (ten.All(char.IsUpper)) return ten.ToLowerInvariant();
        return char.ToLowerInvariant(ten[0]) + ten[1..];
    }
}

/// <summary>
/// Ngày giờ trong JSON theo ISO 8601 giờ địa phương, không kèm múi giờ (2026-11-12T14:30:00).
/// </summary>
public class BoChuyenNgayGio : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader boDoc, Type kieu, JsonSerializerOptions tuyChon)
    {
        string? chuoi = boDoc.TokenType == JsonTokenType.String ? boDoc.GetString() : null;
        if (chuoi == null || !ChuyenDoi.thuDocNgayGio(chuoi, out DateTime ngayGio))
            throw new JsonException("Ngày giờ không hợp lệ.");
        return ngayGio;
    }

    public override void Write(Utf8JsonWriter boGhi, DateTime giaTri, JsonSerializerOptions tuyChon)
    {
        boGhi.WriteStringValue(giaTri.ToString("yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture));
    }
}
