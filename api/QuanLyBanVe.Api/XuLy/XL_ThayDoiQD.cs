using System.Text.RegularExpressions;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>
/// UC08 Thay đổi quy định theo QĐ6: sửa sáu tham số của QĐ1, QĐ3 và thêm, sửa, xóa sân bay, hạng vé.
/// Giá trị mới có hiệu lực ngay vì các lớp xử lý khác luôn đọc tham số từ CSDL khi kiểm tra.
/// </summary>
public class XL_ThayDoiQD
{
    // giới hạn trên để phép tính ngày giờ không bị tràn khi nhập nhầm số quá lớn
    private const int SO_PHUT_TOI_DA = 100_000;
    private const int SO_NGAY_TOI_DA = 365;
    private const int SO_SAN_BAY_TRUNG_GIAN_TOI_DA = 255;

    private static readonly Regex mauMaSanBay = new("^[A-Z]{3}$", RegexOptions.Compiled);
    private static readonly Regex mauMaHangVe = new("^[A-Z0-9]{1,5}$", RegexOptions.Compiled);

    private readonly KetNoiCSDL ketNoi;
    private readonly DAL_ThamSoQuyDinh dalThamSo;
    private readonly DAL_SanBay dalSanBay;
    private readonly DAL_HangVe dalHangVe;
    private readonly DAL_ChuyenBay dalChuyenBay;

    public XL_ThayDoiQD(KetNoiCSDL ketNoi, DAL_ThamSoQuyDinh dalThamSo, DAL_SanBay dalSanBay, DAL_HangVe dalHangVe,
        DAL_ChuyenBay dalChuyenBay)
    {
        this.ketNoi = ketNoi;
        this.dalThamSo = dalThamSo;
        this.dalSanBay = dalSanBay;
        this.dalHangVe = dalHangVe;
        this.dalChuyenBay = dalChuyenBay;
    }

    /// <summary>Các giá trị hiện hành: sáu tham số, danh sách sân bay và danh sách hạng vé.</summary>
    public ThamSoQuyDinh layDanhSachQuyDinh(out List<SanBay> dsSanBay, out List<HangVe> dsHangVe)
    {
        dsSanBay = dalSanBay.layDanhSachSanBay();
        dsHangVe = dalHangVe.layDanhSachHangVe();
        return dalThamSo.layThamSoQuyDinh();
    }

    /// <summary>Sửa một tham số của QĐ1 hoặc QĐ3 (TH02 đến TH04, TH06, TH07).</summary>
    public void capNhatThamSo(string maQD, int? giaTriMoi)
    {
        string? tenThamSo = DAL_ThamSoQuyDinh.TEN_THAM_SO
            .FirstOrDefault(ten => string.Equals(ten, maQD, StringComparison.OrdinalIgnoreCase));
        if (tenThamSo == null) throw LoiNghiepVu.khongTimThay("Không có tham số quy định này.");
        if (giaTriMoi == null) throw LoiNghiepVu.khongHopLe("giaTriMoi", "Chưa nhập giá trị mới.");

        ketNoi.thucHienTrongGiaoDich(() =>
        {
            // khóa dòng tham số để hai lần sửa đồng thời không làm sai ràng buộc giữa các tham số
            ThamSoQuyDinh thamSo = dalThamSo.layThamSoQuyDinh(khoaDong: true);
            kiemTraHopLe(thamSo, tenThamSo, giaTriMoi.Value);
            dalThamSo.thayDoiQuyDinh(tenThamSo, giaTriMoi.Value);
        });
    }

