// Biểu mẫu Lịch chuyến bay (BM1) cho chế độ thêm và sửa (MH_ThemSuaChuyenBay)
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CalendarClock, Info, Lock, MapPin, PlaneLanding, PlaneTakeoff, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { apiChuyenBay } from '@/api/dich_vu';
import { laLoiApi, thongBaoLoi } from '@/api/may_khach';
import type { ChuyenBayChiTiet, QuyDinh } from '@/kieu/api';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { OChon, type LuaChon } from '@/thanh_phan/OChon';
import { ONgay } from '@/thanh_phan/ONgay';
import { ONhap } from '@/thanh_phan/ONhap';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangSo, dinhDangTien } from '@/tien_ich/dinh_dang';
import { dungBayGio } from '@/tien_ich/hook';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { sangIso } from '@/tien_ich/thoi_gian';
import {
  bieuMauTrong,
  bieuMauTuChiTiet,
  doiKhoaLoiMayChu,
  idO,
  kiemTraBieuMau,
  taoIdDong,
  taoYeuCau,
  thuTuKhoa,
  type BangLoi,
  type CheDoBieuMau,
  type DuLieuBieuMau,
  type DongTrungGian,
} from './kiem_tra';
import { TheHanhTrinh } from './TheHanhTrinh';
import s from './ChuyenBay.module.css';

const chiSo = (v: string, toiDa = 12) => v.replace(/\D/g, '').slice(0, toiDa);
const chonHet = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

export interface ThuocTinhBieuMau {
  cheDo: CheDoBieuMau;
  quyDinh: QuyDinh;
  chiTiet?: ChuyenBayChiTiet;
}

