# Hợp đồng API giữa `web/` và `api/`

Máy chủ ASP.NET Core 8 chạy ở `http://localhost:5080`, mọi đường dẫn bắt đầu bằng `/api`. Giao diện Vite chạy ở `http://localhost:5173` và chuyển tiếp `/api` sang máy chủ.
JSON dùng tên camelCase, tiếng Việt không dấu, khớp tên thuộc tính ở mục 3.2.12 của báo cáo (ví dụ `MaChuyenBay` thành `maChuyenBay`).
Ngày giờ theo ISO 8601 giờ địa phương không kèm múi giờ (`2026-11-12T14:30:00`). Tiền là số nguyên VND.

## Quy ước chung
- Xác thực bằng cookie HttpOnly `qlbv_phien` sau khi đăng nhập. Chưa đăng nhập: 401. Sai nhóm quyền: 403.
- Nhóm quyền: `QuanLy`, `NhanVien`. Trạng thái tài khoản: `HoatDong`, `DaKhoa`. Tình trạng vé: `DaBan`, `DaHuy`. Tình trạng phiếu: `ChoThanhToan`, `DaHuy`. Loại giấy tờ: `CCCD`, `HoChieu`.
- Lỗi luôn có dạng `{ "ma": "MA_LOI", "thongBao": "câu tiếng Việt hiển thị cho người dùng", "chiTiet": { "tenTruong": "lỗi của ô" } }`.
  400 dữ liệu không hợp lệ (có `chiTiet`), 409 vi phạm quy định nghiệp vụ, 404 không tìm thấy.
- Mã lỗi nghiệp vụ dùng chung: `SAI_THONG_TIN_DANG_NHAP`, `TAI_KHOAN_BI_KHOA`, `TRUNG_MA`, `VI_PHAM_QD1`, `HET_CHO`, `CHUYEN_BAY_DA_KHOI_HANH`, `QUA_HAN_DAT_VE`, `PHIEU_HET_HAN`,
  `GIAY_TO_DA_THUOC_NGUOI_KHAC`, `DANG_DUOC_SU_DUNG`, `DA_CO_VE_HOAC_PHIEU`, `KHONG_DUOC_TU_KHOA`, `KHONG_DUOC_TU_DOI_QUYEN`, `DU_LIEU_DA_THAY_DOI`.

## Phiên làm việc (UC01)
| Phương thức | Đường dẫn | Thân yêu cầu | Trả về |
|---|---|---|---|
| POST | `/api/dang-nhap` | `{tenDangNhap, matKhau}` | 200 `{tenDangNhap, nhomQuyen}` |
| POST | `/api/dang-xuat` | | 204 |
| GET | `/api/phien` | | 200 `{tenDangNhap, nhomQuyen}` hoặc 401 |

## Tài khoản (UC02, chỉ Quản lý)
| Phương thức | Đường dẫn | Thân yêu cầu | Trả về |
|---|---|---|---|
| GET | `/api/tai-khoan` | | `[{tenDangNhap, nhomQuyen, trangThai}]` |
| POST | `/api/tai-khoan` | `{tenDangNhap, matKhau, nhomQuyen}` | 201 |
| PUT | `/api/tai-khoan/{tenDangNhap}` | `{nhomQuyen, matKhauMoi?}` | 204 |
| POST | `/api/tai-khoan/{tenDangNhap}/khoa` | | 204 |
| POST | `/api/tai-khoan/{tenDangNhap}/mo-khoa` | | 204 |

## Quy định, sân bay, hạng vé (UC08; đọc: mọi vai trò, ghi: chỉ Quản lý)
| Phương thức | Đường dẫn | Thân yêu cầu | Trả về |
|---|---|---|---|
| GET | `/api/quy-dinh` | | `{thamSo: {thoiGianBayToiThieu, soSanBayTrungGianToiDa, thoiGianDungToiThieu, thoiGianDungToiDa, thoiGianDatVeChamNhat, thoiGianHuyDatVe}, sanBay: [{maSanBay, tenSanBay}], hangVe: [{maHangVe, tenHangVe, tiLeDonGia}]}` |
| PUT | `/api/quy-dinh/tham-so/{tenThamSo}` | `{giaTriMoi}` | 204 |
| POST | `/api/san-bay` | `{maSanBay, tenSanBay}` | 201 |
| PUT | `/api/san-bay/{maSanBay}` | `{tenSanBay}` | 204 |
| DELETE | `/api/san-bay/{maSanBay}` | | 204, 409 `DANG_DUOC_SU_DUNG` |
| POST | `/api/hang-ve` | `{maHangVe, tenHangVe, tiLeDonGia}` | 201 |
| PUT | `/api/hang-ve/{maHangVe}` | `{tenHangVe}` (không sửa tỉ lệ) | 204 |
| DELETE | `/api/hang-ve/{maHangVe}` | | 204, 409 `DANG_DUOC_SU_DUNG` |

