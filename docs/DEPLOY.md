# Đưa phần mềm lên web

Tài liệu này mô tả hai cách cho người khác dùng phần mềm qua Internet:

- **Cách A:** chạy hẳn trên Internet, dùng Render cho máy chủ ứng dụng và Azure SQL Database cho cơ sở dữ liệu. Cả hai đều có gói miễn phí.
- **Cách B:** vẫn chạy trên máy cá nhân, mở một đường hầm để có địa chỉ công khai. Hợp cho buổi demo ngắn.

Render chạy được phần mềm qua Docker nhưng không có SQL Server (chỉ có PostgreSQL). Vì vậy cơ sở dữ liệu phải đặt ở nơi khác. Azure SQL Database dùng đúng SQL Server nên không phải sửa mã.

## Giới hạn của gói miễn phí

| | Render Free | Azure SQL Database (free offer) |
|---|---|---|
| Tài nguyên | 512 MB RAM, 0,1 CPU, 750 giờ/tháng | 100.000 vCore-giây và 32 GB mỗi tháng, cho mỗi cơ sở dữ liệu |
| Khi không ai dùng | Ngủ sau 15 phút. Lần mở đầu sau đó mất khoảng 1 phút | Tự tạm dừng sau 15 phút. Lần truy cập đầu mất khoảng 1 phút |
| Ổ đĩa | Mất khi khởi động lại | Dữ liệu được giữ |
| Dùng hết hạn mức | | Cơ sở dữ liệu tạm dừng đến đầu tháng sau (chọn "Auto-pause") |

Hệ quả khi dùng:

- Lần mở đầu tiên sau một lúc không ai dùng có thể chờ 1–2 phút, vì cả máy chủ ứng dụng lẫn cơ sở dữ liệu đều phải khởi động lại. Nếu trang báo lỗi thì tải lại trang.
- Khi Render khởi động lại, phiên đăng nhập bị xóa và mọi người phải đăng nhập lại.
- Chức năng **Sao lưu dữ liệu** không dùng được, vì Azure không cho sao lưu ra tập tin. Phần mềm báo rõ điều này. Azure đã tự sao lưu theo chính sách của nhà cung cấp.
- Phiếu đặt chỗ quá hạn vẫn được hủy. Việc hủy chạy mỗi 60 phút, và chạy ngay khi máy chủ thức dậy.

Nguồn số liệu: https://render.com/docs/free , https://learn.microsoft.com/azure/azure-sql/database/free-offer (kiểm tra tháng 11/2026).

## Cách A: Render + Azure SQL Database

Trong kho mã đã có sẵn:

| Tệp | Tác dụng |
|---|---|
| `Dockerfile` | Dựng giao diện, publish máy chủ .NET 10, đặt giờ Việt Nam và phông chữ cho PDF |
| `.dockerignore` | Loại các tệp không cần đưa vào ảnh Docker |
| `render.yaml` | Mô tả dịch vụ web cho Render |
| `db/azure/nap_azure.ps1` | Nạp bảng và dữ liệu mẫu vào Azure |

Không có mật khẩu nào nằm trong kho mã. Chuỗi kết nối và mật khẩu được nhập trên Render.

### Bước 1. Tạo cơ sở dữ liệu trên Azure

1. Đăng nhập https://portal.azure.com. Sinh viên có thể dùng gói Azure for Students; gói này không cần thẻ.
2. Tìm **Azure SQL**, chọn **SQL databases**, rồi **Create**. Bấm **Apply offer** (có nơi ghi **Start free**) ở dòng mời dùng thử Azure SQL Database miễn phí.
3. Điền thông tin:
   - **Database name:** `QLBANVECHUYENBAY`.
   - **Server:** tạo mới, ví dụ `canh-en-sql`. Vùng gần Việt Nam nhất là Southeast Asia.
   - **Authentication:** chọn "Use SQL authentication". Đặt tên quản trị (ví dụ `quantri`) và một mật khẩu mạnh, ghi lại ở nơi an toàn.
   - **Behavior when free limit reached:** chọn **Auto-pause the database until next month**. Như vậy không bao giờ bị tính tiền.
   - Ở thẻ **Additional settings**, mục **Collation**, chọn `Vietnamese_CI_AS`. Cài đặt này phải chọn ngay lúc tạo, sau đó không đổi được.
