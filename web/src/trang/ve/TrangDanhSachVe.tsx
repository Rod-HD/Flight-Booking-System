// Danh sách vé (MH_DanhSachVe): tra cứu vé, mở Bán vé, sửa thông tin hành khách, hủy vé (UC04.3 đến UC04.5)
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, Pencil, PlaneTakeoff, Plus, RotateCcw, Search, XCircle } from 'lucide-react';
import { apiVe, khoaTruyVan } from '@/api/dich_vu';
import { thongBaoLoi } from '@/api/may_khach';
import type { TieuChiTimVe, Ve } from '@/kieu/api';
import { IconChongVe } from '@/icons3d';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { KhungTrang, TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { NhanTinhTrangVe } from '@/thanh_phan/NhanTrangThai';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { OChon } from '@/thanh_phan/OChon';
import { ONgay } from '@/thanh_phan/ONgay';
import { ONhap } from '@/thanh_phan/ONhap';
import { LOP_O_PHANG, ThanhTimKiem } from '@/thanh_phan/ThanhTimKiem';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangSo, dinhDangTien, tenLoaiGiayTo } from '@/tien_ich/dinh_dang';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { dinhDangGio, dinhDangNgay, sangNgayIso } from '@/tien_ich/thoi_gian';
import { dungLuaChonMoiChuyenBay } from '../_chung_ve/dung_chuyen_bay';
import { lamMoiSauGhi } from '../_chung_ve/kiem_tra';
import s from '../_chung_ve/DanhSach.module.css';

interface BoLoc {
  maVe: string;
  soGiayTo: string;
  maChuyenBay: string | null;
  tuNgay: string;
  denNgay: string;
}

const homNay = () => sangNgayIso(new Date());
const locMacDinh = (): BoLoc => ({ maVe: '', soGiayTo: '', maChuyenBay: null, tuNgay: homNay(), denNgay: homNay() });

function sangTieuChi(b: BoLoc): TieuChiTimVe {
  const t: TieuChiTimVe = {};
  if (b.maVe.trim()) t.maVe = b.maVe.trim();
  if (b.soGiayTo.trim()) t.soGiayTo = b.soGiayTo.trim();
  if (b.maChuyenBay) t.maChuyenBay = b.maChuyenBay;
  if (b.tuNgay) t.tuNgay = b.tuNgay;
  if (b.denNgay) t.denNgay = b.denNgay;
  return t;
}

