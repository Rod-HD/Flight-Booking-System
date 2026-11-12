namespace QuanLyBanVe.Api.TruyXuat;

/// <summary>Câu lệnh ghi làm trùng khóa chính hoặc trùng cột không cho phép trùng.</summary>
public class LoiTrungDuLieu : Exception
{
    public LoiTrungDuLieu(Exception loiGoc) : base("Dữ liệu bị trùng với dòng đã có.", loiGoc) { }
}

/// <summary>Câu lệnh ghi vi phạm khóa ngoại hoặc ràng buộc miền giá trị của bảng.</summary>
public class LoiRangBuocDuLieu : Exception
{
    public LoiRangBuocDuLieu(Exception loiGoc) : base("Dữ liệu vi phạm ràng buộc của cơ sở dữ liệu.", loiGoc) { }
}

/// <summary>Giao dịch bị cơ sở dữ liệu hủy do tranh chấp khóa với giao dịch khác.</summary>
public class LoiTranhChap : Exception
{
    public LoiTranhChap(Exception loiGoc) : base("Giao dịch bị hủy do tranh chấp với thao tác khác.", loiGoc) { }
}

/// <summary>Không mở được kết nối tới cơ sở dữ liệu.</summary>
public class LoiKetNoiCSDL : Exception
{
    public LoiKetNoiCSDL(Exception loiGoc) : base("Không kết nối được cơ sở dữ liệu.", loiGoc) { }
}
