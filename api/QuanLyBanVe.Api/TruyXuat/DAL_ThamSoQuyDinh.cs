using QuanLyBanVe.Api.DTO;

namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Truy xuất bảng THAMSOQUYDINH (đúng một dòng): chỉ có thao tác đọc và sửa.</summary>
public class DAL_ThamSoQuyDinh
{
    /// <summary>Tên sáu tham số được phép thay đổi theo QĐ6, cũng là tên cột của bảng.</summary>
    public static readonly string[] TEN_THAM_SO =
    {
        "ThoiGianBayToiThieu", "SoSanBayTrungGianToiDa", "ThoiGianDungToiThieu",
        "ThoiGianDungToiDa", "ThoiGianDatVeChamNhat", "ThoiGianHuyDatVe"
    };

    private readonly KetNoiCSDL ketNoi;

    public DAL_ThamSoQuyDinh(KetNoiCSDL ketNoi)
    {
        this.ketNoi = ketNoi;
    }

    /// <summary>Đọc cả sáu tham số; khoaDong = true khi sắp sửa trong cùng giao dịch.</summary>
    public ThamSoQuyDinh layThamSoQuyDinh(bool khoaDong = false)
    {
        string khoa = khoaDong ? " WITH (UPDLOCK, HOLDLOCK)" : "";
        ThamSoQuyDinh? thamSo = ketNoi.docMot(
            "SELECT ThoiGianBayToiThieu, SoSanBayTrungGianToiDa, ThoiGianDungToiThieu, ThoiGianDungToiDa, "
            + "ThoiGianDatVeChamNhat, ThoiGianHuyDatVe FROM THAMSOQUYDINH" + khoa,
            dong => new ThamSoQuyDinh(dong.GetInt32(0), dong.GetInt32(1), dong.GetInt32(2),
                dong.GetInt32(3), dong.GetInt32(4), dong.GetInt32(5)));
        return thamSo ?? throw new InvalidOperationException("Bảng THAMSOQUYDINH chưa có dòng tham số.");
    }

    /// <summary>Các tham số của QĐ1 dùng khi nhận lịch chuyến bay.</summary>
    public ThamSoQuyDinh layThamSoNhanLich()
    {
        return layThamSoQuyDinh();
    }

    /// <summary>QĐ3: số ngày tối thiểu trước ngày khởi hành được đặt vé.</summary>
    public int layThoiGianDatVeChamNhat()
    {
        return ketNoi.docSoNguyen("SELECT ThoiGianDatVeChamNhat FROM THAMSOQUYDINH");
    }

    /// <summary>QĐ3: số ngày trước ngày khởi hành mà phiếu chưa thanh toán bị hủy.</summary>
    public int layThoiGianHuyDatVe()
    {
        return ketNoi.docSoNguyen("SELECT ThoiGianHuyDatVe FROM THAMSOQUYDINH");
    }

    public void thayDoiQuyDinh(string maQD, int giaTriMoi)
    {
        // tên cột không truyền bằng tham số được nên chỉ nhận đúng một trong sáu tên đã biết
        string? cot = TEN_THAM_SO.FirstOrDefault(ten => ten == maQD);
        if (cot == null) throw new ArgumentException("Không có tham số quy định " + maQD);
        ketNoi.thucThi("UPDATE THAMSOQUYDINH SET " + cot + " = @giaTri", ThamSo.SoNguyen("@giaTri", giaTriMoi));
    }
}
