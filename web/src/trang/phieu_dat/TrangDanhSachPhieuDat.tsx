// Danh sách phiếu đặt chỗ (MH_DanhSachPhieuDat): tra cứu, bán vé từ phiếu, sửa, hủy phiếu; Quản lý xóa phiếu đã hủy
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Pencil, PlaneTakeoff, Plus, RotateCcw, Search } from 'lucide-react';
import { apiPhieuDat, khoaTruyVan } from '@/api/dich_vu';
import { thongBaoLoi } from '@/api/may_khach';
import type { PhieuDat, TieuChiTimPhieu, TinhTrangPhieu } from '@/kieu/api';
import { CHI_QUAN_LY } from '@/dinh_tuyen';
import { IconBiaKepDongHo } from '@/icons3d';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { ChiKhiCoQuyen } from '@/thanh_phan/BaoVeDuongDan';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { KhungTrang, TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { OChon } from '@/thanh_phan/OChon';
import { OChonGoc, ONhap } from '@/thanh_phan/ONhap';
import { LOP_O_PHANG, ThanhTimKiem } from '@/thanh_phan/ThanhTimKiem';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangSo, dinhDangTien, tenLoaiGiayTo, tenTinhTrangPhieu } from '@/tien_ich/dinh_dang';
import { dungBayGio } from '@/tien_ich/hook';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { dinhDangGio, dinhDangNgay, docIso } from '@/tien_ich/thoi_gian';
import { DemNguoc } from '../_chung_ve/DemNguoc';
import { dungLuaChonMoiChuyenBay } from '../_chung_ve/dung_chuyen_bay';
import { lamMoiSauGhi } from '../_chung_ve/kiem_tra';
import { KhoiXoaPhieuDaHuy } from './KhoiXoaPhieuDaHuy';
import s from '../_chung_ve/DanhSach.module.css';

interface BoLoc {
  maPhieuDat: string;
  soGiayTo: string;
  maChuyenBay: string | null;
  tinhTrang: '' | TinhTrangPhieu;
}

function sangTieuChi(b: BoLoc): TieuChiTimPhieu {
  const t: TieuChiTimPhieu = {};
  if (b.maPhieuDat.trim()) t.maPhieuDat = b.maPhieuDat.trim();
  if (b.soGiayTo.trim()) t.soGiayTo = b.soGiayTo.trim();
  if (b.maChuyenBay) t.maChuyenBay = b.maChuyenBay;
  if (b.tinhTrang) t.tinhTrang = b.tinhTrang;
  return t;
}

const TINH_TRANG = [
  { giaTri: 'ChoThanhToan', nhan: 'Chờ thanh toán' },
  { giaTri: 'DaHuy', nhan: 'Đã hủy' },
];

