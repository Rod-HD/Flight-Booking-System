// Danh sách chuyến bay (MH_DanhSachChuyenBay, BM4): tra cứu, bán vé, đặt vé, thêm sửa xóa và nhập xuất Excel
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileDown, FileUp, Hash, Pencil, PlaneLanding, PlaneTakeoff, Plus, Search, Trash2, X } from 'lucide-react';
import { apiChuyenBay, apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { laLoiApi, luuTapTin, thongBaoLoi } from '@/api/may_khach';
import { CHI_QUAN_LY } from '@/dinh_tuyen';
import { IconMayBay } from '@/icons3d';
import type { ChuyenBayTomTat, TieuChiTimChuyenBay } from '@/kieu/api';
import { dungPhien } from '@/phien/NguCanhPhien';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { ChiKhiCoQuyen } from '@/thanh_phan/BaoVeDuongDan';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { KhungTrang, TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { NhanGheTrong } from '@/thanh_phan/NhanTrangThai';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { OChon, type LuaChon } from '@/thanh_phan/OChon';
import { ONgay } from '@/thanh_phan/ONgay';
import { ONhap } from '@/thanh_phan/ONhap';
import { LOP_O_PHANG, ThanhTimKiem } from '@/thanh_phan/ThanhTimKiem';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangSo } from '@/tien_ich/dinh_dang';
import { dungBayGio } from '@/tien_ich/hook';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { conLai, dinhDangGio, dinhDangNgay, dinhDangThoiLuong, docIso, sangNgayIso } from '@/tien_ich/thoi_gian';
import { HopThoaiNhapExcel } from './HopThoaiNhapExcel';
import s from './ChuyenBay.module.css';

const SO_DONG_MOI_TRANG = 10;

/** Đọc tiêu chí từ URL. Chưa có tuNgay thì mặc định từ hôm nay (mở màn hình hiện chuyến từ hôm nay trở đi). */
function docTieuChi(p: URLSearchParams): TieuChiTimChuyenBay {
  const lay = (k: string) => p.get(k)?.trim() || undefined;
  return {
    sanBayDi: lay('sanBayDi'),
    sanBayDen: lay('sanBayDen'),
    tuNgay: p.has('tuNgay') ? lay('tuNgay') : sangNgayIso(new Date()),
    denNgay: lay('denNgay'),
    maChuyenBay: lay('maChuyenBay')?.toUpperCase(),
  };
}

export function TrangDanhSachChuyenBay() {
  const dieuHuong = useNavigate();
  const boTruyVan = useQueryClient();
  const { laQuanLy } = dungPhien();
  const bayGio = dungBayGio(30000);
  const [thamSoUrl, datThamSoUrl] = useSearchParams();
  const tieuChi = useMemo(() => docTieuChi(thamSoUrl), [thamSoUrl]);

  // ô nhập trên thanh tìm (chỉ áp dụng khi bấm Tìm)
  const [di, datDi] = useState<string | null>(tieuChi.sanBayDi ?? null);
  const [den, datDen] = useState<string | null>(tieuChi.sanBayDen ?? null);
  const [tuNgay, datTuNgay] = useState(tieuChi.tuNgay ?? '');
  const [denNgay, datDenNgay] = useState(tieuChi.denNgay ?? '');
  const [ma, datMa] = useState(tieuChi.maChuyenBay ?? '');
  const [loiTim, datLoiTim] = useState<{ den?: string; denNgay?: string }>({});
  const [chon, datChon] = useState<string | null>(null);
  const [dangXuat, datDangXuat] = useState(false);
  const oTimDau = useRef<HTMLDivElement>(null);

  // URL đổi từ nơi khác (trang chính gửi sang) thì đồng bộ lại ô nhập
  useEffect(() => {
    datDi(tieuChi.sanBayDi ?? null);
    datDen(tieuChi.sanBayDen ?? null);
    datTuNgay(tieuChi.tuNgay ?? '');
    datDenNgay(tieuChi.denNgay ?? '');
    datMa(tieuChi.maChuyenBay ?? '');
  }, [tieuChi]);

  const moNhapExcel = laQuanLy && thamSoUrl.get('nhapExcel') === '1';
  const [hienNhap, datHienNhap] = useState(moNhapExcel);
  useEffect(() => {
    if (moNhapExcel) datHienNhap(true);
  }, [moNhapExcel]);

  const dongNhapExcel = () => {
    datHienNhap(false);
    if (thamSoUrl.has('nhapExcel')) {
      const p = new URLSearchParams(thamSoUrl);
      p.delete('nhapExcel');
      datThamSoUrl(p, { replace: true });
    }
  };

  const { data: quyDinh, isPending: dangTaiSanBay } = useQuery({ queryKey: khoaTruyVan.quyDinh, queryFn: apiQuyDinh.lay, staleTime: 300000 });
  const sanBay: LuaChon[] = useMemo(() => (quyDinh?.sanBay ?? []).map((sb) => ({ giaTri: sb.maSanBay, ma: sb.maSanBay, nhan: sb.tenSanBay })), [quyDinh]);
  const tenSanBay = (m?: string) => quyDinh?.sanBay.find((x) => x.maSanBay === m)?.tenSanBay ?? m;

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: khoaTruyVan.chuyenBay(tieuChi),
    queryFn: () => apiChuyenBay.traCuu(tieuChi),
  });

  const xoa = useMutation({
    mutationFn: (maCB: string) => apiChuyenBay.xoa(maCB),
    onSuccess: (_, maCB) => {
      hienToast.thanhCong(`Xóa chuyến bay ${maCB} thành công.`);
      if (chon === maCB) datChon(null);
      boTruyVan.invalidateQueries({ queryKey: ['chuyen-bay'] });
    },
    onError: (loi) => {
      if (laLoiApi(loi) && loi.ma === 'DA_CO_VE_HOAC_PHIEU') baoLoi('Không thể xóa chuyến bay', loi.thongBao);
      else baoLoi('Xóa chuyến bay không thành công', thongBaoLoi(loi));
    },
  });

  const tim = () => {
    const loi: typeof loiTim = {};
    if (di && den && di === den) loi.den = 'Sân bay đến phải khác sân bay đi.';
    if (tuNgay && denNgay && denNgay < tuNgay) loi.denNgay = 'Đến ngày phải sau hoặc bằng Từ ngày.';
    datLoiTim(loi);
    if (Object.keys(loi).length) return;
    const p = new URLSearchParams();
    if (di) p.set('sanBayDi', di);
    if (den) p.set('sanBayDen', den);
    // luôn ghi tuNgay (kể cả rỗng) để phân biệt với lần mở trang đầu tiên
    p.set('tuNgay', tuNgay);
    if (denNgay) p.set('denNgay', denNgay);
    if (ma.trim()) p.set('maChuyenBay', ma.trim().toUpperCase());
    datChon(null);
    datThamSoUrl(p);
    // bấm Tìm lại với cùng tiêu chí thì vẫn tải lại số ghế mới nhất
    boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.chuyenBay(docTieuChi(p)) });
  };

  const xoaBoLoc = () => {
    datLoiTim({});
    datChon(null);
    datThamSoUrl(new URLSearchParams({ tuNgay: '' }));
  };

  const xacNhanXoa = async (cb: ChuyenBayTomTat) => {
    datChon(cb.maChuyenBay);
    const dongY = await hoiXacNhan({
      tieuDe: `Xóa chuyến bay ${cb.maChuyenBay}?`,
      noiDung: (
        <>
          Chuyến bay <b>{cb.maSanBayDi}</b> đến <b>{cb.maSanBayDen}</b> lúc{' '}
          <b>
            {dinhDangGio(cb.ngayGioKhoiHanh)} {dinhDangNgay(cb.ngayGioKhoiHanh)}
          </b>{' '}
          sẽ bị xóa cùng số ghế theo hạng và các sân bay trung gian. Chỉ xóa được chuyến bay chưa có vé hoặc phiếu đặt chỗ.
        </>
      ),
      nutDongY: 'Xóa',
    });
    if (dongY) xoa.mutate(cb.maChuyenBay);
  };

  const xuatExcel = async () => {
    datDangXuat(true);
    try {
      luuTapTin(await apiChuyenBay.xuatExcel(tieuChi));
      hienToast.thanhCong(`Đã xuất ${data?.length ?? 0} chuyến bay ra tập tin Excel.`);
    } catch (loi) {
      baoLoi('Xuất Excel không thành công', thongBaoLoi(loi));
    } finally {
      datDangXuat(false);
    }
  };

  dungPhimTat({
    'ctrl+f': () => oTimDau.current?.querySelector<HTMLInputElement>('input')?.focus(),
    'ctrl+n': () => (laQuanLy ? dieuHuong('/chuyen-bay/them') : hienToast.canhBao('Chỉ Quản lý được thêm chuyến bay.')),
  });

  // các tiêu chí đang áp dụng, hiện thành chip dưới tiêu đề kết quả
  const chip: string[] = [];
  if (tieuChi.sanBayDi) chip.push(`Từ ${tieuChi.sanBayDi} · ${tenSanBay(tieuChi.sanBayDi)}`);
  if (tieuChi.sanBayDen) chip.push(`Đến ${tieuChi.sanBayDen} · ${tenSanBay(tieuChi.sanBayDen)}`);
  if (tieuChi.tuNgay && tieuChi.denNgay) chip.push(`${dinhDangNgay(tieuChi.tuNgay)} đến ${dinhDangNgay(tieuChi.denNgay)}`);
  else if (tieuChi.tuNgay) chip.push(`Từ ngày ${dinhDangNgay(tieuChi.tuNgay)}`);
  else if (tieuChi.denNgay) chip.push(`Đến ngày ${dinhDangNgay(tieuChi.denNgay)}`);
  if (tieuChi.maChuyenBay) chip.push(`Mã có ${tieuChi.maChuyenBay}`);
  const laMacDinh = thamSoUrl.toString() === '' || thamSoUrl.toString() === 'nhapExcel=1';

  return (
    <KhungTrang
      tieuDe="Danh sách chuyến bay"
      icon={<IconMayBay kichThuoc={56} />}
      moTa="Tra cứu lịch chuyến bay theo biểu mẫu BM4"
      duongDan={[{ nhan: 'Chuyến bay' }]}
      nut={
        <>
          <ChiKhiCoQuyen quyen={CHI_QUAN_LY}>
            <Nut iconTrai={<Plus size={18} strokeWidth={2.6} />} den="/chuyen-bay/them" title="Thêm chuyến bay (Ctrl+N)">
              Thêm chuyến bay
            </Nut>
            <Nut bienThe="phu" iconTrai={<FileUp size={18} />} onClick={() => datHienNhap(true)}>
              Nhập Excel
            </Nut>
          </ChiKhiCoQuyen>
          <Nut bienThe="phu" iconTrai={<FileDown size={18} />} onClick={xuatExcel} dangXuLy={dangXuat} disabled={!data?.length}>
            Xuất Excel
          </Nut>
          <Nut bienThe="lang" muiTen={false} iconTrai={<X size={18} />} den="/">
            Đóng
          </Nut>
        </>
      }
    >
      <div className={s.thanhTim} ref={oTimDau}>
        <ThanhTimKiem
          onSubmit={tim}
          chuThich={
            <>
              Mở trang sẽ hiện các chuyến bay khởi hành từ hôm nay. Bỏ trống ô ngày để xem mọi chuyến bay. Nhấn <b>Ctrl+F</b> để tới ô tìm.
            </>
          }
        >
          <ThanhTimKiem.O>
            <OChon
              className={LOP_O_PHANG}
              nhan="Sân bay đi"
              giaTri={di}
              onDoi={(g) => {
                datDi(g);
                datLoiTim({ ...loiTim, den: undefined });
              }}
              luaChon={sanBay}
              dangTai={dangTaiSanBay}
              placeholder="Tất cả sân bay"
              iconTrai={<PlaneTakeoff size={18} />}
            />
          </ThanhTimKiem.O>
          <ThanhTimKiem.O>
            <OChon
              className={LOP_O_PHANG}
              nhan="Sân bay đến"
              giaTri={den}
              onDoi={(g) => {
                datDen(g);
                datLoiTim({ ...loiTim, den: undefined });
              }}
              luaChon={sanBay}
              dangTai={dangTaiSanBay}
              placeholder="Tất cả sân bay"
              iconTrai={<PlaneLanding size={18} />}
              loi={loiTim.den}
            />
          </ThanhTimKiem.O>
          <ThanhTimKiem.O rong={196}>
            <ONgay className={LOP_O_PHANG} nhan="Từ ngày" value={tuNgay} onChange={(e) => datTuNgay(e.target.value)} />
          </ThanhTimKiem.O>
          <ThanhTimKiem.O rong={196}>
            <ONgay
              className={LOP_O_PHANG}
              nhan="Đến ngày"
              value={denNgay}
              min={tuNgay || undefined}
              loi={loiTim.denNgay}
              onChange={(e) => {
                datDenNgay(e.target.value);
                datLoiTim({ ...loiTim, denNgay: undefined });
              }}
            />
          </ThanhTimKiem.O>
          <ThanhTimKiem.O rong={176}>
            <ONhap
              className={`${LOP_O_PHANG} ${s.oMa}`}
              nhan="Mã chuyến bay"
              placeholder="Ví dụ CB101"
              maxLength={10}
              iconTrai={<Hash size={17} />}
              value={ma}
              onChange={(e) => datMa(e.target.value.replace(/\s/g, ''))}
            />
          </ThanhTimKiem.O>
          <ThanhTimKiem.Nut>
            <Nut type="submit" kichThuoc="lon" iconTrai={<Search size={19} strokeWidth={2.6} />} dangXuLy={isFetching && !isPending}>
              Tìm
            </Nut>
          </ThanhTimKiem.Nut>
        </ThanhTimKiem>
      </div>

      <section className={s.ketQua} aria-labelledby="tieu-de-ket-qua">
        <TieuDeMuc
          id="tieu-de-ket-qua"
          tieuDe="Kết quả tra cứu"
          phu={isPending ? 'Đang tìm chuyến bay...' : `Tìm thấy ${dinhDangSo(data?.length ?? 0)} chuyến bay thỏa tiêu chí.`}
          phai={
            <span className={s.chipLoc}>
              {chip.map((c) => (
                <span key={c} className={s.chip}>
                  {c}
                </span>
              ))}
              {!laMacDinh && (
                <Nut bienThe="chu" muiTen={false} iconTrai={<X size={16} />} onClick={xoaBoLoc}>
                  Xóa bộ lọc
                </Nut>
              )}
            </span>
          }
        />
        <BangDuLieu<ChuyenBayTomTat>
          nhan="Danh sách chuyến bay"
          duLieu={data}
          dangTai={isPending}
          loi={error}
          khoaDong={(d) => d.maChuyenBay}
          dongDangChon={chon}
          onChonDong={(d) => datChon(d.maChuyenBay)}
          onMoDong={(d) => dieuHuong(`/chuyen-bay/${d.maChuyenBay}`)}
          kichThuocTrang={SO_DONG_MOI_TRANG}
          donVi="chuyến bay"
          soDongXuong={6}
          rong={{
            tieuDe: 'Không tìm thấy chuyến bay',
            goiY: laMacDinh
              ? 'Chưa có chuyến bay nào khởi hành từ hôm nay. Quản lý có thể thêm chuyến bay mới hoặc nhập lịch từ tập tin Excel.'
              : 'Không có chuyến bay nào thỏa tiêu chí đã chọn. Hãy nới khoảng ngày hoặc bỏ bớt tiêu chí rồi tìm lại.',
            linhVat: 'tra_cuu',
            hanhDong: laMacDinh ? (
              laQuanLy && (
                <Nut den="/chuyen-bay/them" iconTrai={<Plus size={18} />}>
                  Thêm chuyến bay
                </Nut>
              )
            ) : (
              <Nut bienThe="phu" muiTen={false} onClick={xoaBoLoc}>
                Xóa bộ lọc
              </Nut>
            ),
          }}
          cot={[
            { khoa: 'stt', tieuDe: 'STT', rong: 56, hien: (_, i) => <span className={s.stt}>{String(i + 1).padStart(2, '0')}</span> },
            { khoa: 'ma', tieuDe: 'Mã chuyến bay', hien: (d) => <span className={s.ma}>{d.maChuyenBay}</span> },
            {
              khoa: 'di',
              tieuDe: 'Sân bay đi',
              hien: (d) => (
                <span className={s.sanBay}>
                  <b>{d.maSanBayDi}</b>
                  <span>{d.tenSanBayDi}</span>
                </span>
              ),
            },
            {
              khoa: 'den',
              tieuDe: 'Sân bay đến',
              hien: (d) => (
                <span className={s.sanBay}>
                  <b>{d.maSanBayDen}</b>
                  <span>{d.tenSanBayDen}</span>
                </span>
              ),
            },
            {
              khoa: 'kh',
              tieuDe: 'Khởi hành',
              hien: (d) => {
                const cl = conLai(d.ngayGioKhoiHanh, bayGio);
                return (
                  <span className={s.hai}>
                    <b>
                      {dinhDangGio(d.ngayGioKhoiHanh)} · {dinhDangNgay(d.ngayGioKhoiHanh)}
                    </b>
                    <small className={cl.phut < 0 ? s.daBay : cl.phut < 180 ? s.sapGap : undefined}>{cl.phut < 0 ? 'đã khởi hành' : cl.chu}</small>
                  </span>
                );
              },
            },
            { khoa: 'tg', tieuDe: 'Thời gian bay', hien: (d) => dinhDangThoiLuong(d.thoiGianBay) },
            { khoa: 'trong', tieuDe: 'Số ghế trống', canh: 'giua', hien: (d) => <NhanGheTrong soGhe={d.soGheTrong} /> },
            { khoa: 'dat', tieuDe: 'Số ghế đặt', so: true, hien: (d) => dinhDangSo(d.soGheDat) },
            {
              khoa: 'tt',
              tieuDe: 'Thao tác',
              canh: 'phai',
              hien: (d) => {
                const daBay = docIso(d.ngayGioKhoiHanh) <= bayGio;
                const khongBan = daBay || d.soGheTrong <= 0;
                const lyDo = daBay ? 'Chuyến bay đã khởi hành' : d.soGheTrong <= 0 ? 'Chuyến bay đã hết chỗ' : undefined;
                return (
                  <span className={s.hanhDong} onDoubleClick={(e) => e.stopPropagation()}>
                    <Nut
                      kichThuoc="nho"
                      muiTen={false}
                      den={`/ban-ve?maChuyenBay=${d.maChuyenBay}`}
                      disabled={khongBan}
                      title={lyDo ?? `Bán vé chuyến ${d.maChuyenBay}`}
                    >
                      Bán vé
                    </Nut>
                    <Nut
                      kichThuoc="nho"
                      bienThe="phu"
                      den={`/dat-ve?maChuyenBay=${d.maChuyenBay}`}
                      disabled={khongBan}
                      title={lyDo ?? `Đặt vé chuyến ${d.maChuyenBay}`}
                    >
                      Đặt vé
                    </Nut>
                    <NutTron
                      nhan={`Xem chuyến bay ${d.maChuyenBay}`}
                      bienThe="trong"
                      kichThuoc="nho"
                      className={s.nutIcon}
                      onClick={() => dieuHuong(`/chuyen-bay/${d.maChuyenBay}`)}
                    >
                      <Eye size={17} />
                    </NutTron>
                    <ChiKhiCoQuyen quyen={CHI_QUAN_LY}>
                      <NutTron
                        nhan={`Sửa chuyến bay ${d.maChuyenBay}`}
                        bienThe="trong"
                        kichThuoc="nho"
                        className={s.nutIcon}
                        onClick={() => dieuHuong(`/chuyen-bay/${d.maChuyenBay}/sua`)}
                      >
                        <Pencil size={16} />
                      </NutTron>
                      <NutTron
                        nhan={`Xóa chuyến bay ${d.maChuyenBay}`}
                        bienThe="do"
                        kichThuoc="nho"
                        className={s.nutIcon}
                        disabled={xoa.isPending && xoa.variables === d.maChuyenBay}
                        onClick={(e) => {
                          e.stopPropagation();
                          xacNhanXoa(d);
                        }}
                      >
                        <Trash2 size={16} />
                      </NutTron>
                    </ChiKhiCoQuyen>
                  </span>
                );
              },
            },
          ]}
        />
        <p className={s.chuThichBang}>
          Nhấp đúp một dòng hoặc chọn dòng rồi nhấn <kbd>Enter</kbd> để xem chi tiết chuyến bay.
          {laQuanLy && (
            <>
              {' '}
              Nhấn <kbd>Ctrl</kbd> + <kbd>N</kbd> để thêm chuyến bay.
            </>
          )}
        </p>
      </section>

      {laQuanLy && <HopThoaiNhapExcel mo={hienNhap} onDong={dongNhapExcel} />}
    </KhungTrang>
  );
}
