# Quản lý bán vé chuyến bay

Đồ án môn Nhập môn Công nghệ phần mềm (SE104.R13), Nhóm 12. Ứng dụng web nội bộ cho phòng vé với hai nhóm quyền: Quản lý và Nhân viên bán vé.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `api/` | Máy chủ ASP.NET Core 8 (C#) theo ba tầng: giao tiếp, xử lý nghiệp vụ (`XL_`), truy xuất dữ liệu (`DAL_`) và các lớp DTO |
| `web/` | Giao diện React + TypeScript (Vite) |
| `db/` | Script tạo cơ sở dữ liệu SQL Server và dữ liệu mẫu |
| `e2e/` | Kiểm thử giao diện và chụp ảnh màn hình bằng Playwright |
| `docs/` | Hệ thống thiết kế giao diện, mô tả API, logo, bản chữ báo cáo |

Hướng dẫn cài đặt và chạy sẽ được bổ sung khi mã nguồn hoàn thành.

## Máy chủ và cơ sở dữ liệu (`api/`, `db/`)

### Cần cài

- .NET SDK 8.
- SQL Server 2022 Express (hoặc bản SQL Server khác) và công cụ `sqlcmd` hay SQL Server Management Studio để chạy script.

### Tạo cơ sở dữ liệu

```
cd db
sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 01_tao_csdl.sql
sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 02_du_lieu_mau.sql
```

- `01_tao_csdl.sql` tạo cơ sở dữ liệu `QLBANVECHUYENBAY` gồm 10 bảng đúng mục 3.2.12 của báo cáo (khóa, ràng buộc, chỉ mục) và dòng tham số quy định mặc định. Chạy lại thì cơ sở dữ liệu cũ bị xóa và tạo lại.
- `02_du_lieu_mau.sql` nạp dữ liệu mẫu quanh tháng 11 năm 2026: 10 sân bay, 2 hạng vé, 60 chuyến bay từ tháng 1 đến tháng 12 năm 2026, khoảng 400 hành khách, vé Đã bán và Đã hủy, phiếu Chờ thanh toán và Đã hủy. Chạy lại được nhiều lần. Các phiếu Chờ thanh toán và các vé bán trong ngày được tính theo thời điểm chạy script, nên trước buổi demo nên chạy lại script này.

### Chuỗi kết nối

Chuỗi kết nối nằm ở mục `ConnectionStrings:QLBANVE` của `api/QuanLyBanVe.Api/appsettings.json`, mặc định trỏ tới `localhost\SQLEXPRESS` bằng tài khoản Windows. Máy dùng máy chủ hoặc tài khoản khác thì tạo thêm tập tin `api/QuanLyBanVe.Api/appsettings.Development.json` (đã nằm trong `.gitignore`, không đưa mật khẩu vào repo), ví dụ:

```json
{
  "ConnectionStrings": {
    "QLBANVE": "Server=localhost,1433;Database=QLBANVECHUYENBAY;User Id=sa;Password=<mật khẩu của máy>;TrustServerCertificate=True"
  }
}
```

### Chạy máy chủ

```
cd api/QuanLyBanVe.Api
dotnet run
```

Máy chủ nghe ở `http://localhost:5080`, mọi đường dẫn bắt đầu bằng `/api` theo `docs/API.md`. Giao diện ở `http://localhost:5173` được phép gọi kèm cookie (CORS).

Lần chạy đầu, khi bảng `TAIKHOAN` còn rỗng, máy chủ tự tạo ba tài khoản khai báo ở mục `TaiKhoanBanDau` của `appsettings.json`:

| Tên đăng nhập | Mật khẩu | Nhóm quyền | Trạng thái |
|---|---|---|---|
| `quanly` | `Quanly@123` | Quản lý | Hoạt động |
| `nhanvien` | `Nhanvien@123` | Nhân viên bán vé | Hoạt động |
| `nhanvien2` | `Nhanvien2@123` | Nhân viên bán vé | Đã khóa |

Đây là tài khoản để demo; khi dùng thật cần đổi mật khẩu ở chức năng Phân quyền.

Dịch vụ nền `BoDinhThoi` chạy UC06 ngay khi máy chủ khởi động và sau mỗi 15 phút. Mỗi lần có phiếu bị hủy, một dòng được ghi vào `api/QuanLyBanVe.Api/nhat_ky/huy_phieu_tu_dong.log`; đường dẫn `/api/thong-bao` đọc lại các dòng mới nhất của tập tin này.

### Tổ chức mã nguồn của `api/QuanLyBanVe.Api`

| Thư mục | Nội dung |
|---|---|
| `GiaoTiep/` | Các Controller (thay cho 14 form của tầng giao diện), bộ lọc lỗi trả về `{ma, thongBao, chiTiet}`, xác thực bằng cookie `qlbv_phien` |
| `XuLy/` | Tầng xử lý nghiệp vụ: `XL_DangNhap`, `XL_PhanQuyen`, `XL_ChuyenBay`, `XL_BanVe`, `XL_DatVe`, `XL_HuyPhieuDat`, `XL_BaoCao`, `XL_ThayDoiQD` |
| `TruyXuat/` | Tầng truy xuất dữ liệu: `KetNoiCSDL` và 10 lớp `DAL_`, câu lệnh SQL có tham số bằng Microsoft.Data.SqlClient |
| `DTO/` | 10 lớp DTO ứng với 10 bảng và lớp `TieuChiTim` |
| `TienIch/` | `TienIch_BaoMat` (PBKDF2), `TienIch_TapTin` (Excel bằng ClosedXML, PDF bằng QuestPDF bản Community), `TienIch_NhatKy`, `PhienLamViec`, `DongHoHeThong`, `BoDinhThoi` |

### Kiểm thử

```
cd api
dotnet test
```

Dự án `QuanLyBanVe.KiemThu` (xUnit) tự tạo cơ sở dữ liệu thử `QLBANVE_KIEMTHU` từ `db/01_tao_csdl.sql` trên cùng máy chủ SQL Server của chuỗi kết nối, không đụng tới `QLBANVECHUYENBAY`. Các trường hợp kiểm thử phủ từng quy định (QĐ1, QĐ2, QĐ3, QĐ6), công thức (1.1) đến (1.6) và các ngoại lệ chính của UC01 đến UC08, trong đó có trường hợp nhiều máy cùng bán chiếc ghế cuối. Tên mỗi trường hợp ghi mã yêu cầu mà nó kiểm tra.

Khi máy chủ đang chạy, có thể gọi thử các luồng chính bằng curl:

```
bash api/kiemtra_nhanh.sh
```

Script này ghi dữ liệu thử (một chuyến bay mã `KT...`, vài vé, phiếu và tài khoản `kiemtra`); chạy lại hai script trong `db/` để trở về dữ liệu mẫu ban đầu.

### Phần máy chủ bổ sung so với `docs/API.md`

- Mã trạng thái khi đăng nhập không thành công: 401 với `SAI_THONG_TIN_DANG_NHAP`, 403 với `TAI_KHOAN_BI_KHOA`.
- Mã lỗi dùng thêm: `DU_LIEU_KHONG_HOP_LE` (400), `CHUA_DANG_NHAP` (401), `KHONG_CO_QUYEN` (403), `KHONG_TIM_THAY` (404), `VI_PHAM_QD6` (409, danh sách phải còn ít nhất hai sân bay, một hạng vé), `LOI_HE_THONG` (500, 503).
- Tên trường trong `chiTiet` là tên ô nhập không kèm tiền tố, kể cả với thân có `hanhKhach` lồng bên trong (ví dụ `hoTen`, `soGiayTo`, `dienThoai`).
- Một số phản hồi có thêm trường ngoài hợp đồng để giao diện tiện hiển thị: `tenSanBayDi`, `tenSanBayDen` ở chi tiết chuyến bay; `maHangVe`, `ngayGioKhoiHanh` ở danh sách vé và phiếu; `maSanBayDi`, `tenSanBayDi`, `maSanBayDen`, `tenSanBayDen`, `thoiDiemDat` ở phiếu còn hạn (`tuyenBay` có dạng `SGN - HAN`).
- Tài khoản bị khóa hoặc bị đổi nhóm quyền thì phiên đang mở hết hiệu lực (401), người dùng đăng nhập lại để nhận quyền mới.
- Tra cứu vé và phiếu trả tối đa 1000 dòng mới nhất cho mỗi lần tìm.
