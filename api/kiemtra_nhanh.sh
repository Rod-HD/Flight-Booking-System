#!/usr/bin/env bash
# Kiểm tra nhanh các luồng chính của máy chủ đang chạy bằng curl và in kết quả từng bước.
# Cách dùng: bash kiemtra_nhanh.sh [địa chỉ máy chủ]     (mặc định http://localhost:5080)
# Cần: máy chủ đang chạy, cơ sở dữ liệu đã nạp dữ liệu mẫu, hai tài khoản quanly và nhanvien.
# Lưu ý: script có ghi dữ liệu thử (một chuyến bay mã KT..., vài vé, phiếu và tài khoản kiemtra).
# Muốn trở về dữ liệu mẫu ban đầu thì chạy lại db/01_tao_csdl.sql và db/02_du_lieu_mau.sql.

set -u
GOC="${1:-http://localhost:5080}"
TAM=$(mktemp -d)
trap 'rm -rf "$TAM"' EXIT
QL="$TAM/quanly.cookie"
NV="$TAM/nhanvien.cookie"
KHAC="$TAM/khac.cookie"
THAN="$TAM/than.txt"
SO_DAT=0
SO_TRUOT=0

# goi <mô tả> <mã trạng thái mong đợi> <tập tin cookie> <phương thức> <đường dẫn> [thân JSON]
goi() {
    local mo_ta="$1" mong_doi="$2" cookie="$3" phuong_thuc="$4" duong_dan="$5" than="${6:-}"
    local ma
    if [ -n "$than" ]; then
        ma=$(curl -s -o "$THAN" -w '%{http_code}' -X "$phuong_thuc" -b "$cookie" -c "$cookie" \
            -H 'Content-Type: application/json' -d "$than" "$GOC$duong_dan")
    else
        ma=$(curl -s -o "$THAN" -w '%{http_code}' -X "$phuong_thuc" -b "$cookie" -c "$cookie" "$GOC$duong_dan")
    fi
    local tom_tat
    tom_tat=$(tr -d '\n' < "$THAN" | sed -E 's/^(.{200}).*/\1 .../')
    if [ "$ma" = "$mong_doi" ]; then
        SO_DAT=$((SO_DAT + 1))
        echo "[ĐẠT]   $mo_ta: $ma $tom_tat"
    else
        SO_TRUOT=$((SO_TRUOT + 1))
        echo "[TRƯỢT] $mo_ta: nhận $ma, mong đợi $mong_doi $tom_tat"
    fi
}

# tai <mô tả> <tập tin cookie> <đường dẫn>: tải một tập tin, in mã trạng thái, kiểu nội dung và kích thước
tai() {
    local mo_ta="$1" cookie="$2" duong_dan="$3"
    local ket_qua
    ket_qua=$(curl -s -o "$TAM/tap_tin" -w '%{http_code} %{content_type} %{size_download} byte' -b "$cookie" "$GOC$duong_dan")
    if [ "${ket_qua%% *}" = "200" ]; then
        SO_DAT=$((SO_DAT + 1))
        echo "[ĐẠT]   $mo_ta: $ket_qua"
    else
        SO_TRUOT=$((SO_TRUOT + 1))
        echo "[TRƯỢT] $mo_ta: $ket_qua"
    fi
}

# truong <tên>: giá trị chuỗi hoặc số của một trường trong phản hồi JSON vừa nhận
truong() {
    sed -n 's/.*"'"$1"'":"\{0,1\}\([^",}]*\).*/\1/p' "$THAN" | head -1
}

muc() {
    echo
    echo "== $1 =="
}

MA_CB="KT$(date +%H%M%S)"
NGAY_BAY=$(date -d '+10 days' '+%Y-%m-%d')
THANG_BAY=$(date -d '+10 days' '+%-m')
NAM_BAY=$(date -d '+10 days' '+%Y')
HOM_NAY=$(date '+%Y-%m-%d')
SO_GIAY_TO_1="0790$(date +%d%H%M%S)"
SO_GIAY_TO_2="0791$(date +%d%H%M%S)"
SO_GIAY_TO_3="0792$(date +%d%H%M%S)"

echo "Máy chủ: $GOC, chuyến bay thử: $MA_CB khởi hành $NGAY_BAY"

