namespace QuanLyBanVe.Api.XuLy;

/// <summary>Loại lỗi, tầng giao tiếp dựa vào đây để chọn mã trạng thái HTTP.</summary>
public enum LoaiLoi
{
    /// <summary>Dữ liệu nhập không hợp lệ, có chi tiết lỗi theo từng ô (400).</summary>
    DuLieuKhongHopLe,
    /// <summary>Sai thông tin đăng nhập (401).</summary>
    ChuaXacThuc,
    /// <summary>Không được phép đăng nhập hoặc thực hiện (403).</summary>
    KhongCoQuyen,
    /// <summary>Không tìm thấy đối tượng (404).</summary>
    KhongTimThay,
    /// <summary>Vi phạm quy định nghiệp vụ (409).</summary>
    ViPhamQuyDinh
}

/// <summary>Các mã lỗi trả về cho giao diện.</summary>
public static class MaLoi
{
    public const string DU_LIEU_KHONG_HOP_LE = "DU_LIEU_KHONG_HOP_LE";
    public const string KHONG_TIM_THAY = "KHONG_TIM_THAY";
    public const string CHUA_DANG_NHAP = "CHUA_DANG_NHAP";
    public const string KHONG_CO_QUYEN = "KHONG_CO_QUYEN";
    public const string LOI_HE_THONG = "LOI_HE_THONG";

    public const string SAI_THONG_TIN_DANG_NHAP = "SAI_THONG_TIN_DANG_NHAP";
    public const string TAI_KHOAN_BI_KHOA = "TAI_KHOAN_BI_KHOA";
    public const string TRUNG_MA = "TRUNG_MA";
    public const string VI_PHAM_QD1 = "VI_PHAM_QD1";
    public const string VI_PHAM_QD6 = "VI_PHAM_QD6";
    public const string HET_CHO = "HET_CHO";
    public const string CHUYEN_BAY_DA_KHOI_HANH = "CHUYEN_BAY_DA_KHOI_HANH";
    public const string QUA_HAN_DAT_VE = "QUA_HAN_DAT_VE";
    public const string PHIEU_HET_HAN = "PHIEU_HET_HAN";
    public const string GIAY_TO_DA_THUOC_NGUOI_KHAC = "GIAY_TO_DA_THUOC_NGUOI_KHAC";
    public const string DANG_DUOC_SU_DUNG = "DANG_DUOC_SU_DUNG";
    public const string DA_CO_VE_HOAC_PHIEU = "DA_CO_VE_HOAC_PHIEU";
    public const string KHONG_DUOC_TU_KHOA = "KHONG_DUOC_TU_KHOA";
    public const string KHONG_DUOC_TU_DOI_QUYEN = "KHONG_DUOC_TU_DOI_QUYEN";
    public const string DU_LIEU_DA_THAY_DOI = "DU_LIEU_DA_THAY_DOI";
}

/// <summary>
/// Ngoại lệ do lớp XL_ phát sinh khi một điều kiện nghiệp vụ không thỏa (hết chỗ, vi phạm quy định,
/// trùng mã, trùng giấy tờ...), kèm câu thông báo hiển thị cho người dùng.
/// </summary>
public class LoiNghiepVu : Exception
{
    public LoaiLoi Loai { get; }
    public string Ma { get; }
    /// <summary>Lỗi theo từng ô nhập: tên trường và câu thông báo của ô đó.</summary>
    public Dictionary<string, string> ChiTiet { get; }

    public LoiNghiepVu(LoaiLoi loai, string ma, string thongBao, Dictionary<string, string>? chiTiet = null)
        : base(thongBao)
    {
        Loai = loai;
        Ma = ma;
        ChiTiet = chiTiet ?? new Dictionary<string, string>();
    }

    /// <summary>Dữ liệu không hợp lệ ở nhiều ô; câu thông báo chung là lỗi của ô đầu tiên.</summary>
    public static LoiNghiepVu khongHopLe(Dictionary<string, string> chiTiet)
    {
        return new LoiNghiepVu(LoaiLoi.DuLieuKhongHopLe, MaLoi.DU_LIEU_KHONG_HOP_LE, chiTiet.Values.First(), chiTiet);
    }

    public static LoiNghiepVu khongHopLe(string truong, string thongBao)
    {
        return khongHopLe(new Dictionary<string, string> { [truong] = thongBao });
    }

    public static LoiNghiepVu khongTimThay(string thongBao)
    {
        return new LoiNghiepVu(LoaiLoi.KhongTimThay, MaLoi.KHONG_TIM_THAY, thongBao);
    }

    /// <summary>Vi phạm quy định nghiệp vụ; truong (nếu có) là ô nhập liên quan.</summary>
    public static LoiNghiepVu viPham(string ma, string thongBao, string? truong = null)
    {
        var chiTiet = new Dictionary<string, string>();
        if (truong != null) chiTiet[truong] = thongBao;
        return new LoiNghiepVu(LoaiLoi.ViPhamQuyDinh, ma, thongBao, chiTiet);
    }
}
