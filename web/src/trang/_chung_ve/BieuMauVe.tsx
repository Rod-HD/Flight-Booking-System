// Biểu mẫu vé (BM2) và phiếu đặt chỗ (BM3): đúng ba hàng hai cột, kèm bảng thông tin chuyến bay bên phải.
// Dùng chung cho Bán vé trực tiếp, Đặt vé và chế độ sửa thông tin hành khách của vé, phiếu.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Phone, PlaneTakeoff, Ticket, UserRound, X } from 'lucide-react';
import { apiChuyenBay, apiPhieuDat, apiVe, khoaTruyVan } from '@/api/dich_vu';
import { laLoiApi, thongBaoLoi } from '@/api/may_khach';
import type { HanhKhach, MucDichBan } from '@/kieu/api';
import { baoCanhBao, baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { Nut } from '@/thanh_phan/Nut';
import { OChon } from '@/thanh_phan/OChon';
import { ONhap } from '@/thanh_phan/ONhap';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangTien, tenLoaiGiayTo } from '@/tien_ich/dinh_dang';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { dinhDangNgay, dinhDangNgayGio } from '@/tien_ich/thoi_gian';
import { BangHanGiuCho, ChonHangVe, OGiaTien, OGiayTo } from './CacO';
import { dungChuyenBayDeBan, dungQuyDinh, type LocChuyenBay } from './dung_chuyen_bay';
import { HopThoaiKetQua, type KetQuaHienThi } from './HopThoaiKetQua';
import {
  HANH_KHACH_TRONG,
  chuanHoaHanhKhach,
  chuanHoaSoGiayTo,
  kiemTraHanhKhach,
  lamMoiSauGhi,
  loiDienThoai,
  loiHoTen,
  loiSoGiayTo,
  loiTuMayChu,
  tenMucDich,
  type LoiHanhKhach,
} from './kiem_tra';
import { TheThongTinChuyenBay } from './TheThongTinChuyenBay';
import s from './BieuMauVe.module.css';

/** Vé hoặc phiếu đang sửa (chỉ sửa thông tin hành khách) */
export interface BanGhiSua {
  ma: string;
  maChuyenBay: string;
  tenHangVe: string;
  giaTien: number;
  hanhKhach: HanhKhach;
  hanThanhToan?: string;
}

type LoiBieuMau = LoiHanhKhach & { maChuyenBay?: string; maHangVe?: string };

const TIEU_DE_LOI: Record<string, string> = {
  HET_CHO: 'Chuyến bay đã hết chỗ',
  CHUYEN_BAY_DA_KHOI_HANH: 'Chuyến bay đã khởi hành',
  QUA_HAN_DAT_VE: 'Quá thời hạn đặt vé',
};

export interface ThuocTinhBieuMauVe {
  mucDich: MucDichBan;
  banGhiSua?: BanGhiSua;
  maChuyenBayBanDau?: string | null;
  loc?: LocChuyenBay;
  onBoLoc?: () => void;
  /** trang danh sách để về khi hủy hoặc sau khi lưu */
  veDanhSach: string;
  /** báo cho trang cha biết đang nhập dở */
  onDoiNhapDo?: (dangNhapDo: boolean) => void;
  batPhimTat?: boolean;
}

