# Nạp cấu trúc và dữ liệu mẫu (db/01, db/02) vào một cơ sở dữ liệu Azure SQL Database đã tạo sẵn (collation Vietnamese_CI_AS).
# Azure không cho USE, CREATE/DROP DATABASE nên script bỏ phần đầu của 01, 02 và chạy thẳng trong cơ sở dữ liệu đích.
# Azure chạy giờ UTC: SYSDATETIME() được đổi thành giờ Việt Nam để lịch bay mẫu và ngày bán khớp giờ địa phương.
# Mật khẩu hỏi khi chạy, không ghi ra tập tin.
#
# Ví dụ:
#   .\nap_azure.ps1 -MayChu ten-may-chu.database.windows.net -CoSoDuLieu QLBANVECHUYENBAY -NguoiDung quantri
#   .\nap_azure.ps1 ... -XoaCu                      xóa mọi bảng cũ trước khi nạp lại (mất dữ liệu)
#   .\nap_azure.ps1 ... -TaoNguoiDungUngDung ungdung tạo thêm người dùng chỉ đọc, ghi dữ liệu cho phần mềm
#   .\nap_azure.ps1 -MayChu 'localhost\SQLEXPRESS' -CoSoDuLieu THU -XacThucWindows   thử trên máy (cơ sở dữ liệu phải có sẵn)
param(
  [Parameter(Mandatory)] [string] $MayChu,
  [Parameter(Mandatory)] [string] $CoSoDuLieu,
  [string] $NguoiDung,
  [switch] $XacThucWindows,
  [switch] $XoaCu,
  [string] $TaoNguoiDungUngDung
)
$ErrorActionPreference = 'Stop'
$db = Split-Path $PSScriptRoot
$tam = Join-Path ([IO.Path]::GetTempPath()) "nap_azure_$PID"
New-Item -ItemType Directory -Force $tam | Out-Null

$ketNoi = @('-S', $MayChu, '-d', $CoSoDuLieu, '-b', '-I')
if ($XacThucWindows) { $ketNoi += @('-E', '-C') }
else {
  if (-not $NguoiDung) { throw 'Cần -NguoiDung (tài khoản quản trị của máy chủ Azure SQL) hoặc -XacThucWindows.' }
  $an = Read-Host "Mật khẩu của $NguoiDung" -AsSecureString
  # sqlcmd đọc mật khẩu từ biến môi trường SQLCMDPASSWORD, không lộ trên dòng lệnh
  $env:SQLCMDPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($an))
  $ketNoi += @('-U', $NguoiDung, '-N')
}

function Chay([string] $tep, [string[]] $them = @()) {
  & sqlcmd @ketNoi @them -i $tep
  if ($LASTEXITCODE) { throw "chạy $(Split-Path $tep -Leaf) lỗi" }
}

$gioVN = "CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time' AS datetime2(0))"
function Doc([string] $ten, [string] $moc) {
  $t = [IO.File]::ReadAllText((Join-Path $db $ten))
  $i = $t.IndexOf($moc)
  if ($i -lt 0) { throw "không thấy mốc '$moc' trong $ten" }
  return $t.Substring($i).Replace('SYSDATETIME()', $gioVN)
}

try {
  if ($XoaCu) {
    $xoa = @"
DECLARE @s nvarchar(max) = N'';
SELECT @s += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(name) + N';' FROM sys.foreign_keys;
EXEC (@s);
SET @s = N'';
SELECT @s += N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N';' FROM sys.tables WHERE is_ms_shipped = 0;
EXEC (@s);
SET @s = N'';
SELECT @s += N'DROP SEQUENCE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N';' FROM sys.sequences;
EXEC (@s);
"@
    [IO.File]::WriteAllText("$tam\00_xoa.sql", $xoa, (New-Object Text.UTF8Encoding $true))
    Chay "$tam\00_xoa.sql"
    'đã xóa các bảng cũ'
  }
  # 01: bỏ USE master, DROP/CREATE DATABASE, USE; bắt đầu từ dòng bật QUOTED_IDENTIFIER
  [IO.File]::WriteAllText("$tam\01.sql", (Doc '01_tao_csdl.sql' 'SET QUOTED_IDENTIFIER ON;'), (New-Object Text.UTF8Encoding $true))
  Chay "$tam\01.sql"
  'đã tạo bảng (01)'
  [IO.File]::WriteAllText("$tam\02.sql", (Doc '02_du_lieu_mau.sql' 'SET QUOTED_IDENTIFIER ON;'), (New-Object Text.UTF8Encoding $true))
  Chay "$tam\02.sql"
  'đã nạp dữ liệu mẫu (02)'

  if ($TaoNguoiDungUngDung) {
    $an2 = Read-Host "Mật khẩu mới cho $TaoNguoiDungUngDung (ít nhất 8 ký tự, có chữ hoa, chữ thường, số)" -AsSecureString
    $mk = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($an2))
    # người dùng chứa trong cơ sở dữ liệu (contained user): Azure không cho CREATE LOGIN từ cơ sở dữ liệu thường
    $nd = @'
IF USER_ID(N'$(TenNguoiDung)') IS NULL CREATE USER [$(TenNguoiDung)] WITH PASSWORD = N'$(MatKhauMoi)';
ALTER ROLE db_datareader ADD MEMBER [$(TenNguoiDung)];
ALTER ROLE db_datawriter ADD MEMBER [$(TenNguoiDung)];
'@
    [IO.File]::WriteAllText("$tam\03.sql", $nd, (New-Object Text.UTF8Encoding $true))
    Chay "$tam\03.sql" @('-v', "TenNguoiDung=$TaoNguoiDungUngDung", "MatKhauMoi=$mk")
    "đã tạo người dùng $TaoNguoiDungUngDung (đọc, ghi dữ liệu)"
  }
}
finally {
  Remove-Item -Recurse -Force $tam -ErrorAction SilentlyContinue
  Remove-Item Env:SQLCMDPASSWORD -ErrorAction SilentlyContinue
}