muc "UC01 Đăng nhập"
goi "Chưa đăng nhập thì bị từ chối" 401 "$QL" GET /api/phien
goi "Sai mật khẩu" 401 "$QL" POST /api/dang-nhap '{"tenDangNhap":"quanly","matKhau":"sai-mat-khau"}'
goi "Tài khoản đã khóa" 403 "$KHAC" POST /api/dang-nhap '{"tenDangNhap":"nhanvien2","matKhau":"Nhanvien2@123"}'
goi "Quản lý đăng nhập" 200 "$QL" POST /api/dang-nhap '{"tenDangNhap":"quanly","matKhau":"Quanly@123"}'
goi "Nhân viên đăng nhập" 200 "$NV" POST /api/dang-nhap '{"tenDangNhap":"nhanvien","matKhau":"Nhanvien@123"}'
goi "Xem phiên hiện tại" 200 "$QL" GET /api/phien

muc "UC03 Tra cứu chuyến bay (BM4)"
goi "Quy định, sân bay, hạng vé" 200 "$NV" GET /api/quy-dinh
goi "Tra cứu theo sân bay và ngày" 200 "$NV" GET "/api/chuyen-bay?sanBayDi=SGN&sanBayDen=HAN&tuNgay=2026-11-10&denNgay=2026-11-30"
goi "Chuyến bay sắp khởi hành" 200 "$NV" GET "/api/chuyen-bay/sap-khoi-hanh?soLuong=3"
tai "Xuất danh sách chuyến bay ra Excel" "$NV" "/api/chuyen-bay/xuat-excel?tuNgay=2026-11-10&denNgay=2026-11-30"
tai "Tải tập tin Excel mẫu" "$QL" /api/chuyen-bay/mau-excel

muc "UC03 Thêm chuyến bay (BM1, QĐ1)"
LICH='{"maChuyenBay":"'$MA_CB'","giaVe":1500000,"maSanBayDi":"SGN","maSanBayDen":"HAN","ngayGioKhoiHanh":"'$NGAY_BAY'T08:30:00","thoiGianBay":130,"gheTheoHang":[{"maHangVe":"H1","soLuongGhe":2},{"maHangVe":"H2","soLuongGhe":3}],"trungGian":[{"thuTu":1,"maSanBay":"DAD","thoiGianDung":15,"ghiChu":"Đón khách"}]}'
goi "Nhân viên không được thêm chuyến bay" 403 "$NV" POST /api/chuyen-bay "$LICH"
goi "Vi phạm QĐ1: thời gian bay 10 phút" 409 "$QL" POST /api/chuyen-bay "${LICH/\"thoiGianBay\":130/\"thoiGianBay\":10}"
goi "Quản lý thêm chuyến bay" 201 "$QL" POST /api/chuyen-bay "$LICH"
goi "Trùng mã chuyến bay" 409 "$QL" POST /api/chuyen-bay "$LICH"
goi "Xem chi tiết chuyến bay" 200 "$NV" GET "/api/chuyen-bay/$MA_CB"

muc "UC04 Bán vé (BM2, QĐ2)"
khach() { echo '{"hoTen":"'"$1"'","loaiGiayTo":"CCCD","soGiayTo":"'"$2"'","dienThoai":"0901234567"}'; }
goi "Thông tin bán của chuyến bay" 200 "$NV" GET "/api/chuyen-bay/$MA_CB/thong-tin-ban?mucDich=banVe"
goi "Bán vé Hạng 1 (giá 105%)" 201 "$NV" POST /api/ve '{"maChuyenBay":"'$MA_CB'","maHangVe":"H1","hanhKhach":'"$(khach 'Nguyễn Văn Thử' "$SO_GIAY_TO_1")"'}'
MA_VE=$(truong maVe)
goi "Bán vé Hạng 1 lần hai" 201 "$NV" POST /api/ve '{"maChuyenBay":"'$MA_CB'","maHangVe":"H1","hanhKhach":'"$(khach 'Trần Thị Thử' "$SO_GIAY_TO_2")"'}'
goi "Hạng 1 hết chỗ thì không bán" 409 "$NV" POST /api/ve '{"maChuyenBay":"'$MA_CB'","maHangVe":"H1","hanhKhach":'"$(khach 'Lê Văn Thử' "$SO_GIAY_TO_3")"'}'
goi "Giấy tờ sai định dạng" 400 "$NV" POST /api/ve '{"maChuyenBay":"'$MA_CB'","maHangVe":"H2","hanhKhach":'"$(khach 'Lê Văn Thử' '123')"'}'

