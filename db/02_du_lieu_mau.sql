-- Dữ liệu mẫu cho QLBANVECHUYENBAY. Lịch gốc được soạn quanh ngày 12/11/2026 (chuyến bay từ tháng 1 đến tháng 12 năm 2026);
-- khi nạp, mọi mốc ngày được dịch theo số ngày lệch giữa ngày nạp và 12/11/2026, nên nạp vào ngày nào
-- thì ngày đó cũng đóng vai trò "hôm nay" của lịch và các kịch bản minh họa vẫn đúng.
-- Chạy sau 01_tao_csdl.sql. Chạy lại được nhiều lần: dữ liệu nghiệp vụ cũ bị xóa rồi nạp lại.
-- Bảng TAIKHOAN không nạp ở đây: máy chủ tự tạo tài khoản ban đầu khi khởi động nếu bảng còn rỗng.
-- Cách chạy: sqlcmd -S localhost\SQLEXPRESS -E -C -b -i 02_du_lieu_mau.sql

USE QLBANVECHUYENBAY;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
GO

-- Xóa dữ liệu cũ theo thứ tự khóa ngoại
DELETE FROM VE;
DELETE FROM PHIEUDATCHO;
DELETE FROM HANHKHACH;
DELETE FROM CHITIETTRUNGGIAN;
DELETE FROM GHETHEOHANG;
DELETE FROM CHUYENBAY;
DELETE FROM HANGVE;
DELETE FROM SANBAY;

-- Tham số quy định mặc định theo đề (QĐ1, QĐ3)
UPDATE THAMSOQUYDINH
SET ThoiGianBayToiThieu = 30, SoSanBayTrungGianToiDa = 2, ThoiGianDungToiThieu = 10, ThoiGianDungToiDa = 20,
    ThoiGianDatVeChamNhat = 1, ThoiGianHuyDatVe = 0;

-- QĐ1: 10 sân bay ban đầu (giả định 11)
INSERT INTO SANBAY (MaSanBay, TenSanBay) VALUES
('SGN', N'Tân Sơn Nhất'),
('HAN', N'Nội Bài'),
('DAD', N'Đà Nẵng'),
('CXR', N'Cam Ranh'),
('PQC', N'Phú Quốc'),
('HPH', N'Cát Bi'),
('HUI', N'Phú Bài'),
('VCA', N'Cần Thơ'),
('DLI', N'Liên Khương'),
('VII', N'Vinh');

-- QĐ2: hai hạng vé, hạng 1 bằng 105% đơn giá, hạng 2 bằng đơn giá
INSERT INTO HANGVE (MaHangVe, TenHangVe, TiLeDonGia) VALUES
('H1', N'Hạng 1', 105.00),
('H2', N'Hạng 2', 100.00);

-- Số ngày lệch giữa ngày nạp và ngày gốc 12/11/2026 của lịch; cộng vào mọi mốc ngày cố định bên dưới.
-- Nạp vào đúng ngày 12/11/2026 thì độ lệch bằng 0 và dữ liệu giữ nguyên như lịch gốc.
DECLARE @Lech int = DATEDIFF(DAY, CAST('2026-11-12' AS date), CAST(SYSDATETIME() AS date));

-- Lịch 60 chuyến bay, ghi theo ngày gốc (tháng 1 đến tháng 12 năm 2026) rồi dịch theo @Lech.
-- GheH1, GheH2: số lượng ghế từng hạng; BanH1, BanH2: số vé Đã bán sẽ phát sinh cho từng hạng.
CREATE TABLE #Lich (
    STT         int IDENTITY(1,1) PRIMARY KEY,
    Ma          varchar(10)   NOT NULL,
    GiaVe       decimal(12,0) NOT NULL,
    Di          char(3)       NOT NULL,
    Den         char(3)       NOT NULL,
    NgayGio     datetime2(0)  NOT NULL,
    ThoiGianBay int           NOT NULL,
    GheH1       int           NOT NULL,
    GheH2       int           NOT NULL,
    BanH1       int           NOT NULL,
    BanH2       int           NOT NULL
);

