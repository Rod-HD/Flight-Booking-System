#requires -Version 5.1
# TT01–TT03 (Bảng 5.30): tập tin mẫu, nhập lịch, xuất danh sách chuyến bay, báo cáo; mở tập tin bằng openpyxl, pypdf rồi đối chiếu SQL.
param([string]$Ra, [int]$Thang=6, [int]$ThangDanhSach=11, [string]$SoLieuCu)
. "$PSScriptRoot/chung.ps1"
if (-not $Ra) { $Ra = $KetQuaHQ }
$Ra = (New-Item -ItemType Directory -Force -Path $Ra).FullName
$py = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$docTep = Join-Path $PSScriptRoot '08_tuong_thich.py'
if (-not (Test-Path -LiteralPath $py)) { throw 'Thiếu .venv: chạy uv venv .venv rồi uv pip install --python .venv\Scripts\python.exe openpyxl pypdf.' }
Kiem-MayChuHQ $DiaChiHQ
$moc = DauGio-HQ
$LogHQ = Join-Path $Ra "tuong_thich_$moc.txt"
function Doc-Tep([string]$Lenh, [string]$Tep) {
    $json = & $py -I $docTep $Lenh $Tep
    if ($LASTEXITCODE -ne 0) { throw "Không đọc được $Tep." }
    $json | ConvertFrom-Json
}
function Luu-Tep($Kq, [string]$Ten) {
    if ($Kq.Http -ne 200) { throw "$Ten`: HTTP $($Kq.Http) $($Kq.Ma)" }
    $tep = Join-Path $Ra "${moc}-$Ten"
    [IO.File]::WriteAllBytes($tep, $Kq.PhanHoi.RawContentStream.ToArray())
    $tep
}

$ql = DangNhap-HQ
$nam = (NgayGio-HQ).Year

