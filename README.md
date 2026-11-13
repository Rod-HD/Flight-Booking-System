# Quản lý bán vé chuyến bay

Đồ án môn Nhập môn Công nghệ phần mềm, lớp SE104.R13, đề tài "Quản lý việc bán vé chuyến bay". Phần mềm web nội bộ cho một phòng vé: nhận lịch chuyến bay, bán vé, ghi nhận đặt vé, tra cứu chuyến bay, lập báo cáo doanh thu và thay đổi quy định (QĐ1 đến QĐ6 trong báo cáo `docs/baocao.txt`).

**Nhóm 12**

| Họ tên | MSSV |
|---|---|
| Hoàng Quốc Duy | 24520373 |
| Nguyễn Nhật Nam | 24521115 |
| Trần Vũ Hữu Lộc | 24520988 |
| Nguyễn Xuân Huy | 24520687 |

## Chức năng theo vai trò

| Chức năng | Nhân viên bán vé | Quản lý |
|---|:---:|:---:|
| Đăng nhập, đăng xuất (UC01) | Có | Có |
| Tra cứu chuyến bay theo sân bay, ngày, mã (BM4), xuất danh sách ra Excel | Có | Có |
| Bán vé trực tiếp hoặc từ phiếu đặt chỗ (BM2, QĐ2); tra cứu, sửa thông tin hành khách, hủy vé | Có | Có |
| Lập phiếu đặt chỗ (BM3, QĐ3); tra cứu, sửa, hủy phiếu | Có | Có |
| Xem thông báo phiếu bị hệ thống tự hủy khi quá hạn (UC06) | Có | Có |
| Thêm, sửa, xóa chuyến bay (BM1, QĐ1); nhập lịch chuyến bay từ tập tin Excel mẫu | | Có |
| Xóa hẳn các phiếu đặt chỗ đã hủy trước một ngày | | Có |
| Báo cáo doanh thu tháng (BM5.1) và năm (BM5.2), xuất Excel và PDF | | Có |
| Thay đổi quy định (QĐ6): tham số QĐ1, QĐ3; thêm, sửa tên, xóa sân bay và hạng vé | | Có |
| Phân quyền (UC02): thêm tài khoản, đổi nhóm quyền, đặt lại mật khẩu, khóa và mở khóa | | Có |

Phím tắt chung: F1 mở Trợ giúp, Alt+1 Chuyến bay, Alt+2 Bán vé, Alt+3 Đặt vé, Alt+4 Báo cáo; trong biểu mẫu Ctrl+S để lưu, Esc để hủy.

## Công nghệ

