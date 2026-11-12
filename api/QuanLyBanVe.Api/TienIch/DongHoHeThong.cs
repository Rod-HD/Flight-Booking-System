namespace QuanLyBanVe.Api.TienIch;

/// <summary>
/// Tác nhân Đồng hồ hệ thống: cung cấp thời điểm hiện tại (giờ của máy chủ) cho các lớp xử lý.
/// Tách thành lớp riêng để kiểm thử thay được thời điểm.
/// </summary>
public class DongHoHeThong
{
    public virtual DateTime layThoiDiemHienTai()
    {
        // bỏ phần lẻ của giây vì cột datetime2(0) chỉ lưu đến giây
        DateTime bayGio = DateTime.Now;
        return new DateTime(bayGio.Year, bayGio.Month, bayGio.Day, bayGio.Hour, bayGio.Minute, bayGio.Second);
    }
}
