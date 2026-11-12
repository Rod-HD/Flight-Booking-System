# Giao diện web: Quản lý bán vé chuyến bay

React 18 + TypeScript + Vite, React Router, TanStack Query, CSS Modules với biến CSS, font KoHo, icon `lucide-react`.

## Chạy

```bash
npm install
npm run dev                  # cổng 5173, chuyển /api sang http://localhost:5080
VITE_GIA_LAP=1 npm run dev   # chạy với máy chủ giả lập trong trình duyệt, không cần api/
npm run build                # kiểm tra kiểu rồi đóng gói vào dist/
npx tsc --noEmit             # chỉ kiểm tra kiểu
```

Tài khoản giả lập: `quanly` / `Quanly@123` (Quản lý), `nhanvien` / `Nhanvien@123` (Nhân viên bán vé),
`banve02` / `Nhanvien@123` (Nhân viên), `banve03` (đã khóa, để thử thông báo "Tài khoản đã bị khóa").
Dữ liệu giả lập sinh theo ngày hiện tại và nằm trong bộ nhớ: tải lại trang là về dữ liệu ban đầu (phiên đăng nhập vẫn giữ trong tab).

## Cấu trúc `src/`

| Thư mục | Nội dung |
|---|---|
| `styles/` | `bien.css` (màu, dải màu, bo góc, bóng, khoảng cách, thời gian chuyển động), `goc.css` (reset, font, keyframe chung) |
| `kieu/` | Kiểu dữ liệu khớp `docs/API.md` |
| `api/` | `may_khach.ts` (gọi máy chủ, lỗi `LoiApi`), `dich_vu.ts` (một hàm cho mỗi đường dẫn, khóa truy vấn), `gia_lap/` (máy chủ giả lập) |
| `phien/` | Ngữ cảnh phiên đăng nhập |
| `thanh_phan/` | Thành phần dùng chung |
| `icons3d/` | Icon 3D đỏ bóng theo từng chức năng |
| `canh/` | Key visual bầu trời, mây, linh vật |
| `trang/` | Các trang, mỗi trang một thư mục |
| `tien_ich/` | Định dạng, thời gian, hook, phím tắt |
| `dinh_tuyen.ts` | Mục menu và quyền truy cập |

## Thêm một trang

1. Viết trang trong `src/trang/<ten>/TrangXyz.tsx`, bọc nội dung bằng `KhungTrang` (tiêu đề, icon 3D, đường dẫn, nút).
2. Khai báo đường dẫn trong `src/App.tsx`. Trang chỉ cho Quản lý thì đặt trong nhóm `YeuCauQuyen quyen={CHI_QUAN_LY}`.
3. Nếu là mục menu, thêm vào `MENU` trong `src/dinh_tuyen.ts`.
4. Nút chỉ dành cho Quản lý: `<ChiKhiCoQuyen quyen={CHI_QUAN_LY}>...</ChiKhiCoQuyen>`.
5. Phím tắt của trang: `dungPhimTat({ 'ctrl+n': themMoi, 'ctrl+s': luu, 'ctrl+f': timKiem })`.

## Tham số đường dẫn trang chính gửi sang

- `/ban-ve`, `/dat-ve`: `?maChuyenBay=`, `?sanBayDi=&sanBayDen=&ngay=`; `/ban-ve?maPhieuDat=` và `/ban-ve?cheDo=tuPhieu`.
- `/chuyen-bay`: `?sanBayDi=&sanBayDen=&tuNgay=&denNgay=`, `?nhapExcel=1`.
- `/phieu-dat?xoaDaHuy=1`.
