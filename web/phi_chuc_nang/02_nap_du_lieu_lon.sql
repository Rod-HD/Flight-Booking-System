IF DB_NAME() COLLATE Latin1_General_BIN2 <> N'QLBANVE_HQ' THROW 50000, 'Sai ten CSDL', 1;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @HeSo decimal(18,10) = $(HeSo);
IF @HeSo < 0.01 OR @HeSo > 1 THROW 50000, 'HeSo ngoai khoang 0.01..1', 1;
DECLARE @CB int = ROUND(20000*@HeSo, 0), @TG int = ROUND(10000*@HeSo, 0),
        @HK int = ROUND(600000*@HeSo, 0), @Ve int = ROUND(2000000*@HeSo, 0),
        @PD int = ROUND(2000000*@HeSo, 0), @QuaHan int = ROUND(1000*@HeSo, 0),
        @DaBan int = ROUND(1720000*@HeSo, 0), @TuPhieu int = ROUND(600000*@HeSo, 0),
        @Cho int = ROUND(37970*@HeSo, 0);
DECLARE @Nay datetime2(0) = DATEADD(hour,7,SYSUTCDATETIME());
DECLARE @Nam int = YEAR(@Nay);
DECLARE @Dau date = DATEFROMPARTS(@Nam-1,1,1), @Cuoi date = DATEFROMPARTS(@Nam+1,12,20);

BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM CHUYENBAY) OR EXISTS (SELECT 1 FROM HANHKHACH)
    THROW 50000, 'Can CSDL HQ moi', 1;