4. Ở thẻ **Networking**:
   - Chọn **Public endpoint**.
   - Bật **Add current client IP address**, để máy của bạn nạp được dữ liệu.
   - Bật **Allow Azure services and resources to access this server**.
5. Bấm **Create** và chờ khoảng 2–5 phút.
6. Sau khi tạo xong, vào server, chọn **Networking**, thêm một luật tường lửa cho Render: Start IP `0.0.0.0`, End IP `255.255.255.255`.
   - Gói Free của Render không có địa chỉ IP cố định, nên phải mở cho mọi địa chỉ.
   - Khi đó an toàn của cơ sở dữ liệu chỉ còn dựa vào mật khẩu, nên mật khẩu phải thật mạnh.

### Bước 2. Nạp bảng và dữ liệu mẫu

Trên máy Windows đã cài `sqlcmd` (có sẵn khi cài SQL Server), mở PowerShell tại thư mục `db\azure` của kho mã và chạy:

```powershell
.\nap_azure.ps1 -MayChu canh-en-sql.database.windows.net -CoSoDuLieu QLBANVECHUYENBAY -NguoiDung quantri -TaoNguoiDungUngDung ungdung
```

Script sẽ hỏi hai mật khẩu:

- mật khẩu của tài khoản quản trị;
- mật khẩu mới cho `ungdung`. Đây là tài khoản phần mềm dùng để kết nối, chỉ được đọc và ghi dữ liệu.

Script chạy `db/01_tao_csdl.sql` và `db/02_du_lieu_mau.sql`, nhưng bỏ phần tạo cơ sở dữ liệu (Azure không cho) và đổi giờ máy chủ (UTC) sang giờ Việt Nam.

Muốn nạp lại từ đầu thì thêm `-XoaCu`. Lựa chọn này xóa hết dữ liệu cũ.

### Bước 3. Tạo dịch vụ trên Render

1. Đăng nhập https://render.com bằng tài khoản GitHub có quyền xem kho mã.
2. Chọn **New**, rồi **Blueprint**, chọn kho `Flight-Booking-System`. Render đọc `render.yaml` và đề xuất dịch vụ `dai-ly-ve-may-bay-canh-en` (Docker, gói Free, vùng Singapore).
3. Render hỏi giá trị các biến có đánh dấu `sync: false`:
   - **`ConnectionStrings__QLBANVE`**: thay tên server và mật khẩu vào chuỗi sau.
     ```
     Server=tcp:canh-en-sql.database.windows.net,1433;Initial Catalog=QLBANVECHUYENBAY;User ID=ungdung;Password=<mật khẩu của ungdung>;Encrypt=True;TrustServerCertificate=False;Connect Timeout=60;ConnectRetryCount=3;ConnectRetryInterval=10
     ```
   - **`TaiKhoanBanDau__0__MatKhau`**, **`__1__`**, **`__2__`**: mật khẩu ban đầu của ba tài khoản `quanly`, `nhanvien`, `nhanvien2`.
     - Mật khẩu dài 10–100 ký tự và không trùng mật khẩu mặc định.
     - Phần mềm chỉ tạo các tài khoản này ở lần chạy đầu, khi bảng TAIKHOAN còn rỗng. Vì vậy phải đặt các biến này trước lần chạy đầu.
4. Bấm **Apply**. Lần dựng đầu mất khoảng 5–10 phút. Khi Render báo **Live**, địa chỉ có dạng `https://dai-ly-ve-may-bay-canh-en.onrender.com`.

Cách làm tay nếu không dùng Blueprint: chọn **New**, rồi **Web Service**, chọn kho, **Language** là Docker, **Instance Type** là Free. Sau đó thêm các biến môi trường như trên, cùng biến `BoDinhThoi__ChuKyPhut` = `60`.

### Bước 4. Kiểm tra sau khi đưa lên