INSERT INTO #Lich (Ma, GiaVe, Di, Den, NgayGio, ThoiGianBay, GheH1, GheH2, BanH1, BanH2) VALUES
-- tháng 1 đến tháng 10: các chuyến bay đã khởi hành
('CB101', 1650000, 'SGN', 'HAN', '2026-01-08T06:30:00', 130, 12,  80,  9, 61),
('CB102', 1650000, 'HAN', 'SGN', '2026-01-15T09:15:00', 130, 12,  80,  7, 55),
('CB103', 1150000, 'SGN', 'DAD', '2026-01-24T14:00:00',  85,  8,  60,  5, 48),
('CB111', 2350000, 'SGN', 'HAN', '2026-02-10T07:00:00', 130, 16, 100, 16, 97),
('CB112', 2350000, 'HAN', 'SGN', '2026-02-22T16:45:00', 130, 16, 100, 14, 92),
('CB113', 1250000, 'SGN', 'PQC', '2026-02-27T10:30:00',  60,  8,  60,  6, 41),
('CB121', 1050000, 'HAN', 'DAD', '2026-03-06T08:20:00',  80,  8,  60,  4, 37),
('CB122', 1100000, 'DAD', 'SGN', '2026-03-14T18:10:00',  85,  8,  60,  5, 42),
('CB123',  990000, 'SGN', 'CXR', '2026-03-25T11:40:00',  65,  8,  50,  3, 30),
('CB131', 1700000, 'SGN', 'HAN', '2026-04-04T06:30:00', 130, 12,  80,  8, 58),
('CB132', 2100000, 'HAN', 'PQC', '2026-04-18T13:25:00', 130, 12,  80, 10, 66),
('CB133', 1300000, 'SGN', 'HUI', '2026-04-29T15:00:00',  85,  8,  60,  8, 57),
('CB141', 1900000, 'HAN', 'SGN', '2026-05-02T19:30:00', 130, 12,  80, 11, 74),
('CB142',  950000, 'SGN', 'DLI', '2026-05-16T07:45:00',  55,  6,  50,  2, 28),
('CB143', 1050000, 'DAD', 'HAN', '2026-05-27T12:10:00',  80,  8,  60,  4, 39),
('CB151', 1850000, 'HAN', 'CXR', '2026-06-05T08:00:00', 110, 12,  80, 12, 76),
('CB152', 1350000, 'SGN', 'PQC', '2026-06-13T09:30:00',  60,  8,  60,  8, 58),
('CB153', 1250000, 'HAN', 'DAD', '2026-06-26T17:20:00',  80,  8,  60,  7, 52),
('CB161', 1300000, 'SGN', 'DAD', '2026-07-04T06:15:00',  85,  8,  60,  8, 55),
('CB162', 2250000, 'HAN', 'PQC', '2026-07-18T10:50:00', 130, 12,  80, 11, 71),
('CB163', 1750000, 'SGN', 'HPH', '2026-07-29T14:35:00', 125, 12,  80,  6, 49),
('CB171', 1200000, 'DAD', 'SGN', '2026-08-08T20:05:00',  85,  8,  60,  6, 47),
('CB172', 1500000, 'SGN', 'VII', '2026-08-15T07:10:00', 110,  8,  60,  4, 36),
('CB173', 1600000, 'HAN', 'DLI', '2026-08-28T11:30:00', 110,  8,  60,  5, 40),
('CB181', 2000000, 'SGN', 'HAN', '2026-09-01T16:00:00', 130, 12,  80, 12, 78),
('CB182', 1700000, 'HAN', 'VCA', '2026-09-12T08:40:00', 130,  8,  60,  3, 29),
('CB183',  950000, 'CXR', 'SGN', '2026-09-24T13:15:00',  65,  8,  50,  2, 24),
('CB191', 1100000, 'SGN', 'DAD', '2026-10-03T09:00:00',  85,  8,  60,  5, 41),
('CB192', 1650000, 'HAN', 'SGN', '2026-10-17T18:30:00', 130, 12,  80,  9, 63),
('CB193', 1150000, 'PQC', 'SGN', '2026-10-28T15:45:00',  60,  8,  60,  4, 38),
-- tháng 11: nhiều chuyến bay trong các ngày 10 đến 30
('CB201', 1700000, 'SGN', 'HAN', '2026-11-03T06:30:00', 130, 12,  80, 10, 68),
('CB202', 1700000, 'HAN', 'SGN', '2026-11-07T20:00:00', 130, 12,  80,  9, 61),
('CB203', 1150000, 'SGN', 'DAD', '2026-11-10T07:30:00',  85,  8,  60,  6, 45),
('CB204', 1050000, 'DAD', 'HAN', '2026-11-11T10:15:00',  80,  8,  60,  5, 38),
('CB205', 1050000, 'HAN', 'DAD', '2026-11-12T06:00:00',  80,  8,  60,  6, 44),
('CB206', 1250000, 'SGN', 'PQC', '2026-11-12T21:30:00',  60,  8,  60,  7, 50),
('CB207',  990000, 'SGN', 'CXR', '2026-11-13T09:45:00',  65,  8,  50,  4, 33),
('CB208', 1750000, 'HAN', 'SGN', '2026-11-14T07:00:00', 130, 12,  80,  8, 57),
('CB209', 1750000, 'SGN', 'HAN', '2026-11-14T18:20:00', 130, 12,  80,  7, 52),
('CB210', 1150000, 'DAD', 'SGN', '2026-11-15T13:00:00',  85,  8,  60,  5, 36),
('CB211', 1300000, 'SGN', 'HUI', '2026-11-16T08:10:00',  85,  8,  60,  3, 31),
('CB212', 2150000, 'HAN', 'PQC', '2026-11-17T11:25:00', 130, 12,  80,  6, 45),
-- CB213: đã hết chỗ ở cả hai hạng
('CB213',  950000, 'SGN', 'DLI', '2026-11-18T16:40:00',  55,  4,  12,  4, 12),
-- CB214: đã hết Hạng 1, còn Hạng 2
('CB214', 1800000, 'SGN', 'HAN', '2026-11-20T06:30:00', 130,  8,  60,  8, 35),
('CB215', 1800000, 'HAN', 'SGN', '2026-11-20T19:10:00', 130, 12,  80,  5, 40),
-- CB216: gần hết chỗ, chỉ còn 1 ghế Hạng 2
('CB216', 1200000, 'DAD', 'SGN', '2026-11-22T09:20:00',  85,  4,  10,  4,  9),
('CB217', 1750000, 'SGN', 'HPH', '2026-11-23T14:05:00', 125, 12,  80,  4, 30),
('CB218', 1850000, 'HAN', 'CXR', '2026-11-24T08:35:00', 110, 12,  80,  3, 26),
-- CB219: gần hết chỗ ở cả hai hạng
('CB219', 1500000, 'SGN', 'VII', '2026-11-25T10:00:00', 110,  6,  30,  5, 28),
('CB220', 1300000, 'SGN', 'PQC', '2026-11-27T12:30:00',  60,  8,  60,  2, 18),
('CB245', 1850000, 'SGN', 'HAN', '2026-11-28T17:45:00', 130, 12,  80,  3, 22),
('CB222', 1100000, 'HAN', 'DAD', '2026-11-30T15:15:00',  80,  8,  60,  1, 12),
-- tháng 12: mới mở bán, ba chuyến cuối chưa có vé
('CB231', 1750000, 'SGN', 'HAN', '2026-12-02T06:30:00', 130, 12,  80,  2, 14),
('CB232', 1750000, 'HAN', 'SGN', '2026-12-05T20:00:00', 130, 12,  80,  1,  9),
('CB233', 1200000, 'SGN', 'DAD', '2026-12-10T07:30:00',  85,  8,  60,  0,  6),
('CB234', 1250000, 'DAD', 'VCA', '2026-12-14T13:40:00',  90,  8,  50,  0,  3),
('CB235', 1450000, 'SGN', 'PQC', '2026-12-19T09:00:00',  60,  8,  60,  1,  5),
('CB236', 2400000, 'HAN', 'PQC', '2026-12-24T10:30:00', 130, 12,  80,  0,  0),
('CB237', 2300000, 'SGN', 'HAN', '2026-12-28T16:00:00', 130, 16, 100,  0,  0),
-- CB238: chuyến bay chỉ có Hạng 2
('CB238', 2300000, 'HAN', 'SGN', '2026-12-31T21:15:00', 130,  0, 100,  0,  0);