muc "UC05 Đặt vé (BM3, QĐ3) và bán vé từ phiếu"
goi "Thông tin đặt của chuyến bay" 200 "$NV" GET "/api/chuyen-bay/$MA_CB/thong-tin-ban?mucDich=datVe"
goi "Lập phiếu đặt chỗ Hạng 2" 201 "$NV" POST /api/phieu-dat '{"maChuyenBay":"'$MA_CB'","maHangVe":"H2","hanhKhach":'"$(khach 'Lê Văn Thử' "$SO_GIAY_TO_3")"'}'
MA_PHIEU=$(truong maPhieuDat)
goi "Tìm phiếu còn hạn theo CCCD" 200 "$NV" GET "/api/phieu-dat/con-han?loaiGiayTo=CCCD&soGiayTo=$SO_GIAY_TO_3"
goi "Bán vé từ phiếu đặt chỗ" 201 "$NV" POST /api/ve/tu-phieu '{"maPhieuDat":"'$MA_PHIEU'"}'
goi "Phiếu đã thành vé không bán lại được" 409 "$NV" POST /api/ve/tu-phieu '{"maPhieuDat":"'$MA_PHIEU'"}'
goi "Lập phiếu thứ hai" 201 "$NV" POST /api/phieu-dat '{"maChuyenBay":"'$MA_CB'","maHangVe":"H2","hanhKhach":'"$(khach 'Nguyễn Văn Thử' "$SO_GIAY_TO_1")"'}'
MA_PHIEU_2=$(truong maPhieuDat)
goi "Phiếu sắp hết hạn" 200 "$NV" GET "/api/phieu-dat/sap-het-han?soLuong=3"
goi "Tra cứu phiếu của chuyến bay" 200 "$NV" GET "/api/phieu-dat?maChuyenBay=$MA_CB"

muc "UC04, UC05 Sửa và hủy"
goi "Sửa thông tin hành khách trên vé" 204 "$NV" PUT "/api/ve/$MA_VE/hanh-khach" "$(khach 'Nguyễn Văn Thử Sửa' "$SO_GIAY_TO_1")"
goi "Giấy tờ đã thuộc hành khách khác" 409 "$NV" PUT "/api/ve/$MA_VE/hanh-khach" "$(khach 'Nguyễn Văn Thử' "$SO_GIAY_TO_2")"
goi "Hủy vé" 204 "$NV" POST "/api/ve/$MA_VE/huy"
goi "Hủy vé lần hai" 409 "$NV" POST "/api/ve/$MA_VE/huy"
goi "Hủy phiếu đặt chỗ" 204 "$NV" POST "/api/phieu-dat/$MA_PHIEU_2/huy"
goi "Danh sách vé bán trong ngày" 200 "$NV" GET /api/ve
goi "Xóa chuyến bay đã có vé" 409 "$QL" DELETE "/api/chuyen-bay/$MA_CB"
goi "Đếm phiếu đã hủy trước hôm nay" 200 "$QL" GET "/api/phieu-dat/da-huy/dem?truocNgay=$HOM_NAY"
goi "Nhân viên không được xóa phiếu đã hủy" 403 "$NV" DELETE "/api/phieu-dat/da-huy?truocNgay=2026-01-01"
goi "Xóa phiếu đã hủy trước 01/01/2026" 200 "$QL" DELETE "/api/phieu-dat/da-huy?truocNgay=2026-01-01"

muc "UC07 Báo cáo doanh thu (BM5.1, BM5.2)"
goi "Báo cáo tháng 11/2026" 200 "$QL" GET "/api/bao-cao/thang?thang=11&nam=2026"
goi "Báo cáo tháng của chuyến bay thử" 200 "$QL" GET "/api/bao-cao/thang?thang=$THANG_BAY&nam=$NAM_BAY"
goi "Báo cáo năm 2026" 200 "$QL" GET "/api/bao-cao/nam?nam=2026"
goi "Nhân viên không được xem báo cáo" 403 "$NV" GET "/api/bao-cao/nam?nam=2026"
tai "Xuất báo cáo tháng ra PDF" "$QL" "/api/bao-cao/thang/xuat?thang=11&nam=2026&dinhDang=pdf"
tai "Xuất báo cáo năm ra Excel" "$QL" "/api/bao-cao/nam/xuat?nam=2026&dinhDang=excel"

