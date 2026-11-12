// Hộp thoại Cập nhật quy định (MH_CapNhatQD) cho một tham số: giá trị hiện tại, ô giá trị mới, Hủy, Lưu
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { laLoiApi, thongBaoLoi } from '@/api/may_khach';
import { IconBanhRangDanhSach } from '@/icons3d';
import type { ThamSoQuyDinh } from '@/kieu/api';
import { HopThoai } from '@/thanh_phan/HopThoai';
import { baoLoi } from '@/thanh_phan/hop_thoai_kho';
import { Nut } from '@/thanh_phan/Nut';
import { ONhap } from '@/thanh_phan/ONhap';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import type { MoTaThamSo } from './tham_so';
import s from './QuyDinh.module.css';

/** Đưa con trỏ về ô đang báo lỗi trong hộp thoại */
function veOLoi() {
  window.setTimeout(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus(), 40);
}

export function HopThoaiThamSo({
  moTa,
  thamSo,
  onDong,
  onDaLuu,
}: {
  moTa: MoTaThamSo | null;
  thamSo: ThamSoQuyDinh;
  onDong: () => void;
  onDaLuu: (ten: string) => void;
}) {
  const boTruyVan = useQueryClient();
  const [giaTri, datGiaTri] = useState('');
  const [loi, datLoi] = useState<string | null>(null);
  const [daCham, datDaCham] = useState(false);
  const [dangLuu, datDangLuu] = useState(false);
  // giữ mô tả cuối cùng để nội dung không biến mất khi hộp thoại đang đóng dần
  const [cuoi, datCuoi] = useState<MoTaThamSo | null>(moTa);

  useEffect(() => {
    if (moTa) {
      datCuoi(moTa);
      datGiaTri('');
      datLoi(null);
      datDaCham(false);
    }
  }, [moTa]);

  const m = moTa ?? cuoi;
  const hienTai = m ? thamSo[m.ten] : 0;
  const khoang = m?.khoang(thamSo);

  const kiemTra = (v: string): string | null => {
    if (!v.trim()) return 'Chưa nhập giá trị mới.';
    if (!/^\d+$/.test(v.trim())) return 'Giá trị mới phải là số nguyên không âm.';
    const so = Number(v);
    if (khoang && (so < khoang.nhoNhat || so > khoang.lonNhat)) {
      if (m?.ten === 'thoiGianDungToiThieu') return 'Thời gian dừng tối thiểu không được lớn hơn thời gian dừng tối đa.';
      if (m?.ten === 'thoiGianDungToiDa') return 'Thời gian dừng tối đa không được nhỏ hơn thời gian dừng tối thiểu.';
      if (m?.ten === 'thoiGianHuyDatVe') return 'Thời gian hủy đặt vé phải nhỏ hơn thời gian chậm nhất khi đặt vé.';
      if (m?.ten === 'thoiGianDatVeChamNhat' && so <= thamSo.thoiGianHuyDatVe) return 'Thời gian chậm nhất khi đặt vé phải lớn hơn thời gian hủy đặt vé.';
      return `Giá trị mới không được lớn hơn ${khoang.lonNhat}.`;
    }
    return null;
  };

  const loiHien = loi ?? (daCham ? kiemTra(giaTri) : null);

  const luu = async () => {
    if (!m || dangLuu) return;
    datDaCham(true);
    const l = kiemTra(giaTri);
    if (l) {
      datLoi(l);
      veOLoi();
      return;
    }
    if (Number(giaTri) === hienTai) {
      hienToast.thongTin('Giá trị mới bằng giá trị hiện tại, không có gì thay đổi.');
      onDong();
      return;
    }
    datDangLuu(true);
    try {
      await apiQuyDinh.suaThamSo(m.ten, Number(giaTri));
      hienToast.thanhCong(`Cập nhật quy định thành công: ${m.tieuDe.toLowerCase()} là ${giaTri} ${m.donVi}.`);
      await boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.quyDinh });
      onDaLuu(m.ten);
      onDong();
    } catch (e) {
      if (laLoiApi(e) && e.chiTiet?.giaTriMoi) datLoi(e.chiTiet.giaTriMoi);
      else baoLoi('Không cập nhật được quy định', thongBaoLoi(e));
    } finally {
      datDangLuu(false);
      veOLoi();
    }
  };

  dungPhimTat({ 'ctrl+s': () => void luu(), esc: () => !dangLuu && onDong() }, { batTat: !!moTa, keCaHopThoai: true });

  return (
    <HopThoai
      mo={!!moTa}
      onDong={onDong}
      rong={520}
      icon={<IconBanhRangDanhSach kichThuoc={56} />}
      tieuDe="Cập nhật quy định"
      moTa={m ? `${m.tieuDe} (${m.qd})` : undefined}
      dongKhiBamNen={!dangLuu}
      chan={
        <>
          <Nut bienThe="nguy-hiem" muiTen={false} onClick={onDong} disabled={dangLuu}>
            Hủy
          </Nut>
          <Nut type="submit" form="form-tham-so" dangXuLy={dangLuu}>
            Lưu
          </Nut>
        </>
      }
    >
      {m && (
        <form
          id="form-tham-so"
          className={s.rung}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void luu();
          }}
        >
          <div className={s.hienTai}>
            <span>Giá trị hiện tại</span>
            <span className={s.muiDoi}>
              <b>
                {hienTai} <small>{m.donVi}</small>
              </b>
              {giaTri && /^\d+$/.test(giaTri) && Number(giaTri) !== hienTai && (
                <>
                  <ArrowRight size={18} color="var(--muc-400)" />
                  <b className={s.moi} key={giaTri}>
                    {Number(giaTri)} <small>{m.donVi}</small>
                  </b>
                </>
              )}
            </span>
          </div>
          <ONhap
            className={s.oSoLon}
            nhan={`Giá trị mới (${m.donVi})`}
            batBuoc
            data-tu-focus
            inputMode="numeric"
            placeholder={String(hienTai)}
            value={giaTri}
            loi={loiHien}
            goiY={`${khoang?.goiY} Áp dụng cho các nghiệp vụ phát sinh sau khi lưu.`}
            ben={<span className={s.donVi}>{m.donVi}</span>}
            onChange={(e) => {
              datGiaTri(e.target.value.replace(/\D/g, '').slice(0, 6));
              datLoi(null);
            }}
            onBlur={() => giaTri && datDaCham(true)}
          />
        </form>
      )}
    </HopThoai>
  );
}
