using System.Text.RegularExpressions;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>Kiểm tra thông tin hành khách trên BM2, BM3 theo giả định 9 và 10; dùng chung cho bán vé và đặt vé.</summary>
internal static class KiemTraHanhKhach
{
    private static readonly Regex mauCanCuoc = new("^[0-9]{12}$", RegexOptions.Compiled);
    private static readonly Regex mauHoChieu = new("^[A-Z0-9]{6,20}$", RegexOptions.Compiled);
    private static readonly Regex mauDienThoai = new(@"^\+?[0-9]{8,15}$", RegexOptions.Compiled);

    /// <summary>
    /// Bỏ khoảng trắng thừa, kiểm tra từng ô; ném LoiNghiepVu kèm lỗi của từng ô nếu có ô sai.
    /// Loại giấy tờ để trống thì mặc định là Căn cước.
    /// </summary>
    public static HanhKhach chuanHoaVaKiemTra(HanhKhach? hanhKhach)
    {
        var hk = new HanhKhach
        {
            MaHanhKhach = hanhKhach?.MaHanhKhach ?? "",
            HoTen = Regex.Replace((hanhKhach?.HoTen ?? "").Trim(), @"\s+", " "),
            LoaiGiayTo = string.IsNullOrWhiteSpace(hanhKhach?.LoaiGiayTo) ? HanhKhach.CAN_CUOC : hanhKhach.LoaiGiayTo.Trim(),
            SoGiayTo = (hanhKhach?.SoGiayTo ?? "").Trim(),
            DienThoai = (hanhKhach?.DienThoai ?? "").Trim()
        };
        var loi = new Dictionary<string, string>();

        if (hk.HoTen.Length == 0) loi["hoTen"] = "Chưa nhập họ tên hành khách.";
        else if (hk.HoTen.Length > 50) loi["hoTen"] = "Họ tên hành khách tối đa 50 ký tự.";

        if (hk.LoaiGiayTo == HanhKhach.CAN_CUOC)
        {
            // giả định 9: số căn cước gồm đúng 12 chữ số
            if (!mauCanCuoc.IsMatch(hk.SoGiayTo)) loi["soGiayTo"] = "Số căn cước phải gồm đúng 12 chữ số.";
        }
        else if (hk.LoaiGiayTo == HanhKhach.HO_CHIEU)
        {
            // giả định 9: số hộ chiếu gồm 6 đến 20 ký tự chữ in hoa và chữ số
            hk.SoGiayTo = hk.SoGiayTo.ToUpperInvariant();
            if (!mauHoChieu.IsMatch(hk.SoGiayTo)) loi["soGiayTo"] = "Số hộ chiếu phải gồm 6 đến 20 ký tự chữ in hoa và chữ số.";
        }
        else
        {
            loi["loaiGiayTo"] = "Loại giấy tờ phải là Căn cước hoặc Hộ chiếu.";
        }

        // giả định 10: điện thoại gồm 8 đến 15 chữ số, có thể có dấu + ở đầu
        if (!mauDienThoai.IsMatch(hk.DienThoai)) loi["dienThoai"] = "Điện thoại phải gồm 8 đến 15 chữ số, có thể có dấu + ở đầu.";

        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
        return hk;
    }
}
