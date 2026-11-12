-- Tạo cơ sở dữ liệu QLBANVECHUYENBAY và 10 bảng theo mục 3.2.12 của báo cáo.
-- Chạy lại được nhiều lần: nếu cơ sở dữ liệu đã có thì xóa và tạo lại (mất dữ liệu cũ).
-- Cách chạy: sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 01_tao_csdl.sql

USE master;
GO

IF DB_ID(N'QLBANVECHUYENBAY') IS NOT NULL
BEGIN
    ALTER DATABASE QLBANVECHUYENBAY SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE QLBANVECHUYENBAY;
END
GO

CREATE DATABASE QLBANVECHUYENBAY COLLATE Vietnamese_CI_AS;
GO

USE QLBANVECHUYENBAY;
GO

-- sqlcmd mặc định tắt QUOTED_IDENTIFIER, cần bật để tạo chỉ mục có điều kiện trên VE
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. SANBAY: danh sách sân bay (QĐ1, TH01)
CREATE TABLE SANBAY (
    MaSanBay   char(3)       NOT NULL,
    TenSanBay  nvarchar(100) NOT NULL,
    CONSTRAINT PK_SANBAY PRIMARY KEY (MaSanBay),
    CONSTRAINT UQ_SANBAY_TenSanBay UNIQUE (TenSanBay),
    -- mã gồm đúng 3 chữ cái in hoa
    CONSTRAINT CK_SANBAY_MaSanBay CHECK (MaSanBay COLLATE Latin1_General_BIN2 LIKE '[A-Z][A-Z][A-Z]'),
    CONSTRAINT CK_SANBAY_TenSanBay CHECK (LEN(TenSanBay) > 0)
);
GO

-- 2. CHUYENBAY: thông tin chung của chuyến bay theo BM1
CREATE TABLE CHUYENBAY (
    MaChuyenBay      varchar(10)   NOT NULL,
    GiaVe            decimal(12,0) NOT NULL,
    MaSanBayDi       char(3)       NOT NULL,
    MaSanBayDen      char(3)       NOT NULL,
    NgayGioKhoiHanh  datetime2(0)  NOT NULL,
    ThoiGianBay      int           NOT NULL,
    CONSTRAINT PK_CHUYENBAY PRIMARY KEY (MaChuyenBay),
    CONSTRAINT FK_CHUYENBAY_SanBayDi  FOREIGN KEY (MaSanBayDi)  REFERENCES SANBAY (MaSanBay),
    CONSTRAINT FK_CHUYENBAY_SanBayDen FOREIGN KEY (MaSanBayDen) REFERENCES SANBAY (MaSanBay),
    -- mã chỉ gồm chữ in hoa và số
    CONSTRAINT CK_CHUYENBAY_MaChuyenBay CHECK (LEN(MaChuyenBay) > 0 AND MaChuyenBay COLLATE Latin1_General_BIN2 NOT LIKE '%[^A-Z0-9]%'),
    CONSTRAINT CK_CHUYENBAY_GiaVe CHECK (GiaVe > 0),
    -- giả định 12: sân bay đến khác sân bay đi
    CONSTRAINT CK_CHUYENBAY_SanBayKhacNhau CHECK (MaSanBayDen <> MaSanBayDi),
    -- thời gian bay tối thiểu (QĐ1) kiểm tra ở tầng xử lý vì phụ thuộc tham số
    CONSTRAINT CK_CHUYENBAY_ThoiGianBay CHECK (ThoiGianBay > 0)
);
GO

CREATE INDEX IX_CHUYENBAY_NgayGioKhoiHanh ON CHUYENBAY (NgayGioKhoiHanh);
CREATE INDEX IX_CHUYENBAY_SanBayDi_SanBayDen ON CHUYENBAY (MaSanBayDi, MaSanBayDen);
GO