- Đăng nhập bằng `quanly` và mật khẩu đã đặt ở Bước 3.
- Thử tra cứu chuyến bay, bán một vé, đặt một phiếu.
- Xuất báo cáo ra Excel và PDF, kiểm tra chữ tiếng Việt hiển thị đúng.
- Kiểm tra giờ trên thanh thông báo là giờ Việt Nam.
- Mở thử bằng điện thoại. Giao diện đã co giãn theo màn hình điện thoại và máy tính bảng.

### Cập nhật phiên bản

Mỗi lần đẩy mã lên nhánh `main`, Render tự dựng và chạy bản mới. Dữ liệu trên Azure được giữ nguyên.

## Cách B: chạy trên máy, chia sẻ bằng đường hầm (demo nhanh)

Cách này không cần chuyển cơ sở dữ liệu, mọi chức năng (kể cả sao lưu) vẫn chạy như trên máy. Đổi lại, máy cá nhân phải bật suốt thời gian người khác dùng.

1. Chạy phần mềm như bình thường (mục "Cài đặt trên Windows" của README), địa chỉ `http://localhost:5080`, nhưng đặt thêm biến môi trường trước khi chạy:
   ```powershell
   $env:ASPNETCORE_FORWARDEDHEADERS_ENABLED = 'true'
   dotnet run -c Release --urls http://0.0.0.0:5080
   ```
   Thiếu biến này thì mọi người dùng qua đường hầm đều hiện cùng địa chỉ 127.0.0.1. Phần chống dò mật khẩu sẽ coi họ là một máy, và chỉ sau 30 lần đăng nhập sai (cộng dồn của tất cả mọi người) là khóa đăng nhập của mọi người.
2. Tải `cloudflared` cho Windows từ https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ và đặt vào `D:\Programs\cloudflared\`.
3. Chạy lệnh sau:
   ```powershell
   D:\Programs\cloudflared\cloudflared.exe tunnel --url http://localhost:5080
   ```
4. Lệnh in ra một địa chỉ dạng `https://<tên ngẫu nhiên>.trycloudflare.com`. Gửi địa chỉ này cho người dùng. Địa chỉ đổi sau mỗi lần chạy lại lệnh.
   - Các dịch vụ rút gọn link như TinyURL và is.gd từ chối địa chỉ `trycloudflare.com`, vì tên miền này nằm trong danh sách chặn của họ (đã thử ngày 27/11/2026).
   - Cần địa chỉ ngắn hoặc cố định thì dùng Tailscale Funnel (mục dưới) hoặc một tên miền riêng.

### Địa chỉ cố định bằng Tailscale Funnel

Địa chỉ của Cloudflare đổi mỗi lần chạy. Nếu cần một địa chỉ cố định thì dùng Tailscale Funnel; cách này miễn phí nhưng phải có tài khoản Tailscale (đăng nhập bằng Google hoặc GitHub).

1. Tải bộ cài từ https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi. Cài vào `D:\Programs\Tailscale`; việc này cần quyền quản trị:
   ```powershell
   msiexec /i tailscale-setup-latest-amd64.msi INSTALLDIR=D:\Programs\Tailscale\
   ```
   Trạng thái dịch vụ vẫn nằm ở `C:\ProgramData\Tailscale`; bộ cài không cho đổi chỗ này.
2. Đăng nhập: chạy `D:\Programs\Tailscale\tailscale.exe up`, rồi mở địa chỉ lệnh in ra.
3. Bật đường hầm:
   ```powershell
   D:\Programs\Tailscale\tailscale.exe funnel --bg 5080
   ```
   - Lần đầu, lệnh in ra một địa chỉ để bật Funnel trên trang quản trị. Mở địa chỉ đó, bấm đồng ý, rồi chạy lại lệnh.
   - Địa chỉ công khai có dạng `https://<tên máy>.<tên mạng>.ts.net` và giữ nguyên qua các lần chạy.
4. Tắt đường hầm: `D:\Programs\Tailscale\tailscale.exe funnel --https=443 off`.

Nếu dùng cách này, nên đổi mật khẩu các tài khoản mặc định trước khi chia sẻ.
