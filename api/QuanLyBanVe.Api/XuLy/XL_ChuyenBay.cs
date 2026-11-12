using System.Data;
using System.Globalization;
using System.Text.RegularExpressions;
using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>
/// UC03 Quản lý chuyến bay: nhận lịch chuyến bay theo BM1 (thêm, sửa, xóa, nhập từ Excel)
/// và tra cứu chuyến bay theo BM4.
/// </summary>
public class XL_ChuyenBay
{
    public const string TRANG_CHUYEN_BAY = "ChuyenBay";
    public const string TRANG_TRUNG_GIAN = "TrungGian";

    private const decimal GIA_VE_TOI_DA = 999_999_999_999m;
    private const int SO_DONG_NHAP_TOI_DA = 2000;
    private static readonly Regex mauMaChuyenBay = new("^[A-Z0-9]{1,10}$", RegexOptions.Compiled);

    private readonly KetNoiCSDL ketNoi;
    private readonly DAL_ChuyenBay dalChuyenBay;
    private readonly DAL_GheTheoHang dalGheTheoHang;
    private readonly DAL_SanBay dalSanBay;
    private readonly DAL_HangVe dalHangVe;
    private readonly DAL_ThamSoQuyDinh dalThamSo;
    private readonly DongHoHeThong dongHo;

    public XL_ChuyenBay(KetNoiCSDL ketNoi, DAL_ChuyenBay dalChuyenBay, DAL_GheTheoHang dalGheTheoHang,
        DAL_SanBay dalSanBay, DAL_HangVe dalHangVe, DAL_ThamSoQuyDinh dalThamSo, DongHoHeThong dongHo)
    {
        this.ketNoi = ketNoi;
        this.dalChuyenBay = dalChuyenBay;
        this.dalGheTheoHang = dalGheTheoHang;
        this.dalSanBay = dalSanBay;
        this.dalHangVe = dalHangVe;
        this.dalThamSo = dalThamSo;
        this.dongHo = dongHo;
    }

    /// <summary>Danh sách sân bay và hạng vé để chọn khi nhập chuyến bay (TD01).</summary>
    public void taiDuLieu(out List<SanBay> dsSanBay, out List<HangVe> dsHangVe)
    {
        dsSanBay = dalSanBay.layDanhSachSanBay();
        dsHangVe = dalHangVe.layDanhSachHangVe();
    }

    /// <summary>
    /// UC03.4: tra cứu theo một hoặc nhiều tiêu chí. TuNgay, DenNgay là ngày khởi hành (tính cả hai ngày đầu, cuối).
    /// Kết quả theo các cột của BM4, kèm số ghế trống (1.6) và số ghế đặt (1.5).
    /// </summary>
    public DataTable timKiem(TieuChiTim tieuChi)
    {
        var chuan = new TieuChiTim
        {
            MaSanBayDi = chuanHoaMa(tieuChi.MaSanBayDi),
            MaSanBayDen = chuanHoaMa(tieuChi.MaSanBayDen),
            MaChuyenBay = chuanHoaMa(tieuChi.MaChuyenBay),
            TuNgay = tieuChi.TuNgay?.Date,
            DenNgay = tieuChi.DenNgay?.Date.AddDays(1)
        };
        return dalChuyenBay.timChuyenBay(chuan);
    }

    /// <summary>Các chuyến bay chưa khởi hành gần nhất, sắp theo giờ khởi hành.</summary>
    public DataTable laySapKhoiHanh(int soLuong)
    {
        soLuong = Math.Clamp(soLuong, 1, 100);
        return dalChuyenBay.timChuyenBay(new TieuChiTim { TuNgay = dongHo.layThoiDiemHienTai() }, soLuong);
    }

    /// <summary>Thông tin một chuyến bay kèm số ghế từng hạng, các sân bay trung gian và số ghế đã bán, đã đặt của từng hạng.</summary>
    public ChuyenBay layThongTin(string maCB, out List<GheTheoHang> dsGhe, out List<ChiTietTrungGian> dsTrungGian,
        out Dictionary<string, int> soDaBanVaDat)
    {
        maCB = chuanHoaMa(maCB) ?? "";
        ChuyenBay cb = dalChuyenBay.layThongTin(maCB, out dsGhe, out dsTrungGian) ?? throw khongCoChuyenBay();
        soDaBanVaDat = dalChuyenBay.laySoGheDaBanVaDat(maCB);
        return cb;
    }