export function BieuMauVe({ mucDich, banGhiSua, maChuyenBayBanDau = null, loc = {}, onBoLoc, veDanhSach, onDoiNhapDo, batPhimTat = true }: ThuocTinhBieuMauVe) {
  const sua = !!banGhiSua;
  const ten = tenMucDich[mucDich];
  const qc = useQueryClient();
  const dieuHuong = useNavigate();
  const goc = useRef<HTMLFormElement>(null);
  const daBao = useRef('');

  const [maCB, datMaCB] = useState<string | null>(banGhiSua?.maChuyenBay ?? maChuyenBayBanDau);
  const [maHang, datMaHang] = useState<string | null>(null);
  const [hk, datHk] = useState<HanhKhach>(banGhiSua?.hanhKhach ?? HANH_KHACH_TRONG);
  const [loi, datLoi] = useState<LoiBieuMau>({});
  const [daGui, datDaGui] = useState(false);
  const [dangGui, datDangGui] = useState(false);
  const [rung, datRung] = useState(false);
  const [ketQua, datKetQua] = useState<KetQuaHienThi | null>(null);
  const [goiYGiayTo, datGoiYGiayTo] = useState<string | null>(null);

  const { data: quyDinh } = dungQuyDinh();
  const dsCB = dungChuyenBayDeBan(mucDich, loc, maCB, !sua);
  const tomTat = dsCB.ds.find((c) => c.maChuyenBay === maCB);

  const ttBan = useQuery({
    queryKey: khoaTruyVan.thongTinBan(maCB ?? '', mucDich),
    queryFn: () => apiChuyenBay.thongTinBan(maCB ?? '', mucDich),
    enabled: !!maCB && !sua,
  });
  const { data: ct } = useQuery({
    queryKey: khoaTruyVan.chuyenBayChiTiet(maCB ?? ''),
    queryFn: () => apiChuyenBay.chiTiet(maCB ?? ''),
    enabled: !!maCB,
  });
  const tt = ttBan.data;
  const hangChon = tt?.hang.find((h) => h.maHangVe === maHang);

  /* chọn chuyến bay không được phép bán (đã khởi hành, hết chỗ, quá hạn đặt) thì báo ngay */
  useEffect(() => {
    if (sua || !maCB || !tt || tt.duocPhep) return;
    const khoa = `${maCB}:${tt.maLoi}`;
    if (daBao.current === khoa) return;
    daBao.current = khoa;
    const tieuDe = TIEU_DE_LOI[tt.maLoi ?? ''] ?? `Không thể ${ten.dongTu}`;
    const noiDung = `${tt.thongBao ?? ''} Vui lòng chọn chuyến bay khác.`;
    if (tt.maLoi === 'QUA_HAN_DAT_VE') baoCanhBao(tieuDe, noiDung);
    else baoLoi(tieuDe, noiDung);
  }, [tt, maCB, sua, ten.dongTu]);

  /* số ghế được làm mới mà hạng đang chọn hết chỗ thì bỏ chọn, yêu cầu chọn hạng khác */
  useEffect(() => {
    if (!maHang || !tt) return;
    const h = tt.hang.find((x) => x.maHangVe === maHang);
    if (!h || h.soGheTrong <= 0) {
      datMaHang(null);
      if (h) datLoi((l) => ({ ...l, maHangVe: `${h.tenHangVe} đã hết chỗ, vui lòng chọn hạng vé khác.` }));
    }
  }, [tt, maHang]);

  const dangNhapDo = sua
    ? hk.hoTen !== banGhiSua.hanhKhach.hoTen ||
      hk.loaiGiayTo !== banGhiSua.hanhKhach.loaiGiayTo ||
      hk.soGiayTo !== banGhiSua.hanhKhach.soGiayTo ||
      hk.dienThoai !== banGhiSua.hanhKhach.dienThoai
    : !!(hk.hoTen.trim() || hk.soGiayTo || hk.dienThoai || maHang || (maCB && maCB !== maChuyenBayBanDau));

  useEffect(() => {
    onDoiNhapDo?.(dangNhapDo);
  }, [dangNhapDo, onDoiNhapDo]);

  /* rung các ô lỗi một lần rồi đưa con trỏ tới ô lỗi đầu tiên */
  useEffect(() => {
    if (!rung) return;
    // không tự mở danh sách chuyến bay, ưu tiên các ô nhập khác
    const o = goc.current;
    (
      o?.querySelector<HTMLElement>('input[aria-invalid="true"]:not([role="combobox"]), [role="radiogroup"][aria-invalid="true"] button:not(:disabled)') ??
      null
    )?.focus();
    const id = window.setTimeout(() => datRung(false), 450);
    return () => window.clearTimeout(id);
  }, [rung]);

  const doiTruong = (thay: Partial<HanhKhach>) => {
    const moi = { ...hk, ...thay };
    datHk(moi);
    if ('loaiGiayTo' in thay || 'soGiayTo' in thay) datGoiYGiayTo(null);
    datLoi((l) => {
      const x = { ...l };
      if (!daGui) {
        for (const k of Object.keys(thay) as (keyof HanhKhach)[]) delete x[k];
        if ('loaiGiayTo' in thay) delete x.soGiayTo;
        return x;
      }
      x.hoTen = loiHoTen(moi.hoTen);
      x.soGiayTo = loiSoGiayTo(moi.loaiGiayTo, moi.soGiayTo);
      x.dienThoai = loiDienThoai(moi.dienThoai);
      return x;
    });
  };

  const roiTruong = (k: 'hoTen' | 'dienThoai' | 'soGiayTo') => {
    const gt = hk[k].trim();
    if (!gt) return;
    const l = k === 'hoTen' ? loiHoTen(gt) : k === 'dienThoai' ? loiDienThoai(gt) : loiSoGiayTo(hk.loaiGiayTo, gt);
    datLoi((x) => ({ ...x, [k]: l }));
  };

  /* rời ô số giấy tờ: hành khách đã có trong hệ thống thì điền sẵn họ tên, điện thoại để kiểm tra lại */
  const timHanhKhach = async () => {
    roiTruong('soGiayTo');
    const { loaiGiayTo: loai, soGiayTo: so } = hk;
    if (sua || loiSoGiayTo(loai, so)) return;
    try {
      const [dsVe, dsPhieu] = await Promise.all([
        qc.fetchQuery({ queryKey: khoaTruyVan.ve({ soGiayTo: so }), queryFn: () => apiVe.danhSach({ soGiayTo: so }) }),
        qc.fetchQuery({ queryKey: khoaTruyVan.phieuDat({ soGiayTo: so }), queryFn: () => apiPhieuDat.danhSach({ soGiayTo: so }) }),
      ]);
      const thay = [...dsVe, ...dsPhieu].find((x) => x.loaiGiayTo === loai && x.soGiayTo === so);
      if (!thay) return;
      datHk((h) => {
        if (h.loaiGiayTo !== loai || h.soGiayTo !== so) return h;
        return { ...h, hoTen: h.hoTen.trim() ? h.hoTen : thay.hoTen, dienThoai: h.dienThoai.trim() ? h.dienThoai : thay.dienThoai };
      });
      datLoi((l) => ({ ...l, hoTen: undefined, dienThoai: undefined }));
      datGoiYGiayTo(`Hành khách đã có trong hệ thống: ${thay.hoTen}, điện thoại ${thay.dienThoai}.`);
    } catch {
      /* không tra được thì nhân viên nhập tay như bình thường */
    }
  };

  const chonChuyenBay = (ma: string | null) => {
    daBao.current = '';
    datMaCB(ma);
    datMaHang(null);
    datLoi((l) => ({ ...l, maChuyenBay: undefined, maHangVe: undefined }));
  };

  const datLai = (giuChuyenBay: boolean) => {
    if (!giuChuyenBay) datMaCB(maChuyenBayBanDau);
    datMaHang(null);
    datHk(HANH_KHACH_TRONG);
    datLoi({});
    datDaGui(false);
    datGoiYGiayTo(null);
  };

  const huy = async () => {
    if (dangGui) return;
    if (dangNhapDo) {
      const dongY = await hoiXacNhan({
        tieuDe: sua ? 'Hủy các thay đổi?' : `Hủy thao tác ${ten.dongTu}?`,
        noiDung: sua ? 'Thông tin hành khách vừa sửa sẽ không được lưu.' : `Thông tin đã nhập sẽ không được lưu, ${ten.doiTuong} chưa được lập.`,
        nutDongY: sua ? 'Hủy thay đổi' : `Hủy ${ten.dongTu}`,
        nutHuy: 'Tiếp tục nhập',
      });
      if (!dongY) return;
    }
    dieuHuong(veDanhSach);
  };

  const xuLyLoi = (e: unknown) => {
    if (laLoiApi(e)) {
      if (e.trangThai === 400 && e.chiTiet) {
        datLoi((l) => ({ ...l, ...loiTuMayChu(e.chiTiet) }));
        datRung(true);
      }
      if (e.ma === 'GIAY_TO_DA_THUOC_NGUOI_KHAC') {
        datLoi((l) => ({ ...l, soGiayTo: e.thongBao }));
        datRung(true);
      }
      if (e.ma === 'HET_CHO' || e.ma === 'CHUYEN_BAY_DA_KHOI_HANH' || e.ma === 'QUA_HAN_DAT_VE') {
        // cập nhật lại số ghế, không để hộp thoại tự báo lần nữa
        daBao.current = `${maCB}:${e.ma}`;
        qc.invalidateQueries({ queryKey: ['chuyen-bay'] });
      }
      if (e.ma === 'DU_LIEU_DA_THAY_DOI') lamMoiSauGhi(qc);
    }
    baoLoi(sua ? 'Không thể lưu thay đổi' : `Không thể ${ten.dongTu}`, thongBaoLoi(e));
  };

  const gui = async () => {
    if (dangGui || ketQua) return;
    datDaGui(true);
    const hkChuan = chuanHoaHanhKhach(hk);
    const l: LoiBieuMau = { ...kiemTraHanhKhach(hkChuan) };
    if (!sua) {
      if (!maCB) l.maChuyenBay = 'Vui lòng chọn chuyến bay.';
      else if (tt && !tt.duocPhep) l.maChuyenBay = tt.thongBao ?? 'Chuyến bay không còn nhận bán.';
      if (maCB && !maHang && (!tt || tt.duocPhep)) l.maHangVe = 'Vui lòng chọn hạng vé.';
    }
    datLoi(l);
    if (Object.values(l).some(Boolean)) {
      datRung(true);
      return;
    }

    if (sua) {
      datDangGui(true);
      try {
        if (mucDich === 'banVe') await apiVe.suaHanhKhach(banGhiSua.ma, hkChuan);
        else await apiPhieuDat.suaHanhKhach(banGhiSua.ma, hkChuan);
        hienToast.thanhCong(`Đã cập nhật thông tin hành khách của ${ten.doiTuong} ${banGhiSua.ma}`);
        await lamMoiSauGhi(qc);
        dieuHuong(veDanhSach);
      } catch (e) {
        xuLyLoi(e);
      } finally {
        datDangGui(false);
      }
      return;
    }

    if (!maCB || !hangChon) return;
    const dongY = await hoiXacNhan({
      loai: 'xac-nhan',
      tieuDe: mucDich === 'banVe' ? 'Xác nhận bán vé?' : 'Xác nhận đặt vé?',
      noiDung: (
        <span className={s.tomTatXacNhan}>
          <span>
            Chuyến bay <b>{maCB}</b>
            {tomTat ? ` (${tomTat.maSanBayDi} → ${tomTat.maSanBayDen}, ${dinhDangNgayGio(tomTat.ngayGioKhoiHanh)})` : ''}, <b>{hangChon.tenHangVe}</b>
          </span>
          <span>
            Hành khách <b>{hkChuan.hoTen}</b>, {tenLoaiGiayTo[hkChuan.loaiGiayTo]} {hkChuan.soGiayTo}
          </span>
          <span>
            Giá tiền <b className={s.chuDo}>{dinhDangTien(hangChon.giaTien)}</b>
          </span>
        </span>
      ),
      nutDongY: ten.DongTu,
      nutHuy: 'Không',
    });
    if (!dongY) return;

    datDangGui(true);
    const yc = { maChuyenBay: maCB, maHangVe: hangChon.maHangVe, hanhKhach: hkChuan };
    try {
      if (mucDich === 'banVe') {
        const kq = await apiVe.ban(yc);
        datKetQua({ loai: 've', ma: kq.maVe, giaTien: kq.giaTien, hoTen: hkChuan.hoTen, maChuyenBay: maCB, tenHangVe: hangChon.tenHangVe });
        hienToast.thanhCong(`Đã bán vé ${kq.maVe} cho hành khách ${hkChuan.hoTen}`);
      } else {
        const kq = await apiPhieuDat.dat(yc);
        datKetQua({
          loai: 'phieu',
          ma: kq.maPhieuDat,
          giaTien: kq.giaTien,
          hoTen: hkChuan.hoTen,
          maChuyenBay: maCB,
          tenHangVe: hangChon.tenHangVe,
          hanThanhToan: kq.hanThanhToan,
        });
        hienToast.thanhCong(`Đã lập phiếu đặt chỗ ${kq.maPhieuDat}`);
      }
      await lamMoiSauGhi(qc);
    } catch (e) {
      xuLyLoi(e);
    } finally {
      datDangGui(false);
    }
  };

  dungPhimTat(
    {
      'ctrl+s': () => gui(),
      esc: () => huy(),
      'ctrl+f': () => goc.current?.querySelector<HTMLInputElement>('input')?.focus(),
    },
    { batTat: batPhimTat },
  );

  /* giá tiền và chú thích cách tính theo QĐ2 */
  const giaTien = sua ? banGhiSua.giaTien : hangChon?.giaTien ?? 0;
  const tiLe = hangChon ? quyDinh?.hangVe.find((h) => h.maHangVe === hangChon.maHangVe)?.tiLeDonGia ?? (ct ? Math.round((hangChon.giaTien / ct.giaVe) * 100) : null) : null;
  const chuThichGia = sua ? (
    `Giá tiền ghi trên ${ten.doiTuong} lúc lập, không thay đổi khi sửa.`
  ) : hangChon && ct && tiLe !== null ? (
    <>
      = Giá vé {dinhDangTien(ct.giaVe)} x {tiLe}% ({hangChon.tenHangVe}, QĐ2)
    </>
  ) : (
    'Tự tính theo QĐ2: giá vé của chuyến bay x tỉ lệ đơn giá của hạng vé.'
  );

  const coLoc = !sua && (loc.sanBayDi || loc.sanBayDen || loc.ngay);
  const chuyenBayKhongDuoc = !sua && tt && !tt.duocPhep;

  return (
    <>
      <div className={s.boCuc}>
        <form
          ref={goc}
          className={`${s.the} ${rung ? s.dangRung : ''}`}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            gui();
          }}
          aria-labelledby="tieu-de-bieu-mau"
        >
          <div className={s.dauThe}>
            <div className={s.dauTheTrai}>
              <span className={s.iconThe} aria-hidden>
                <Ticket size={22} strokeWidth={2.2} />
              </span>
              <div>
                <h2 id="tieu-de-bieu-mau" className={s.tieuDeThe}>
                  {mucDich === 'banVe' ? 'Vé chuyến bay' : 'Phiếu đặt chỗ'}
                  <span className={s.nhanBieuMau}>{mucDich === 'banVe' ? 'BM2' : 'BM3'}</span>
                </h2>
                <p className={s.moTaThe}>
                  {sua
                    ? `Chỉ sửa thông tin hành khách. Muốn đổi chuyến bay hoặc hạng vé, hãy hủy ${ten.doiTuong} rồi lập lại.`
                    : 'Nhập đủ các ô có dấu *. Giá tiền do hệ thống tự tính khi chọn hạng vé.'}
                </p>
              </div>
            </div>
            {sua && (
              <NhanTrangThai loai="vang" coCham={false}>
                {mucDich === 'banVe' ? 'Vé' : 'Phiếu'} {banGhiSua.ma}
              </NhanTrangThai>
            )}
          </div>

          {coLoc && (
            <div className={s.loc}>
              <Filter size={16} aria-hidden />
              <span>
                Đang lọc chuyến bay:{' '}
                <b>
                  {loc.sanBayDi ?? 'mọi nơi'} → {loc.sanBayDen ?? 'mọi nơi'}
                </b>
                {loc.ngay && (
                  <>
                    {' '}
                    ngày <b>{dinhDangNgay(loc.ngay)}</b>
                  </>
                )}
                {!dsCB.dangTai && ` · ${dsCB.ds.length} chuyến bay`}
              </span>
              {onBoLoc && (
                <button type="button" className={s.boLoc} onClick={onBoLoc}>
                  <X size={14} /> Bỏ lọc
                </button>
              )}
            </div>
          )}

          <div className={s.luoi}>
            {/* hàng 1: Chuyến bay | Hành khách */}
            {sua ? (
              <ONhap
                nhan="Chuyến bay"
                readOnly
                iconTrai={<PlaneTakeoff size={18} />}
                value={ct ? `${ct.maChuyenBay} · ${ct.maSanBayDi} → ${ct.maSanBayDen} · ${dinhDangNgayGio(ct.ngayGioKhoiHanh)}` : banGhiSua.maChuyenBay}
                goiY="Không sửa được chuyến bay."
              />
            ) : (
              <OChon
                nhan="Chuyến bay"
                batBuoc
                giaTri={maCB}
                onDoi={chonChuyenBay}
                luaChon={dsCB.luaChon}
                dangTai={dsCB.dangTai}
                iconTrai={<PlaneTakeoff size={18} />}
                placeholder="Gõ mã chuyến bay hoặc mã sân bay"
                chuKhongCo={mucDich === 'banVe' ? 'Không có chuyến bay chưa khởi hành phù hợp' : 'Không có chuyến bay còn trong thời hạn đặt vé'}
                loi={loi.maChuyenBay ?? (chuyenBayKhongDuoc ? tt.thongBao : undefined)}
                goiY={
                  mucDich === 'banVe'
                    ? 'Chỉ hiện các chuyến bay chưa khởi hành.'
                    : `Chỉ hiện các chuyến bay khởi hành sau hôm nay ít nhất ${dsCB.soNgayToiThieu} ngày (QĐ3).`
                }
              />
            )}
            <ONhap
              nhan="Hành khách"
              batBuoc
              iconTrai={<UserRound size={18} />}
              placeholder="Họ và tên hành khách"
              maxLength={50}
              autoComplete="off"
              value={hk.hoTen}
              loi={loi.hoTen}
              onChange={(e) => doiTruong({ hoTen: e.target.value })}
              onBlur={() => roiTruong('hoTen')}
            />

            {/* hàng 2: CCCD/Hộ chiếu | Điện thoại */}
            <OGiayTo
              loai={hk.loaiGiayTo}
              so={hk.soGiayTo}
              onDoiLoai={(l) => doiTruong({ loaiGiayTo: l, soGiayTo: chuanHoaSoGiayTo(l, hk.soGiayTo) })}
              onDoiSo={(so) => doiTruong({ soGiayTo: so })}
              onRoi={timHanhKhach}
              loi={loi.soGiayTo}
              goiY={goiYGiayTo ?? (hk.loaiGiayTo === 'CCCD' ? 'Căn cước công dân gồm đúng 12 chữ số.' : 'Hộ chiếu gồm 6 đến 20 ký tự chữ in hoa và chữ số.')}
            />
            <ONhap
              nhan="Điện thoại"
              batBuoc
              iconTrai={<Phone size={18} />}
              placeholder="Ví dụ 0901234567 hoặc +84901234567"
              inputMode="tel"
              autoComplete="off"
              maxLength={16}
              value={hk.dienThoai}
              loi={loi.dienThoai}
              goiY="Từ 8 đến 15 chữ số, có thể bắt đầu bằng dấu + và mã quốc gia."
              onChange={(e) => doiTruong({ dienThoai: e.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '') })}
              onBlur={() => roiTruong('dienThoai')}
            />

            {/* hàng 3: Hạng vé | Giá tiền */}
            {sua ? (
              <ONhap nhan="Hạng vé" readOnly value={banGhiSua.tenHangVe} goiY="Không sửa được hạng vé." />
            ) : (
              <ChonHangVe
                hang={(tt?.hang ?? []).filter((h) => !ct || ct.gheTheoHang.some((g) => g.maHangVe === h.maHangVe && g.soLuongGhe > 0))}
                giaTri={maHang}
                dangTai={!!maCB && ttBan.isPending}
                disabled={!maCB || !!chuyenBayKhongDuoc}
                loi={loi.maHangVe}
                goiY={tt?.duocPhep && tt.hang.some((h) => h.soGheTrong <= 0) ? 'Hạng vé hết chỗ không chọn được.' : undefined}
                onDoi={(ma) => {
                  datMaHang(ma);
                  datLoi((l) => ({ ...l, maHangVe: undefined }));
                }}
              />
            )}
            <OGiaTien giaTien={giaTien} chuThich={chuThichGia} />
          </div>

          {mucDich === 'datVe' && !sua && tt?.duocPhep && tt.hanThanhToanDuKien && (
            <BangHanGiuCho han={tt.hanThanhToanDuKien} soNgayToiThieu={quyDinh?.thamSo.thoiGianDatVeChamNhat ?? 1} />
          )}
          {mucDich === 'datVe' && sua && banGhiSua.hanThanhToan && (
            <BangHanGiuCho han={banGhiSua.hanThanhToan} soNgayToiThieu={quyDinh?.thamSo.thoiGianDatVeChamNhat ?? 1} />
          )}

          <div className={s.chanThe}>
            <span className={s.phimGoiY}>
              <kbd>Ctrl</kbd>+<kbd>S</kbd> {sua ? 'lưu' : ten.dongTu} · <kbd>Esc</kbd> hủy
            </span>
            <div className={s.nutChan}>
              <Nut bienThe="nguy-hiem" muiTen={false} iconTrai={<X size={18} />} onClick={huy} disabled={dangGui}>
                Hủy
              </Nut>
              <Nut type="submit" kichThuoc="lon" dangXuLy={dangGui}>
                {sua ? 'Lưu' : ten.DongTu}
              </Nut>
            </div>
          </div>
        </form>

        <TheThongTinChuyenBay maChuyenBay={maCB} tomTat={tomTat} sanBay={quyDinh?.sanBay} thongTin={sua ? undefined : tt} chiXem={sua} />
      </div>

      <HopThoaiKetQua
        ketQua={ketQua}
        onDong={() => {
          datKetQua(null);
          datLai(true);
        }}
        nutPhu={{
          chu: mucDich === 'banVe' ? 'Bán vé khác' : 'Đặt vé khác',
          onClick: () => {
            datKetQua(null);
            datLai(true);
            window.setTimeout(() => goc.current?.querySelector<HTMLInputElement>('input[autocomplete="off"]:not([role])')?.focus(), 200);
          },
        }}
        nutChinh={{
          chu: mucDich === 'banVe' ? 'Xem danh sách vé' : 'Xem danh sách phiếu',
          onClick: () => {
            datKetQua(null);
            dieuHuong(veDanhSach);
          },
        }}
      />
    </>
  );
}