- Máy chủ: ASP.NET Core trên .NET 10 (C#), ba tầng: giao tiếp (`GiaoTiep/`), xử lý nghiệp vụ (`XuLy/`, các lớp `XL_`), truy xuất dữ liệu (`TruyXuat/`, các lớp `DAL_`) cùng các lớp DTO. Truy cập SQL Server bằng Microsoft.Data.SqlClient với câu lệnh có tham số; Excel bằng ClosedXML, PDF bằng QuestPDF (bản Community); mật khẩu băm PBKDF2; phiên đăng nhập bằng cookie HttpOnly.
- Cơ sở dữ liệu: SQL Server 2022 Express, cơ sở dữ liệu `QLBANVECHUYENBAY` gồm 10 bảng.
- Giao diện: React 18, TypeScript 5.6, Vite 6, React Router 6, TanStack Query 5, CSS Modules, biểu tượng lucide-react.
- Kiểm thử: xUnit cho tầng xử lý và API; Playwright cho kiểm thử giao diện đầu cuối.

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| `api/QuanLyBanVe.Api/` | Máy chủ. `wwwroot/` chứa giao diện đã dựng (tạo bằng `npm run dung-may-chu`, không đưa vào git), `nhat_ky/` chứa nhật ký tự hủy phiếu |
| `api/QuanLyBanVe.KiemThu/` | Kiểm thử xUnit, tự tạo cơ sở dữ liệu thử `QLBANVE_KIEMTHU` |
| `api/kiemtra_nhanh.sh` | Gọi thử các luồng chính của máy chủ đang chạy bằng curl |
| `db/` | `01_tao_csdl.sql` tạo cơ sở dữ liệu, `02_du_lieu_mau.sql` nạp dữ liệu mẫu |
| `cai_dat.ps1`, `cai_dat.cmd` | Cài đặt và chạy bằng một lệnh trên Windows |
| `web/src/` | Mã nguồn giao diện; đường dẫn các trang khai báo ở `web/src/dinh_tuyen.ts` và `web/src/App.tsx` |
| `web/kiem_thu_e2e/` | Kiểm thử giao diện đầu cuối (Playwright), cấu hình ở `web/playwright.config.ts` |
| `docs/` | Báo cáo (`baocao.txt`), hợp đồng API (`API.md`), hệ thống thiết kế giao diện, logo |

## Cài đặt trên Windows 10 trở lên

Các lệnh dưới đây chạy trong PowerShell, đứng ở thư mục gốc của mã nguồn.

1. Cài phần mềm:
   - SQL Server 2022 Express (chọn kiểu cài Basic, tên phiên bản mặc định `SQLEXPRESS`). Công cụ dòng lệnh `sqlcmd` đi kèm; nếu lệnh `sqlcmd` chưa có thì cài thêm gói "sqlcmd" của Microsoft.
   - .NET SDK 10.
   - Node.js 22 (kèm npm).

   Kiểm tra: `sqlcmd -?`, `dotnet --version` (10.x), `node --version` (v22.x).

   Sau khi cài xong ba phần mềm trên, có thể làm các bước 2 đến 6 bằng một lệnh (xem mục "Cài nhanh bằng một lệnh" bên dưới) hoặc làm tay từng bước.

2. Tạo cơ sở dữ liệu và nạp dữ liệu mẫu (dùng tài khoản Windows đang đăng nhập, người cài SQL Server Express có quyền quản trị):

   ```powershell
   cd db
   sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 01_tao_csdl.sql
   sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 02_du_lieu_mau.sql
   cd ..
   ```

   `01_tao_csdl.sql` xóa (nếu có) rồi tạo lại `QLBANVECHUYENBAY` với 10 bảng và tham số quy định mặc định. `02_du_lieu_mau.sql` nạp 10 sân bay, 2 hạng vé, 60 chuyến bay, 406 hành khách, khoảng 2.800 vé và gần 290 phiếu đặt chỗ; lịch được soạn quanh ngày 12/11/2026 và tự dịch theo ngày nạp, nên nạp vào ngày nào thì ngày đó là "hôm nay" của dữ liệu mẫu.

3. Kiểm tra chuỗi kết nối ở mục `ConnectionStrings:QLBANVE` của `api/QuanLyBanVe.Api/appsettings.json`. Mặc định là:

   ```json
   "QLBANVE": "Server=localhost\\SQLEXPRESS;Database=QLBANVECHUYENBAY;Trusted_Connection=True;TrustServerCertificate=True"
   ```

   Máy dùng tên phiên bản SQL Server khác thì sửa phần `Server`. Không ghi mật khẩu vào tập tin này; nếu bắt buộc dùng tài khoản SQL thì đặt chuỗi kết nối trong `appsettings.Development.json` (đã nằm trong `.gitignore`).

4. Dựng giao diện và chép vào máy chủ:

   ```powershell
   cd web
   npm ci
   npm run dung-may-chu
   cd ..
   ```

5. Chạy máy chủ:

   ```powershell
   cd api\QuanLyBanVe.Api
   dotnet run -c Release
   ```

   Lần chạy đầu, khi bảng `TAIKHOAN` còn rỗng, máy chủ tự tạo các tài khoản mặc định. Máy chủ chạy dịch vụ tự hủy phiếu quá hạn (UC06) ngay khi khởi động và sau mỗi 15 phút. Giữ cửa sổ này mở trong suốt thời gian dùng; Ctrl+C để dừng.

6. Mở trình duyệt tại `http://localhost:5080`.

### Cài nhanh bằng một lệnh

Script `cai_dat.ps1` làm thay các bước 2 đến 6: kiểm tra đã có `sqlcmd`, .NET SDK 10, Node.js 22; tạo cơ sở dữ liệu và nạp dữ liệu mẫu nếu máy chưa có `QLBANVECHUYENBAY`; dựng giao diện; chạy máy chủ và mở trình duyệt tại `http://localhost:5080`. Chạy qua `cai_dat.cmd` để không phải đổi chính sách thực thi script của PowerShell:

```powershell
.\cai_dat.cmd
```

| Tham số | Tác dụng |
|---|---|
| (không có) | Cơ sở dữ liệu đã có thì giữ nguyên, chỉ dựng lại giao diện và chạy máy chủ |
| `-NapLaiDuLieu` | Xóa `QLBANVECHUYENBAY` hiện có, tạo lại và nạp lại dữ liệu mẫu (mất dữ liệu đã nhập) |
| `-MayChuSql "localhost"` | Dùng khi SQL Server không mang tên phiên bản `SQLEXPRESS`; chuỗi kết nối của lần chạy này đổi theo |
| `-KhongChay` | Chỉ cài đặt, không chạy máy chủ |

Ví dụ nạp lại dữ liệu mẫu trước buổi demo:

```powershell
.\cai_dat.cmd -NapLaiDuLieu
```

### Cho máy khác trong mạng nội bộ truy cập

1. Trong `api/QuanLyBanVe.Api/appsettings.json` đổi `"Urls": "http://localhost:5080"` thành `"Urls": "http://0.0.0.0:5080"` rồi chạy lại máy chủ.
2. Mở cổng 5080 trên tường lửa (PowerShell chạy với quyền Administrator):

   ```powershell
   New-NetFirewallRule -DisplayName "Quan ly ban ve 5080" -Direction Inbound -Protocol TCP -LocalPort 5080 -Action Allow -Profile Private,Domain
   ```

3. Xem địa chỉ IP của máy chủ bằng `ipconfig` (ví dụ `192.168.1.10`), máy khác mở `http://192.168.1.10:5080`.

## Tài khoản mặc định

| Tên đăng nhập | Mật khẩu | Nhóm quyền | Trạng thái |
|---|---|---|---|
| `quanly` | `Quanly@123` | Quản lý | Hoạt động |
| `nhanvien` | `Nhanvien@123` | Nhân viên bán vé | Hoạt động |
| `nhanvien2` | `Nhanvien2@123` | Nhân viên bán vé | Đã khóa |

Các tài khoản này khai báo ở mục `TaiKhoanBanDau` của `appsettings.json` và chỉ được tạo khi bảng `TAIKHOAN` rỗng. Đây là mật khẩu để chạy thử: khi dùng thật, đăng nhập bằng `quanly`, vào Tài khoản, bấm Sửa từng tài khoản để đặt mật khẩu mới, và khóa các tài khoản không dùng.

## Chế độ phát triển

- Máy chủ: `cd api\QuanLyBanVe.Api` rồi `dotnet run` (cổng 5080).
- Giao diện có tải lại nóng: `cd web` rồi `npm run dev`, mở `http://localhost:5173`. Vite chuyển mọi yêu cầu `/api` sang `http://localhost:5080`, nên máy chủ phải đang chạy.
- Chỉ làm giao diện, không cần máy chủ và cơ sở dữ liệu: bật chế độ dữ liệu giả lập trong trình duyệt.

  ```powershell
  cd web
  $env:VITE_GIA_LAP = "1"
  npm run dev
  ```

  Dữ liệu giả lập nằm trong bộ nhớ, tải lại trang là về dữ liệu ban đầu. Tắt bằng `Remove-Item Env:VITE_GIA_LAP`.
- Kiểm tra kiểu TypeScript: `npm run kiem-tra-kieu`.

## Chạy kiểm thử

- Kiểm thử tầng xử lý và API (xUnit). Tự tạo cơ sở dữ liệu `QLBANVE_KIEMTHU` trên cùng máy chủ SQL Server của chuỗi kết nối, không đụng tới `QLBANVECHUYENBAY`:

  ```powershell
  cd api
  dotnet test
  ```

- Kiểm thử giao diện đầu cuối (Playwright, 50 trường hợp, mỗi trường hợp ghi mã use case và mã yêu cầu hoặc quy định). Cần máy chủ đang chạy với giao diện đã dựng và cơ sở dữ liệu vừa nạp dữ liệu mẫu. Bộ kiểm thử tự tạo dữ liệu riêng (chuyến bay mã `KT...`, vé, phiếu, tài khoản thử), đổi tạm một số tham số quy định rồi trả lại. Lần đầu tải trình duyệt Chromium cho Playwright:

  ```powershell
  cd web
  npx playwright install chromium
  npm run kiem-thu-e2e
  ```

  Mặc định kiểm thử máy chủ `http://localhost:5080`; máy chủ khác thì đặt `$env:DIA_CHI = "http://localhost:5090"` trước khi chạy. Kết quả và ảnh chụp khi lỗi nằm trong `web/test-results/`.

- Kiểm tra nhanh các luồng chính bằng curl khi máy chủ đang chạy (cần bash, ví dụ Git Bash trên Windows):

  ```bash
  bash api/kiemtra_nhanh.sh                         # mặc định http://localhost:5080
  bash api/kiemtra_nhanh.sh http://localhost:5090   # máy chủ khác
  ```

Kiểm thử giao diện và `kiemtra_nhanh.sh` đều ghi dữ liệu thử vào cơ sở dữ liệu; chạy xong thì nạp lại dữ liệu mẫu (mục dưới).

## Nạp lại dữ liệu mẫu

Dừng máy chủ (Ctrl+C), chạy lại hai script rồi khởi động lại máy chủ:

```powershell
cd db
sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 01_tao_csdl.sql
sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 02_du_lieu_mau.sql
```

Chỉ chạy `02_du_lieu_mau.sql` thì dữ liệu nghiệp vụ và tham số quy định trở về ban đầu, các tài khoản đã tạo được giữ nguyên. Các phiếu Chờ thanh toán và vé bán trong ngày được tính theo thời điểm chạy script, nên trước buổi demo nên nạp lại. Ba phiếu mẫu đã quá 24 giờ sẽ bị hủy tự động ngay khi máy chủ khởi động và hiện trong chuông thông báo.

## Sao lưu và phục hồi (AT01)

SQL Server Express không có dịch vụ lập lịch riêng, nên việc sao lưu hằng ngày dùng Task Scheduler của Windows chạy lệnh `sqlcmd`, lưu tập tin `.bak` sang ổ đĩa khác. Bản Express không hỗ trợ tùy chọn `COMPRESSION`.

1. Tạo thư mục chứa bản sao lưu, ví dụ `D:\SaoLuu`, và cho tài khoản dịch vụ SQL Server quyền ghi:

   ```powershell
   New-Item -ItemType Directory -Force D:\SaoLuu
   icacls D:\SaoLuu /grant "NT SERVICE\MSSQL`$SQLEXPRESS:(OI)(CI)M"
   ```

2. Tạo tập tin `D:\SaoLuu\sao_luu.ps1`, mỗi ngày một tập tin, xóa bản cũ hơn 30 ngày:

   ```powershell
   $ngay = Get-Date -Format "yyyyMMdd"
   sqlcmd -S localhost\SQLEXPRESS -E -C -b -Q "BACKUP DATABASE QLBANVECHUYENBAY TO DISK = N'D:\SaoLuu\QLBANVECHUYENBAY_$ngay.bak' WITH INIT, CHECKSUM"
   Get-ChildItem D:\SaoLuu\QLBANVECHUYENBAY_*.bak | Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Remove-Item
   ```

3. Đăng ký tác vụ chạy lúc 22:00 mỗi ngày bằng tài khoản Windows có quyền trên SQL Server (PowerShell chạy với quyền Administrator):

   ```powershell
   $hanhDong = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File D:\SaoLuu\sao_luu.ps1"
   $lich = New-ScheduledTaskTrigger -Daily -At 22:00
   $tk = Get-Credential -UserName "$env:USERDOMAIN\$env:USERNAME" -Message "Mật khẩu Windows để chạy tác vụ sao lưu"
   Register-ScheduledTask -TaskName "Sao luu QLBANVECHUYENBAY" -Action $hanhDong -Trigger $lich -User $tk.UserName -Password $tk.GetNetworkCredential().Password -RunLevel Highest
   ```

   Chạy thử ngay: `Start-ScheduledTask -TaskName "Sao luu QLBANVECHUYENBAY"`, rồi kiểm tra tập tin vừa tạo:

   ```powershell
   sqlcmd -S localhost\SQLEXPRESS -E -C -b -Q "RESTORE VERIFYONLY FROM DISK = N'D:\SaoLuu\QLBANVECHUYENBAY_20261112.bak'"
   ```

4. Phục hồi từ bản sao lưu gần nhất: dừng máy chủ web, rồi chạy (thay tên tập tin):

   ```powershell
   sqlcmd -S localhost\SQLEXPRESS -E -C -b -Q "ALTER DATABASE QLBANVECHUYENBAY SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE QLBANVECHUYENBAY FROM DISK = N'D:\SaoLuu\QLBANVECHUYENBAY_20261112.bak' WITH REPLACE; ALTER DATABASE QLBANVECHUYENBAY SET MULTI_USER;"
   ```

   Khởi động lại máy chủ web. Dữ liệu trở về thời điểm sao lưu (mất tối đa dữ liệu của một ngày). Cũng có thể phục hồi bằng SQL Server Management Studio: chuột phải Databases, Restore Database, chọn tập tin `.bak`.
