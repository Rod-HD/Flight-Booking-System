# Cai dat va chay phan mem Quan ly ban ve chuyen bay bang mot lenh (Windows 10 tro len).
# Chay trong PowerShell, dung o thu muc goc cua ma nguon:
#   .\cai_dat.cmd                          tao CSDL (neu chua co), nap du lieu mau, dung giao dien, chay may chu
#   .\cai_dat.cmd -NapLaiDuLieu            xoa CSDL hien co roi tao lai va nap lai du lieu mau
#   .\cai_dat.cmd -MayChuSql "localhost"   SQL Server khong dung ten phien ban SQLEXPRESS
#   .\cai_dat.cmd -KhongChay               chi cai dat, khong chay may chu
# Thong bao viet khong dau de hien dung tren moi bang ma cua cua so lenh.
param(
    [string]$MayChuSql = "localhost\SQLEXPRESS",
    [switch]$NapLaiDuLieu,
    [switch]$KhongChay
)

$ErrorActionPreference = "Stop"
$goc = $PSScriptRoot
$tenCsdl = "QLBANVECHUYENBAY"
$diaChi = "http://localhost:5080"

function Buoc($so, $noiDung) {
    Write-Host ""
    Write-Host "[$so/4] $noiDung" -ForegroundColor Cyan
}

function Dung($thongBao) {
    Write-Host ""
    Write-Host "LOI: $thongBao" -ForegroundColor Red
    exit 1
}

function KiemTraLenh($ten, $huongDan) {
    if (-not (Get-Command $ten -ErrorAction SilentlyContinue)) {
        Dung "Chua co lenh '$ten'. $huongDan"
    }
}

# Goi mot lenh ngoai (sqlcmd, npm, dotnet). Trong luc goi, dong canh bao lenh ghi ra stderr
# khong bi PowerShell coi la loi dung script; ket qua xet theo ma thoat $LASTEXITCODE.
function GoiLenh([string]$ten, [string[]]$thamSo) {
    $cu = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $ten @thamSo 2>&1 | ForEach-Object { "$_" }
    } finally {
        $ErrorActionPreference = $cu
    }
}

# Chay sqlcmd bang tai khoan Windows dang dang nhap; tra ve cac dong ket qua.
function ChaySql([string[]]$thamSo) {
    $ketQua = GoiLenh "sqlcmd" (@("-S", $MayChuSql, "-E", "-C", "-b") + $thamSo)
    if ($LASTEXITCODE -ne 0) {
        $ketQua | ForEach-Object { Write-Host $_ }
        Dung "sqlcmd bao loi (ma $LASTEXITCODE)."
    }
    return $ketQua
}

Write-Host "Quan ly ban ve chuyen bay: cai dat va chay" -ForegroundColor Green

# ---- kiem tra phan mem can co
KiemTraLenh "sqlcmd" "Cai SQL Server 2022 Express (kieu Basic) va goi sqlcmd cua Microsoft."
KiemTraLenh "dotnet" "Cai .NET SDK 10."
KiemTraLenh "node" "Cai Node.js 22 (kem npm)."
KiemTraLenh "npm" "Cai Node.js 22 (kem npm)."

$banDotnet = "$(GoiLenh 'dotnet' @('--version') | Select-Object -Last 1)".Trim()
if ($banDotnet -notmatch '^10\.') { Dung "Can .NET SDK 10, may dang co ban $banDotnet." }
$banNode = "$(GoiLenh 'node' @('--version') | Select-Object -Last 1)".Trim()
if ($banNode -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 22) { Dung "Can Node.js 22 tro len, may dang co ban $banNode." }

GoiLenh "sqlcmd" @("-S", $MayChuSql, "-E", "-C", "-b", "-l", "15", "-Q", "SELECT 1") | Out-Null
if ($LASTEXITCODE -ne 0) {
    Dung "Khong ket noi duoc SQL Server '$MayChuSql' bang tai khoan Windows hien tai. Kiem tra dich vu SQL Server dang chay; neu ten phien ban khac thi them tham so -MayChuSql."
}

# ---- 1 va 2: co so du lieu
$daCo = (ChaySql @("-h", "-1", "-W", "-Q", "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = '$tenCsdl'") |
    Where-Object { $_ -match '^\s*\d+\s*$' } | Select-Object -First 1)
$daCo = [int]("$daCo".Trim())

if ($daCo -eq 0 -or $NapLaiDuLieu) {
    Buoc 1 "Tao co so du lieu $tenCsdl"
    ChaySql @("-i", (Join-Path $goc "db\01_tao_csdl.sql")) | Out-Null
    Buoc 2 "Nap du lieu mau"
    ChaySql @("-i", (Join-Path $goc "db\02_du_lieu_mau.sql")) | Out-Null
    Write-Host "Da tao $tenCsdl va nap du lieu mau."
} else {
    Buoc 1 "Co so du lieu $tenCsdl da co, giu nguyen"
    Buoc 2 "Bo qua nap du lieu mau (them -NapLaiDuLieu neu muon xoa va nap lai)"
}

# ---- 3: dung giao dien, chep vao wwwroot cua may chu
Buoc 3 "Dung giao dien"
Push-Location (Join-Path $goc "web")
try {
    if (-not (Test-Path "node_modules")) {
        GoiLenh "npm" @("ci")
        if ($LASTEXITCODE -ne 0) { Dung "npm ci bao loi." }
    }
    GoiLenh "npm" @("run", "dung-may-chu")
    if ($LASTEXITCODE -ne 0) { Dung "Dung giao dien bao loi." }
} finally {
    Pop-Location
}

if ($KhongChay) {
    Write-Host ""
    Write-Host "Da cai dat xong. Chay may chu: cd api\QuanLyBanVe.Api roi dotnet run -c Release" -ForegroundColor Green
    exit 0
}

# ---- 4: chay may chu
Buoc 4 "Chay may chu tai $diaChi (Ctrl+C de dung)"
if ($MayChuSql -ne "localhost\SQLEXPRESS") {
    # ghi de chuoi ket noi trong appsettings.json cho lan chay nay
    $env:ConnectionStrings__QLBANVE = "Server=$MayChuSql;Database=$tenCsdl;Trusted_Connection=True;TrustServerCertificate=True"
}
Write-Host "Tai khoan mac dinh: quanly / Quanly@123 (Quan ly), nhanvien / Nhanvien@123 (Nhan vien ban ve)."
Write-Host "Trinh duyet se tu mo khi may chu san sang."

# mo trinh duyet khi may chu da tra loi; neu khong mo duoc thi nguoi dung tu mo dia chi tren
$moTrinhDuyet = Start-Job -ArgumentList $diaChi -ScriptBlock {
    param($diaChi)
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep -Seconds 2
        try {
            Invoke-WebRequest -Uri $diaChi -UseBasicParsing -TimeoutSec 3 | Out-Null
            Start-Process $diaChi
            return
        } catch { }
    }
}

Push-Location (Join-Path $goc "api\QuanLyBanVe.Api")
try {
    GoiLenh "dotnet" @("run", "-c", "Release")
} finally {
    Pop-Location
    Remove-Job $moTrinhDuyet -Force -ErrorAction SilentlyContinue
}