-- 3. CHITIETTRUNGGIAN: các sân bay trung gian theo thứ tự dừng
CREATE TABLE CHITIETTRUNGGIAN (
    MaChuyenBay   varchar(10)   NOT NULL,
    ThuTu         tinyint       NOT NULL,
    MaSanBay      char(3)       NOT NULL,
    ThoiGianDung  int           NOT NULL,
    GhiChu        nvarchar(200) NULL,
    CONSTRAINT PK_CHITIETTRUNGGIAN PRIMARY KEY (MaChuyenBay, ThuTu),
    CONSTRAINT FK_CHITIETTRUNGGIAN_ChuyenBay FOREIGN KEY (MaChuyenBay) REFERENCES CHUYENBAY (MaChuyenBay),
    CONSTRAINT FK_CHITIETTRUNGGIAN_SanBay    FOREIGN KEY (MaSanBay)    REFERENCES SANBAY (MaSanBay),
    -- một sân bay không dừng hai lần trong cùng chuyến bay
    CONSTRAINT UQ_CHITIETTRUNGGIAN_SanBay UNIQUE (MaChuyenBay, MaSanBay),
    CONSTRAINT CK_CHITIETTRUNGGIAN_ThuTu CHECK (ThuTu >= 1),
    -- khoảng thời gian dừng (QĐ1) kiểm tra ở tầng xử lý vì phụ thuộc tham số
    CONSTRAINT CK_CHITIETTRUNGGIAN_ThoiGianDung CHECK (ThoiGianDung >= 0)
);
GO

-- 4. HANGVE: hạng vé và tỉ lệ đơn giá (QĐ2, TH05)
CREATE TABLE HANGVE (
    MaHangVe    varchar(5)   NOT NULL,
    TenHangVe   nvarchar(30) NOT NULL,
    TiLeDonGia  decimal(5,2) NOT NULL,
    CONSTRAINT PK_HANGVE PRIMARY KEY (MaHangVe),
    CONSTRAINT UQ_HANGVE_TenHangVe UNIQUE (TenHangVe),
    CONSTRAINT CK_HANGVE_MaHangVe CHECK (LEN(MaHangVe) > 0 AND MaHangVe COLLATE Latin1_General_BIN2 NOT LIKE '%[^A-Z0-9]%'),
    CONSTRAINT CK_HANGVE_TenHangVe CHECK (LEN(TenHangVe) > 0),
    -- tỉ lệ tính theo phần trăm, 105.00 nghĩa là 105%
    CONSTRAINT CK_HANGVE_TiLeDonGia CHECK (TiLeDonGia > 0)
);
GO

-- 5. GHETHEOHANG: số lượng ghế của từng hạng vé trên từng chuyến bay
--    Hạng không có ghế trên chuyến bay thì không có dòng trong bảng này.
CREATE TABLE GHETHEOHANG (
    MaChuyenBay  varchar(10) NOT NULL,
    MaHangVe     varchar(5)  NOT NULL,
    SoLuongGhe   int         NOT NULL,
    CONSTRAINT PK_GHETHEOHANG PRIMARY KEY (MaChuyenBay, MaHangVe),
    CONSTRAINT FK_GHETHEOHANG_ChuyenBay FOREIGN KEY (MaChuyenBay) REFERENCES CHUYENBAY (MaChuyenBay),
    CONSTRAINT FK_GHETHEOHANG_HangVe    FOREIGN KEY (MaHangVe)    REFERENCES HANGVE (MaHangVe),
    CONSTRAINT CK_GHETHEOHANG_SoLuongGhe CHECK (SoLuongGhe > 0)
);
GO

-- Bộ đếm để phát sinh mã hành khách, mã vé, mã phiếu đặt (tiền tố và 8 chữ số)
CREATE SEQUENCE SEQ_HANHKHACH   AS int START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_VE          AS int START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE SEQ_PHIEUDATCHO AS int START WITH 1 INCREMENT BY 1;
GO