-- dịch toàn bộ lịch theo ngày nạp (giữ nguyên giờ khởi hành)
UPDATE #Lich SET NgayGio = DATEADD(DAY, @Lech, NgayGio);

INSERT INTO CHUYENBAY (MaChuyenBay, GiaVe, MaSanBayDi, MaSanBayDen, NgayGioKhoiHanh, ThoiGianBay)
SELECT Ma, GiaVe, Di, Den, NgayGio, ThoiGianBay FROM #Lich;

-- hạng có 0 ghế thì không có dòng trong GHETHEOHANG
INSERT INTO GHETHEOHANG (MaChuyenBay, MaHangVe, SoLuongGhe)
SELECT Ma, 'H1', GheH1 FROM #Lich WHERE GheH1 > 0
UNION ALL
SELECT Ma, 'H2', GheH2 FROM #Lich WHERE GheH2 > 0;

-- Sân bay trung gian: tối đa 2, thời gian dừng 10 đến 20 phút (QĐ1)
INSERT INTO CHITIETTRUNGGIAN (MaChuyenBay, ThuTu, MaSanBay, ThoiGianDung, GhiChu) VALUES
('CB132', 1, 'DAD', 20, N'Đón khách'),
('CB162', 1, 'DAD', 15, N'Đón khách'),
('CB162', 2, 'SGN', 20, N'Tiếp nhiên liệu'),
('CB163', 1, 'DAD', 15, NULL),
('CB182', 1, 'DAD', 20, N'Đón khách'),
('CB182', 2, 'SGN', 15, NULL),
('CB212', 1, 'DAD', 15, N'Đón khách'),
('CB217', 1, 'HUI', 20, N'Đón khách'),
('CB218', 1, 'VII', 10, NULL),
('CB218', 2, 'DAD', 15, N'Tiếp nhiên liệu'),
('CB219', 1, 'DAD', 15, NULL),
('CB234', 1, 'SGN', 20, N'Đón khách'),
('CB236', 1, 'DAD', 15, N'Đón khách'),
('CB236', 2, 'CXR', 10, NULL);

