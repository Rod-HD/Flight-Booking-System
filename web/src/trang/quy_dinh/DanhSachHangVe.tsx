// Thẻ danh sách hạng vé (TH05): thêm (mã, tên, tỉ lệ đơn giá), sửa tên, xóa hạng chưa được chuyến bay sử dụng
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Info, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { laLoiApi, thongBaoLoi } from '@/api/may_khach';
import type { HangVe } from '@/kieu/api';
import { IconVeSao } from '@/icons3d';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { HopThoai } from '@/thanh_phan/HopThoai';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { ONhap } from '@/thanh_phan/ONhap';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangSo, dinhDangTien } from '@/tien_ich/dinh_dang';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import s from './QuyDinh.module.css';

/** Đưa con trỏ về ô đang báo lỗi trong hộp thoại */
function veOLoi() {
  window.setTimeout(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus(), 40);
}

type CheDo = { loai: 'them' } | { loai: 'sua'; hangVe: HangVe } | null;

/** '105,5' hoặc '105.5' sang 105.5; chuỗi sai trả NaN */
const docTiLe = (v: string) => (v.trim() ? Number(v.trim().replace(',', '.')) : NaN);
const hienTiLe = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

function HopThoaiHangVe({ cheDo, onDong }: { cheDo: CheDo; onDong: () => void }) {
  const boTruyVan = useQueryClient();
  const [ma, datMa] = useState('');
  const [ten, datTen] = useState('');
  const [tiLe, datTiLe] = useState('');
  const [loi, datLoi] = useState<Record<string, string>>({});
  const [daGui, datDaGui] = useState(false);
  const [dangLuu, datDangLuu] = useState(false);
  const [cuoi, datCuoi] = useState<CheDo>(cheDo);

  useEffect(() => {
    if (cheDo) {
      datCuoi(cheDo);
      datMa(cheDo.loai === 'sua' ? cheDo.hangVe.maHangVe : '');
      datTen(cheDo.loai === 'sua' ? cheDo.hangVe.tenHangVe : '');
      datTiLe(cheDo.loai === 'sua' ? hienTiLe(cheDo.hangVe.tiLeDonGia) : '');
      datLoi({});
      datDaGui(false);
    }
  }, [cheDo]);

  const cd = cheDo ?? cuoi;
  const laSua = cd?.loai === 'sua';

  const kiemTra = () => {
    const l: Record<string, string> = {};
    if (!laSua) {
      if (!/^[A-Z0-9]{1,5}$/.test(ma)) l.maHangVe = 'Mã hạng vé gồm 1 đến 5 ký tự chữ in hoa và số.';
      const t = docTiLe(tiLe);
      if (!tiLe.trim()) l.tiLeDonGia = 'Chưa nhập tỉ lệ đơn giá.';
      else if (isNaN(t)) l.tiLeDonGia = 'Tỉ lệ đơn giá phải là số.';
      else if (t <= 0) l.tiLeDonGia = 'Tỉ lệ đơn giá phải lớn hơn 0.';
      else if (t > 999.99) l.tiLeDonGia = 'Tỉ lệ đơn giá không được lớn hơn 999,99%.';
      else if (Math.round(t * 100) !== t * 100) l.tiLeDonGia = 'Tỉ lệ đơn giá có tối đa hai chữ số thập phân.';
    }
    if (!ten.trim()) l.tenHangVe = 'Chưa nhập tên hạng vé.';
    else if (ten.trim().length > 30) l.tenHangVe = 'Tên hạng vé tối đa 30 ký tự.';
    return l;
  };
  const loiHien = { ...(daGui ? kiemTra() : {}), ...loi };
  const tiLeSo = docTiLe(tiLe);

  const luu = async () => {
    if (!cd || dangLuu) return;
    datDaGui(true);
    if (Object.keys(kiemTra()).length) {
      veOLoi();
      return;
    }
    datDangLuu(true);
    try {
      if (cd.loai === 'sua') {
        await apiQuyDinh.suaHangVe(cd.hangVe.maHangVe, ten.trim());
        hienToast.thanhCong(`Cập nhật hạng vé ${cd.hangVe.maHangVe} thành công.`);
      } else {
        await apiQuyDinh.themHangVe({ maHangVe: ma, tenHangVe: ten.trim(), tiLeDonGia: tiLeSo });
        hienToast.thanhCong(`Thêm hạng vé ${ten.trim()} thành công.`);
      }
      await boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.quyDinh });
      onDong();
    } catch (e) {
      if (laLoiApi(e) && e.chiTiet && Object.keys(e.chiTiet).length) datLoi(e.chiTiet);
      else if (laLoiApi(e) && e.ma === 'TRUNG_MA') datLoi({ maHangVe: e.thongBao });
      else baoLoi('Không lưu được hạng vé', thongBaoLoi(e));
    } finally {
      datDangLuu(false);
      veOLoi();
    }
  };

  dungPhimTat({ 'ctrl+s': () => void luu(), esc: () => !dangLuu && onDong() }, { batTat: !!cheDo, keCaHopThoai: true });

  return (
    <HopThoai
      mo={!!cheDo}
      onDong={onDong}
      rong={520}
      icon={<IconVeSao kichThuoc={52} />}
      tieuDe={laSua ? 'Sửa tên hạng vé' : 'Thêm hạng vé'}
      moTa={laSua ? 'Chỉ sửa tên khi nhập sai; mã và tỉ lệ đơn giá giữ nguyên.' : 'Giá tiền của hạng bằng giá vé chuyến bay nhân tỉ lệ đơn giá (QĐ2).'}
      dongKhiBamNen={!dangLuu}
      chan={
        <>
          <Nut bienThe="nguy-hiem" muiTen={false} onClick={onDong} disabled={dangLuu}>
            Hủy
          </Nut>
          <Nut type="submit" form="form-hang-ve" dangXuLy={dangLuu}>
            Lưu
          </Nut>
        </>
      }
    >
      <form
        id="form-hang-ve"
        className={`${s.cotO} ${s.rung}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void luu();
        }}
      >
        <ONhap
          className={s.oMa}
          nhan="Mã hạng vé"
          batBuoc={!laSua}
          readOnly={laSua}
          iconTrai={laSua ? <Lock size={16} /> : undefined}
          data-tu-focus={laSua ? undefined : true}
          placeholder="Ví dụ H3"
          maxLength={5}
          value={ma}
          loi={loiHien.maHangVe}
          goiY={laSua ? 'Mã hạng vé không sửa được sau khi lưu.' : 'Từ 1 đến 5 ký tự chữ in hoa và số.'}
          onChange={(e) => {
            datMa(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
            datLoi(({ maHangVe: _, ...c }) => c);
          }}
        />
        <ONhap
          nhan="Tên hạng vé"
          batBuoc
          data-tu-focus={laSua ? true : undefined}
          placeholder="Ví dụ Hạng 3"
          maxLength={30}
          value={ten}
          loi={loiHien.tenHangVe}
          goiY="Không trùng tên hạng vé đã có."
          onChange={(e) => {
            datTen(e.target.value);
            datLoi(({ tenHangVe: _, ...c }) => c);
          }}
        />
        <ONhap
          className={s.oSoLon}
          nhan="Tỉ lệ đơn giá (%)"
          batBuoc={!laSua}
          disabled={laSua}
          iconTrai={laSua ? <Lock size={16} /> : undefined}
          inputMode="decimal"
          placeholder="Ví dụ 110"
          value={tiLe}
          loi={loiHien.tiLeDonGia}
          goiY={
            laSua ? (
              <span className={s.ghiChuKhoa}>Tỉ lệ chỉ nhập khi thêm hạng vé.</span>
            ) : (
              'Số lớn hơn 0, tối đa hai chữ số thập phân. Tỉ lệ chỉ nhập khi thêm hạng vé, không sửa sau khi lưu.'
            )
          }
          ben={<span className={s.donVi}>%</span>}
          onChange={(e) => {
            datTiLe(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7));
            datLoi(({ tiLeDonGia: _, ...c }) => c);
          }}
        />
        {!laSua && tiLeSo > 0 && (
          <p className={s.giaVi} key={tiLe}>
            Ví dụ: chuyến bay có giá vé <b>{dinhDangTien(1000000)}</b> thì vé hạng này có giá <b>{dinhDangTien(Math.round(1000000 * tiLeSo) / 100)}</b>.
          </p>
        )}
      </form>
    </HopThoai>
  );
}

export function DanhSachHangVe({ hangVe, dangTai, loi }: { hangVe: HangVe[] | undefined; dangTai: boolean; loi: unknown }) {
  const boTruyVan = useQueryClient();
  const [cheDo, datCheDo] = useState<CheDo>(null);
  const [chon, datChon] = useState<string | null>(null);

  const xoa = async (x: HangVe) => {
    datChon(x.maHangVe);
    const dongY = await hoiXacNhan({
      tieuDe: `Xóa hạng vé ${x.tenHangVe}?`,
      noiDung: 'Chỉ xóa được hạng vé chưa có chuyến bay nào sử dụng. Danh sách luôn còn ít nhất một hạng vé.',
      nutDongY: 'Xóa',
    });
    if (!dongY) return;
    try {
      await apiQuyDinh.xoaHangVe(x.maHangVe);
      hienToast.thanhCong(`Xóa hạng vé ${x.tenHangVe} thành công.`);
      datChon(null);
      boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.quyDinh });
    } catch (e) {
      baoLoi('Không thể xóa hạng vé', thongBaoLoi(e));
    }
  };

  return (
    <section className={s.theDs} aria-labelledby="ds-hang-ve">
      <div className={s.dauDs}>
        <div className={s.dauDsTrai}>
          <div>
            <h3 className={s.tieuDeDs} id="ds-hang-ve">
              Danh sách hạng vé
            </h3>
            <p className={s.phuDs}>Số lượng hạng vé và tỉ lệ đơn giá theo QĐ2</p>
          </div>
          <NhanTrangThai loai="do" coCham={false} nho>
            {hangVe?.length ?? 0} hạng
          </NhanTrangThai>
        </div>
        <Nut kichThuoc="nho" iconTrai={<Plus size={16} strokeWidth={2.6} />} onClick={() => datCheDo({ loai: 'them' })}>
          Thêm hạng vé
        </Nut>
      </div>
      <BangDuLieu<HangVe>
        nhan="Danh sách hạng vé"
        duLieu={hangVe}
        dangTai={dangTai}
        loi={loi}
        khoaDong={(d) => d.maHangVe}
        dongDangChon={chon}
        onChonDong={(d) => datChon(d.maHangVe)}
        onMoDong={(d) => datCheDo({ loai: 'sua', hangVe: d })}
        soDongXuong={2}
        rong={{ tieuDe: 'Chưa có hạng vé', goiY: 'Bấm Thêm hạng vé để bắt đầu.', linhVat: 'tra_cuu' }}
        cot={[
          { khoa: 'stt', tieuDe: 'STT', rong: 60, hien: (_, i) => <span className={s.stt}>{i + 1}</span> },
          { khoa: 'ma', tieuDe: 'Mã hạng', rong: 100, hien: (d) => <span className={s.ma}>{d.maHangVe}</span> },
          { khoa: 'ten', tieuDe: 'Tên hạng vé', hien: (d) => <span className={s.ten}>{d.tenHangVe}</span> },
          { khoa: 'tl', tieuDe: 'Tỉ lệ đơn giá', canh: 'phai', hien: (d) => <span className={s.tiLe}>{hienTiLe(d.tiLeDonGia)}%</span> },
          {
            khoa: 'tt',
            tieuDe: 'Thao tác',
            canh: 'phai',
            rong: 110,
            hien: (d) => (
              <span className={s.hanhDong} onDoubleClick={(e) => e.stopPropagation()}>
                <NutTron nhan={`Sửa tên hạng vé ${d.maHangVe}`} bienThe="trong" kichThuoc="nho" onClick={() => datCheDo({ loai: 'sua', hangVe: d })}>
                  <Pencil size={16} />
                </NutTron>
                <NutTron nhan={`Xóa hạng vé ${d.maHangVe}`} bienThe="do" kichThuoc="nho" onClick={() => void xoa(d)}>
                  <Trash2 size={16} />
                </NutTron>
              </span>
            ),
          },
        ]}
      />
      <p className={s.ghiChuDs}>
        <Info size={15} /> Giá tiền của vé bằng giá vé chuyến bay nhân tỉ lệ đơn giá của hạng, ví dụ {dinhDangSo(105)}% là bằng 1,05 lần đơn giá. Tỉ lệ không
        sửa được sau khi lưu.
      </p>
      <HopThoaiHangVe cheDo={cheDo} onDong={() => datCheDo(null)} />
    </section>
  );
}
