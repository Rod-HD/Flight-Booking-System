using System.Security.Cryptography;

namespace QuanLyBanVe.Api.TienIch;

/// <summary>
/// Băm mật khẩu một chiều bằng PBKDF2 kèm chuỗi muối ngẫu nhiên; không lưu mật khẩu gốc.
/// Chuỗi lưu trong TAIKHOAN.MatKhau có dạng: PBKDF2-SHA256$số vòng lặp$muối$giá trị băm (muối và giá trị băm ghi theo Base64).
/// </summary>
public static class TienIch_BaoMat
{
    private const string TIEN_TO = "PBKDF2-SHA256";
    private const int SO_VONG_LAP = 600_000;
    private const int DO_DAI_MUOI = 16;
    private const int DO_DAI_BAM = 32;

    public static string maHoa(string matKhau)
    {
        byte[] muoi = RandomNumberGenerator.GetBytes(DO_DAI_MUOI);
        byte[] bam = Rfc2898DeriveBytes.Pbkdf2(matKhau, muoi, SO_VONG_LAP, HashAlgorithmName.SHA256, DO_DAI_BAM);
        return string.Join('$', TIEN_TO, SO_VONG_LAP, Convert.ToBase64String(muoi), Convert.ToBase64String(bam));
    }

    /// <summary>Băm mật khẩu nhập vào với muối và số vòng lặp đã lưu rồi so với giá trị băm đã lưu.</summary>
    public static bool kiemTraMatKhau(string matKhau, string matKhauDaMaHoa)
    {
        string[] phan = matKhauDaMaHoa.Split('$');
        if (phan.Length != 4 || phan[0] != TIEN_TO || !int.TryParse(phan[1], out int soVongLap) || soVongLap <= 0)
            return false;
        try
        {
            byte[] muoi = Convert.FromBase64String(phan[2]);
            byte[] bamDaLuu = Convert.FromBase64String(phan[3]);
            byte[] bam = Rfc2898DeriveBytes.Pbkdf2(matKhau, muoi, soVongLap, HashAlgorithmName.SHA256, bamDaLuu.Length);
            // so sánh với thời gian không phụ thuộc vị trí byte khác nhau
            return CryptographicOperations.FixedTimeEquals(bam, bamDaLuu);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