-- 6. HANHKHACH: dùng chung cho vé và phiếu đặt chỗ (giả định 9, 10)
CREATE TABLE HANHKHACH (
    MaHanhKhach  varchar(10)  NOT NULL
        CONSTRAINT DF_HANHKHACH_MaHanhKhach DEFAULT ('HK' + RIGHT('00000000' + CAST(NEXT VALUE FOR SEQ_HANHKHACH AS varchar(8)), 8)),
    HoTen        nvarchar(50) NOT NULL,
    LoaiGiayTo   nvarchar(8)  NOT NULL CONSTRAINT DF_HANHKHACH_LoaiGiayTo DEFAULT (N'Căn cước'),
    SoGiayTo     varchar(20)  NOT NULL,
    DienThoai    varchar(16)  NOT NULL,
    CONSTRAINT PK_HANHKHACH PRIMARY KEY (MaHanhKhach),
    -- mỗi cặp loại giấy tờ, số giấy tờ ứng với đúng một hành khách
    CONSTRAINT UQ_HANHKHACH_GiayTo UNIQUE (LoaiGiayTo, SoGiayTo),
    CONSTRAINT CK_HANHKHACH_HoTen CHECK (LEN(HoTen) > 0),
    CONSTRAINT CK_HANHKHACH_LoaiGiayTo CHECK (LoaiGiayTo IN (N'Căn cước', N'Hộ chiếu')),
    -- căn cước: đúng 12 chữ số; hộ chiếu: 6 đến 20 ký tự chữ in hoa và số
    CONSTRAINT CK_HANHKHACH_SoGiayTo CHECK (
        (LoaiGiayTo = N'Căn cước' AND LEN(SoGiayTo) = 12 AND SoGiayTo COLLATE Latin1_General_BIN2 NOT LIKE '%[^0-9]%')
        OR
        (LoaiGiayTo = N'Hộ chiếu' AND LEN(SoGiayTo) BETWEEN 6 AND 20 AND SoGiayTo COLLATE Latin1_General_BIN2 NOT LIKE '%[^A-Z0-9]%')
    ),
    -- điện thoại: 8 đến 15 chữ số, có thể có dấu + ở đầu
    CONSTRAINT CK_HANHKHACH_DienThoai CHECK (
        LEN(DienThoai) - CASE WHEN LEFT(DienThoai, 1) = '+' THEN 1 ELSE 0 END BETWEEN 8 AND 15
        AND SUBSTRING(DienThoai, CASE WHEN LEFT(DienThoai, 1) = '+' THEN 2 ELSE 1 END, 16) COLLATE Latin1_General_BIN2 NOT LIKE '%[^0-9]%'
    )
);
GO

-- 8. PHIEUDATCHO: phiếu đặt chỗ theo BM3 (tạo trước VE vì VE tham chiếu tới)
CREATE TABLE PHIEUDATCHO (
    MaPhieuDat   varchar(10)   NOT NULL
        CONSTRAINT DF_PHIEUDATCHO_MaPhieuDat DEFAULT ('PD' + RIGHT('00000000' + CAST(NEXT VALUE FOR SEQ_PHIEUDATCHO AS varchar(8)), 8)),
    MaChuyenBay  varchar(10)   NOT NULL,
    MaHanhKhach  varchar(10)   NOT NULL,
    MaHangVe     varchar(5)    NOT NULL,
    GiaTien      decimal(12,0) NOT NULL,
    ThoiDiemDat  datetime2(0)  NOT NULL,
    TinhTrang    nvarchar(14)  NOT NULL CONSTRAINT DF_PHIEUDATCHO_TinhTrang DEFAULT (N'Chờ thanh toán'),
    CONSTRAINT PK_PHIEUDATCHO PRIMARY KEY (MaPhieuDat),
    CONSTRAINT FK_PHIEUDATCHO_ChuyenBay FOREIGN KEY (MaChuyenBay) REFERENCES CHUYENBAY (MaChuyenBay),
    CONSTRAINT FK_PHIEUDATCHO_HanhKhach FOREIGN KEY (MaHanhKhach) REFERENCES HANHKHACH (MaHanhKhach),
    CONSTRAINT FK_PHIEUDATCHO_HangVe    FOREIGN KEY (MaHangVe)    REFERENCES HANGVE (MaHangVe),
    -- chỉ đặt chỗ cho hạng vé mà chuyến bay có ghế
    CONSTRAINT FK_PHIEUDATCHO_GheTheoHang FOREIGN KEY (MaChuyenBay, MaHangVe) REFERENCES GHETHEOHANG (MaChuyenBay, MaHangVe),
    CONSTRAINT CK_PHIEUDATCHO_GiaTien CHECK (GiaTien > 0),
    CONSTRAINT CK_PHIEUDATCHO_TinhTrang CHECK (TinhTrang IN (N'Chờ thanh toán', N'Đã hủy'))
);
GO