    /// <summary>Kiểm tra giá trị mới theo miền giá trị ở Bảng 1.9.</summary>
    private static void kiemTraHopLe(ThamSoQuyDinh thamSo, string tenThamSo, int giaTriMoi)
    {
        if (giaTriMoi < 0) throw LoiNghiepVu.khongHopLe("giaTriMoi", "Giá trị mới phải là số nguyên không âm.");

        int toiDa = SO_PHUT_TOI_DA;
        switch (tenThamSo)
        {
            case nameof(ThamSoQuyDinh.ThoiGianBayToiThieu):
                thamSo.ThoiGianBayToiThieu = giaTriMoi;
                break;
            case nameof(ThamSoQuyDinh.SoSanBayTrungGianToiDa):
                thamSo.SoSanBayTrungGianToiDa = giaTriMoi;
                toiDa = SO_SAN_BAY_TRUNG_GIAN_TOI_DA;
                break;
            case nameof(ThamSoQuyDinh.ThoiGianDungToiThieu):
                thamSo.ThoiGianDungToiThieu = giaTriMoi;
                break;
            case nameof(ThamSoQuyDinh.ThoiGianDungToiDa):
                thamSo.ThoiGianDungToiDa = giaTriMoi;
                break;
            case nameof(ThamSoQuyDinh.ThoiGianDatVeChamNhat):
                thamSo.ThoiGianDatVeChamNhat = giaTriMoi;
                toiDa = SO_NGAY_TOI_DA;
                break;
            case nameof(ThamSoQuyDinh.ThoiGianHuyDatVe):
                thamSo.ThoiGianHuyDatVe = giaTriMoi;
                toiDa = SO_NGAY_TOI_DA;
                break;
        }
        if (giaTriMoi > toiDa)
            throw LoiNghiepVu.khongHopLe("giaTriMoi", "Giá trị mới không được lớn hơn " + toiDa + ".");

        // TH04: thời gian dừng tối thiểu không lớn hơn tối đa
        if (thamSo.ThoiGianDungToiThieu > thamSo.ThoiGianDungToiDa)
            throw LoiNghiepVu.khongHopLe("giaTriMoi",
                "Thời gian dừng tối thiểu không được lớn hơn thời gian dừng tối đa.");

        // TH06, TH07 (giả định 6): thời gian hủy đặt vé phải nhỏ hơn thời gian chậm nhất khi đặt vé
        if (thamSo.ThoiGianHuyDatVe >= thamSo.ThoiGianDatVeChamNhat)
            throw LoiNghiepVu.khongHopLe("giaTriMoi",
                "Thời gian hủy đặt vé phải nhỏ hơn thời gian chậm nhất khi đặt vé.");
    }

    // TH01: danh sách sân bay

    public void themSanBay(string? maSanBay, string? tenSanBay)
    {
        maSanBay = (maSanBay ?? "").Trim().ToUpperInvariant();
        tenSanBay = chuanHoaTen(tenSanBay);
        var loi = new Dictionary<string, string>();
        if (!mauMaSanBay.IsMatch(maSanBay)) loi["maSanBay"] = "Mã sân bay phải gồm đúng 3 chữ cái in hoa.";
        kiemTraTenSanBay(tenSanBay, null, loi);
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);

