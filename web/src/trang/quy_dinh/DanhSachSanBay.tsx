// Thẻ danh sách sân bay (TH01): thêm, sửa tên, xóa sân bay chưa được chuyến bay sử dụng
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Info, Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { laLoiApi, thongBaoLoi } from '@/api/may_khach';
import type { SanBay } from '@/kieu/api';
import { IconMayBay } from '@/icons3d';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { HopThoai } from '@/thanh_phan/HopThoai';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { ONhap } from '@/thanh_phan/ONhap';
import { hienToast } from '@/thanh_phan/toast_kho';
import { khopTuKhoa } from '@/tien_ich/dinh_dang';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import s from './QuyDinh.module.css';

/** Đưa con trỏ về ô đang báo lỗi trong hộp thoại */
function veOLoi() {
  window.setTimeout(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus(), 40);
}

export interface DieuKhienDanhSach {
  them: () => void;
  timKiem: () => void;
}

type CheDo = { loai: 'them' } | { loai: 'sua'; sanBay: SanBay } | null;

function HopThoaiSanBay({ cheDo, onDong }: { cheDo: CheDo; onDong: () => void }) {
  const boTruyVan = useQueryClient();
  const [ma, datMa] = useState('');
  const [ten, datTen] = useState('');
  const [loi, datLoi] = useState<Record<string, string>>({});
  const [daGui, datDaGui] = useState(false);
  const [dangLuu, datDangLuu] = useState(false);
  const [cuoi, datCuoi] = useState<CheDo>(cheDo);

  useEffect(() => {
    if (cheDo) {
      datCuoi(cheDo);
      datMa(cheDo.loai === 'sua' ? cheDo.sanBay.maSanBay : '');
      datTen(cheDo.loai === 'sua' ? cheDo.sanBay.tenSanBay : '');
      datLoi({});
      datDaGui(false);
    }
  }, [cheDo]);

  const cd = cheDo ?? cuoi;
  const laSua = cd?.loai === 'sua';

  const kiemTra = () => {
    const l: Record<string, string> = {};
    if (!laSua && !/^[A-Z]{3}$/.test(ma)) l.maSanBay = 'Mã sân bay phải gồm đúng 3 chữ cái in hoa.';
    if (!ten.trim()) l.tenSanBay = 'Chưa nhập tên sân bay.';
    else if (ten.trim().length > 50) l.tenSanBay = 'Tên sân bay tối đa 50 ký tự.';
    return l;
  };
  const loiHien = { ...(daGui ? kiemTra() : {}), ...loi };

  const luu = async () => {
    if (!cd || dangLuu) return;
    datDaGui(true);
    const l = kiemTra();
    if (Object.keys(l).length) {
      veOLoi();
      return;
    }
    datDangLuu(true);
    try {
      if (cd.loai === 'sua') {
        await apiQuyDinh.suaSanBay(cd.sanBay.maSanBay, ten.trim());
        hienToast.thanhCong(`Cập nhật sân bay ${cd.sanBay.maSanBay} thành công.`);
      } else {
        await apiQuyDinh.themSanBay({ maSanBay: ma, tenSanBay: ten.trim() });
        hienToast.thanhCong(`Thêm sân bay ${ma} · ${ten.trim()} thành công.`);
      }
      await boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.quyDinh });
      onDong();
    } catch (e) {
      if (laLoiApi(e) && e.chiTiet && Object.keys(e.chiTiet).length) datLoi(e.chiTiet);
      else if (laLoiApi(e) && e.ma === 'TRUNG_MA') datLoi({ maSanBay: e.thongBao });
      else baoLoi('Không lưu được sân bay', thongBaoLoi(e));
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
      rong={500}
      icon={<IconMayBay kichThuoc={52} />}
      tieuDe={laSua ? 'Sửa tên sân bay' : 'Thêm sân bay'}
      moTa={laSua ? 'Chỉ sửa tên khi nhập sai; mã sân bay giữ nguyên.' : 'Sân bay mới dùng được ngay khi nhận lịch chuyến bay.'}
      dongKhiBamNen={!dangLuu}
      chan={
        <>
          <Nut bienThe="nguy-hiem" muiTen={false} onClick={onDong} disabled={dangLuu}>
            Hủy
          </Nut>
          <Nut type="submit" form="form-san-bay" dangXuLy={dangLuu}>
            Lưu
          </Nut>
        </>
      }
    >
      <form
        id="form-san-bay"
        className={`${s.cotO} ${s.rung}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void luu();
        }}
      >
        <ONhap
          className={s.oMa}
          nhan="Mã sân bay"
          batBuoc={!laSua}
          readOnly={laSua}
          iconTrai={laSua ? <Lock size={16} /> : undefined}
          data-tu-focus={laSua ? undefined : true}
          placeholder="Ví dụ BMV"
          maxLength={3}
          value={ma}
          loi={loiHien.maSanBay}
          goiY={laSua ? 'Mã sân bay không sửa được sau khi lưu.' : 'Đúng 3 chữ cái in hoa, không trùng mã đã có.'}
          onChange={(e) => {
            datMa(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''));
            datLoi(({ maSanBay: _, ...c }) => c);
          }}
        />
        <ONhap
          nhan="Tên sân bay"
          batBuoc
          data-tu-focus={laSua ? true : undefined}
          placeholder="Ví dụ Buôn Ma Thuột"
          maxLength={50}
          value={ten}
          loi={loiHien.tenSanBay}
          goiY="Không trùng tên sân bay đã có."
          onChange={(e) => {
            datTen(e.target.value);
            datLoi(({ tenSanBay: _, ...c }) => c);
          }}
        />
      </form>
    </HopThoai>
  );
}

export const DanhSachSanBay = forwardRef<DieuKhienDanhSach, { sanBay: SanBay[] | undefined; dangTai: boolean; loi: unknown }>(function DanhSachSanBay(
  { sanBay, dangTai, loi },
  ref,
) {
  const boTruyVan = useQueryClient();
  const [cheDo, datCheDo] = useState<CheDo>(null);
  const [chon, datChon] = useState<string | null>(null);
  const [tuKhoa, datTuKhoa] = useState('');
  const oTim = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    them: () => datCheDo({ loai: 'them' }),
    timKiem: () => oTim.current?.focus(),
  }));

  const daLoc = useMemo(() => sanBay?.filter((x) => khopTuKhoa(`${x.maSanBay} ${x.tenSanBay}`, tuKhoa)), [sanBay, tuKhoa]);

  const xoa = async (x: SanBay) => {
    datChon(x.maSanBay);
    const dongY = await hoiXacNhan({
      tieuDe: `Xóa sân bay ${x.maSanBay}?`,
      noiDung: (
        <>
          Sân bay <b>{x.tenSanBay}</b> sẽ bị xóa khỏi danh sách. Chỉ xóa được sân bay chưa có chuyến bay nào sử dụng.
        </>
      ),
      nutDongY: 'Xóa',
    });
    if (!dongY) return;
    try {
      await apiQuyDinh.xoaSanBay(x.maSanBay);
      hienToast.thanhCong(`Xóa sân bay ${x.maSanBay} thành công.`);
      datChon(null);
      boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.quyDinh });
    } catch (e) {
      baoLoi('Không thể xóa sân bay', thongBaoLoi(e));
    }
  };

  return (
    <section className={s.theDs} aria-labelledby="ds-san-bay">
      <div className={s.dauDs}>
        <div className={s.dauDsTrai}>
          <div>
            <h3 className={s.tieuDeDs} id="ds-san-bay">
              Danh sách sân bay
            </h3>
            <p className={s.phuDs}>Số lượng sân bay theo QĐ1</p>
          </div>
          <NhanTrangThai loai="do" coCham={false} nho>
            {sanBay?.length ?? 0} sân bay
          </NhanTrangThai>
        </div>
        <Nut kichThuoc="nho" iconTrai={<Plus size={16} strokeWidth={2.6} />} onClick={() => datCheDo({ loai: 'them' })} title="Thêm sân bay (Ctrl+N)">
          Thêm sân bay
        </Nut>
      </div>
      <div className={s.thanhLoc}>
        <ONhap
          ref={oTim}
          placeholder="Lọc theo mã hoặc tên sân bay (Ctrl+F)"
          iconTrai={<Search size={17} />}
          value={tuKhoa}
          onChange={(e) => datTuKhoa(e.target.value)}
          aria-label="Lọc sân bay"
        />
      </div>
      <BangDuLieu<SanBay>
        nhan="Danh sách sân bay"
        duLieu={daLoc}
        dangTai={dangTai}
        loi={loi}
        khoaDong={(d) => d.maSanBay}
        dongDangChon={chon}
        onChonDong={(d) => datChon(d.maSanBay)}
        onMoDong={(d) => datCheDo({ loai: 'sua', sanBay: d })}
        chieuCaoToiDa={448}
        rong={{
          tieuDe: tuKhoa ? 'Không có sân bay phù hợp' : 'Chưa có sân bay',
          goiY: tuKhoa ? 'Thử gõ mã hoặc tên khác.' : 'Bấm Thêm sân bay để bắt đầu.',
          linhVat: 'tra_cuu',
        }}
        cot={[
          { khoa: 'stt', tieuDe: 'STT', rong: 60, hien: (_, i) => <span className={s.stt}>{i + 1}</span> },
          { khoa: 'ma', tieuDe: 'Mã', rong: 90, hien: (d) => <span className={s.ma}>{d.maSanBay}</span> },
          { khoa: 'ten', tieuDe: 'Tên sân bay', hien: (d) => <span className={s.ten}>{d.tenSanBay}</span> },
          {
            khoa: 'tt',
            tieuDe: 'Thao tác',
            canh: 'phai',
            rong: 110,
            hien: (d) => (
              <span className={s.hanhDong} onDoubleClick={(e) => e.stopPropagation()}>
                <NutTron nhan={`Sửa tên sân bay ${d.maSanBay}`} bienThe="trong" kichThuoc="nho" onClick={() => datCheDo({ loai: 'sua', sanBay: d })}>
                  <Pencil size={16} />
                </NutTron>
                <NutTron nhan={`Xóa sân bay ${d.maSanBay}`} bienThe="do" kichThuoc="nho" onClick={() => void xoa(d)}>
                  <Trash2 size={16} />
                </NutTron>
              </span>
            ),
          },
        ]}
      />
      <p className={s.ghiChuDs}>
        <Info size={15} /> Danh sách luôn còn ít nhất hai sân bay. Không xóa được sân bay đang được chuyến bay sử dụng; nhấp đúp một dòng để sửa tên.
      </p>
      <HopThoaiSanBay cheDo={cheDo} onDong={() => datCheDo(null)} />
    </section>
  );
});
