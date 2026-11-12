using Microsoft.Data.SqlClient;
using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng HANHKHACH.</summary>
public class DAL_HanhKhach
{
    private readonly KetNoiCSDL ketNoi;

    public DAL_HanhKhach(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    private static HanhKhach taoHanhKhach(SqlDataReader dong)
    {
        return new HanhKhach(dong.GetString(0), dong.GetString(1), dong.GetString(2), dong.GetString(3), dong.GetString(4));
    }

    /// <summary>Tìm hành khách theo cặp loại giấy tờ, số giấy tờ (mỗi cặp ứng với đúng một hành khách).</summary>
    public HanhKhach? timHanhKhach(string loaiGiayTo, string soGiayTo, bool khoaDong = false)
    {
        return ketNoi.docMot(
            "SELECT MaHanhKhach, HoTen, LoaiGiayTo, SoGiayTo, DienThoai FROM HANHKHACH"
            + (khoaDong ? " WITH (UPDLOCK, HOLDLOCK)" : "")
            + " WHERE LoaiGiayTo = @loai AND SoGiayTo = @so",
            taoHanhKhach,
            ThamSo.ChuoiCoDau("@loai", loaiGiayTo, 8),
            ThamSo.Chuoi("@so", soGiayTo, 20));
    }

    public HanhKhach? layHanhKhach(string maHanhKhach)
    {
        return ketNoi.docMot(
            "SELECT MaHanhKhach, HoTen, LoaiGiayTo, SoGiayTo, DienThoai FROM HANHKHACH WHERE MaHanhKhach = @ma",
            taoHanhKhach, ThamSo.Chuoi("@ma", maHanhKhach, 10));
    }

    /// <summary>
    /// Trả về mã hành khách đã có theo giấy tờ; nếu chưa có thì lưu hành khách mới và trả về mã vừa cấp.
    /// Gọi trong giao dịch bán vé, đặt vé; có khóa để hai máy không cùng thêm một hành khách.
    /// </summary>
    public string timHoacThemHanhKhach(string hoTen, string loaiGiayTo, string soGiayTo, string dienThoai)
    {
        HanhKhach? daCo = timHanhKhach(loaiGiayTo, soGiayTo, khoaDong: ketNoi.dangCoGiaoDich);
        if (daCo != null) return daCo.MaHanhKhach;

        return (string)ketNoi.docGiaTri(
            "INSERT INTO HANHKHACH (HoTen, LoaiGiayTo, SoGiayTo, DienThoai) "
            + "OUTPUT inserted.MaHanhKhach VALUES (@hoTen, @loai, @so, @dienThoai)",
            ThamSo.ChuoiCoDau("@hoTen", hoTen, 50),
            ThamSo.ChuoiCoDau("@loai", loaiGiayTo, 8),
            ThamSo.Chuoi("@so", soGiayTo, 20),
            ThamSo.Chuoi("@dienThoai", dienThoai, 16))!;
    }

    public void capNhat(string maHanhKhach, string hoTen, string loaiGiayTo, string soGiayTo, string dienThoai)
    {
        ketNoi.thucThi(
            "UPDATE HANHKHACH SET HoTen = @hoTen, LoaiGiayTo = @loai, SoGiayTo = @so, DienThoai = @dienThoai "
            + "WHERE MaHanhKhach = @ma",
            ThamSo.Chuoi("@ma", maHanhKhach, 10),
            ThamSo.ChuoiCoDau("@hoTen", hoTen, 50),
            ThamSo.ChuoiCoDau("@loai", loaiGiayTo, 8),
            ThamSo.Chuoi("@so", soGiayTo, 20),
            ThamSo.Chuoi("@dienThoai", dienThoai, 16));
    }
}
