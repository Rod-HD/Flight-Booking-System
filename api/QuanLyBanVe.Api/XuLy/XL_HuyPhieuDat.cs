using QuanLyBanVe.Api.DTO;
using QuanLyBanVe.Api.TienIch;
using QuanLyBanVe.Api.TruyXuat;

namespace QuanLyBanVe.Api.XuLy;

/// <summary>UC06 Tự động hủy phiếu đặt chỗ, do BoDinhThoi kích hoạt khi khởi động và sau mỗi 15 phút.</summary>
public class XL_HuyPhieuDat
{
    private readonly DAL_PhieuDatCho dalPhieuDatCho;
    private readonly DAL_ChuyenBay dalChuyenBay;
    private readonly DAL_ThamSoQuyDinh dalThamSo;

    public XL_HuyPhieuDat(DAL_PhieuDatCho dalPhieuDatCho, DAL_ChuyenBay dalChuyenBay, DAL_ThamSoQuyDinh dalThamSo)
    {
        this.dalPhieuDatCho = dalPhieuDatCho;
        this.dalChuyenBay = dalChuyenBay;
        this.dalThamSo = dalThamSo;
    }

    /// <summary>
    /// Hủy các phiếu Chờ thanh toán đã quá 24 giờ (giả định 7) và các phiếu của chuyến bay đã đến mốc hủy
    /// đặt vé theo QĐ3 (giả định 6). Phiếu chỉ đổi tình trạng, không bị xóa (AT03). Trả về số phiếu đã hủy.
    /// </summary>
    public int kichHoatDinhKy(DateTime thoiDiemHienTai)
    {
        int soPhieuDaHuy = 0;

        // bước 2: phiếu có thời điểm đặt cách thời điểm hiện tại quá 24 giờ
        foreach (PhieuDatCho phieu in dalPhieuDatCho.layPhieuQuaHan(thoiDiemHienTai))
            soPhieuDaHuy += dalPhieuDatCho.huy(phieu.MaPhieuDat);

        // bước 3, 4: đọc tham số thời gian hủy đặt vé rồi hủy phiếu của các chuyến bay đã đến mốc hủy
        int thoiGianHuy = dalThamSo.layThoiGianHuyDatVe();
        foreach (ChuyenBay cb in dalChuyenBay.layChuyenBayDenHanHuy(thoiDiemHienTai.Date, thoiGianHuy))
        {
            foreach (PhieuDatCho phieu in dalPhieuDatCho.layPhieuChoThanhToan(cb.MaChuyenBay))
                soPhieuDaHuy += dalPhieuDatCho.huy(phieu.MaPhieuDat);
        }

        // bước 5: chỉ ghi nhật ký khi có phiếu bị hủy
        if (soPhieuDaHuy > 0) TienIch_NhatKy.ghiNhatKy(thoiDiemHienTai, soPhieuDaHuy);
        return soPhieuDaHuy;
    }

    /// <summary>Các dòng mới nhất của nhật ký hủy phiếu tự động, để hiển thị ở mục thông báo.</summary>
    public List<(DateTime ThoiDiem, string NoiDung)> layThongBao(int soDongToiDa)
    {
        return TienIch_NhatKy.docNhatKy(soDongToiDa);
    }
}