CREATE INDEX IX_PHIEUDATCHO_TinhTrang_ThoiDiemDat ON PHIEUDATCHO (TinhTrang, ThoiDiemDat);
CREATE INDEX IX_PHIEUDATCHO_ChuyenBay_HangVe_TinhTrang ON PHIEUDATCHO (MaChuyenBay, MaHangVe, TinhTrang);
CREATE INDEX IX_PHIEUDATCHO_MaHanhKhach ON PHIEUDATCHO (MaHanhKhach);
GO

-- 7. VE: vé theo BM2, gồm cả vé Đã bán và vé Đã hủy
CREATE TABLE VE (
    MaVe         varchar(10)   NOT NULL
        CONSTRAINT DF_VE_MaVe DEFAULT ('VE' + RIGHT('00000000' + CAST(NEXT VALUE FOR SEQ_VE AS varchar(8)), 8)),
    MaChuyenBay  varchar(10)   NOT NULL,
    MaHanhKhach  varchar(10)   NOT NULL,
    MaHangVe     varchar(5)    NOT NULL,
    MaPhieuDat   varchar(10)   NULL,
    GiaTien      decimal(12,0) NOT NULL,
    NgayBan      datetime2(0)  NOT NULL CONSTRAINT DF_VE_NgayBan DEFAULT (SYSDATETIME()),
    TinhTrang    nvarchar(6)   NOT NULL CONSTRAINT DF_VE_TinhTrang DEFAULT (N'Đã bán'),
    CONSTRAINT PK_VE PRIMARY KEY (MaVe),
    CONSTRAINT FK_VE_ChuyenBay FOREIGN KEY (MaChuyenBay) REFERENCES CHUYENBAY (MaChuyenBay),
    CONSTRAINT FK_VE_HanhKhach FOREIGN KEY (MaHanhKhach) REFERENCES HANHKHACH (MaHanhKhach),
    CONSTRAINT FK_VE_HangVe    FOREIGN KEY (MaHangVe)    REFERENCES HANGVE (MaHangVe),
    CONSTRAINT FK_VE_PhieuDat  FOREIGN KEY (MaPhieuDat)  REFERENCES PHIEUDATCHO (MaPhieuDat),
    -- chỉ bán vé cho hạng vé mà chuyến bay có ghế
    CONSTRAINT FK_VE_GheTheoHang FOREIGN KEY (MaChuyenBay, MaHangVe) REFERENCES GHETHEOHANG (MaChuyenBay, MaHangVe),
    CONSTRAINT CK_VE_GiaTien CHECK (GiaTien > 0),
    CONSTRAINT CK_VE_TinhTrang CHECK (TinhTrang IN (N'Đã bán', N'Đã hủy'))
);
GO

-- GiaTien đi kèm chỉ mục để báo cáo doanh thu không phải đọc lại bảng
CREATE INDEX IX_VE_ChuyenBay_HangVe_TinhTrang ON VE (MaChuyenBay, MaHangVe, TinhTrang) INCLUDE (GiaTien);
CREATE INDEX IX_VE_MaHanhKhach ON VE (MaHanhKhach);
-- mỗi phiếu chỉ chuyển thành nhiều nhất một vé (giả định 5)
CREATE UNIQUE INDEX UQ_VE_MaPhieuDat ON VE (MaPhieuDat) WHERE MaPhieuDat IS NOT NULL;
-- phục vụ danh sách vé bán trong ngày
CREATE INDEX IX_VE_NgayBan ON VE (NgayBan);
GO