-- Dãy số 1 đến 400 dùng để phát sinh hành khách, vé, phiếu
CREATE TABLE #So (n int PRIMARY KEY);
INSERT INTO #So (n)
SELECT TOP (400) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) FROM sys.all_objects a CROSS JOIN sys.all_objects b;

-- 400 hành khách trong nước (căn cước 12 chữ số) ghép từ 20 họ và 20 tên
CREATE TABLE #Ho (i int PRIMARY KEY, Ho nvarchar(10));
INSERT INTO #Ho VALUES
(1, N'Nguyễn'), (2, N'Trần'), (3, N'Lê'), (4, N'Phạm'), (5, N'Hoàng'), (6, N'Huỳnh'), (7, N'Phan'), (8, N'Vũ'),
(9, N'Võ'), (10, N'Đặng'), (11, N'Bùi'), (12, N'Đỗ'), (13, N'Hồ'), (14, N'Ngô'), (15, N'Dương'), (16, N'Lý'),
(17, N'Đinh'), (18, N'Trịnh'), (19, N'Mai'), (20, N'Cao');

CREATE TABLE #Ten (j int PRIMARY KEY, Ten nvarchar(20));
INSERT INTO #Ten VALUES
(1, N'Văn An'), (2, N'Thị Bình'), (3, N'Minh Châu'), (4, N'Quốc Dũng'), (5, N'Thu Hà'), (6, N'Gia Huy'),
(7, N'Ngọc Lan'), (8, N'Đức Minh'), (9, N'Thanh Nga'), (10, N'Hữu Phúc'), (11, N'Thị Quỳnh'), (12, N'Anh Tuấn'),
(13, N'Bảo Trâm'), (14, N'Công Vinh'), (15, N'Hải Yến'), (16, N'Nhật Nam'), (17, N'Kim Oanh'), (18, N'Trung Kiên'),
(19, N'Mỹ Linh'), (20, N'Tấn Tài');

