// Bán vé từ phiếu đặt chỗ (UC04.2): tìm phiếu còn hạn theo CCCD/Hộ chiếu hoặc mã phiếu đặt, chọn một phiếu rồi lập vé
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Hash, IdCard, Search, Ticket, X } from 'lucide-react';
import { apiPhieuDat, apiVe } from '@/api/dich_vu';
import { thongBaoLoi } from '@/api/may_khach';
import type { LoaiGiayTo, PhieuConHan } from '@/kieu/api';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { Nut } from '@/thanh_phan/Nut';
import { ONhap } from '@/thanh_phan/ONhap';
import { LOP_O_PHANG, ThanhTimKiem } from '@/thanh_phan/ThanhTimKiem';
import { TrangThaiRong } from '@/thanh_phan/TrangThaiRong';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangTien } from '@/tien_ich/dinh_dang';
import { dungBayGio } from '@/tien_ich/hook';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { dinhDangNgayGio, docIso } from '@/tien_ich/thoi_gian';
import { OGiayTo } from '../_chung_ve/CacO';
import { HopThoaiKetQua, type KetQuaHienThi } from '../_chung_ve/HopThoaiKetQua';
import { chuanHoaSoGiayTo, lamMoiSauGhi, loiSoGiayTo } from '../_chung_ve/kiem_tra';
import { DemNguoc } from '../_chung_ve/DemNguoc';
import s from './TrangBanVe.module.css';

type KieuTim = 'giayTo' | 'ma';
type TieuChi = { kieu: 'giayTo'; loai: LoaiGiayTo; so: string } | { kieu: 'ma'; ma: string };

export interface ThuocTinhBanTuPhieu {
  maPhieuBanDau: string | null;
  onChuyenTrucTiep: () => void;
  batPhimTat: boolean;
}