export function TrangDanhSachPhieuDat() {
  const dieuHuong = useNavigate();
  const qc = useQueryClient();
  const [thamSo] = useSearchParams();
  const xoaDaHuy = thamSo.get('xoaDaHuy') === '1';
  const bayGio = dungBayGio(1000);
  const oTim = useRef<HTMLDivElement>(null);
  const khoiXoa = useRef<HTMLElement>(null);
  // mở màn hình: chọn sẵn Chờ thanh toán; đi từ lối tắt dọn dẹp thì xem các phiếu Đã hủy
  const banDau: BoLoc = { maPhieuDat: '', soGiayTo: '', maChuyenBay: null, tinhTrang: xoaDaHuy ? 'DaHuy' : 'ChoThanhToan' };
  const [nhap, datNhap] = useState<BoLoc>(banDau);
  const [tieuChi, datTieuChi] = useState<TieuChiTimPhieu>(() => sangTieuChi(banDau));
  const [chon, datChon] = useState<string | null>(null);
  const [dangHuy, datDangHuy] = useState<string | null>(null);
  const chuyenBay = dungLuaChonMoiChuyenBay();

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: khoaTruyVan.phieuDat(tieuChi),
    queryFn: () => apiPhieuDat.danhSach(tieuChi),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!xoaDaHuy) return;
    const id = window.setTimeout(() => khoiXoa.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    return () => window.clearTimeout(id);
  }, [xoaDaHuy]);

  const thongKe = useMemo(() => {
    const cho = (data ?? []).filter((p) => p.tinhTrang === 'ChoThanhToan');
    return { tong: data?.length ?? 0, cho: cho.length, tien: cho.reduce((t, p) => t + p.giaTien, 0) };
  }, [data]);

  const tim = () => {
    datChon(null);
    const moi = sangTieuChi(nhap);
    if (JSON.stringify(moi) === JSON.stringify(tieuChi)) qc.invalidateQueries({ queryKey: khoaTruyVan.phieuDat(moi) });
    else datTieuChi(moi);
  };

  const datLaiLoc = () => {
    const m: BoLoc = { maPhieuDat: '', soGiayTo: '', maChuyenBay: null, tinhTrang: 'ChoThanhToan' };
    datNhap(m);
    datTieuChi(sangTieuChi(m));
    datChon(null);
  };

  const conHan = (p: PhieuDat) => p.tinhTrang === 'ChoThanhToan' && docIso(p.hanThanhToan) > bayGio;

  const sua = (p: PhieuDat) => {
    if (p.tinhTrang !== 'ChoThanhToan') return;
    dieuHuong(`/dat-ve?suaPhieu=${encodeURIComponent(p.maPhieuDat)}`);
  };

  const huy = async (p: PhieuDat) => {
    datChon(p.maPhieuDat);
    const dongY = await hoiXacNhan({
      tieuDe: `Hủy phiếu ${p.maPhieuDat}?`,
      noiDung: (
        <>
          Phiếu của hành khách <b>{p.hoTen}</b> trên chuyến bay <b>{p.maChuyenBay}</b> sẽ chuyển sang Đã hủy và chỗ được trả lại. Phiếu đã hủy không thể phục hồi.
        </>
      ),
      nutDongY: 'Hủy phiếu',
      nutHuy: 'Không',
    });
    if (!dongY) return;
    datDangHuy(p.maPhieuDat);
    try {
      await apiPhieuDat.huy(p.maPhieuDat);
      hienToast.thanhCong(`Đã hủy phiếu ${p.maPhieuDat}`);
      await lamMoiSauGhi(qc);
    } catch (e) {
      baoLoi('Không thể hủy phiếu', thongBaoLoi(e));
      lamMoiSauGhi(qc);
    } finally {
      datDangHuy(null);
    }
  };

  dungPhimTat({
    'ctrl+n': () => dieuHuong('/dat-ve'),
    'ctrl+f': () => oTim.current?.querySelector<HTMLInputElement>('input')?.focus(),
    esc: () => dieuHuong('/'),
  });

  const laMacDinh = JSON.stringify(tieuChi) === JSON.stringify({ tinhTrang: 'ChoThanhToan' });

  return (
    <KhungTrang
      tieuDe="Danh sách phiếu đặt chỗ"
      icon={<IconBiaKepDongHo kichThuoc={56} />}
      moTa="Tra cứu phiếu đặt chỗ, bán vé từ phiếu, sửa thông tin hành khách và hủy phiếu"
      duongDan={[{ nhan: 'Đặt vé', den: '/dat-ve' }, { nhan: 'Danh sách phiếu đặt chỗ' }]}
      nut={
        <>
          <Nut iconTrai={<Plus size={18} strokeWidth={2.6} />} den="/dat-ve" title="Đặt vé (Ctrl+N)">
            Đặt vé
          </Nut>
          <Nut bienThe="lang" muiTen={false} den="/">
            Đóng
          </Nut>
        </>
      }
    >
      <div className={s.trang}>
        <div ref={oTim} className={s.timKiem}>
          <ThanhTimKiem
            onSubmit={tim}
            chuThich={
              <span className={s.chuThich}>
                Hạn thanh toán là thời điểm sớm hơn giữa 24 giờ kể từ lúc đặt và mốc hủy đặt vé theo QĐ3.
                {!laMacDinh && (
                  <button type="button" className={s.boLoc} onClick={datLaiLoc}>
                    <RotateCcw size={13} /> Về phiếu chờ thanh toán
                  </button>
                )}
              </span>
            }
          >
            <ThanhTimKiem.O>
              <ONhap
                className={LOP_O_PHANG}
                nhan="Mã phiếu đặt"
                iconTrai={<Hash size={18} />}
                placeholder="PD..."
                maxLength={10}
                autoComplete="off"
                value={nhap.maPhieuDat}
                onChange={(e) => datNhap({ ...nhap, maPhieuDat: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
              />
            </ThanhTimKiem.O>
            <ThanhTimKiem.O>
              <ONhap
                className={LOP_O_PHANG}
                nhan="CCCD/Hộ chiếu"
                placeholder="Số giấy tờ"
                maxLength={20}
                autoComplete="off"
                value={nhap.soGiayTo}
                onChange={(e) => datNhap({ ...nhap, soGiayTo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
              />
            </ThanhTimKiem.O>
            <ThanhTimKiem.O>
              <OChon
                className={LOP_O_PHANG}
                nhan="Chuyến bay"
                giaTri={nhap.maChuyenBay}
                onDoi={(x) => datNhap({ ...nhap, maChuyenBay: x })}
                luaChon={chuyenBay.luaChon}
                dangTai={chuyenBay.dangTai}
                placeholder="Tất cả"
                iconTrai={<PlaneTakeoff size={18} />}
              />
            </ThanhTimKiem.O>
            <ThanhTimKiem.O rong={210}>
              <OChonGoc
                className={LOP_O_PHANG}
                nhan="Tình trạng"
                dongTrong="Tất cả"
                luaChon={TINH_TRANG}
                value={nhap.tinhTrang}
                onChange={(e) => datNhap({ ...nhap, tinhTrang: e.target.value as BoLoc['tinhTrang'] })}
              />
            </ThanhTimKiem.O>
            <ThanhTimKiem.Nut>
              <Nut type="submit" kichThuoc="lon" iconTrai={<Search size={18} />} dangXuLy={isFetching && !isPending}>
                Tìm
              </Nut>
            </ThanhTimKiem.Nut>
          </ThanhTimKiem>
        </div>

        <section aria-labelledby="tieu-de-ket-qua-phieu">
          <TieuDeMuc
            id="tieu-de-ket-qua-phieu"
            tieuDe={laMacDinh ? 'Phiếu đang chờ thanh toán' : 'Kết quả tìm kiếm'}
            phu="Nhấp đúp một phiếu Chờ thanh toán để sửa thông tin hành khách."
            phai={
              data && data.length > 0 ? (
                <div className={s.tomTat}>
                  <span className={s.vien}>
                    <b>{dinhDangSo(thongKe.tong)}</b> phiếu
                  </span>
                  <span className={s.vien}>
                    <b>{dinhDangSo(thongKe.cho)}</b> chờ thanh toán
                  </span>
                  <span className={`${s.vien} ${s.vienDo}`}>
                    Đang giữ <b>{dinhDangTien(thongKe.tien)}</b>
                  </span>
                </div>
              ) : undefined
            }
          />
          <BangDuLieu<PhieuDat>
            className={`${s.bang} ${s.bangGon}`}
            nhan="Danh sách phiếu đặt chỗ"
            duLieu={data}
            dangTai={isPending}
            loi={error}
            khoaDong={(p) => p.maPhieuDat}
            dongDangChon={chon}
            onChonDong={(p) => datChon(p.maPhieuDat)}
            onMoDong={sua}
            kichThuocTrang={10}
            donVi="phiếu"
            rong={{
              tieuDe: 'Không tìm thấy phiếu đặt chỗ',
              goiY: laMacDinh ? 'Hiện không có phiếu nào đang chờ thanh toán.' : 'Không có phiếu thỏa tiêu chí đã nhập. Hãy thử bỏ bớt tiêu chí hoặc chọn tình trạng Tất cả.',
              linhVat: 'tra_cuu',
              hanhDong: <Nut den="/dat-ve">Đặt vé</Nut>,
            }}
            cot={[
              { khoa: 'stt', tieuDe: 'STT', rong: 36, hien: (_, i) => <span className={s.stt}>{i + 1}</span> },
              { khoa: 'ma', tieuDe: 'Mã phiếu', hien: (p) => <span className={s.ma}>{p.maPhieuDat}</span> },
              { khoa: 'cb', tieuDe: 'Chuyến bay', hien: (p) => <span className={s.cb}>{p.maChuyenBay}</span> },
              { khoa: 'hk', tieuDe: 'Hành khách', hien: (p) => <span className={s.ten}>{p.hoTen}</span> },
              {
                khoa: 'gt',
                tieuDe: 'CCCD/Hộ chiếu',
                hien: (p) => (
                  <span className={s.hai}>
                    <b className={s.so}>{p.soGiayTo}</b>
                    <small>{tenLoaiGiayTo[p.loaiGiayTo]}</small>
                  </span>
                ),
              },
              { khoa: 'dt', tieuDe: 'Điện thoại', hien: (p) => <span className={s.so}>{p.dienThoai}</span> },
              { khoa: 'hang', tieuDe: 'Hạng vé', hien: (p) => p.tenHangVe },
              { khoa: 'tien', tieuDe: 'Giá tiền', so: true, hien: (p) => <span className={s.tien}>{dinhDangTien(p.giaTien)}</span> },
              {
                khoa: 'dat',
                tieuDe: 'Thời điểm đặt',
                hien: (p) => (
                  <span className={s.hai}>
                    <b>{dinhDangGio(p.thoiDiemDat)}</b>
                    <small>{dinhDangNgay(p.thoiDiemDat)}</small>
                  </span>
                ),
              },
              {
                khoa: 'han',
                tieuDe: 'Hạn thanh toán',
                hien: (p) => (
                  <span className={s.hai}>
                    <b>
                      {dinhDangGio(p.hanThanhToan)} {dinhDangNgay(p.hanThanhToan).slice(0, 5)}
                    </b>
                    {p.tinhTrang === 'ChoThanhToan' ? <DemNguoc moc={docIso(p.hanThanhToan)} bayGio={bayGio} /> : <small className={s.mo}>không còn giữ chỗ</small>}
                  </span>
                ),
              },
              { khoa: 'tt', tieuDe: 'Tình trạng', hien: (p) => (
                  <NhanTrangThai loai={p.tinhTrang === 'ChoThanhToan' ? 'canh-bao' : 'trung-tinh'} nho>
                    {tenTinhTrangPhieu[p.tinhTrang]}
                  </NhanTrangThai>
                ) },
              {
                khoa: 'hd',
                tieuDe: 'Thao tác',
                canh: 'phai',
                hien: (p) => {
                  const cho = p.tinhTrang === 'ChoThanhToan';
                  const banDuoc = conHan(p);
                  return (
                    <span className={s.thaoTac} onDoubleClick={(e) => e.stopPropagation()}>
                      <Nut
                        kichThuoc="nho"
                        muiTen={false}
                        disabled={!banDuoc}
                        den={banDuoc ? `/ban-ve?maPhieuDat=${encodeURIComponent(p.maPhieuDat)}` : undefined}
                        title={banDuoc ? `Bán vé từ phiếu ${p.maPhieuDat}` : 'Chỉ bán từ phiếu Chờ thanh toán còn hạn'}
                      >
                        Bán vé
                      </Nut>
                      <NutTron nhan={cho ? `Sửa phiếu ${p.maPhieuDat}` : 'Phiếu đã hủy, không sửa được'} kichThuoc="nho" disabled={!cho} onClick={() => sua(p)}>
                        <Pencil size={15} />
                      </NutTron>
                      <Nut
                        bienThe="nguy-hiem"
                        kichThuoc="nho"
                        muiTen={false}
                        disabled={!cho}
                        dangXuLy={dangHuy === p.maPhieuDat}
                        title={cho ? `Hủy phiếu ${p.maPhieuDat}` : 'Phiếu đã hủy'}
                        aria-label={`Hủy phiếu ${p.maPhieuDat}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          huy(p);
                        }}
                      >
                        Hủy
                      </Nut>
                    </span>
                  );
                },
              },
            ]}
          />
        </section>

        <ChiKhiCoQuyen quyen={CHI_QUAN_LY}>
          <KhoiXoaPhieuDaHuy ref={khoiXoa} noiBat={xoaDaHuy} />
        </ChiKhiCoQuyen>
      </div>
    </KhungTrang>
  );
}