INSERT INTO HANHKHACH (MaHanhKhach, HoTen, LoaiGiayTo, SoGiayTo, DienThoai)
SELECT 'HK' + RIGHT('00000000' + CAST(x.idx AS varchar(8)), 8),
       x.Ho + N' ' + x.Ten,
       N'Căn cước',
       -- mã tỉnh (3), giới tính và thế kỷ (1), năm sinh (2), số ngẫu nhiên (6)
       '0' + RIGHT('00' + CAST(1 + (x.idx * 7) % 96 AS varchar(2)), 2)
           + CAST(x.idx % 4 AS char(1))
           + RIGHT('0' + CAST((60 + x.idx * 3) % 100 AS varchar(2)), 2)
           + CAST(100000 + (x.idx * 7919) % 900000 AS varchar(6)),
       CASE x.idx % 5 WHEN 0 THEN '090' WHEN 1 THEN '091' WHEN 2 THEN '093' WHEN 3 THEN '097' ELSE '098' END
           + RIGHT('0000000' + CAST((x.idx * 104729) % 10000000 AS varchar(7)), 7)
FROM (SELECT (h.i - 1) * 20 + t.j AS idx, h.Ho, t.Ten FROM #Ho h CROSS JOIN #Ten t) x;

-- 6 hành khách nước ngoài dùng hộ chiếu, điện thoại có mã quốc gia (giả định 9, 10)
INSERT INTO HANHKHACH (MaHanhKhach, HoTen, LoaiGiayTo, SoGiayTo, DienThoai) VALUES
('HK00000401', N'Kim Min Jun',    N'Hộ chiếu', 'M12345678', '+821012345678'),
('HK00000402', N'John Smith',     N'Hộ chiếu', '512345678', '+12025550147'),
('HK00000403', N'Tanaka Hiroshi', N'Hộ chiếu', 'TK1234567', '+819012345678'),
('HK00000404', N'Sophie Martin',  N'Hộ chiếu', '19AB12345', '+33612345678'),
('HK00000405', N'Chen Wei',       N'Hộ chiếu', 'E12345678', '+8613812345678'),
('HK00000406', N'Emma Wilson',    N'Hộ chiếu', 'N1234567',  '+61412345678');

-- Thời điểm chạy script và mốc chia chuyến bay đã bán xong với chuyến bay đang mở bán (đầu ngày nạp).
-- @MoBanVe, @MoDatCho: ngày bắt đầu bán vé, đặt chỗ cho các chuyến đang mở bán (gốc 23/10 và 20/10/2026).
DECLARE @HienTai datetime2(0) = SYSDATETIME();
DECLARE @MocMoBan datetime2(0) = DATEADD(DAY, @Lech, CAST('2026-11-12T00:00:00' AS datetime2(0)));
DECLARE @MoBanVe date = DATEADD(DAY, @Lech, CAST('2026-10-23' AS date));
DECLARE @MoDatCho date = DATEADD(DAY, @Lech, CAST('2026-10-20' AS date));

-- Vé: mỗi chuyến bay có BanH1 vé Hạng 1 và BanH2 vé Hạng 2 ở tình trạng Đã bán,
-- thêm 1 hoặc 2 vé Hạng 2 Đã hủy ở một số chuyến bay (vé hủy không giữ chỗ, không tính doanh thu).
-- k là số thứ tự của vé trong chuyến bay, dùng để chọn hành khách không trùng nhau trong một chuyến.
CREATE TABLE #Ve (
    STT int, Ma varchar(10), k int, Hang varchar(5), GiaTien decimal(12,0), NgayGio datetime2(0),
    TinhTrang nvarchar(6), MaHanhKhach varchar(10), NgayBan datetime2(0), MaVe varchar(10), MaPhieuDat varchar(10) NULL
);