export function BanTuPhieu({ maPhieuBanDau, onChuyenTrucTiep, batPhimTat }: ThuocTinhBanTuPhieu) {
  const qc = useQueryClient();
  const dieuHuong = useNavigate();
  const bayGio = dungBayGio(1000);
  const goc = useRef<HTMLDivElement>(null);
  const [kieu, datKieu] = useState<KieuTim>(maPhieuBanDau ? 'ma' : 'giayTo');
  const [loai, datLoai] = useState<LoaiGiayTo>('CCCD');
  const [so, datSo] = useState('');
  const [maPhieu, datMaPhieu] = useState(maPhieuBanDau ?? '');
  const [loi, datLoi] = useState<string | undefined>();
  const [tieuChi, datTieuChi] = useState<TieuChi | null>(maPhieuBanDau ? { kieu: 'ma', ma: maPhieuBanDau } : null);
  const [chon, datChon] = useState<string | null>(maPhieuBanDau);
  const [dangBan, datDangBan] = useState(false);
  const [ketQua, datKetQua] = useState<KetQuaHienThi | null>(null);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['phieu-dat', 'con-han', tieuChi],
    queryFn: () => (tieuChi!.kieu === 'ma' ? apiPhieuDat.conHanTheoMa(tieuChi!.ma) : apiPhieuDat.conHanTheoGiayTo(tieuChi!.loai, tieuChi!.so)),
    enabled: !!tieuChi,
    staleTime: 0,
  });

  // chỉ giữ dòng đang chọn khi phiếu đó vẫn còn trong kết quả; có đúng một phiếu thì chọn sẵn
  useEffect(() => {
    if (!data) return;
    if (chon && !data.some((p) => p.maPhieuDat === chon)) datChon(null);
    if (!chon && data.length === 1) datChon(data[0].maPhieuDat);
    // chỉ chạy lại khi có kết quả mới
  }, [data]);

  const phieuChon = data?.find((p) => p.maPhieuDat === chon) ?? null;

  const ganTieuChi = (moi: TieuChi) => {
    datChon(null);
    if (JSON.stringify(moi) === JSON.stringify(tieuChi)) refetch();
    else datTieuChi(moi);
  };

  const tim = () => {
    if (kieu === 'giayTo') {
      const l = loiSoGiayTo(loai, so);
      datLoi(l);
      if (l) return;
      ganTieuChi({ kieu: 'giayTo', loai, so: so.trim() });
    } else {
      const ma = maPhieu.trim().toUpperCase();
      if (!ma) {
        datLoi('Vui lòng nhập mã phiếu đặt.');
        return;
      }
      datLoi(undefined);
      ganTieuChi({ kieu: 'ma', ma });
    }
  };

  const ban = async () => {
    if (!phieuChon || dangBan) {
      if (!phieuChon) hienToast.canhBao('Vui lòng chọn một phiếu đặt chỗ trong bảng.');
      return;
    }
    const p = phieuChon;
    const dongY = await hoiXacNhan({
      loai: 'xac-nhan',
      tieuDe: `Bán vé từ phiếu ${p.maPhieuDat}?`,
      noiDung: (
        <span className={s.tomTat}>
          <span>
            Hành khách <b>{p.hoTen}</b>, chuyến bay <b>{p.maChuyenBay}</b> ({p.tuyenBay}), {p.tenHangVe}
          </span>
          <span>
            Giá tiền ghi trên phiếu <b className={s.chuDo}>{dinhDangTien(p.giaTien)}</b>. Sau khi lập vé, phiếu chuyển sang Đã hủy.
          </span>
        </span>
      ),
      nutDongY: 'Bán vé',
      nutHuy: 'Không',
    });
    if (!dongY) return;
    datDangBan(true);
    try {
      const kq = await apiVe.banTuPhieu(p.maPhieuDat);
      datKetQua({ loai: 've', ma: kq.maVe, giaTien: kq.giaTien, hoTen: p.hoTen, maChuyenBay: p.maChuyenBay, tenHangVe: p.tenHangVe, tuPhieu: p.maPhieuDat });
      hienToast.thanhCong(`Đã bán vé ${kq.maVe} từ phiếu ${p.maPhieuDat}`);
      datChon(null);
      await lamMoiSauGhi(qc);
    } catch (e) {
      baoLoi('Không thể bán vé', thongBaoLoi(e));
      lamMoiSauGhi(qc);
    } finally {
      datDangBan(false);
    }
  };

  dungPhimTat(
    {
      'ctrl+s': () => ban(),
      'ctrl+f': () => goc.current?.querySelector<HTMLInputElement>('input')?.focus(),
      esc: () => dieuHuong('/ve'),
    },
    { batTat: batPhimTat },
  );

  const daTim = !!tieuChi;
  const rong = daTim && !isFetching && !error && data?.length === 0;

  return (
    <div className={s.tuPhieu} ref={goc}>
      <ThanhTimKiem<KieuTim>
        tab={[
          { khoa: 'giayTo', nhan: 'Theo CCCD/Hộ chiếu', icon: <IdCard size={18} /> },
          { khoa: 'ma', nhan: 'Theo mã phiếu đặt', icon: <Hash size={18} /> },
        ]}
        giaTriTab={kieu}
        onDoiTab={(k) => {
          datKieu(k);
          datLoi(undefined);
        }}
        nhanTab="Cách tìm phiếu đặt chỗ"
        onSubmit={tim}
        chuThich="Chỉ hiện các phiếu Chờ thanh toán còn hạn: chưa quá 24 giờ kể từ lúc đặt và chưa đến mốc hủy theo QĐ3."
      >
        <ThanhTimKiem.O>
          {kieu === 'giayTo' ? (
            <OGiayTo
              className={LOP_O_PHANG}
              nhan="CCCD/Hộ chiếu của hành khách"
              loai={loai}
              so={so}
              onDoiLoai={(l) => {
                datLoai(l);
                datSo(chuanHoaSoGiayTo(l, so));
              }}
              onDoiSo={(x) => {
                datSo(x);
                datLoi(undefined);
              }}
              loi={loi}
            />
          ) : (
            <ONhap
              className={LOP_O_PHANG}
              nhan="Mã phiếu đặt"
              batBuoc
              iconTrai={<Hash size={18} />}
              placeholder="Ví dụ PD00000012"
              autoComplete="off"
              value={maPhieu}
              loi={loi}
              maxLength={10}
              onChange={(e) => {
                datMaPhieu(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                datLoi(undefined);
              }}
            />
          )}
        </ThanhTimKiem.O>
        <ThanhTimKiem.Nut>
          <Nut type="submit" kichThuoc="lon" iconTrai={<Search size={18} />} dangXuLy={isFetching}>
            Tìm phiếu
          </Nut>
        </ThanhTimKiem.Nut>
      </ThanhTimKiem>

      <section className={s.mucKetQua} aria-labelledby="tieu-de-phieu-con-han">
        <TieuDeMuc
          id="tieu-de-phieu-con-han"
          tieuDe="Phiếu đặt chỗ còn hạn"
          phu={daTim ? 'Chọn một phiếu rồi bấm Bán vé từ phiếu. Giá tiền giữ nguyên như khi đặt.' : 'Nhập CCCD/Hộ chiếu hoặc mã phiếu đặt rồi bấm Tìm phiếu.'}
          phai={data && data.length > 0 ? <span className={s.dem}>{data.length} phiếu</span> : undefined}
        />
        {!daTim ? (
          <div className={s.khungRong}>
            <TrangThaiRong
              linhVat="tra_cuu"
              kichThuocHinh={120}
              tieuDe="Tìm phiếu đặt chỗ để bán vé"
              goiY="Hành khách đến thanh toán cung cấp số CCCD/hộ chiếu hoặc mã phiếu đặt. Vé được lập từ thông tin trên phiếu."
            />
          </div>
        ) : rong ? (
          <div className={s.khungRong}>
            <TrangThaiRong
              linhVat="ngu"
              kichThuocHinh={128}
              tieuDe="Không có phiếu đặt chỗ còn hạn"
              goiY="Phiếu có thể không đúng thông tin, đã quá 24 giờ, đã đến mốc hủy theo QĐ3 hoặc đã bị hủy. Nếu hành khách vẫn muốn mua, hãy bán vé trực tiếp."
              hanhDong={
                <Nut onClick={onChuyenTrucTiep} iconTrai={<Ticket size={18} />}>
                  Bán vé trực tiếp
                </Nut>
              }
            />
          </div>
        ) : (
          <BangDuLieu<PhieuConHan>
            nhan="Phiếu đặt chỗ còn hạn"
            duLieu={data}
            dangTai={isFetching && !data}
            loi={error}
            khoaDong={(p) => p.maPhieuDat}
            dongDangChon={chon}
            onChonDong={(p) => datChon(p.maPhieuDat)}
            onMoDong={(p) => {
              datChon(p.maPhieuDat);
              window.setTimeout(ban, 0);
            }}
            soDongXuong={3}
            cot={[
              { khoa: 'ma', tieuDe: 'Mã phiếu', hien: (p) => <span className={s.maPhieu}>{p.maPhieuDat}</span> },
              {
                khoa: 'cb',
                tieuDe: 'Chuyến bay',
                hien: (p) => (
                  <span className={s.hai}>
                    <b>{p.maChuyenBay}</b>
                    <small>{p.tuyenBay}</small>
                  </span>
                ),
              },
              { khoa: 'kh', tieuDe: 'Khởi hành', hien: (p) => dinhDangNgayGio(p.ngayGioKhoiHanh) },
              { khoa: 'hang', tieuDe: 'Hạng vé', hien: (p) => p.tenHangVe },
              { khoa: 'hk', tieuDe: 'Hành khách', hien: (p) => <b className={s.ten}>{p.hoTen}</b> },
              { khoa: 'tien', tieuDe: 'Giá tiền', so: true, hien: (p) => dinhDangTien(p.giaTien) },
              {
                khoa: 'han',
                tieuDe: 'Hạn thanh toán',
                hien: (p) => (
                  <span className={s.hai}>
                    <b>{dinhDangNgayGio(p.hanThanhToan)}</b>
                    <DemNguoc moc={docIso(p.hanThanhToan)} bayGio={bayGio} />
                  </span>
                ),
              },
            ]}
          />
        )}
      </section>

      <div className={`${s.thanhChon} ${phieuChon ? s.thanhChonCo : ''}`} aria-live="polite">
        <div className={s.thanhChonChu}>
          {phieuChon ? (
            <>
              <span className={s.maPhieu}>{phieuChon.maPhieuDat}</span>
              <span>
                <b>{phieuChon.hoTen}</b> · {phieuChon.maChuyenBay} · {phieuChon.tenHangVe}
              </span>
              <b className={s.chuDo}>{dinhDangTien(phieuChon.giaTien)}</b>
            </>
          ) : (
            <span className={s.chuMo}>Chưa chọn phiếu đặt chỗ</span>
          )}
        </div>
        <div className={s.nutChan}>
          <Nut bienThe="nguy-hiem" muiTen={false} iconTrai={<X size={18} />} onClick={() => dieuHuong('/ve')}>
            Hủy
          </Nut>
          <Nut kichThuoc="lon" disabled={!phieuChon} dangXuLy={dangBan} onClick={ban}>
            Bán vé từ phiếu
          </Nut>
        </div>
      </div>

      <HopThoaiKetQua
        ketQua={ketQua}
        onDong={() => datKetQua(null)}
        nutPhu={{ chu: 'Bán vé khác', onClick: () => datKetQua(null) }}
        nutChinh={{
          chu: 'Xem danh sách vé',
          onClick: () => {
            datKetQua(null);
            dieuHuong('/ve');
          },
        }}
      />
    </div>
  );
}