export function TrangDanhSachVe() {
  const dieuHuong = useNavigate();
  const qc = useQueryClient();
  const oTim = useRef<HTMLDivElement>(null);
  const [nhap, datNhap] = useState<BoLoc>(locMacDinh);
  const [tieuChi, datTieuChi] = useState<TieuChiTimVe>(() => sangTieuChi(locMacDinh()));
  const [chon, datChon] = useState<string | null>(null);
  const [dangHuy, datDangHuy] = useState<string | null>(null);
  const [loiNgay, datLoiNgay] = useState<string | undefined>();
  const chuyenBay = dungLuaChonMoiChuyenBay();

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: khoaTruyVan.ve(tieuChi),
    queryFn: () => apiVe.danhSach(tieuChi),
    placeholderData: keepPreviousData,
  });

  const thongKe = useMemo(() => {
    const daBan = (data ?? []).filter((v) => v.tinhTrang === 'DaBan');
    return { tong: data?.length ?? 0, daBan: daBan.length, tien: daBan.reduce((t, v) => t + v.giaTien, 0) };
  }, [data]);

  const tim = () => {
    if (nhap.tuNgay && nhap.denNgay && nhap.tuNgay > nhap.denNgay) {
      datLoiNgay('Đến ngày phải sau hoặc bằng Từ ngày.');
      return;
    }
    datLoiNgay(undefined);
    datChon(null);
    const moi = sangTieuChi(nhap);
    if (JSON.stringify(moi) === JSON.stringify(tieuChi)) qc.invalidateQueries({ queryKey: khoaTruyVan.ve(moi) });
    else datTieuChi(moi);
  };

  const datLaiLoc = () => {
    const m = locMacDinh();
    datNhap(m);
    datTieuChi(sangTieuChi(m));
    datLoiNgay(undefined);
    datChon(null);
  };

  const sua = (v: Ve) => {
    if (v.tinhTrang !== 'DaBan') return;
    dieuHuong(`/ban-ve?suaVe=${encodeURIComponent(v.maVe)}`);
  };

  const huy = async (v: Ve) => {
    datChon(v.maVe);
    const dongY = await hoiXacNhan({
      tieuDe: `Hủy vé ${v.maVe}?`,
      noiDung: (
        <>
          Vé của hành khách <b>{v.hoTen}</b> trên chuyến bay <b>{v.maChuyenBay}</b> sẽ chuyển sang Đã hủy và chỗ được trả lại. Vé đã hủy không thể phục hồi.
        </>
      ),
      nutDongY: 'Hủy vé',
      nutHuy: 'Không',
    });
    if (!dongY) return;
    datDangHuy(v.maVe);
    try {
      await apiVe.huy(v.maVe);
      hienToast.thanhCong(`Đã hủy vé ${v.maVe}`);
      await lamMoiSauGhi(qc);
    } catch (e) {
      baoLoi('Không thể hủy vé', thongBaoLoi(e));
      lamMoiSauGhi(qc);
    } finally {
      datDangHuy(null);
    }
  };

  dungPhimTat({
    'ctrl+n': () => dieuHuong('/ban-ve'),
    'ctrl+f': () => oTim.current?.querySelector<HTMLInputElement>('input')?.focus(),
    esc: () => dieuHuong('/'),
  });

  const laMacDinh = JSON.stringify(tieuChi) === JSON.stringify(sangTieuChi(locMacDinh()));

  return (
    <KhungTrang
      tieuDe="Danh sách vé"
      icon={<IconChongVe kichThuoc={56} />}
      moTa="Tra cứu vé đã bán, sửa thông tin hành khách và hủy vé khi chuyến bay chưa khởi hành"
      duongDan={[{ nhan: 'Bán vé', den: '/ban-ve' }, { nhan: 'Danh sách vé' }]}
      nut={
        <>
          <Nut iconTrai={<Plus size={18} strokeWidth={2.6} />} den="/ban-ve" title="Bán vé (Ctrl+N)">
            Bán vé
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
                {laMacDinh ? 'Đang hiện các vé bán trong ngày hôm nay. Xóa ô ngày để tìm trong mọi ngày.' : 'Kết quả theo các tiêu chí đã nhập.'}
                {!laMacDinh && (
                  <button type="button" className={s.boLoc} onClick={datLaiLoc}>
                    <RotateCcw size={13} /> Về vé hôm nay
                  </button>
                )}
              </span>
            }
          >
            <ThanhTimKiem.O>
              <ONhap
                className={LOP_O_PHANG}
                nhan="Mã vé"
                iconTrai={<Hash size={18} />}
                placeholder="VE..."
                maxLength={10}
                autoComplete="off"
                value={nhap.maVe}
                onChange={(e) => datNhap({ ...nhap, maVe: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
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
            <ThanhTimKiem.O rong={190}>
              <ONgay className={LOP_O_PHANG} nhan="Từ ngày" value={nhap.tuNgay} onChange={(e) => datNhap({ ...nhap, tuNgay: e.target.value })} />
            </ThanhTimKiem.O>
            <ThanhTimKiem.O rong={190}>
              <ONgay className={LOP_O_PHANG} nhan="Đến ngày" value={nhap.denNgay} loi={loiNgay} onChange={(e) => datNhap({ ...nhap, denNgay: e.target.value })} />
            </ThanhTimKiem.O>
            <ThanhTimKiem.Nut>
              <Nut type="submit" kichThuoc="lon" iconTrai={<Search size={18} />} dangXuLy={isFetching && !isPending}>
                Tìm
              </Nut>
            </ThanhTimKiem.Nut>
          </ThanhTimKiem>
        </div>

        <section aria-labelledby="tieu-de-ket-qua-ve">
          <TieuDeMuc
            id="tieu-de-ket-qua-ve"
            tieuDe={laMacDinh ? 'Vé bán hôm nay' : 'Kết quả tìm kiếm'}
            phu="Nhấp đúp một vé Đã bán để sửa thông tin hành khách."
            phai={
              data && data.length > 0 ? (
                <div className={s.tomTat}>
                  <span className={s.vien}>
                    <b>{dinhDangSo(thongKe.tong)}</b> vé
                  </span>
                  <span className={s.vien}>
                    <b>{dinhDangSo(thongKe.daBan)}</b> đã bán
                  </span>
                  <span className={`${s.vien} ${s.vienDo}`}>
                    Tổng <b>{dinhDangTien(thongKe.tien)}</b>
                  </span>
                </div>
              ) : undefined
            }
          />
          <BangDuLieu<Ve>
            className={s.bang}
            nhan="Danh sách vé"
            duLieu={data}
            dangTai={isPending}
            loi={error}
            khoaDong={(v) => v.maVe}
            dongDangChon={chon}
            onChonDong={(v) => datChon(v.maVe)}
            onMoDong={sua}
            kichThuocTrang={10}
            donVi="vé"
            rong={{
              tieuDe: 'Không tìm thấy vé',
              goiY: laMacDinh ? 'Hôm nay chưa bán vé nào. Bấm Bán vé để lập vé mới.' : 'Không có vé thỏa tiêu chí đã nhập. Hãy thử bỏ bớt tiêu chí hoặc xóa ô ngày.',
              linhVat: 'tra_cuu',
              hanhDong: laMacDinh ? <Nut den="/ban-ve">Bán vé</Nut> : <Nut bienThe="phu" muiTen={false} onClick={datLaiLoc}>Về vé hôm nay</Nut>,
            }}
            cot={[
              { khoa: 'stt', tieuDe: 'STT', rong: 48, hien: (_, i) => <span className={s.stt}>{i + 1}</span> },
              { khoa: 'ma', tieuDe: 'Mã vé', hien: (v) => <span className={s.ma}>{v.maVe}</span> },
              { khoa: 'cb', tieuDe: 'Chuyến bay', hien: (v) => <span className={s.cb}>{v.maChuyenBay}</span> },
              { khoa: 'hk', tieuDe: 'Hành khách', hien: (v) => <span className={s.ten}>{v.hoTen}</span> },
              {
                khoa: 'gt',
                tieuDe: 'CCCD/Hộ chiếu',
                hien: (v) => (
                  <span className={s.hai}>
                    <b className={s.so}>{v.soGiayTo}</b>
                    <small>{tenLoaiGiayTo[v.loaiGiayTo]}</small>
                  </span>
                ),
              },
              { khoa: 'dt', tieuDe: 'Điện thoại', hien: (v) => <span className={s.so}>{v.dienThoai}</span> },
              { khoa: 'hang', tieuDe: 'Hạng vé', hien: (v) => v.tenHangVe },
              { khoa: 'tien', tieuDe: 'Giá tiền', so: true, hien: (v) => <span className={s.tien}>{dinhDangTien(v.giaTien)}</span> },
              {
                khoa: 'ngay',
                tieuDe: 'Ngày bán',
                hien: (v) => (
                  <span className={s.hai}>
                    <b>{dinhDangGio(v.ngayBan)}</b>
                    <small>{dinhDangNgay(v.ngayBan)}</small>
                  </span>
                ),
              },
              { khoa: 'tt', tieuDe: 'Tình trạng', hien: (v) => <NhanTinhTrangVe giaTri={v.tinhTrang} /> },
              {
                khoa: 'hd',
                tieuDe: 'Thao tác',
                canh: 'phai',
                hien: (v) => {
                  const daBan = v.tinhTrang === 'DaBan';
                  return (
                    <span className={s.thaoTac} onDoubleClick={(e) => e.stopPropagation()}>
                      <NutTron nhan={daBan ? `Sửa vé ${v.maVe}` : 'Vé đã hủy, không sửa được'} kichThuoc="nho" disabled={!daBan} onClick={() => sua(v)}>
                        <Pencil size={15} />
                      </NutTron>
                      <Nut
                        bienThe="nguy-hiem"
                        kichThuoc="nho"
                        muiTen={false}
                        iconTrai={<XCircle size={15} />}
                        disabled={!daBan}
                        dangXuLy={dangHuy === v.maVe}
                        title={daBan ? `Hủy vé ${v.maVe}` : 'Vé đã hủy'}
                        onClick={(e) => {
                          e.stopPropagation();
                          huy(v);
                        }}
                      >
                        Hủy vé
                      </Nut>
                    </span>
                  );
                },
              },
            ]}
          />
        </section>
      </div>
    </KhungTrang>
  );
}