muc "UC08 Thay đổi quy định (QĐ6)"
goi "Đọc quy định hiện hành" 200 "$QL" GET /api/quy-dinh
GIA_TRI_CU=$(truong thoiGianBayToiThieu)
goi "Đổi thời gian bay tối thiểu thành 45" 204 "$QL" PUT /api/quy-dinh/tham-so/thoiGianBayToiThieu '{"giaTriMoi":45}'
goi "Giá trị mới có hiệu lực ngay" 200 "$QL" GET /api/quy-dinh
goi "Trả lại giá trị cũ ($GIA_TRI_CU)" 204 "$QL" PUT /api/quy-dinh/tham-so/thoiGianBayToiThieu '{"giaTriMoi":'"${GIA_TRI_CU:-30}"'}'
goi "Thời gian dừng tối thiểu lớn hơn tối đa" 400 "$QL" PUT /api/quy-dinh/tham-so/thoiGianDungToiThieu '{"giaTriMoi":999}'
goi "Nhân viên không được đổi quy định" 403 "$NV" PUT /api/quy-dinh/tham-so/thoiGianBayToiThieu '{"giaTriMoi":1}'
# xóa sân bay, hạng vé thử còn sót từ lần chạy trước (nếu có)
curl -s -o /dev/null -X DELETE -b "$QL" "$GOC/api/san-bay/KTT"
goi "Thêm sân bay" 201 "$QL" POST /api/san-bay '{"maSanBay":"KTT","tenSanBay":"Sân bay kiểm tra"}'
goi "Sửa tên sân bay" 204 "$QL" PUT /api/san-bay/KTT '{"tenSanBay":"Sân bay kiểm tra (đã sửa)"}'
goi "Xóa sân bay chưa dùng" 204 "$QL" DELETE /api/san-bay/KTT
goi "Không xóa sân bay đang được dùng" 409 "$QL" DELETE /api/san-bay/SGN
curl -s -o /dev/null -X DELETE -b "$QL" "$GOC/api/hang-ve/KT"
goi "Thêm hạng vé kèm tỉ lệ đơn giá" 201 "$QL" POST /api/hang-ve '{"maHangVe":"KT","tenHangVe":"Hạng kiểm tra","tiLeDonGia":90}'
goi "Sửa tên hạng vé" 204 "$QL" PUT /api/hang-ve/KT '{"tenHangVe":"Hạng kiểm tra (đã sửa)"}'
goi "Xóa hạng vé chưa dùng" 204 "$QL" DELETE /api/hang-ve/KT
goi "Không xóa hạng vé đang được dùng" 409 "$QL" DELETE /api/hang-ve/H2

muc "UC02 Phân quyền"
goi "Danh sách tài khoản" 200 "$QL" GET /api/tai-khoan
goi "Nhân viên không được xem tài khoản" 403 "$NV" GET /api/tai-khoan
# tạo tài khoản kiemtra nếu chưa có (lần chạy trước có thể đã tạo)
curl -s -o /dev/null -X POST -b "$QL" -H 'Content-Type: application/json' \
    -d '{"tenDangNhap":"kiemtra","matKhau":"Kiemtra@123","nhomQuyen":"NhanVien"}' "$GOC/api/tai-khoan"
goi "Thêm tài khoản trùng tên đăng nhập" 409 "$QL" POST /api/tai-khoan '{"tenDangNhap":"kiemtra","matKhau":"Kiemtra@123","nhomQuyen":"NhanVien"}'
goi "Mở khóa tài khoản kiemtra" 204 "$QL" POST /api/tai-khoan/kiemtra/mo-khoa
goi "Đặt lại mật khẩu và đổi nhóm quyền" 204 "$QL" PUT /api/tai-khoan/kiemtra '{"nhomQuyen":"QuanLy","matKhauMoi":"Kiemtra@456"}'
goi "Đăng nhập bằng mật khẩu mới" 200 "$KHAC" POST /api/dang-nhap '{"tenDangNhap":"kiemtra","matKhau":"Kiemtra@456"}'
goi "Trả lại nhóm quyền Nhân viên" 204 "$QL" PUT /api/tai-khoan/kiemtra '{"nhomQuyen":"NhanVien"}'
goi "Khóa tài khoản kiemtra" 204 "$QL" POST /api/tai-khoan/kiemtra/khoa
goi "Tài khoản bị khóa không đăng nhập được" 403 "$KHAC" POST /api/dang-nhap '{"tenDangNhap":"kiemtra","matKhau":"Kiemtra@456"}'
goi "Không tự khóa tài khoản đang đăng nhập" 409 "$QL" POST /api/tai-khoan/quanly/khoa
goi "Không tự đổi nhóm quyền" 409 "$QL" PUT /api/tai-khoan/quanly '{"nhomQuyen":"NhanVien"}'

muc "UC06 Thông báo hủy phiếu tự động và đăng xuất"
goi "Thông báo" 200 "$NV" GET /api/thong-bao
goi "Đăng xuất" 204 "$NV" POST /api/dang-xuat
goi "Sau khi đăng xuất" 401 "$NV" GET /api/phien

echo
echo "Tổng kết: $SO_DAT bước đạt, $SO_TRUOT bước trượt."
[ "$SO_TRUOT" -eq 0 ]