INSERT INTO #Ve (STT, Ma, k, Hang, GiaTien, NgayGio, TinhTrang)
SELECT l.STT, l.Ma, s.n, 'H1', ROUND(l.GiaVe * 105.00 / 100, 0), l.NgayGio, N'Đã bán'
FROM #Lich l JOIN #So s ON s.n <= l.BanH1
UNION ALL
SELECT l.STT, l.Ma, l.BanH1 + s.n, 'H2', l.GiaVe, l.NgayGio, N'Đã bán'
FROM #Lich l JOIN #So s ON s.n <= l.BanH2
UNION ALL
SELECT l.STT, l.Ma, 150 + s.n, 'H2', l.GiaVe, l.NgayGio, N'Đã hủy'
FROM #Lich l JOIN #So s ON s.n <= CASE l.STT % 3 WHEN 0 THEN 2 WHEN 1 THEN 1 ELSE 0 END
WHERE l.BanH2 > 0;

-- hành khách: mỗi vé trong một chuyến bay ứng với một hành khách khác nhau
UPDATE #Ve SET MaHanhKhach = 'HK' + RIGHT('00000000' + CAST((STT * 37 + k * 7) % 400 + 1 AS varchar(8)), 8);

-- ngày bán: trong giờ làm việc; chuyến đã bay thì bán trước ngày khởi hành 1 đến 20 ngày,
-- chuyến đang mở bán thì bán trong 20 ngày từ @MoBanVe (gốc 23/10 đến 11/11/2026, tức đến hôm trước ngày nạp)
UPDATE #Ve
SET NgayBan = DATEADD(MINUTE, 480 + (k * 37 + STT * 11) % 540,
        CAST(CASE WHEN NgayGio < @MocMoBan
                  THEN DATEADD(DAY, -(1 + (k * 5 + STT) % 20), CAST(NgayGio AS date))
                  ELSE DATEADD(DAY, (k * 5 + STT) % 20, @MoBanVe) END AS datetime2(0)));

-- Vé bán trong ngày chạy script, để danh sách vé bán trong ngày có số liệu (chỉ cho chuyến bay chưa khởi hành)
INSERT INTO #Ve (STT, Ma, k, Hang, GiaTien, NgayGio, TinhTrang, MaHanhKhach, NgayBan)
SELECT l.STT, l.Ma, v.k, v.Hang, ROUND(l.GiaVe * CASE v.Hang WHEN 'H1' THEN 105.00 ELSE 100.00 END / 100, 0),
       l.NgayGio, N'Đã bán', v.MaHanhKhach, DATEADD(MINUTE, -v.PhutTruoc, @HienTai)
FROM (VALUES
    ('CB208', 301, 'H2', 'HK00000019', 185),
    ('CB215', 302, 'H1', 'HK00000402', 160),
    ('CB220', 303, 'H2', 'HK00000133', 120),
    ('CB245', 304, 'H2', 'HK00000258', 95),
    ('CB245', 305, 'H1', 'HK00000404', 60),
    ('CB222', 306, 'H2', 'HK00000371', 35),
    ('CB231', 307, 'H2', 'HK00000089', 20),
    ('CB235', 308, 'H2', 'HK00000312', 8)
) v (Ma, k, Hang, MaHanhKhach, PhutTruoc)
JOIN #Lich l ON l.Ma = v.Ma
WHERE l.NgayGio > @HienTai;