        var trung = LoiNghiepVu.viPham(MaLoi.TRUNG_MA, "Mã sân bay đã tồn tại.", "maSanBay");
        if (dalSanBay.laySanBay(maSanBay) != null) throw trung;
        try
        {
            dalSanBay.them(new SanBay(maSanBay, tenSanBay));
        }
        catch (LoiTrungDuLieu)
        {
            throw trung;
        }
    }

    /// <summary>Sửa tên sân bay khi nhập sai; mã sân bay không sửa sau khi lưu.</summary>
    public void suaSanBay(string maSanBay, string? tenSanBay)
    {
        maSanBay = maSanBay.Trim().ToUpperInvariant();
        tenSanBay = chuanHoaTen(tenSanBay);
        if (dalSanBay.laySanBay(maSanBay) == null) throw LoiNghiepVu.khongTimThay("Không tìm thấy sân bay.");
        var loi = new Dictionary<string, string>();
        kiemTraTenSanBay(tenSanBay, maSanBay, loi);
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
        try
        {
            dalSanBay.sua(new SanBay(maSanBay, tenSanBay));
        }
        catch (LoiTrungDuLieu)
        {
            throw LoiNghiepVu.khongHopLe("tenSanBay", "Tên sân bay đã tồn tại.");
        }
    }

    public void xoaSanBay(string maSanBay)
    {
        maSanBay = maSanBay.Trim().ToUpperInvariant();
        var dangDung = LoiNghiepVu.viPham(MaLoi.DANG_DUOC_SU_DUNG,
            "Không thể xóa sân bay vì đang được chuyến bay sử dụng.");
        try
        {
            ketNoi.thucHienTrongGiaoDich(() =>
            {
                int soSanBay = dalSanBay.demSanBay(khoaBang: true);
                if (dalSanBay.laySanBay(maSanBay) == null) throw LoiNghiepVu.khongTimThay("Không tìm thấy sân bay.");
                // AT02: không xóa sân bay đang được chuyến bay sử dụng
                if (dalChuyenBay.kiemTraDangSuDung(new List<string> { maSanBay }, new List<string>())) throw dangDung;
                // TH01: danh sách luôn còn ít nhất hai sân bay
                if (soSanBay <= 2)
                    throw LoiNghiepVu.viPham(MaLoi.VI_PHAM_QD6, "Danh sách phải còn ít nhất hai sân bay.");
                dalSanBay.xoa(maSanBay);
            });
        }
        catch (LoiRangBuocDuLieu)
        {
            // có chuyến bay vừa được thêm với sân bay này trong lúc xóa
            throw dangDung;
        }
    }

    // TH05: danh sách hạng vé

    /// <summary>Thêm hạng vé; tỉ lệ đơn giá chỉ nhập ở bước này và không sửa sau khi lưu (giả định 11).</summary>
    public void themHangVe(string? maHangVe, string? tenHangVe, decimal? tiLeDonGia)
    {
        maHangVe = (maHangVe ?? "").Trim().ToUpperInvariant();
        tenHangVe = chuanHoaTen(tenHangVe);
        var loi = new Dictionary<string, string>();
        if (!mauMaHangVe.IsMatch(maHangVe)) loi["maHangVe"] = "Mã hạng vé gồm 1 đến 5 ký tự chữ in hoa và số.";
        kiemTraTenHangVe(tenHangVe, null, loi);
        if (tiLeDonGia == null) loi["tiLeDonGia"] = "Chưa nhập tỉ lệ đơn giá.";
        else if (tiLeDonGia <= 0) loi["tiLeDonGia"] = "Tỉ lệ đơn giá phải lớn hơn 0.";
        else if (tiLeDonGia > 999.99m) loi["tiLeDonGia"] = "Tỉ lệ đơn giá không được lớn hơn 999,99%.";
        else if (decimal.Round(tiLeDonGia.Value, 2) != tiLeDonGia.Value)
            loi["tiLeDonGia"] = "Tỉ lệ đơn giá có tối đa hai chữ số thập phân.";
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);

        var trung = LoiNghiepVu.viPham(MaLoi.TRUNG_MA, "Mã hạng vé đã tồn tại.", "maHangVe");
        if (dalHangVe.layHangVe(maHangVe) != null) throw trung;
        try
        {
            dalHangVe.them(new HangVe(maHangVe, tenHangVe, tiLeDonGia!.Value));
        }
        catch (LoiTrungDuLieu)
        {
            throw trung;
        }
    }

    /// <summary>Sửa tên hạng vé khi nhập sai; mã và tỉ lệ đơn giá giữ nguyên.</summary>
    public void suaHangVe(string maHangVe, string? tenHangVe)
    {
        maHangVe = maHangVe.Trim().ToUpperInvariant();
        tenHangVe = chuanHoaTen(tenHangVe);
        if (dalHangVe.layHangVe(maHangVe) == null) throw LoiNghiepVu.khongTimThay("Không tìm thấy hạng vé.");
        var loi = new Dictionary<string, string>();
        kiemTraTenHangVe(tenHangVe, maHangVe, loi);
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
        try
        {
            dalHangVe.suaTen(maHangVe, tenHangVe);
        }
        catch (LoiTrungDuLieu)
        {
            throw LoiNghiepVu.khongHopLe("tenHangVe", "Tên hạng vé đã tồn tại.");
        }
    }

    public void xoaHangVe(string maHangVe)
    {
        maHangVe = maHangVe.Trim().ToUpperInvariant();
        var dangDung = LoiNghiepVu.viPham(MaLoi.DANG_DUOC_SU_DUNG,
            "Không thể xóa hạng vé vì đang được chuyến bay sử dụng.");
        try
        {
            ketNoi.thucHienTrongGiaoDich(() =>
            {
                int soHangVe = dalHangVe.demHangVe(khoaBang: true);
                if (dalHangVe.layHangVe(maHangVe) == null) throw LoiNghiepVu.khongTimThay("Không tìm thấy hạng vé.");
                // AT02: không xóa hạng vé đang được chuyến bay sử dụng
                if (dalChuyenBay.kiemTraDangSuDung(new List<string>(), new List<string> { maHangVe })) throw dangDung;
                // TH05: danh sách luôn còn ít nhất một hạng vé
                if (soHangVe <= 1)
                    throw LoiNghiepVu.viPham(MaLoi.VI_PHAM_QD6, "Danh sách phải còn ít nhất một hạng vé.");
                dalHangVe.xoa(maHangVe);
            });
        }
        catch (LoiRangBuocDuLieu)
        {
            throw dangDung;
        }
    }

    private static string chuanHoaTen(string? ten)
    {
        return Regex.Replace((ten ?? "").Trim(), @"\s+", " ");
    }

    private void kiemTraTenSanBay(string tenSanBay, string? maBoQua, Dictionary<string, string> loi)
    {
        if (tenSanBay.Length == 0) loi["tenSanBay"] = "Chưa nhập tên sân bay.";
        else if (tenSanBay.Length > 100) loi["tenSanBay"] = "Tên sân bay tối đa 100 ký tự.";
        else if (dalSanBay.kiemTraTrungTen(tenSanBay, maBoQua)) loi["tenSanBay"] = "Tên sân bay đã tồn tại.";
    }

    private void kiemTraTenHangVe(string tenHangVe, string? maBoQua, Dictionary<string, string> loi)
    {
        if (tenHangVe.Length == 0) loi["tenHangVe"] = "Chưa nhập tên hạng vé.";
        else if (tenHangVe.Length > 30) loi["tenHangVe"] = "Tên hạng vé tối đa 30 ký tự.";
        else if (dalHangVe.kiemTraTrungTen(tenHangVe, maBoQua)) loi["tenHangVe"] = "Tên hạng vé đã tồn tại.";
    }
}