# TT01: tải mẫu, điền 3 chuyến bay (2 sân bay trung gian, 1 chuyến bay 20 phút), nhập, đọc lại
$kq = Thu-HQ '/api/chuyen-bay/mau-excel' -Session $ql
$mau = Luu-Tep $kq 'TT01_mau.xlsx'
$ma = @(1..3 | ForEach-Object { Ma-HQ })
$ngay = (NgayGio-HQ).AddDays(10).ToString('dd/MM/yyyy 08:30', [Globalization.CultureInfo]::InvariantCulture)
$daDien = Join-Path $Ra "${moc}-TT01_da_dien.xlsx"
$dien = & $py -I $docTep dien $mau $daDien $ma[0] $ma[1] $ma[2] $ngay
if ($LASTEXITCODE -ne 0) { throw 'Không điền được tập tin mẫu.' }
Ghi "== TT01 =="
Ghi "Tập tin mẫu: $mau"
Ghi $dien
$nhap = Thu-HQ '/api/chuyen-bay/nhap-excel' POST $ql -TepXlsx $daDien
Ghi "Nhập: HTTP $($nhap.Http), $($nhap.MiliGiay) ms, phản hồi $($nhap.Than)"
foreach ($m in $ma) {
    $ct = Thu-HQ "/api/chuyen-bay/$m" -Session $ql
    Ghi "Đọc lại $m`: HTTP $($ct.Http) $($ct.Ma) $($ct.Than)"
}
Ghi (Sql-Dong @"
SELECT CONCAT('CSDL|',MaChuyenBay,'|',GiaVe,'|',CONVERT(varchar(16),NgayGioKhoiHanh,120),'|',ThoiGianBay) FROM CHUYENBAY WHERE MaChuyenBay IN ('$($ma -join "','")');
SELECT CONCAT('TRUNGGIAN|',MaChuyenBay,'|',ThuTu,'|',MaSanBay,'|',ThoiGianDung,'|',GhiChu) FROM CHITIETSANBAYTRUNGGIAN WHERE MaChuyenBay IN ('$($ma -join "','")') ORDER BY MaChuyenBay,ThuTu;
SELECT CONCAT('GHE|',MaChuyenBay,'|',MaHangVe,'|',SoLuongGhe) FROM GHETHEOHANG WHERE MaChuyenBay IN ('$($ma -join "','")') ORDER BY MaChuyenBay,MaHangVe;
"@ | Out-String)

# TT02: xuất danh sách chuyến bay một tháng và không tiêu chí
Ghi "== TT02 =="
$cuoi = [datetime]::DaysInMonth($nam, $ThangDanhSach)
$dsXuat = @(
    @{Ten="TT02_thang_$ThangDanhSach.xlsx"; Path=("/api/chuyen-bay/xuat-excel?tuNgay={0}-{1:00}-01&denNgay={0}-{1:00}-{2:00}" -f $nam,$ThangDanhSach,$cuoi)},
    @{Ten='TT02_khong_tieu_chi.xlsx'; Path='/api/chuyen-bay/xuat-excel'}
)
foreach ($x in $dsXuat) {
    $kq = Thu-HQ $x.Path -Session $ql
    $tep = Luu-Tep $kq $x.Ten
    Ghi "$($x.Ten): HTTP $($kq.Http), $($kq.MiliGiay) ms, $((Get-Item -LiteralPath $tep).Length) byte"
    Ghi ((Doc-Tep excel $tep) | ConvertTo-Json -Depth 6 -Compress)
}
$dauThangDs = '{0}-{1:00}-01' -f $nam,$ThangDanhSach
Ghi (Sql-Dong @"
SELECT CONCAT('SQL so chuyen bay thang $ThangDanhSach|',COUNT(*)) FROM CHUYENBAY WHERE NgayGioKhoiHanh >= '$dauThangDs' AND NgayGioKhoiHanh < DATEADD(month,1,'$dauThangDs');
SELECT CONCAT('SQL tong so chuyen bay|',COUNT(*)) FROM CHUYENBAY;
"@ | Out-String)

# TT03: báo cáo tháng, năm tải mới qua máy chủ, cùng các tập tin HQ06 đã lưu (nếu có), đối chiếu SQL
Ghi "== TT03 =="
$dsBaoCao = @()
foreach ($dd in 'excel','pdf') {
    $ext = if ($dd -eq 'excel') { 'xlsx' } else { 'pdf' }
    $kq = Thu-HQ "/api/bao-cao/thang/xuat?thang=$Thang&nam=$nam&dinhDang=$dd" -Session $ql
    $dsBaoCao += Luu-Tep $kq "TT03_thang_$Thang.$ext"
    Ghi "Báo cáo tháng $dd`: HTTP $($kq.Http), $($kq.MiliGiay) ms"
    $kq = Thu-HQ "/api/bao-cao/nam/xuat?nam=$nam&dinhDang=$dd" -Session $ql
    $dsBaoCao += Luu-Tep $kq "TT03_nam_$nam.$ext"
    Ghi "Báo cáo năm $dd`: HTTP $($kq.Http), $($kq.MiliGiay) ms"
}
if ($SoLieuCu) { $dsBaoCao += @(Get-ChildItem -LiteralPath $SoLieuCu -Filter '*HQ06_*' | ForEach-Object FullName) }
foreach ($tep in $dsBaoCao) {
    $loai = if ($tep -like '*.pdf') { 'pdf' } else { 'excel' }
    Ghi ("{0}: {1}" -f [IO.Path]::GetFileName($tep), ((Doc-Tep $loai $tep) | ConvertTo-Json -Depth 6 -Compress))
}
$dauThang = '{0}-{1:00}-01' -f $nam,$Thang
Ghi (Sql-Dong @"
SELECT CONCAT('SQL thang $Thang|chuyen bay khoi hanh ',COUNT(*)) FROM CHUYENBAY WHERE NgayGioKhoiHanh >= '$dauThang' AND NgayGioKhoiHanh < DATEADD(month,1,'$dauThang');
SELECT CONCAT('SQL thang $Thang|chuyen bay co ve ',COUNT(DISTINCT v.MaChuyenBay),'|so ve ',COUNT(*),'|doanh thu ',SUM(v.GiaTien))
FROM VE v JOIN CHUYENBAY cb ON cb.MaChuyenBay=v.MaChuyenBay
WHERE cb.NgayGioKhoiHanh >= '$dauThang' AND cb.NgayGioKhoiHanh < DATEADD(month,1,'$dauThang') AND v.TinhTrang=N'Đã bán';
SELECT CONCAT('SQL nam $nam|thang ',m.Thang,'|chuyen bay ',m.SoChuyen,'|doanh thu ',ISNULL(d.DoanhThu,0))
FROM (SELECT MONTH(NgayGioKhoiHanh) Thang, COUNT(*) SoChuyen FROM CHUYENBAY WHERE YEAR(NgayGioKhoiHanh)=$nam GROUP BY MONTH(NgayGioKhoiHanh)) m
LEFT JOIN (SELECT MONTH(cb.NgayGioKhoiHanh) Thang, SUM(v.GiaTien) DoanhThu FROM VE v JOIN CHUYENBAY cb ON cb.MaChuyenBay=v.MaChuyenBay
           WHERE YEAR(cb.NgayGioKhoiHanh)=$nam AND v.TinhTrang=N'Đã bán' GROUP BY MONTH(cb.NgayGioKhoiHanh)) d ON d.Thang=m.Thang ORDER BY m.Thang;
SELECT CONCAT('SQL nam $nam|tong chuyen bay ',COUNT(*)) FROM CHUYENBAY WHERE YEAR(NgayGioKhoiHanh)=$nam;
SELECT CONCAT('SQL nam $nam|tong doanh thu ',SUM(v.GiaTien)) FROM VE v JOIN CHUYENBAY cb ON cb.MaChuyenBay=v.MaChuyenBay WHERE YEAR(cb.NgayGioKhoiHanh)=$nam AND v.TinhTrang=N'Đã bán';
"@ | Out-String)
$null = Thu-HQ '/api/dang-xuat' POST $ql
Write-Host $LogHQ