-- mã vé cấp theo thứ tự thời gian bán
UPDATE v SET MaVe = 'VE' + RIGHT('00000000' + CAST(x.rn AS varchar(8)), 8)
FROM #Ve v
JOIN (SELECT STT, k, ROW_NUMBER() OVER (ORDER BY NgayBan, STT, k) AS rn FROM #Ve) x ON x.STT = v.STT AND x.k = v.k;

-- Phiếu đặt chỗ
CREATE TABLE #Phieu (
    id int IDENTITY(1,1) PRIMARY KEY, Ma varchar(10), MaHanhKhach varchar(10), Hang varchar(5), GiaTien decimal(12,0),
    ThoiDiemDat datetime2(0), TinhTrang nvarchar(14), MaVe varchar(10) NULL, MaPhieuDat varchar(10) NULL
);

-- (a) phiếu đã được thanh toán: đặt trước lúc bán vé 20 giờ, sau đó chuyển thành vé nên phiếu ở tình trạng Đã hủy (giả định 5)
INSERT INTO #Phieu (Ma, MaHanhKhach, Hang, GiaTien, ThoiDiemDat, TinhTrang, MaVe)
SELECT Ma, MaHanhKhach, Hang, GiaTien, DATEADD(HOUR, -20, NgayBan), N'Đã hủy', MaVe
FROM #Ve
WHERE TinhTrang = N'Đã bán' AND k % 17 = 3 AND k < 300;

-- (b) phiếu bị hủy do quá 24 giờ, đến mốc hủy hoặc hành khách yêu cầu hủy; không có vé kèm theo
INSERT INTO #Phieu (Ma, MaHanhKhach, Hang, GiaTien, ThoiDiemDat, TinhTrang)
SELECT l.Ma,
       'HK' + RIGHT('00000000' + CAST((l.STT * 37 + (200 + s.n) * 7) % 400 + 1 AS varchar(8)), 8),
       'H2', l.GiaVe,
       DATEADD(MINUTE, 540 + (l.STT * 17 + s.n * 53) % 480,
           CAST(CASE WHEN l.NgayGio < @MocMoBan
                     THEN DATEADD(DAY, -(3 + (l.STT + s.n) % 10), CAST(l.NgayGio AS date))
                     ELSE DATEADD(DAY, (l.STT * 3 + s.n) % 20, @MoDatCho) END AS datetime2(0))),
       N'Đã hủy'
FROM #Lich l JOIN #So s ON s.n <= CASE l.STT % 2 WHEN 0 THEN 2 ELSE 1 END;

-- (c) phiếu đang Chờ thanh toán, đặt cách lúc chạy script PhutTruoc phút.
-- Ba phiếu cuối đã quá 24 giờ: lần kiểm tra đầu tiên khi máy chủ khởi động sẽ tự hủy và ghi nhật ký (UC06).
-- Chỉ lập cho chuyến bay còn ít nhất 2 ngày nữa mới khởi hành để đúng thời hạn đặt vé (QĐ3).
INSERT INTO #Phieu (Ma, MaHanhKhach, Hang, GiaTien, ThoiDiemDat, TinhTrang)
SELECT l.Ma, p.MaHanhKhach, p.Hang, ROUND(l.GiaVe * CASE p.Hang WHEN 'H1' THEN 105.00 ELSE 100.00 END / 100, 0),
       DATEADD(MINUTE, -p.PhutTruoc, @HienTai), N'Chờ thanh toán'
