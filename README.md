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

- Máy chủ: ASP.NET Core trên .NET 10 (C#), ba tầng: giao tiếp (`GiaoTiep/`), xử lý nghiệp vụ (`XuLy/`, các lớp `XL_`), truy xuất dữ liệu (`TruyXuat/`, các lớp `DAL_`) cùng các lớp DTO. Truy cập SQL Server bằng Microsoft.Data.SqlClient với câu lệnh có tham số; Excel bằng ClosedXML, PDF bằng QuestPDF (bản Community); mật khẩu băm PBKDF2; phiên đăng nhập giữ ở máy chủ, trình duyệt chỉ giữ cookie HttpOnly mang khóa phiên (xem mục Bảo mật).
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

Script `cai_dat.ps1` làm thay các bước 2 đến 6: kiểm tra đã có `sqlcmd`, .NET SDK 10, Node.js 22; tạo cơ sở dữ liệu và nạp dữ liệu mẫu nếu máy chưa có `QLBANVECHUYENBAY` hoặc có nhưng rỗng; dựng giao diện; chạy máy chủ và mở trình duyệt tại `http://localhost:5080`. Chạy qua `cai_dat.cmd` để không phải đổi chính sách thực thi script của PowerShell:

```powershell
.\cai_dat.cmd
```

| Tham số | Tác dụng |
|---|---|
| (không có) | Cơ sở dữ liệu đã có dữ liệu thì giữ nguyên, chỉ dựng lại giao diện và chạy máy chủ; đã có nhưng rỗng (ví dụ lần nạp trước bị lỗi) thì nạp dữ liệu mẫu, giữ các tài khoản |
| `-NapLaiDuLieu` | Xóa `QLBANVECHUYENBAY` hiện có, tạo lại và nạp lại dữ liệu mẫu (mất dữ liệu đã nhập) |
| `-MayChuSql "localhost"` | Dùng khi SQL Server không mang tên phiên bản `SQLEXPRESS`; chuỗi kết nối của lần chạy này đổi theo. Không có tham số này mà không kết nối được `localhost\SQLEXPRESS` thì script tự thử `localhost` (phiên bản mặc định) |
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

Chạy bằng HTTP thì mật khẩu và cookie phiên đi qua mạng ở dạng đọc được. Khi mở cho máy khác, nên chạy HTTPS:

1. Tạo chứng chỉ phát triển trên máy chủ (một lần): `dotnet dev-certs https --trust`.
2. Đổi `"Urls"` thành `"https://0.0.0.0:5443;http://0.0.0.0:5080"` rồi chạy lại máy chủ, mở cổng 5443 trên tường lửa như bước 2.
3. Máy khác mở `https://192.168.1.10:5443`. Chứng chỉ phát triển chỉ được tin cậy trên máy chủ, nên trình duyệt máy khác sẽ cảnh báo; dùng lâu dài thì cài chứng chỉ do đơn vị cấp cho tên máy chủ.

Khi `Urls` có địa chỉ `https`, máy chủ tự chuyển `http` sang `https`, chỉ gửi cookie phiên qua HTTPS và bật HSTS.

### Đưa lên web cho người khác dùng

Có thể chạy trên Render (máy chủ ứng dụng, qua `Dockerfile` và `render.yaml`) với Azure SQL Database (cơ sở dữ liệu, nạp bằng `db/azure/nap_azure.ps1`), cả hai có gói miễn phí; hoặc chạy trên máy và mở đường hầm Cloudflare để có địa chỉ công khai. Các bước chi tiết ở [docs/DEPLOY.md](docs/DEPLOY.md).

## Bảo mật

- **Mật khẩu:** tối thiểu 10 ký tự, không được trùng mật khẩu mặc định của ba tài khoản ban đầu. Lưu dạng băm PBKDF2.
- **Đăng nhập sai nhiều lần:** sai 5 lần trong một phút với cùng một tên đăng nhập từ cùng một máy (hoặc 30 lần từ một máy với mọi tên) thì bị khóa tạm 5 phút, kể cả khi sau đó nhập đúng. Bộ đếm nằm trong bộ nhớ máy chủ.
- **Phiên đăng nhập:** giữ ở máy chủ, hết hạn sau 8 giờ không dùng. Đăng xuất là hủy phiên ngay ở máy chủ; đặt lại mật khẩu thì mọi phiên của tài khoản đó bị hủy. Khởi động lại máy chủ thì mọi người đăng nhập lại.
- **Yêu cầu ghi tới API** (POST, PUT, DELETE) phải có header `X-Requested-With`; giao diện tự gắn. Cùng với cookie `SameSite=Lax`, trang web khác không gửi thay người dùng được.
- **Header bảo mật** ở mọi phản hồi: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'self'` (thêm `data:` cho ảnh và phông chữ).
- **Tài khoản SQL riêng (tùy chọn):** mặc định máy chủ kết nối SQL Server bằng quyền Windows của người chạy. Muốn hạn chế quyền, chạy `db/03_tai_khoan_sql.sql` theo hướng dẫn ở đầu tập tin để tạo tài khoản chỉ đọc và ghi dữ liệu trên `QLBANVECHUYENBAY`, rồi đặt chuỗi kết nối vào `appsettings.Development.json`.

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

### Xem kiểm thử giao diện tự chạy trên trình duyệt

`npm run kiem-thu-e2e` chạy ẩn và nhanh. Muốn nhìn trình duyệt tự đăng nhập, bấm, nhập liệu qua từng trường hợp thì dùng hai lệnh dưới, cùng điều kiện như trên: máy chủ đang chạy (`.\cai_dat.cmd` ở một cửa sổ khác), cơ sở dữ liệu vừa nạp dữ liệu mẫu, đã cài Chromium. Các lệnh chạy trong thư mục `web`. Trong lúc chạy không bấm vào cửa sổ trình duyệt.

1. Xem tự chạy liên tục (`kiem-thu-xem`): mở Chrome và chạy lần lượt, mỗi thao tác chậm 0,4 giây, kết quả từng trường hợp in ra cửa sổ lệnh. Phần sau `--` chọn trường hợp cần chạy:

   | Muốn chạy | Lệnh |
   |---|---|
   | Cả 50 trường hợp (khoảng 4 phút) | `npm run kiem-thu-xem` |
   | Một use case (theo tên tập tin) | `npm run kiem-thu-xem -- uc04` |
   | Vài use case | `npm run kiem-thu-xem -- uc01 uc04 uc05` |
   | Một trường hợp (theo mã, có dấu cách cuối để `UC03.1` không khớp `UC03.10`) | `npm run kiem-thu-xem -- -g "UC03.1 "` |
   | Các trường hợp có chữ trong tên | `npm run kiem-thu-xem -- -g "QĐ2"` |
   | Xem danh sách mã và tên, không chạy | `npx playwright test --list` |

   Đổi tốc độ: `$env:CHAM_MS = "1000"` (mili giây mỗi thao tác) rồi chạy lại lệnh; trở về mặc định bằng `Remove-Item Env:CHAM_MS`. Dừng giữa chừng: Ctrl+C.

2. Chọn từng trường hợp bằng chuột (`kiem-thu-ui`): `npm run kiem-thu-ui` mở cửa sổ Playwright UI. Cột trái liệt kê các tập tin và trường hợp; bấm nút ▶ cạnh một trường hợp (hoặc cạnh tập tin, hoặc trên cùng để chạy tất cả). Khung giữa hiện từng bước đã làm, bấm vào một bước để xem màn hình lúc đó; ô "Show browser" ở thanh trên mở thêm trình duyệt thật.

   | Tập tin | Số trường hợp | Nội dung |
   |---|---:|---|
   | `uc01_dang_nhap` | 5 | UC01.1 đến UC01.5: đăng nhập đúng, sai mật khẩu, tài khoản khóa, đăng xuất, chưa đăng nhập bị chặn |
   | `uc02_phan_quyen` | 5 | UC02.1 đến UC02.5: thêm tài khoản, trùng tên, đổi nhóm quyền, khóa và mở khóa, không tự khóa chính mình |
   | `phan_quyen_vai_tro` | 4 | UC02.6 đến UC02.9: menu, đường dẫn và nút của Nhân viên so với Quản lý |
   | `uc03_chuyen_bay` | 11 | UC03.1 đến UC03.11: thêm, sửa, xóa, tra cứu chuyến bay, xuất và nhập Excel (QĐ1) |
   | `uc04_ban_ve` | 7 | UC04.1 đến UC04.7: bán vé trực tiếp và từ phiếu, giá theo hạng, hết chỗ, sửa, hủy vé (QĐ2) |
   | `uc05_dat_ve` | 6 | UC05.1 đến UC05.6: lập, tra cứu, sửa, hủy phiếu đặt chỗ, xóa phiếu đã hủy (QĐ3) |
   | `uc07_bao_cao` | 3 | UC07.1 đến UC07.3: báo cáo tháng, năm, xuất Excel và PDF |
   | `uc08_quy_dinh` | 6 | UC08.1 đến UC08.6: tham số quy định, sân bay, hạng vé (QĐ6) |
   | `chung` | 3 | CHUNG.1 đến CHUNG.3: phím F1, Alt+1 đến Alt+4, chuông thông báo tự hủy phiếu |

   Trường hợp lỗi có ảnh chụp màn hình trong `web/test-results/`.

### Trang Kiểm thử trong phần mềm

Chọn và chạy các trường hợp kiểm thử giao diện ngay trên web, không cần gõ lệnh. Chỉ tài khoản Quản lý dùng được; trình duyệt kiểm thử luôn mở trên máy đang chạy máy chủ (dù bấm từ máy khác). Điều kiện như mục trên: đã `npm ci` trong `web`, đã cài Chromium (`npx playwright install chromium`).

1. Mở trang: đăng nhập bằng tài khoản Quản lý. Ở mép phải màn hình, phía dưới, có một vạch đỏ mờ; di chuột vào thì hiện nút **Kiểm thử**, bấm để mở trang trong tab mới (hoặc gõ thẳng `http://localhost:5080/kiem-thu`).
2. Chọn trường hợp: các trường hợp đánh số liền mạch theo thứ tự trên trang, chia nhóm theo use case. Tick từng trường hợp, tick ô ở đầu nhóm để chọn cả nhóm, hoặc **Chọn tất cả**. Ô tìm kiếm lọc theo mã (`UC04.2`) hoặc chữ trong tên.
3. Chạy:
   - **Chạy N trường hợp**: chạy các trường hợp đã tick.
   - Nút ▶ ở cuối mỗi dòng: chạy riêng trường hợp đó; khi đã có kết quả nút đổi thành ↻ để chạy lại.
   - **Chạy nhóm**: chạy cả nhóm. **Chạy lại lần trước**: chạy lại đúng các trường hợp vừa chạy.
   - **Tốc độ**: thời gian nghỉ giữa hai bước thao tác, từ 0 (nhanh nhất) đến 3 giây, mặc định 1 giây; áp dụng từ lần bấm Chạy kế tiếp.
   - **Hiện trình duyệt**: bỏ tick thì chạy ẩn, nhanh hơn, chỉ xem kết quả.
   - **Dừng**: dừng ngay lần chạy, đóng trình duyệt kiểm thử.
4. Theo dõi: dòng đang chạy tô vàng và ghi bước đang làm (ví dụ "Bước 3: Bấm · nút "Đăng nhập""); xong thì hiện Đạt hoặc Trượt kèm thời gian và câu lỗi. Cột phải là nhật ký từng bước.
   - Khi chạy chậm, chỗ vừa bấm hiện vòng đỏ, ô đang nhập có viền đỏ.
   - Ca làm đổi dữ liệu (thêm, sửa, xóa) có bước cuối "Mở CSDL kiểm chứng": mở thẻ mới hiện câu lệnh SELECT và các dòng thật trong bảng, tô vàng ô vừa đổi, đánh ✔/✘ từng điều kiện; dữ liệu sai thì ca bị tính là trượt.

Danh sách chia hai phần: **Theo báo cáo (Chương 5)** gồm 50 ca trong `web/kiem_thu_e2e`, và **Bổ sung ngoài báo cáo** gồm các ca trong `web/kiem_thu_e2e/bo_sung` (giá trị biên, đoán lỗi, kịch bản đầu cuối).

Mỗi lúc chỉ chạy được một lần. Bộ kiểm thử ghi dữ liệu thử vào cơ sở dữ liệu như khi chạy bằng lệnh; dùng xong nên nạp lại dữ liệu mẫu. 

Trang Kiểm thử **mặc định tắt** (`"KiemThu": { "Bat": false }` trong `appsettings.json`), vì nó chạy trên chính cơ sở dữ liệu đang dùng và cho Quản lý xem thẳng dữ liệu các bảng. Muốn bật trên máy phát triển, tạo tập tin `api/QuanLyBanVe.Api/appsettings.Development.json` (không đưa lên git) với nội dung dưới đây rồi chạy lại máy chủ:

```json
{ "KiemThu": { "Bat": true } }
```

Các ca có tạo tài khoản thử tự khóa những tài khoản đó sau mỗi ca (phần mềm không có chức năng xóa tài khoản).

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

   Nếu tài khoản Windows không đặt mật khẩu, Windows không nhận mật khẩu trống; khi đó bỏ lệnh `Get-Credential` và đăng ký theo kiểu S4U (vẫn chạy với quyền cao nhất cả khi không có ai đăng nhập):

   ```powershell
   $nguoi = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
   Register-ScheduledTask -TaskName "Sao luu QLBANVECHUYENBAY" -Action $hanhDong -Trigger $lich -Principal $nguoi
   ```

   Chạy thử ngay: `Start-ScheduledTask -TaskName "Sao luu QLBANVECHUYENBAY"`, rồi kiểm tra tập tin vừa tạo:

   ```powershell
   sqlcmd -S localhost\SQLEXPRESS -E -C -b -Q "RESTORE VERIFYONLY FROM DISK = N'D:\SaoLuu\QLBANVECHUYENBAY_20261112.bak'"
   ```

4. Phục hồi từ bản sao lưu gần nhất: dừng máy chủ web, rồi chạy (thay tên tập tin):

   ```powershell
   sqlcmd -S localhost\SQLEXPRESS -E -C -b -Q "ALTER DATABASE QLBANVECHUYENBAY SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE QLBANVECHUYENBAY FROM DISK = N'D:\SaoLuu\QLBANVECHUYENBAY_20261112.bak' WITH REPLACE; ALTER DATABASE QLBANVECHUYENBAY SET MULTI_USER;"
   ```

   Nếu bản sao lưu tạo trước ngày 26/11/2026 (bảng trung gian còn tên `CHITIETTRUNGGIAN`), chạy thêm `sqlcmd -S localhost\SQLEXPRESS -E -C -b -d QLBANVECHUYENBAY -i db\04_doi_ten_bang_trung_gian.sql` trước khi khởi động lại.

   Khởi động lại máy chủ web. Dữ liệu trở về thời điểm sao lưu (mất tối đa dữ liệu của một ngày). Cũng có thể phục hồi bằng SQL Server Management Studio: chuột phải Databases, Restore Database, chọn tập tin `.bak`.