    /// <summary>UC03.1: thêm chuyến bay mới (nhận lịch chuyến bay theo BM1).</summary>
    public void themChuyenBay(ChuyenBay cb, List<GheTheoHang> dsGhe, List<ChiTietTrungGian> dsTrungGian)
    {
        chuanHoa(cb, dsGhe, dsTrungGian);
        Dictionary<string, string> loi = kiemTraHopLe(cb, dsGhe, dsTrungGian, laThemMoi: true);
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);

        var trungMa = LoiNghiepVu.viPham(MaLoi.TRUNG_MA, "Mã chuyến bay đã tồn tại.", "maChuyenBay");
        if (dalChuyenBay.kiemTraMaChuyenBay(cb.MaChuyenBay)) throw trungMa;

        kiemTraQuyDinhNhanLich(cb, dsTrungGian);

        List<GheTheoHang> dsGheCoGhe = boHangKhongCoGhe(dsGhe);
        try
        {
            ketNoi.thucHienTrongGiaoDich(() => dalChuyenBay.themChuyenBay(cb, dsGheCoGhe, dsTrungGian));
        }
        catch (LoiTrungDuLieu)
        {
            throw trungMa;
        }
    }

    /// <summary>UC03.2: sửa chuyến bay (trừ mã chuyến bay).</summary>
    public void suaChuyenBay(string maCB, ChuyenBay cb, List<GheTheoHang> dsGhe, List<ChiTietTrungGian> dsTrungGian)
    {
        maCB = chuanHoaMa(maCB) ?? "";
        if (!dalChuyenBay.kiemTraMaChuyenBay(maCB)) throw khongCoChuyenBay();
        cb.MaChuyenBay = maCB;
        chuanHoa(cb, dsGhe, dsTrungGian);

        // giả định 12, trừ điều kiện ngày giờ khởi hành sau thời điểm hiện tại
        Dictionary<string, string> loi = kiemTraHopLe(cb, dsGhe, dsTrungGian, laThemMoi: false);
        if (loi.Count > 0) throw LoiNghiepVu.khongHopLe(loi);
        kiemTraQuyDinhNhanLich(cb, dsTrungGian);

        List<GheTheoHang> dsGheCoGhe = boHangKhongCoGhe(dsGhe);
        Dictionary<string, string> tenHang = dalHangVe.layDanhSachHangVe().ToDictionary(h => h.MaHangVe, h => h.TenHangVe);
        ketNoi.thucHienTrongGiaoDich(() =>
        {
            // giảm số ghế có thể làm hết chỗ nên khóa các dòng số ghế rồi mới đếm lại vé, phiếu
            dalGheTheoHang.layTheoChuyenBay(maCB, khoaDong: true);
            foreach (KeyValuePair<string, int> daDung in dalChuyenBay.laySoGheDaBanVaDat(maCB))
            {
                int soGheMoi = dsGheCoGhe.FirstOrDefault(g => g.MaHangVe == daDung.Key)?.SoLuongGhe ?? 0;
                // giả định 8: số ghế mới không nhỏ hơn số vé Đã bán cộng số phiếu Chờ thanh toán của hạng
                if (soGheMoi < daDung.Value)
                    throw LoiNghiepVu.viPham(MaLoi.DA_CO_VE_HOAC_PHIEU,
                        "Số ghế " + tenHang.GetValueOrDefault(daDung.Key, daDung.Key) + " không được nhỏ hơn " + daDung.Value
                        + " (số vé Đã bán cộng số phiếu Chờ thanh toán của hạng).", "gheTheoHang");
            }

            dalChuyenBay.capNhat(maCB, cb, dsGheCoGhe, dsTrungGian);

            // hạng bị bỏ nhưng còn vé, phiếu đã hủy lưu vết thì dòng số ghế không xóa được
            GheTheoHang? conSot = dalGheTheoHang.layTheoChuyenBay(maCB)
                .FirstOrDefault(cu => dsGheCoGhe.All(moi => moi.MaHangVe != cu.MaHangVe));
            if (conSot != null)
                throw LoiNghiepVu.viPham(MaLoi.DA_CO_VE_HOAC_PHIEU,
                    "Không thể bỏ " + tenHang.GetValueOrDefault(conSot.MaHangVe, conSot.MaHangVe)
                    + " khỏi chuyến bay vì hạng này đã có vé hoặc phiếu đặt chỗ (kể cả đã hủy).", "gheTheoHang");
        });
    }

    /// <summary>UC03.3: xóa chuyến bay chưa có vé, phiếu đặt chỗ (AT02).</summary>
    public void xoaChuyenBay(string maCB)
    {
        maCB = chuanHoaMa(maCB) ?? "";
        var daCo = LoiNghiepVu.viPham(MaLoi.DA_CO_VE_HOAC_PHIEU, "Không thể xóa chuyến bay đã có vé hoặc phiếu đặt chỗ.");
        try
        {
            ketNoi.thucHienTrongGiaoDich(() =>
            {
                if (!dalChuyenBay.kiemTraMaChuyenBay(maCB)) throw khongCoChuyenBay();
                // khóa các dòng số ghế để không có vé, phiếu mới được lập trong lúc xóa
                dalGheTheoHang.layTheoChuyenBay(maCB, khoaDong: true);
                if (dalChuyenBay.kiemTraCoVeHoacPhieu(maCB)) throw daCo;
                dalChuyenBay.xoa(maCB);
            });
        }
        catch (LoiRangBuocDuLieu)
        {
            throw daCo;
        }
    }

    /// <summary>UC03 luồng 3a: xuất danh sách chuyến bay đang tra cứu ra tập tin Excel (TT02).</summary>
    public byte[] xuatExcel(TieuChiTim tieuChi)
    {
        DataTable ketQua = timKiem(tieuChi);
        var bang = new DataTable("DanhSachChuyenBay");
        bang.Columns.Add("STT", typeof(int));
        bang.Columns.Add("MaChuyenBay", typeof(string)).Caption = "Mã chuyến bay";
        bang.Columns.Add("SanBayDi", typeof(string)).Caption = "Sân bay đi";
        bang.Columns.Add("SanBayDen", typeof(string)).Caption = "Sân bay đến";
        bang.Columns.Add("KhoiHanh", typeof(DateTime)).Caption = "Khởi hành";
        bang.Columns.Add("ThoiGian", typeof(int)).Caption = "Thời gian bay (phút)";
        bang.Columns.Add("SoGheTrong", typeof(int)).Caption = "Số ghế trống";
        bang.Columns.Add("SoGheDat", typeof(int)).Caption = "Số ghế đặt";
        int stt = 1;
        foreach (DataRow dong in ketQua.Rows)
        {
            bang.Rows.Add(stt++, dong["MaChuyenBay"], dong["TenSanBayDi"], dong["TenSanBayDen"],
                dong["NgayGioKhoiHanh"], dong["ThoiGianBay"], dong["SoGheTrong"], dong["SoGheDat"]);
        }
        string ngayXuat = dongHo.layThoiDiemHienTai().ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
        return TienIch_TapTin.taoExcel(bang, "Danh sách chuyến bay", new[] { "Ngày xuất: " + ngayXuat });
    }

    /// <summary>Tập tin Excel mẫu để nhập lịch chuyến bay: trang ChuyenBay, trang TrungGian và trang hướng dẫn.</summary>
    public byte[] taoTapTinMau()
    {
        taiDuLieu(out List<SanBay> dsSanBay, out List<HangVe> dsHangVe);
        ThamSoQuyDinh thamSo = dalThamSo.layThamSoNhanLich();

        var chuyenBay = new DataTable(TRANG_CHUYEN_BAY);
        foreach (string cot in new[] { "Mã chuyến bay", "Giá vé", "Mã sân bay đi", "Mã sân bay đến", "Ngày giờ khởi hành", "Thời gian bay (phút)" })
            chuyenBay.Columns.Add(cot, typeof(string));
        foreach (HangVe hang in dsHangVe)
            chuyenBay.Columns.Add("Số ghế " + hang.MaHangVe, typeof(string));

        var trungGian = new DataTable(TRANG_TRUNG_GIAN);
        foreach (string cot in new[] { "Mã chuyến bay", "Thứ tự dừng", "Mã sân bay", "Thời gian dừng (phút)", "Ghi chú" })
            trungGian.Columns.Add(cot, typeof(string));

        var huongDan = new DataTable("HuongDan");
        huongDan.Columns.Add("Hướng dẫn nhập lịch chuyến bay", typeof(string));
        string[] cacDong =
        {
            "Trang ChuyenBay: mỗi dòng là một chuyến bay, nhập từ dòng 2, không đổi tên và thứ tự các cột.",
            "Mã chuyến bay: tối đa 10 ký tự gồm chữ in hoa và số, chưa có trong phần mềm. Ví dụ: CB900.",
            "Giá vé: số nguyên dương, tính bằng đồng. Ví dụ: 1500000.",
            "Mã sân bay đi, mã sân bay đến: lấy trong danh sách sân bay, hai sân bay phải khác nhau.",
            "Danh sách sân bay hiện có: " + string.Join(", ", dsSanBay.Select(sb => sb.MaSanBay + " (" + sb.TenSanBay + ")")) + ".",
            "Ngày giờ khởi hành: theo dạng dd/MM/yyyy HH:mm, phải sau thời điểm nhập. Ví dụ: 25/12/2026 08:30.",
            "Thời gian bay: số phút, không nhỏ hơn " + thamSo.ThoiGianBayToiThieu + " phút (QĐ1).",
            "Mỗi cột Số ghế ứng với một hạng vé: " + string.Join(", ", dsHangVe.Select(h => h.MaHangVe + " (" + h.TenHangVe + ")"))
                + ". Nhập số nguyên không âm, để trống hoặc 0 nếu chuyến bay không có hạng đó; ít nhất một hạng lớn hơn 0.",
            "Trang TrungGian: mỗi dòng là một sân bay trung gian của một chuyến bay ở trang ChuyenBay; chuyến bay bay thẳng thì không cần dòng nào.",
            "Mỗi chuyến bay có tối đa " + thamSo.SoSanBayTrungGianToiDa + " sân bay trung gian, thời gian dừng từ "
                + thamSo.ThoiGianDungToiThieu + " đến " + thamSo.ThoiGianDungToiDa + " phút (QĐ1).",
            "Sân bay trung gian không trùng nhau và khác sân bay đi, sân bay đến. Thứ tự dừng đánh số từ 1.",
            "Sau khi nhập, phần mềm thông báo số chuyến bay đã thêm và danh sách dòng bị lỗi kèm lý do."
        };
        foreach (string dong in cacDong) huongDan.Rows.Add(dong);

        return TienIch_TapTin.taoExcel(new[] { chuyenBay, trungGian, huongDan });
    }

    /// <summary>
    /// UC03 luồng T1a: nhận nhiều lịch chuyến bay từ tập tin Excel theo tập tin mẫu (TT01).
    /// Mỗi dòng được kiểm tra như khi thêm một chuyến bay; dòng hợp lệ được lưu, dòng lỗi được ghi lại kèm lý do.
    /// </summary>
    public (int SoDaThem, List<(int Dong, string LyDo)> DongLoi) nhapTuExcel(Stream tapTin)
    {
        DataTable bangChuyenBay;
        DataTable? bangTrungGian = null;
        try
        {
            using var boNho = new MemoryStream();
            tapTin.CopyTo(boNho);
            boNho.Position = 0;
            bangChuyenBay = TienIch_TapTin.docExcel(boNho, TRANG_CHUYEN_BAY);
            try
            {
                boNho.Position = 0;
                bangTrungGian = TienIch_TapTin.docExcel(boNho, TRANG_TRUNG_GIAN);
            }
            catch (TienIch_TapTin.TapTinKhongDungMau)
            {
                // không có trang TrungGian thì coi như mọi chuyến bay đều bay thẳng
            }
        }
        catch (TienIch_TapTin.TapTinKhongDungMau loi)
        {
            throw LoiNghiepVu.khongHopLe("tapTin", loi.Message);
        }
        catch (Exception)
        {
            throw LoiNghiepVu.khongHopLe("tapTin",
                "Không đọc được tập tin. Hãy dùng tập tin Excel (.xlsx) theo tập tin mẫu của phần mềm.");
        }

        if (bangChuyenBay.Rows.Count > SO_DONG_NHAP_TOI_DA)
            throw LoiNghiepVu.khongHopLe("tapTin", "Mỗi lần chỉ nhập tối đa " + SO_DONG_NHAP_TOI_DA + " chuyến bay.");
        // cột 0 là số dòng, cột 1 đến 6 là thông tin chung, từ cột 7 là số ghế từng hạng
        if (bangChuyenBay.Columns.Count < 8)
            throw LoiNghiepVu.khongHopLe("tapTin", "Trang ChuyenBay thiếu cột so với tập tin mẫu.");

        List<HangVe> dsHangVe = dalHangVe.layDanhSachHangVe();
        var hangCuaCot = new Dictionary<int, string>();
        for (int cot = 7; cot < bangChuyenBay.Columns.Count; cot++)
        {
            string tieuDe = bangChuyenBay.Columns[cot].ColumnName.Trim();
            string tuCuoi = tieuDe.Split(' ', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? "";
            HangVe? hang = dsHangVe.FirstOrDefault(h => string.Equals(h.MaHangVe, tuCuoi, StringComparison.OrdinalIgnoreCase));
            if (hang == null)
                throw LoiNghiepVu.khongHopLe("tapTin", "Cột \"" + tieuDe + "\" của trang ChuyenBay không ứng với hạng vé nào.");
            hangCuaCot[cot] = hang.MaHangVe;
        }

        var dongLoi = new List<(int Dong, string LyDo)>();
        var trungGianTheoMa = docTrangTrungGian(bangTrungGian, dongLoi);
        var maTrongTapTin = new HashSet<string>();
        int soDaThem = 0;

        foreach (DataRow dong in bangChuyenBay.Rows)
        {
            int soDong = (int)dong[TienIch_TapTin.COT_DONG];
            var loiDong = new List<string>();
            var cb = new ChuyenBay
            {
                MaChuyenBay = docChuoi(dong[1]).ToUpperInvariant(),
                MaSanBayDi = docChuoi(dong[3]).ToUpperInvariant(),
                MaSanBayDen = docChuoi(dong[4]).ToUpperInvariant()
            };
            maTrongTapTin.Add(cb.MaChuyenBay);

            if (docSoNguyen(dong[2], out long giaVe)) cb.GiaVe = giaVe;
            else loiDong.Add("Giá vé phải là số nguyên dương (đồng).");
            if (docNgayGio(dong[5], out DateTime ngayGio)) cb.NgayGioKhoiHanh = ngayGio;
            else loiDong.Add("Ngày giờ khởi hành phải theo dạng dd/MM/yyyy HH:mm.");
            if (docSoNguyen(dong[6], out long thoiGianBay) && thoiGianBay <= int.MaxValue) cb.ThoiGianBay = (int)thoiGianBay;
            else loiDong.Add("Thời gian bay phải là số nguyên dương (phút).");

            var dsGhe = new List<GheTheoHang>();
            foreach (KeyValuePair<int, string> cot in hangCuaCot)
            {
                if (dong[cot.Key] is DBNull) continue;
                if (docSoNguyen(dong[cot.Key], out long soGhe) && soGhe >= 0 && soGhe <= int.MaxValue)
                    dsGhe.Add(new GheTheoHang(cb.MaChuyenBay, cot.Value, (int)soGhe));
                else
                    loiDong.Add("Số lượng ghế của mỗi hạng phải là số nguyên không âm.");
            }

            var dsTrungGian = new List<ChiTietTrungGian>();
            if (trungGianTheoMa.TryGetValue(cb.MaChuyenBay, out var cacDiemDung))
            {
                foreach (var (dongTrungGian, chiTiet, loi) in cacDiemDung)
                {
                    if (loi != null) loiDong.Add("Trang TrungGian dòng " + dongTrungGian + ": " + loi);
                    else dsTrungGian.Add(chiTiet!);
                }
            }

            if (loiDong.Count > 0)
            {
                dongLoi.Add((soDong, string.Join(" ", loiDong.Distinct())));
                continue;
            }
            try
            {
                themChuyenBay(cb, dsGhe, dsTrungGian);
                soDaThem++;
            }
            catch (LoiNghiepVu loi)
            {
                string lyDo = loi.ChiTiet.Count > 0 ? string.Join(" ", loi.ChiTiet.Values.Distinct()) : loi.Message;
                dongLoi.Add((soDong, lyDo));
            }
        }

        foreach (var cap in trungGianTheoMa.Where(cap => !maTrongTapTin.Contains(cap.Key)))
        {
            foreach (var (dongTrungGian, _, _) in cap.Value)
                dongLoi.Add((dongTrungGian, "Trang TrungGian: không có chuyến bay " + cap.Key + " trong trang ChuyenBay."));
        }
        return (soDaThem, dongLoi);
    }

    /// <summary>Đọc trang TrungGian, gom các sân bay trung gian theo mã chuyến bay.</summary>
    private static Dictionary<string, List<(int Dong, ChiTietTrungGian? ChiTiet, string? Loi)>> docTrangTrungGian(
        DataTable? bang, List<(int Dong, string LyDo)> dongLoi)
    {
        var ketQua = new Dictionary<string, List<(int, ChiTietTrungGian?, string?)>>();
        if (bang == null) return ketQua;
        foreach (DataRow dong in bang.Rows)
        {
            int soDong = (int)dong[TienIch_TapTin.COT_DONG];
            if (bang.Columns.Count < 5)
            {
                dongLoi.Add((soDong, "Trang TrungGian thiếu cột so với tập tin mẫu."));
                continue;
            }
            string maCB = docChuoi(dong[1]).ToUpperInvariant();
            if (maCB.Length == 0)
            {
                dongLoi.Add((soDong, "Trang TrungGian: chưa nhập mã chuyến bay."));
                continue;
            }

            string? loi = null;
            ChiTietTrungGian? chiTiet = null;
            if (!docSoNguyen(dong[2], out long thuTu) || thuTu < 1 || thuTu > byte.MaxValue)
                loi = "thứ tự dừng phải là số nguyên từ 1.";
            else if (!docSoNguyen(dong[4], out long thoiGianDung) || thoiGianDung < 0 || thoiGianDung > int.MaxValue)
                loi = "thời gian dừng phải là số nguyên không âm (phút).";
            else
            {
                string ghiChu = bang.Columns.Count > 5 ? docChuoi(dong[5]) : "";
                chiTiet = new ChiTietTrungGian(maCB, (byte)thuTu, docChuoi(dong[3]).ToUpperInvariant(),
                    (int)thoiGianDung, ghiChu.Length == 0 ? null : ghiChu);
            }

            if (!ketQua.TryGetValue(maCB, out var ds)) ketQua[maCB] = ds = new List<(int, ChiTietTrungGian?, string?)>();
            ds.Add((soDong, chiTiet, loi));
        }
        return ketQua;
    }

    // Kiểm tra lịch chuyến bay

    /// <summary>Bỏ khoảng trắng, đổi mã sang chữ in hoa, đánh lại thứ tự dừng 1, 2, ... theo thứ tự đã nhập.</summary>
    private static void chuanHoa(ChuyenBay cb, List<GheTheoHang> dsGhe, List<ChiTietTrungGian> dsTrungGian)
    {
        cb.MaChuyenBay = chuanHoaMa(cb.MaChuyenBay) ?? "";
        cb.MaSanBayDi = chuanHoaMa(cb.MaSanBayDi) ?? "";
        cb.MaSanBayDen = chuanHoaMa(cb.MaSanBayDen) ?? "";
        foreach (GheTheoHang ghe in dsGhe)
        {
            ghe.MaChuyenBay = cb.MaChuyenBay;
            ghe.MaHangVe = chuanHoaMa(ghe.MaHangVe) ?? "";
        }

        List<ChiTietTrungGian> theoThuTu = dsTrungGian
            .Select((chiTiet, viTri) => (chiTiet, viTri))
            .OrderBy(cap => cap.chiTiet.ThuTu == 0 ? int.MaxValue : cap.chiTiet.ThuTu)
            .ThenBy(cap => cap.viTri)
            .Select(cap => cap.chiTiet)
            .ToList();
        dsTrungGian.Clear();
        dsTrungGian.AddRange(theoThuTu);
        for (int i = 0; i < dsTrungGian.Count; i++)
        {
            ChiTietTrungGian chiTiet = dsTrungGian[i];
            chiTiet.MaChuyenBay = cb.MaChuyenBay;
            chiTiet.ThuTu = (byte)Math.Min(i + 1, byte.MaxValue);
            chiTiet.MaSanBay = chuanHoaMa(chiTiet.MaSanBay) ?? "";
            chiTiet.GhiChu = string.IsNullOrWhiteSpace(chiTiet.GhiChu) ? null : chiTiet.GhiChu.Trim();
        }
    }

    /// <summary>
    /// Kiểm tra lịch chuyến bay hợp lệ theo giả định 12 và ràng buộc của từng ô.
    /// Trả về lỗi theo từng ô; rỗng nếu hợp lệ.
    /// </summary>
    private Dictionary<string, string> kiemTraHopLe(ChuyenBay cb, List<GheTheoHang> dsGhe,
        List<ChiTietTrungGian> dsTrungGian, bool laThemMoi)
    {
        var loi = new Dictionary<string, string>();
        taiDuLieu(out List<SanBay> dsSanBay, out List<HangVe> dsHangVe);
        var maSanBay = new HashSet<string>(dsSanBay.Select(sb => sb.MaSanBay));
        var maHangVe = new HashSet<string>(dsHangVe.Select(h => h.MaHangVe));

        if (laThemMoi)
        {
            if (cb.MaChuyenBay.Length == 0) loi["maChuyenBay"] = "Chưa nhập mã chuyến bay.";
            else if (!mauMaChuyenBay.IsMatch(cb.MaChuyenBay))
                loi["maChuyenBay"] = "Mã chuyến bay tối đa 10 ký tự, chỉ gồm chữ in hoa và số.";
        }

        // giá vé là số nguyên dương tính bằng đồng
        if (cb.GiaVe <= 0 || cb.GiaVe != decimal.Truncate(cb.GiaVe)) loi["giaVe"] = "Giá vé phải là số nguyên dương (đồng).";
        else if (cb.GiaVe > GIA_VE_TOI_DA) loi["giaVe"] = "Giá vé không được vượt quá 999.999.999.999 đồng.";

        if (cb.MaSanBayDi.Length == 0) loi["maSanBayDi"] = "Chưa chọn sân bay đi.";
        else if (!maSanBay.Contains(cb.MaSanBayDi)) loi["maSanBayDi"] = "Sân bay đi không có trong danh sách sân bay.";

        if (cb.MaSanBayDen.Length == 0) loi["maSanBayDen"] = "Chưa chọn sân bay đến.";
        else if (!maSanBay.Contains(cb.MaSanBayDen)) loi["maSanBayDen"] = "Sân bay đến không có trong danh sách sân bay.";
        else if (cb.MaSanBayDen == cb.MaSanBayDi) loi["maSanBayDen"] = "Sân bay đến phải khác sân bay đi.";

        if (cb.NgayGioKhoiHanh == default) loi["ngayGioKhoiHanh"] = "Chưa nhập ngày giờ khởi hành.";
        else if (cb.NgayGioKhoiHanh.Year < 2000 || cb.NgayGioKhoiHanh.Year > 2100)
            loi["ngayGioKhoiHanh"] = "Ngày giờ khởi hành không hợp lệ.";
        else if (laThemMoi && cb.NgayGioKhoiHanh <= dongHo.layThoiDiemHienTai())
            loi["ngayGioKhoiHanh"] = "Ngày giờ khởi hành phải sau thời điểm hiện tại.";

        if (cb.ThoiGianBay <= 0) loi["thoiGianBay"] = "Thời gian bay phải là số nguyên dương (phút).";

        // số ghế mỗi hạng không âm, ít nhất một hạng có ghế
        if (dsGhe.Any(g => !maHangVe.Contains(g.MaHangVe)))
            loi["gheTheoHang"] = "Có hạng vé không có trong danh sách hạng vé.";
        else if (dsGhe.GroupBy(g => g.MaHangVe).Any(nhom => nhom.Count() > 1))
            loi["gheTheoHang"] = "Mỗi hạng vé chỉ nhập số lượng ghế một lần.";
        else if (dsGhe.Any(g => g.SoLuongGhe < 0))
            loi["gheTheoHang"] = "Số lượng ghế của mỗi hạng phải là số nguyên không âm.";
        else if (!dsGhe.Any(g => g.SoLuongGhe > 0))
            loi["gheTheoHang"] = "Phải có ít nhất một hạng vé có số lượng ghế lớn hơn 0.";

        // sân bay trung gian không trùng nhau và khác sân bay đi, sân bay đến
        if (dsTrungGian.Count > byte.MaxValue)
            loi["trungGian"] = "Số sân bay trung gian quá lớn.";
        else if (dsTrungGian.Any(t => t.MaSanBay.Length == 0))
            loi["trungGian"] = "Chưa chọn sân bay trung gian.";
        else if (dsTrungGian.Any(t => !maSanBay.Contains(t.MaSanBay)))
            loi["trungGian"] = "Có sân bay trung gian không có trong danh sách sân bay.";
        else if (dsTrungGian.GroupBy(t => t.MaSanBay).Any(nhom => nhom.Count() > 1))
            loi["trungGian"] = "Các sân bay trung gian không được trùng nhau.";
        else if (dsTrungGian.Any(t => t.MaSanBay == cb.MaSanBayDi || t.MaSanBay == cb.MaSanBayDen))
            loi["trungGian"] = "Sân bay trung gian phải khác sân bay đi và sân bay đến.";
        else if (dsTrungGian.Any(t => t.ThoiGianDung < 0))
            loi["trungGian"] = "Thời gian dừng phải là số nguyên không âm (phút).";
        else if (dsTrungGian.Any(t => t.GhiChu != null && t.GhiChu.Length > 200))
            loi["trungGian"] = "Ghi chú của sân bay trung gian tối đa 200 ký tự.";

        return loi;
    }

    /// <summary>
    /// Kiểm tra QĐ1 theo tham số hiện hành, đọc từ CSDL ở mỗi lần kiểm tra: thời gian bay tối thiểu,
    /// số sân bay trung gian tối đa, thời gian dừng tối thiểu và tối đa.
    /// </summary>
    private void kiemTraQuyDinhNhanLich(ChuyenBay cb, List<ChiTietTrungGian> dsTrungGian)
    {
        ThamSoQuyDinh thamSo = dalThamSo.layThamSoNhanLich();
        var viPham = new Dictionary<string, string>();

        if (cb.ThoiGianBay < thamSo.ThoiGianBayToiThieu)
            viPham["thoiGianBay"] = "Thời gian bay phải từ " + thamSo.ThoiGianBayToiThieu + " phút trở lên (QĐ1).";

        if (dsTrungGian.Count > thamSo.SoSanBayTrungGianToiDa)
            viPham["trungGian"] = "Chuyến bay có tối đa " + thamSo.SoSanBayTrungGianToiDa + " sân bay trung gian (QĐ1).";
        else if (dsTrungGian.Any(t => t.ThoiGianDung < thamSo.ThoiGianDungToiThieu || t.ThoiGianDung > thamSo.ThoiGianDungToiDa))
            viPham["trungGian"] = "Thời gian dừng tại sân bay trung gian phải từ " + thamSo.ThoiGianDungToiThieu
                + " đến " + thamSo.ThoiGianDungToiDa + " phút (QĐ1).";

        if (viPham.Count > 0)
            throw new LoiNghiepVu(LoaiLoi.ViPhamQuyDinh, MaLoi.VI_PHAM_QD1, string.Join(" ", viPham.Values), viPham);
    }

    /// <summary>Hạng nhập 0 ghế nghĩa là chuyến bay không bán hạng đó, không tạo dòng trong GHETHEOHANG.</summary>
    private static List<GheTheoHang> boHangKhongCoGhe(List<GheTheoHang> dsGhe)
    {
        return dsGhe.Where(g => g.SoLuongGhe > 0).ToList();
    }

    private static string? chuanHoaMa(string? ma)
    {
        return string.IsNullOrWhiteSpace(ma) ? null : ma.Trim().ToUpperInvariant();
    }

    private static LoiNghiepVu khongCoChuyenBay()
    {
        return LoiNghiepVu.khongTimThay("Không tìm thấy chuyến bay.");
    }

    // Đọc giá trị của một ô trong tập tin Excel

    private static string docChuoi(object o)
    {
        return o is DBNull ? "" : (Convert.ToString(o, CultureInfo.InvariantCulture) ?? "").Trim();
    }

    private static bool docSoNguyen(object o, out long so)
    {
        so = 0;
        switch (o)
        {
            case double soThuc:
                if (soThuc != Math.Floor(soThuc) || Math.Abs(soThuc) > 1e15) return false;
                so = (long)soThuc;
                return true;
            case string chuoi:
                chuoi = chuoi.Replace(" ", "");
                // cho phép viết có dấu ngăn hàng nghìn như 1.500.000
                if (Regex.IsMatch(chuoi, @"^\d{1,3}([.,]\d{3})+$")) chuoi = chuoi.Replace(".", "").Replace(",", "");
                return long.TryParse(chuoi, NumberStyles.None, CultureInfo.InvariantCulture, out so);
            default:
                return false;
        }
    }

    private static bool docNgayGio(object o, out DateTime ngayGio)
    {
        ngayGio = default;
        switch (o)
        {
            case DateTime giaTri:
                ngayGio = giaTri;
                return true;
            case string chuoi:
                string[] dang =
                {
                    "d/M/yyyy H:mm", "d/M/yyyy H:mm:ss", "yyyy-M-d H:mm", "yyyy-M-d H:mm:ss",
                    "yyyy-M-d'T'H:mm", "yyyy-M-d'T'H:mm:ss"
                };
                return DateTime.TryParseExact(chuoi.Trim(), dang, CultureInfo.InvariantCulture, DateTimeStyles.None, out ngayGio);
            default:
                return false;
        }
    }
}