FROM (VALUES
    ('CB222', 'HK00000044', 'H2',   30),
    ('CB214', 'HK00000401', 'H2',   60),
    ('CB245', 'HK00000190', 'H2',  120),
    ('CB219', 'HK00000403', 'H2',  180),
    ('CB214', 'HK00000275', 'H2',  300),
    ('CB233', 'HK00000405', 'H1',  360),
    ('CB220', 'HK00000061', 'H1',  480),
    ('CB245', 'HK00000406', 'H2',  720),
    ('CB231', 'HK00000338', 'H2',  960),
    ('CB235', 'HK00000122', 'H2', 1140),
    ('CB215', 'HK00000207', 'H1', 1350),
    ('CB217', 'HK00000395', 'H2', 1400),
    ('CB212', 'HK00000026', 'H1', 1500),
    ('CB232', 'HK00000153', 'H2', 1560),
    ('CB234', 'HK00000289', 'H2', 1860)
) p (Ma, MaHanhKhach, Hang, PhutTruoc)
JOIN #Lich l ON l.Ma = p.Ma
WHERE CAST(l.NgayGio AS date) >= DATEADD(DAY, 2, CAST(@HienTai AS date));

-- mã phiếu đặt cấp theo thứ tự thời điểm đặt
UPDATE p SET MaPhieuDat = 'PD' + RIGHT('00000000' + CAST(x.rn AS varchar(8)), 8)
FROM #Phieu p
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY ThoiDiemDat, id) AS rn FROM #Phieu) x ON x.id = p.id;

UPDATE v SET MaPhieuDat = p.MaPhieuDat FROM #Ve v JOIN #Phieu p ON p.MaVe = v.MaVe;

INSERT INTO PHIEUDATCHO (MaPhieuDat, MaChuyenBay, MaHanhKhach, MaHangVe, GiaTien, ThoiDiemDat, TinhTrang)
SELECT MaPhieuDat, Ma, MaHanhKhach, Hang, GiaTien, ThoiDiemDat, TinhTrang FROM #Phieu;

INSERT INTO VE (MaVe, MaChuyenBay, MaHanhKhach, MaHangVe, MaPhieuDat, GiaTien, NgayBan, TinhTrang)
SELECT MaVe, Ma, MaHanhKhach, Hang, MaPhieuDat, GiaTien, NgayBan, TinhTrang FROM #Ve;

-- Đặt lại bộ đếm để mã cấp tiếp theo nối sau dữ liệu mẫu
DECLARE @SoVe int = (SELECT COUNT(*) FROM VE) + 1;
DECLARE @SoPhieu int = (SELECT COUNT(*) FROM PHIEUDATCHO) + 1;
DECLARE @Lenh nvarchar(400) =
    N'ALTER SEQUENCE SEQ_HANHKHACH RESTART WITH 407; '
    + N'ALTER SEQUENCE SEQ_VE RESTART WITH ' + CAST(@SoVe AS nvarchar(10)) + N'; '
    + N'ALTER SEQUENCE SEQ_PHIEUDATCHO RESTART WITH ' + CAST(@SoPhieu AS nvarchar(10)) + N';';
EXEC (@Lenh);

DROP TABLE #Lich, #So, #Ho, #Ten, #Ve, #Phieu;

-- Tóm tắt dữ liệu vừa nạp
SELECT (SELECT COUNT(*) FROM SANBAY) AS SoSanBay,
       (SELECT COUNT(*) FROM CHUYENBAY) AS SoChuyenBay,
       (SELECT COUNT(*) FROM HANHKHACH) AS SoHanhKhach,
       (SELECT COUNT(*) FROM VE WHERE TinhTrang = N'Đã bán') AS VeDaBan,
       (SELECT COUNT(*) FROM VE WHERE TinhTrang = N'Đã hủy') AS VeDaHuy,
       (SELECT COUNT(*) FROM PHIEUDATCHO WHERE TinhTrang = N'Chờ thanh toán') AS PhieuChoThanhToan,
       (SELECT COUNT(*) FROM PHIEUDATCHO WHERE TinhTrang = N'Đã hủy') AS PhieuDaHuy;
GO