## Chuyến bay (UC03; tra cứu và xuất Excel: mọi vai trò, còn lại: chỉ Quản lý)
| Phương thức | Đường dẫn | Thân yêu cầu / tham số | Trả về |
|---|---|---|---|
| GET | `/api/chuyen-bay` | `?sanBayDi&sanBayDen&tuNgay&denNgay&maChuyenBay` | `[{maChuyenBay, maSanBayDi, tenSanBayDi, maSanBayDen, tenSanBayDen, ngayGioKhoiHanh, thoiGianBay, soGheTrong, soGheDat}]` (BM4) |
| GET | `/api/chuyen-bay/{ma}` | | `{maChuyenBay, giaVe, maSanBayDi, maSanBayDen, ngayGioKhoiHanh, thoiGianBay, gheTheoHang: [{maHangVe, tenHangVe, soLuongGhe, soGheTrong, soDaBanVaDat}], trungGian: [{thuTu, maSanBay, tenSanBay, thoiGianDung, ghiChu}]}` |
| POST | `/api/chuyen-bay` | như trên, không có các trường tính toán | 201 |
| PUT | `/api/chuyen-bay/{ma}` | như POST | 204 |
| DELETE | `/api/chuyen-bay/{ma}` | | 204, 409 `DA_CO_VE_HOAC_PHIEU` |
| POST | `/api/chuyen-bay/nhap-excel` | multipart `tapTin` (.xlsx theo tập tin mẫu) | `{soDaThem, dongLoi: [{dong, lyDo}]}` |
| GET | `/api/chuyen-bay/mau-excel` | | tập tin .xlsx mẫu |
| GET | `/api/chuyen-bay/xuat-excel` | cùng tham số tra cứu | tập tin .xlsx |
| GET | `/api/chuyen-bay/sap-khoi-hanh` | `?soLuong=5` | như tra cứu, sắp theo giờ khởi hành |

## Bán vé (UC04)
| Phương thức | Đường dẫn | Thân yêu cầu / tham số | Trả về |
|---|---|---|---|
| GET | `/api/chuyen-bay/{ma}/thong-tin-ban` | `?mucDich=banVe|datVe` | `{duocPhep, maLoi?, thongBao?, tongSoGheTrong, hanThanhToanDuKien?, hang: [{maHangVe, tenHangVe, soGheTrong, giaTien}]}` |
| POST | `/api/ve` | `{maChuyenBay, maHangVe, hanhKhach: {hoTen, loaiGiayTo, soGiayTo, dienThoai}}` | 201 `{maVe, giaTien, ngayBan}` |
| GET | `/api/phieu-dat/con-han` | `?loaiGiayTo&soGiayTo` hoặc `?maPhieuDat` | `[{maPhieuDat, maChuyenBay, tuyenBay, ngayGioKhoiHanh, tenHangVe, hoTen, giaTien, hanThanhToan}]` |
| POST | `/api/ve/tu-phieu` | `{maPhieuDat}` | 201 `{maVe, giaTien, ngayBan}` |
| GET | `/api/ve` | `?maVe&soGiayTo&maChuyenBay&tuNgay&denNgay` (mặc định vé bán trong ngày) | `[{maVe, maChuyenBay, hoTen, loaiGiayTo, soGiayTo, dienThoai, tenHangVe, giaTien, ngayBan, tinhTrang, maPhieuDat}]` |
| PUT | `/api/ve/{maVe}/hanh-khach` | `{hoTen, loaiGiayTo, soGiayTo, dienThoai}` | 204 |
| POST | `/api/ve/{maVe}/huy` | | 204, 409 `CHUYEN_BAY_DA_KHOI_HANH` |

## Đặt vé (UC05)
| Phương thức | Đường dẫn | Thân yêu cầu / tham số | Trả về |
|---|---|---|---|
| POST | `/api/phieu-dat` | như POST `/api/ve` | 201 `{maPhieuDat, giaTien, thoiDiemDat, hanThanhToan}` |
| GET | `/api/phieu-dat` | `?maPhieuDat&soGiayTo&maChuyenBay&tinhTrang` | `[{maPhieuDat, maChuyenBay, hoTen, loaiGiayTo, soGiayTo, dienThoai, tenHangVe, giaTien, thoiDiemDat, hanThanhToan, tinhTrang}]` |
| GET | `/api/phieu-dat/sap-het-han` | `?soLuong=5` | như trên, phiếu Chờ thanh toán sắp theo hạn |
| PUT | `/api/phieu-dat/{ma}/hanh-khach` | `{hoTen, loaiGiayTo, soGiayTo, dienThoai}` | 204 |
| POST | `/api/phieu-dat/{ma}/huy` | | 204 |
| GET | `/api/phieu-dat/da-huy/dem` | `?truocNgay` (chỉ Quản lý) | `{soPhieu}` |
| DELETE | `/api/phieu-dat/da-huy` | `?truocNgay` (chỉ Quản lý) | `{soDaXoa}` |

## Báo cáo (UC07, chỉ Quản lý)
| Phương thức | Đường dẫn | Tham số | Trả về |
|---|---|---|---|
| GET | `/api/bao-cao/thang` | `?thang&nam` | `{thang, nam, soChuyenBay, tongSoVe, tongDoanhThu, dong: [{stt, maChuyenBay, soVe, doanhThu, tiLe}]}` (BM5.1) |
| GET | `/api/bao-cao/nam` | `?nam` | `{nam, tongDoanhThu, dong: [{thang, soChuyenBay, doanhThu, tiLe}]}` (BM5.2) |
| GET | `/api/bao-cao/thang/xuat` | `?thang&nam&dinhDang=excel|pdf` | tập tin |
| GET | `/api/bao-cao/nam/xuat` | `?nam&dinhDang=excel|pdf` | tập tin |

## Thông báo (UC06 chạy nền)
| Phương thức | Đường dẫn | Trả về |
|---|---|---|
| GET | `/api/thong-bao` | `[{thoiDiem, noiDung}]`: các dòng mới nhất của tập tin nhật ký hủy phiếu tự động (tối đa 20) |

Dịch vụ nền `BoDinhThoi` gọi `XL_HuyPhieuDat.kichHoatDinhKy(thoiDiemHienTai)` ngay khi máy chủ khởi động và sau mỗi 15 phút.