WITH D(n) AS (SELECT n FROM (VALUES(0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) a(n)),
     N(n) AS (
         SELECT 1+a.n+10*b.n+100*c.n+1000*d.n+10000*e.n+100000*f.n+1000000*g.n
         FROM D a CROSS JOIN D b CROSS JOIN D c CROSS JOIN D d CROSS JOIN D e CROSS JOIN D f
         CROSS JOIN (VALUES(0),(1),(2)) g(n)
     )
SELECT n INTO #So FROM N WHERE n <= @Ve;
CREATE UNIQUE CLUSTERED INDEX IX_So ON #So(n);

SELECT n, CAST(CASE WHEN n=@CB THEN 'HQBAN100'
                    WHEN n<=10 THEN CONCAT('HQ1234', n)
                    ELSE 'HQ'+RIGHT('00000000'+CONVERT(varchar(8),n),8) END AS varchar(10)) AS Ma
INTO #Bay FROM #So WHERE n<=@CB;
CREATE UNIQUE CLUSTERED INDEX IX_Bay ON #Bay(n);

INSERT INTO CHUYENBAY
SELECT b.Ma, 1000000+(b.n%37)*10000,
       CASE WHEN b.n%89=0 OR b.n=@CB/2 OR b.n=@CB THEN 'SGN' ELSE 'HAN' END,
       CASE WHEN b.n%89=0 OR b.n=@CB/2 OR b.n=@CB THEN 'HAN' ELSE 'SGN' END,
       CASE WHEN b.n=@CB THEN DATEADD(day,30,@Nay)
            WHEN b.n<=10 THEN DATEADD(day,4+b.n,@Nay)
            ELSE DATEADD(minute,480+b.n%720,
                 CONVERT(datetime2(0),DATEADD(day,(b.n-11)*DATEDIFF(day,@Dau,@Cuoi)/(@CB-12),@Dau))) END,
       130
FROM #Bay b;

INSERT INTO GHETHEOHANG
SELECT Ma, h.MaHangVe, h.SoGhe FROM #Bay CROSS JOIN (VALUES('H1',20),('H2',180)) h(MaHangVe,SoGhe);

DECLARE @HaiTG int = ROUND(2000*@HeSo,0);
INSERT INTO CHITIETSANBAYTRUNGGIAN
SELECT Ma, 1, 'DAD', 15, N'Đón khách' FROM #Bay WHERE n <= @TG-@HaiTG
UNION ALL
SELECT Ma, 2, 'CXR', 15, N'Dừng kỹ thuật' FROM #Bay WHERE n <= @HaiTG;

INSERT INTO HANHKHACH
SELECT 'HK'+RIGHT('00000000'+CONVERT(varchar(8),n),8), CONCAT(N'Hành khách ',n),
       CASE WHEN n%10=0 THEN N'Hộ chiếu' ELSE N'Căn cước' END,
       CASE WHEN n%10=0 THEN 'HQ'+RIGHT('00000000'+CONVERT(varchar(8),n),8)
            ELSE RIGHT('000000000000'+CONVERT(varchar(12),n),12) END, '0912345678'
FROM #So WHERE n<=@HK;

-- Vé và phiếu cũ phân đều theo vòng. Chuyến HQBAN100 có 100 vé và 100 phiếu
-- ở quy mô chuẩn; phiếu của chuyến thử đã hủy nên hạng 2 còn ghế.
;WITH TuongLai AS (
    SELECT ROW_NUMBER() OVER (ORDER BY b.n) AS ThuTu, b.n
    FROM #Bay b JOIN CHUYENBAY c ON c.MaChuyenBay=b.Ma
    WHERE b.n<>@CB AND c.NgayGioKhoiHanh>DATEADD(day,2,@Nay)
)
SELECT ThuTu,n INTO #TuongLai FROM TuongLai;
CREATE UNIQUE CLUSTERED INDEX IX_TuongLai ON #TuongLai(ThuTu);
DECLARE @SoTuongLai int = (SELECT COUNT(*) FROM #TuongLai);
IF @SoTuongLai=0 OR CEILING(1.0*@Cho/@SoTuongLai)>80
    THROW 50000, 'Khong du chuyen bay tuong lai', 1;

SELECT TOP (@Cho-@QuaHan) n, ROW_NUMBER() OVER (ORDER BY n)+@QuaHan AS Stt
INTO #Cho
FROM #So WHERE n>@TuPhieu+@QuaHan AND n<=@PD AND n%@CB<>0
ORDER BY n;
INSERT INTO #Cho (n,Stt)
SELECT n,n-@TuPhieu FROM #So WHERE n BETWEEN @TuPhieu+1 AND @TuPhieu+@QuaHan;
CREATE UNIQUE CLUSTERED INDEX IX_Cho ON #Cho(n);

-- Phiếu 1..@TuPhieu ghép với vé cùng số. 1.000 phiếu HQ04 kế tiếp ở quy mô 1.
INSERT INTO PHIEUDATCHO (MaPhieuDat,MaChuyenBay,MaHanhKhach,MaHangVe,GiaTien,ThoiDiemDat,TinhTrang)
SELECT 'PD'+RIGHT('00000000'+CONVERT(varchar(8),s.n),8), b.Ma,
       'HK'+RIGHT('00000000'+CONVERT(varchar(8),(s.n-1)%@HK+1),8),
       h.MaHangVe, ROUND(c.GiaVe*h.TiLeDonGia/100,0),
       CASE WHEN s.n>@TuPhieu AND s.n<=@TuPhieu+@QuaHan THEN DATEADD(hour,-25,@Nay)
            WHEN d.n IS NOT NULL THEN @Nay
            WHEN c.NgayGioKhoiHanh<@Nay THEN DATEADD(day,-3,c.NgayGioKhoiHanh)
            ELSE DATEADD(day,-3,@Nay) END,
       CASE WHEN d.n IS NOT NULL THEN N'Chờ thanh toán' ELSE N'Đã hủy' END
FROM #So s
LEFT JOIN #Cho d ON d.n=s.n
LEFT JOIN #TuongLai t ON t.ThuTu=(d.Stt-1)%@SoTuongLai+1
JOIN #Bay b ON b.n=COALESCE(t.n,(s.n-1)%@CB+1)
JOIN CHUYENBAY c ON c.MaChuyenBay=b.Ma
JOIN HANGVE h ON h.MaHangVe=CASE WHEN d.n IS NULL
                                   AND ((s.n-1)/@CB)%10=0 THEN 'H1' ELSE 'H2' END
WHERE s.n<=@PD;

INSERT INTO VE (MaVe,MaChuyenBay,MaHanhKhach,MaHangVe,MaPhieuDat,GiaTien,NgayBan,TinhTrang)
SELECT 'VE'+RIGHT('00000000'+CONVERT(varchar(8),s.n),8), b.Ma,
       'HK'+RIGHT('00000000'+CONVERT(varchar(8),(s.n-1)%@HK+1),8),
       h.MaHangVe, CASE WHEN s.n<=@TuPhieu THEN 'PD'+RIGHT('00000000'+CONVERT(varchar(8),s.n),8) END,
       ROUND(c.GiaVe*h.TiLeDonGia/100,0),
       CASE WHEN c.NgayGioKhoiHanh<@Nay THEN DATEADD(day,-1,c.NgayGioKhoiHanh) ELSE DATEADD(day,-1,@Nay) END,
       CASE WHEN s.n-(s.n-1)/@CB<=@DaBan-@Ve/@CB OR b.n=@CB THEN N'Đã bán' ELSE N'Đã hủy' END
FROM #So s
JOIN #Bay b ON b.n=(s.n-1)%@CB+1
JOIN CHUYENBAY c ON c.MaChuyenBay=b.Ma
JOIN HANGVE h ON h.MaHangVe=CASE WHEN ((s.n-1)/@CB)%10=0 THEN 'H1' ELSE 'H2' END
WHERE s.n<=@Ve;

DECLARE @Lenh nvarchar(500) = CONCAT(
    N'ALTER SEQUENCE SEQ_HANHKHACH RESTART WITH ', @HK+1,
    N'; ALTER SEQUENCE SEQ_VE RESTART WITH ', @Ve+1,
    N'; ALTER SEQUENCE SEQ_PHIEUDATCHO RESTART WITH ', @PD+1, N';');
EXEC sys.sp_executesql @Lenh;

DECLARE @RangBuoc table ([Table] nvarchar(517), [Constraint] nvarchar(517), [Where] nvarchar(max));
INSERT INTO @RangBuoc EXEC(N'DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS, NO_INFOMSGS');
SELECT * FROM @RangBuoc;
DECLARE @Sai table (KiemTra varchar(40), SoDongSai int);
INSERT INTO @Sai
SELECT 'CHECK va FK', COUNT(*) FROM @RangBuoc
UNION ALL SELECT 'Vuot so ghe', COUNT(*) FROM GHETHEOHANG g
LEFT JOIN (SELECT MaChuyenBay,MaHangVe,COUNT(*) AS So FROM VE WHERE TinhTrang=N'Đã bán' GROUP BY MaChuyenBay,MaHangVe) v
    ON v.MaChuyenBay=g.MaChuyenBay AND v.MaHangVe=g.MaHangVe
LEFT JOIN (SELECT MaChuyenBay,MaHangVe,COUNT(*) AS So FROM PHIEUDATCHO WHERE TinhTrang=N'Chờ thanh toán' GROUP BY MaChuyenBay,MaHangVe) p
    ON p.MaChuyenBay=g.MaChuyenBay AND p.MaHangVe=g.MaHangVe
WHERE COALESCE(v.So,0)+COALESCE(p.So,0)>g.SoLuongGhe
UNION ALL SELECT 'Sai gia ve/phieu', COUNT(*)
FROM (SELECT MaChuyenBay,MaHangVe,GiaTien FROM VE UNION ALL SELECT MaChuyenBay,MaHangVe,GiaTien FROM PHIEUDATCHO) x
JOIN CHUYENBAY c ON c.MaChuyenBay=x.MaChuyenBay JOIN HANGVE h ON h.MaHangVe=x.MaHangVe
WHERE x.GiaTien<>ROUND(c.GiaVe*h.TiLeDonGia/100,0)
UNION ALL SELECT 'Ve lech phieu', COUNT(*) FROM VE v JOIN PHIEUDATCHO p ON p.MaPhieuDat=v.MaPhieuDat
WHERE v.MaChuyenBay<>p.MaChuyenBay OR v.MaHangVe<>p.MaHangVe OR v.MaHanhKhach<>p.MaHanhKhach OR p.TinhTrang<>N'Đã hủy'
UNION ALL SELECT 'So phieu qua han', ABS(@QuaHan-COUNT(*)) FROM PHIEUDATCHO
WHERE TinhTrang=N'Chờ thanh toán' AND ThoiDiemDat<=DATEADD(hour,-24,@Nay)
UNION ALL SELECT 'So phieu cho', ABS(@Cho-COUNT(*)) FROM PHIEUDATCHO WHERE TinhTrang=N'Chờ thanh toán'
UNION ALL SELECT 'So ve da ban', ABS(@DaBan-COUNT(*)) FROM VE WHERE TinhTrang=N'Đã bán';

SELECT KiemTra,SoDongSai FROM @Sai;
IF EXISTS (SELECT 1 FROM @Sai WHERE SoDongSai<>0) THROW 50000, 'Du lieu doi chieu khong khop', 1;

SELECT (SELECT COUNT(*) FROM CHUYENBAY) AS ChuyenBay,
       (SELECT COUNT(*) FROM CHITIETSANBAYTRUNGGIAN) AS TrungGian,
       (SELECT COUNT(*) FROM GHETHEOHANG) AS GheTheoHang,
       (SELECT COUNT(*) FROM HANHKHACH) AS HanhKhach,
       (SELECT COUNT(*) FROM VE) AS Ve,
       (SELECT COUNT(*) FROM PHIEUDATCHO) AS Phieu;
COMMIT;