export function BieuMauChuyenBay({ cheDo, quyDinh, chiTiet }: ThuocTinhBieuMau) {
  const dieuHuong = useNavigate();
  const boTruyVan = useQueryClient();
  const bayGio = dungBayGio(30000);
  const { thamSo, hangVe } = quyDinh;
  const goc = useMemo(() => (chiTiet ? bieuMauTuChiTiet(chiTiet, hangVe) : bieuMauTrong(hangVe)), [chiTiet, hangVe]);
  const [f, datF] = useState<DuLieuBieuMau>(goc);
  const [cham, datCham] = useState<Set<string>>(new Set());
  const [daGui, datDaGui] = useState(false);
  const [loiMayChu, datLoiMayChu] = useState<BangLoi>({});
  const [dangLuu, datDangLuu] = useState(false);
  const [dangXoa, datDangXoa] = useState<Set<string>>(new Set());
  const gocRef = useRef<HTMLFormElement>(null);

  const daDung = useMemo(() => Object.fromEntries((chiTiet?.gheTheoHang ?? []).map((g) => [g.maHangVe, g.soDaBanVaDat])) as Record<string, number>, [chiTiet]);
  const loiCuc = useMemo(() => kiemTraBieuMau(f, { cheDo, thamSo, hangVe, daDung, bayGio }), [f, cheDo, thamSo, hangVe, daDung, bayGio]);
  const daDoi =
    JSON.stringify({ ...f, trungGian: f.trungGian.map(({ id: _, ...c }) => c) }) !==
    JSON.stringify({ ...goc, trungGian: goc.trungGian.map(({ id: _, ...c }) => c) });

  // nhắc trước khi rời trang khi đang nhập dở
  useEffect(() => {
    if (!daDoi) return;
    const chan = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', chan);
    return () => window.removeEventListener('beforeunload', chan);
  }, [daDoi]);

  const loi = (khoa: string): string | undefined => loiMayChu[khoa] ?? (daGui || cham.has(khoa) ? loiCuc[khoa] : undefined);
  const danhDau = (khoa: string) => datCham((c) => (c.has(khoa) ? c : new Set(c).add(khoa)));
  const boLoiMayChu = (...khoa: string[]) =>
    datLoiMayChu((l) => {
      if (!khoa.some((k) => k in l)) return l;
      const moi = { ...l };
      khoa.forEach((k) => delete moi[k]);
      return moi;
    });

  const doi = <K extends keyof DuLieuBieuMau>(k: K, v: DuLieuBieuMau[K], nhom: string[] = []) => {
    datF((cu) => ({ ...cu, [k]: v }));
    boLoiMayChu(k as string, ...nhom);
  };

  const doiGhe = (maHang: string, v: string) => {
    datF((cu) => ({ ...cu, ghe: { ...cu.ghe, [maHang]: chiSo(v, 5) } }));
    danhDau(`ghe.${maHang}`);
    boLoiMayChu(`ghe.${maHang}`, 'gheTheoHang');
  };

  const doiTg = (id: string, phan: Partial<DongTrungGian>, truong: string) => {
    datF((cu) => ({ ...cu, trungGian: cu.trungGian.map((t) => (t.id === id ? { ...t, ...phan } : t)) }));
    boLoiMayChu(`tg.${id}.${truong}`, 'trungGian');
  };

  const conDong = f.trungGian.filter((t) => !dangXoa.has(t.id));
  const duocThemTg = conDong.length < thamSo.soSanBayTrungGianToiDa;

  const themTg = () => {
    if (!duocThemTg) return;
    const id = taoIdDong();
    datF((cu) => ({ ...cu, trungGian: [...cu.trungGian, { id, maSanBay: null, thoiGianDung: String(thamSo.thoiGianDungToiThieu), ghiChu: '' }] }));
    boLoiMayChu('trungGian');
    // đưa con trỏ vào ô sân bay của dòng mới
    window.setTimeout(() => document.getElementById(idO(`tg.${id}.maSanBay`))?.focus(), 60);
  };

  const xoaTg = (id: string) => {
    datDangXoa((d) => new Set(d).add(id));
    window.setTimeout(() => {
      datF((cu) => ({ ...cu, trungGian: cu.trungGian.filter((t) => t.id !== id) }));
      datDangXoa((d) => {
        const m = new Set(d);
        m.delete(id);
        return m;
      });
      boLoiMayChu('trungGian');
    }, 240);
  };

  const veOLoiDau = (bang: BangLoi) => {
    const dau = thuTuKhoa(f, hangVe).find((k) => bang[k]);
    if (!dau) return;
    const el = document.getElementById(idO(dau));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }
  };

  const luu = async () => {
    if (dangLuu) return;
    datDaGui(true);
    if (Object.keys(loiCuc).length) {
      hienToast.loi('Thông tin chưa hợp lệ, vui lòng kiểm tra các ô được đánh dấu đỏ.');
      veOLoiDau(loiCuc);
      return;
    }
    const yc = taoYeuCau(f, hangVe);
    datDangLuu(true);
    try {
      if (cheDo === 'them') await apiChuyenBay.them(yc);
      else await apiChuyenBay.sua(yc.maChuyenBay, yc);
      hienToast.thanhCong(cheDo === 'them' ? `Thêm chuyến bay ${yc.maChuyenBay} thành công.` : `Cập nhật chuyến bay ${yc.maChuyenBay} thành công.`);
      await boTruyVan.invalidateQueries({ queryKey: ['chuyen-bay'] });
      dieuHuong('/chuyen-bay', { replace: cheDo === 'sua' });
    } catch (e) {
      if (!laLoiApi(e)) {
        baoLoi('Lưu chuyến bay không thành công', thongBaoLoi(e));
        return;
      }
      const bang = doiKhoaLoiMayChu(e.chiTiet, yc, f);
      if (e.ma === 'TRUNG_MA' && !bang.maChuyenBay) bang.maChuyenBay = e.thongBao;
      datLoiMayChu(bang);
      if (e.trangThai === 409) {
        const tieuDe =
          e.ma === 'TRUNG_MA'
            ? 'Mã chuyến bay đã tồn tại'
            : e.ma === 'VI_PHAM_QD1'
              ? 'Lịch chuyến bay vi phạm quy định 1'
              : e.ma === 'DA_CO_VE_HOAC_PHIEU'
                ? 'Không thể giảm số ghế'
                : 'Không lưu được chuyến bay';
        // máy chủ chỉ báo ngắn "Mã chuyến bay đã tồn tại", trùng với tiêu đề nên ghi rõ mã và cách xử lý
        const noiDung = e.ma === 'TRUNG_MA' ? `Chuyến bay ${yc.maChuyenBay} đã có trong lịch. Vui lòng nhập mã chuyến bay khác.` : e.thongBao;
        await baoLoi(tieuDe, noiDung);
      } else if (!Object.keys(bang).length) {
        baoLoi('Lưu chuyến bay không thành công', e.thongBao);
      } else {
        hienToast.loi(e.thongBao);
      }
      veOLoiDau(bang);
    } finally {
      datDangLuu(false);
    }
  };

  const huy = async () => {
    if (daDoi) {
      const dongY = await hoiXacNhan({
        loai: 'xac-nhan',
        tieuDe: 'Hủy thông tin đang nhập?',
        noiDung: 'Các thay đổi chưa lưu sẽ bị bỏ. Chuyến bay giữ nguyên như trước khi mở biểu mẫu.',
        nutDongY: 'Hủy thay đổi',
        nutHuy: 'Tiếp tục nhập',
      });
      if (!dongY) return;
    }
    dieuHuong(cheDo === 'sua' && chiTiet ? `/chuyen-bay/${chiTiet.maChuyenBay}` : '/chuyen-bay');
  };

  dungPhimTat({ 'ctrl+s': () => void luu() });

  /* ---------- dữ liệu hiển thị ---------- */
  const sanBay: LuaChon[] = quyDinh.sanBay.map((sb) => ({ giaTri: sb.maSanBay, ma: sb.maSanBay, nhan: sb.tenSanBay }));
  const vaiTroSanBay = (ma: string, boQuaId?: string) => {
    if (ma === f.maSanBayDi) return 'Sân bay đi';
    if (ma === f.maSanBayDen) return 'Sân bay đến';
    const tg = conDong.findIndex((t) => t.id !== boQuaId && t.maSanBay === ma);
    return tg >= 0 ? 'Đã chọn làm trung gian' : undefined;
  };
  const luaChonCo = (boQuaId?: string, boQuaVaiTro?: 'di' | 'den'): LuaChon[] =>
    sanBay.map((l) => {
      let phu = vaiTroSanBay(l.giaTri, boQuaId);
      if ((boQuaVaiTro === 'di' && phu === 'Sân bay đi') || (boQuaVaiTro === 'den' && phu === 'Sân bay đến')) phu = undefined;
      return { ...l, phu };
    });
  const timSanBay = (ma: string | null) => (ma ? quyDinh.sanBay.find((x) => x.maSanBay === ma) : undefined);
  const giaVe = Number(f.giaVe) || 0;
  const tongGhe = hangVe.reduce((t, h) => t + (Number(f.ghe[h.maHangVe]) || 0), 0);
  const tongDaDung = Object.values(daDung).reduce((a, b) => a + b, 0);
  const thoiGianBay = Number(f.thoiGianBay) || null;
  const minNgayGio = cheDo === 'them' ? sangIso(bayGio).slice(0, 16) : undefined;

  const dsKiemTra = [
    {
      nhan: 'Thời gian bay tối thiểu',
      giaTri: `${thamSo.thoiGianBayToiThieu} phút`,
      loi: !!f.thoiGianBay && !!loiCuc.thoiGianBay,
      dat: !!f.thoiGianBay && !loiCuc.thoiGianBay,
    },
    {
      nhan: 'Sân bay trung gian tối đa',
      giaTri: `${conDong.length} / ${thamSo.soSanBayTrungGianToiDa}`,
      loi: !!loiCuc.trungGian,
      dat: false,
    },
    {
      nhan: 'Thời gian dừng',
      giaTri: `${thamSo.thoiGianDungToiThieu} đến ${thamSo.thoiGianDungToiDa} phút`,
      loi: f.trungGian.some((t) => !!loiCuc[`tg.${t.id}.thoiGianDung`] && t.thoiGianDung !== ''),
      dat: conDong.length > 0 && !f.trungGian.some((t) => loiCuc[`tg.${t.id}.thoiGianDung`]),
    },
  ];

  return (
    <form
      ref={gocRef}
      className={s.rung}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void luu();
      }}
    >
      <div className={s.luoi}>
        <div className={s.cot}>
          {/* ---------- thông tin chung ---------- */}
          <section className={s.the} aria-labelledby="muc-thong-tin">
            <div className={s.dauThe}>
              <div className={s.dauTheTrai}>
                <span className={s.soMuc}>1</span>
                <div>
                  <h2 className={s.tieuDeThe} id="muc-thong-tin">
                    Thông tin chuyến bay
                  </h2>
                  <p className={s.phuThe}>Các ô có dấu * là bắt buộc</p>
                </div>
              </div>
            </div>
            <div className={s.luoiO}>
              {cheDo === 'sua' ? (
                <ONhap
                  id={idO('maChuyenBay')}
                  className={s.oKhoa}
                  nhan="Mã chuyến bay"
                  value={f.maChuyenBay}
                  readOnly
                  iconTrai={<Lock size={16} />}
                  goiY="Mã chuyến bay không sửa được sau khi lưu."
                />
              ) : (
                <ONhap
                  id={idO('maChuyenBay')}
                  className={s.oMaNhap}
                  nhan="Mã chuyến bay"
                  batBuoc
                  autoFocus
                  placeholder="Ví dụ CB245"
                  maxLength={10}
                  value={f.maChuyenBay}
                  loi={loi('maChuyenBay')}
                  goiY="Tối đa 10 ký tự, gồm chữ in hoa và số."
                  onChange={(e) => doi('maChuyenBay', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onBlur={() => danhDau('maChuyenBay')}
                />
              )}
              <ONhap
                id={idO('giaVe')}
                nhan="Giá vé (VND)"
                batBuoc
                inputMode="numeric"
                placeholder="Ví dụ 1.500.000"
                value={f.giaVe ? dinhDangSo(Number(f.giaVe)) : ''}
                loi={loi('giaVe')}
                goiY="Đơn giá của chuyến bay; giá từng hạng tính theo tỉ lệ đơn giá."
                ben={<span className={s.donVi}>₫</span>}
                onChange={(e) => doi('giaVe', chiSo(e.target.value))}
                onBlur={() => danhDau('giaVe')}
              />
              <OChon
                id={idO('maSanBayDi')}
                nhan="Sân bay đi"
                batBuoc
                giaTri={f.maSanBayDi}
                onDoi={(g) => {
                  doi('maSanBayDi', g, ['maSanBayDen']);
                  danhDau('maSanBayDi');
                }}
                luaChon={luaChonCo(undefined, 'di')}
                placeholder="Gõ mã hoặc tên sân bay"
                iconTrai={<PlaneTakeoff size={18} />}
                loi={loi('maSanBayDi')}
              />
              <OChon
                id={idO('maSanBayDen')}
                nhan="Sân bay đến"
                batBuoc
                giaTri={f.maSanBayDen}
                onDoi={(g) => {
                  doi('maSanBayDen', g);
                  danhDau('maSanBayDen');
                }}
                luaChon={luaChonCo(undefined, 'den')}
                placeholder="Gõ mã hoặc tên sân bay"
                iconTrai={<PlaneLanding size={18} />}
                loi={loi('maSanBayDen')}
                goiY="Phải khác sân bay đi."
              />
              <ONgay
                id={idO('ngayGioKhoiHanh')}
                coGio
                nhan="Ngày giờ khởi hành"
                batBuoc
                min={minNgayGio}
                value={f.ngayGioKhoiHanh}
                loi={loi('ngayGioKhoiHanh')}
                goiY={cheDo === 'them' ? 'Phải sau thời điểm hiện tại.' : 'Định dạng ngày/tháng/năm giờ:phút.'}
                onChange={(e) => {
                  doi('ngayGioKhoiHanh', e.target.value);
                  danhDau('ngayGioKhoiHanh');
                }}
              />
              <ONhap
                id={idO('thoiGianBay')}
                nhan="Thời gian bay (phút)"
                batBuoc
                inputMode="numeric"
                placeholder={`Từ ${thamSo.thoiGianBayToiThieu} phút`}
                value={f.thoiGianBay}
                loi={loi('thoiGianBay')}
                goiY={`Tối thiểu ${thamSo.thoiGianBayToiThieu} phút (QĐ1).`}
                ben={<span className={s.donVi}>phút</span>}
                onChange={(e) => doi('thoiGianBay', chiSo(e.target.value, 5))}
                onBlur={() => danhDau('thoiGianBay')}
              />
            </div>
          </section>

          {/* ---------- số ghế theo hạng ---------- */}
          <section className={s.the} aria-labelledby="muc-ghe">
            <div className={s.dauThe}>
              <div className={s.dauTheTrai}>
                <span className={s.soMuc}>2</span>
                <div>
                  <h2 className={s.tieuDeThe} id="muc-ghe">
                    Số lượng ghế theo hạng vé
                  </h2>
                  <p className={s.phuThe}>
                    Nhập 0 nếu chuyến bay không bán hạng đó; phải có ít nhất một hạng có ghế.
                    {cheDo === 'sua' && ' Số ghế mới không được nhỏ hơn số đã bán và đã đặt.'}
                  </p>
                </div>
              </div>
            </div>
            <table className={s.bangNhap}>
              <thead>
                <tr>
                  <th>Hạng vé</th>
                  <th className={s.phai}>Giá vé hạng</th>
                  {cheDo === 'sua' && <th className={s.phai}>Đã bán và đặt</th>}
                  <th className={s.phai}>Số lượng ghế</th>
                </tr>
              </thead>
              <tbody>
                {hangVe.map((h) => (
                  <tr key={h.maHangVe}>
                    <td>
                      <span className={s.tenHang}>
                        <span className={s.maHang}>{h.maHangVe}</span>
                        <span>
                          <b>{h.tenHangVe}</b> <span className={s.tiLe}>· {dinhDangSo(h.tiLeDonGia)}% đơn giá</span>
                        </span>
                      </span>
                    </td>
                    <td className={`${s.giaHang} ${s.phai}`}>{giaVe ? dinhDangTien(Math.round((giaVe * h.tiLeDonGia) / 100)) : '--'}</td>
                    {cheDo === 'sua' && (
                      <td className={`${s.soDung} ${s.phai}`}>
                        <b>{dinhDangSo(daDung[h.maHangVe] ?? 0)}</b> ghế
                      </td>
                    )}
                    <td>
                      <ONhap
                        id={idO(`ghe.${h.maHangVe}`)}
                        className={s.oSo}
                        aria-label={`Số lượng ghế ${h.tenHangVe}`}
                        inputMode="numeric"
                        value={f.ghe[h.maHangVe] ?? ''}
                        loi={loi(`ghe.${h.maHangVe}`)}
                        ben={<span className={s.donVi}>ghế</span>}
                        onFocus={chonHet}
                        onChange={(e) => doiGhe(h.maHangVe, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Tổng cộng</td>
                  <td />
                  {cheDo === 'sua' && <td className={s.phai}>{dinhDangSo(tongDaDung)} ghế</td>}
                  <td className={s.phai}>{dinhDangSo(tongGhe)} ghế</td>
                </tr>
              </tfoot>
            </table>
            {loi('gheTheoHang') && (
              <p className={s.loiBang} id={idO('gheTheoHang')} role="alert" tabIndex={-1}>
                <AlertCircle size={15} /> {loi('gheTheoHang')}
              </p>
            )}
          </section>

          {/* ---------- sân bay trung gian ---------- */}
          <section className={s.the} aria-labelledby="muc-tg">
            <div className={s.dauThe}>
              <div className={s.dauTheTrai}>
                <span className={s.soMuc}>3</span>
                <div>
                  <h2 className={s.tieuDeThe} id="muc-tg">
                    Sân bay trung gian
                  </h2>
                  <p className={s.phuThe}>
                    Tối đa {thamSo.soSanBayTrungGianToiDa} sân bay, thời gian dừng từ {thamSo.thoiGianDungToiThieu} đến {thamSo.thoiGianDungToiDa} phút (QĐ1).
                    Nhập theo thứ tự dừng.
                  </p>
                </div>
              </div>
            </div>
            {f.trungGian.length === 0 ? (
              <div className={s.trongTg}>
                <MapPin size={28} color="var(--do-500)" />
                <span>
                  <b>Chuyến bay bay thẳng</b>
                  Không có sân bay trung gian. Bấm Thêm sân bay trung gian nếu chuyến bay có điểm dừng.
                </span>
              </div>
            ) : (
              <table className={`${s.bangNhap} ${s.bangTg}`}>
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>STT</th>
                    <th>Sân bay trung gian</th>
                    <th style={{ width: 158 }}>Thời gian dừng</th>
                    <th>Ghi chú</th>
                    <th style={{ width: 60 }} aria-label="Xóa dòng" />
                  </tr>
                </thead>
                <tbody>
                  {f.trungGian.map((t) => {
                    const thuTu = conDong.findIndex((x) => x.id === t.id);
                    return (
                      <tr key={t.id} className={dangXoa.has(t.id) ? s.dongDangXoa : s.dongTg}>
                        <td>
                          <span className={s.sttTg}>{thuTu >= 0 ? thuTu + 1 : ''}</span>
                        </td>
                        <td>
                          <OChon
                            id={idO(`tg.${t.id}.maSanBay`)}
                            className={s.oTgSanBay}
                            giaTri={t.maSanBay}
                            onDoi={(g) => {
                              doiTg(t.id, { maSanBay: g }, 'maSanBay');
                              danhDau(`tg.${t.id}.maSanBay`);
                            }}
                            luaChon={luaChonCo(t.id)}
                            placeholder="Chọn sân bay"
                            loi={loi(`tg.${t.id}.maSanBay`)}
                          />
                        </td>
                        <td>
                          <ONhap
                            id={idO(`tg.${t.id}.thoiGianDung`)}
                            className={s.oTgDung}
                            aria-label="Thời gian dừng (phút)"
                            inputMode="numeric"
                            value={t.thoiGianDung}
                            loi={loi(`tg.${t.id}.thoiGianDung`)}
                            ben={<span className={s.donVi}>phút</span>}
                            onFocus={chonHet}
                            onChange={(e) => doiTg(t.id, { thoiGianDung: chiSo(e.target.value, 4) }, 'thoiGianDung')}
                            onBlur={() => danhDau(`tg.${t.id}.thoiGianDung`)}
                          />
                        </td>
                        <td>
                          <ONhap
                            id={idO(`tg.${t.id}.ghiChu`)}
                            aria-label="Ghi chú"
                            placeholder="Ví dụ đón thêm khách"
                            maxLength={200}
                            value={t.ghiChu}
                            loi={loi(`tg.${t.id}.ghiChu`)}
                            onChange={(e) => doiTg(t.id, { ghiChu: e.target.value }, 'ghiChu')}
                          />
                        </td>
                        <td>
                          <NutTron
                            nhan={`Xóa sân bay trung gian thứ ${thuTu + 1}`}
                            bienThe="do"
                            kichThuoc="nho"
                            className={s.nutXoaDong}
                            onClick={() => xoaTg(t.id)}
                          >
                            <Trash2 size={16} />
                          </NutTron>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {loi('trungGian') && (
              <p className={s.loiBang} id={idO('trungGian')} role="alert" tabIndex={-1}>
                <AlertCircle size={15} /> {loi('trungGian')}
              </p>
            )}
            <div className={s.chanTg}>
              <span className={s.ghiChuNho}>
                <Info size={15} />
                {duocThemTg
                  ? `Còn thêm được ${thamSo.soSanBayTrungGianToiDa - conDong.length} sân bay trung gian.`
                  : `Đã đủ ${thamSo.soSanBayTrungGianToiDa} sân bay trung gian theo quy định.`}
              </span>
              <Nut bienThe="phu" kichThuoc="nho" muiTen={false} iconTrai={<Plus size={16} strokeWidth={2.6} />} onClick={themTg} disabled={!duocThemTg}>
                Thêm sân bay trung gian
              </Nut>
            </div>
          </section>
        </div>

        <aside className={s.cotPhai}>
          <TheHanhTrinh
            maChuyenBay={f.maChuyenBay}
            di={timSanBay(f.maSanBayDi) ? { ma: f.maSanBayDi!, ten: timSanBay(f.maSanBayDi)!.tenSanBay } : null}
            den={timSanBay(f.maSanBayDen) ? { ma: f.maSanBayDen!, ten: timSanBay(f.maSanBayDen)!.tenSanBay } : null}
            soDiemDung={conDong.length}
            ngayGio={f.ngayGioKhoiHanh}
            thoiGianBay={thoiGianBay}
            tongGhe={tongGhe}
            gheTrong={cheDo === 'sua' ? Math.max(0, tongGhe - tongDaDung) : undefined}
            giaVe={giaVe || null}
          />
          <section className={s.theQuyDinh} aria-labelledby="muc-qd1">
            <h3 id="muc-qd1">
              <ShieldCheck size={18} /> Quy định đang áp dụng (QĐ1)
            </h3>
            <ul className={s.dsQuyDinh}>
              {dsKiemTra.map((k) => (
                <li key={k.nhan} data-loi={k.loi || undefined} data-dat={k.dat || undefined}>
                  {k.nhan}
                  <b>{k.giaTri}</b>
                </li>
              ))}
              {cheDo === 'them' && (
                <li
                  data-loi={(!!f.ngayGioKhoiHanh && !!loiCuc.ngayGioKhoiHanh) || undefined}
                  data-dat={(!!f.ngayGioKhoiHanh && !loiCuc.ngayGioKhoiHanh) || undefined}
                >
                  Khởi hành
                  <b>
                    <CalendarClock size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> sau hiện tại
                  </b>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      <div className={s.thanhNut}>
        <span className={s.thanhNutChu}>
          <span className={`${s.chamTrangThai} ${daDoi ? s.chamDoi : ''}`} aria-hidden />
          {daDoi ? 'Có thay đổi chưa lưu.' : 'Chưa có thay đổi.'} Nhấn <kbd>Ctrl</kbd> + <kbd>S</kbd> để lưu.
        </span>
        <span className={s.thanhNutPhai}>
          <Nut bienThe="nguy-hiem" muiTen={false} onClick={huy} disabled={dangLuu}>
            Hủy
          </Nut>
          <Nut type="submit" dangXuLy={dangLuu}>
            {cheDo === 'them' ? 'Lưu chuyến bay' : 'Lưu thay đổi'}
          </Nut>
        </span>
      </div>
    </form>
  );
}