-- 9. THAMSOQUYDINH: tham số của QĐ1, QĐ3 thay đổi được theo QĐ6; luôn có đúng một dòng
CREATE TABLE THAMSOQUYDINH (
    ThoiGianBayToiThieu     int NOT NULL CONSTRAINT DF_THAMSO_ThoiGianBayToiThieu    DEFAULT (30),
    SoSanBayTrungGianToiDa  int NOT NULL CONSTRAINT DF_THAMSO_SoSanBayTrungGianToiDa DEFAULT (2),
    ThoiGianDungToiThieu    int NOT NULL CONSTRAINT DF_THAMSO_ThoiGianDungToiThieu   DEFAULT (10),
    ThoiGianDungToiDa       int NOT NULL CONSTRAINT DF_THAMSO_ThoiGianDungToiDa      DEFAULT (20),
    ThoiGianDatVeChamNhat   int NOT NULL CONSTRAINT DF_THAMSO_ThoiGianDatVeChamNhat  DEFAULT (1),
    ThoiGianHuyDatVe        int NOT NULL CONSTRAINT DF_THAMSO_ThoiGianHuyDatVe       DEFAULT (0),
    CONSTRAINT CK_THAMSO_ThoiGianBayToiThieu    CHECK (ThoiGianBayToiThieu >= 0),
    CONSTRAINT CK_THAMSO_SoSanBayTrungGianToiDa CHECK (SoSanBayTrungGianToiDa >= 0),
    CONSTRAINT CK_THAMSO_ThoiGianDungToiThieu   CHECK (ThoiGianDungToiThieu >= 0),
    CONSTRAINT CK_THAMSO_ThoiGianDung           CHECK (ThoiGianDungToiDa >= ThoiGianDungToiThieu),
    CONSTRAINT CK_THAMSO_ThoiGianDatVeChamNhat  CHECK (ThoiGianDatVeChamNhat >= 0),
    -- giả định 6: thời gian hủy đặt vé phải nhỏ hơn thời gian chậm nhất khi đặt vé
    CONSTRAINT CK_THAMSO_ThoiGianHuyDatVe       CHECK (ThoiGianHuyDatVe >= 0 AND ThoiGianHuyDatVe < ThoiGianDatVeChamNhat)
);
GO

-- Dòng tham số mặc định theo đề (QĐ1: 30 phút, 2 sân bay trung gian, dừng 10 đến 20 phút; QĐ3: 1 ngày, 0 ngày)
INSERT INTO THAMSOQUYDINH DEFAULT VALUES;
GO

-- Không cho thêm dòng thứ hai hoặc xóa dòng duy nhất của bảng tham số
CREATE TRIGGER TR_THAMSOQUYDINH_MotDong ON THAMSOQUYDINH
AFTER INSERT, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF (SELECT COUNT(*) FROM THAMSOQUYDINH) <> 1
    BEGIN
        RAISERROR (N'Bảng THAMSOQUYDINH phải có đúng một dòng.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END
GO

-- 10. TAIKHOAN: tài khoản đăng nhập, mật khẩu đã băm PBKDF2
CREATE TABLE TAIKHOAN (
    TenDangNhap  varchar(30)  NOT NULL,
    MatKhau      varchar(200) NOT NULL,
    NhomQuyen    nvarchar(16) NOT NULL,
    TrangThai    nvarchar(9)  NOT NULL CONSTRAINT DF_TAIKHOAN_TrangThai DEFAULT (N'Hoạt động'),
    CONSTRAINT PK_TAIKHOAN PRIMARY KEY (TenDangNhap),
    CONSTRAINT CK_TAIKHOAN_TenDangNhap CHECK (LEN(TenDangNhap) > 0 AND TenDangNhap NOT LIKE '%[ ' + CHAR(9) + CHAR(10) + CHAR(13) + ']%'),
    CONSTRAINT CK_TAIKHOAN_MatKhau CHECK (LEN(MatKhau) > 0),
    CONSTRAINT CK_TAIKHOAN_NhomQuyen CHECK (NhomQuyen IN (N'Quản lý', N'Nhân viên bán vé')),
    CONSTRAINT CK_TAIKHOAN_TrangThai CHECK (TrangThai IN (N'Hoạt động', N'Đã khóa'))
);
GO

PRINT N'Đã tạo cơ sở dữ liệu QLBANVECHUYENBAY với 10 bảng.';
GO
