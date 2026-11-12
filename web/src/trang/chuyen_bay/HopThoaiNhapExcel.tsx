// Hộp thoại nhập lịch chuyến bay từ tập tin Excel (luồng T1a của UC03.1)
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Download, FileSpreadsheet, RotateCcw, X } from 'lucide-react';
import { apiChuyenBay } from '@/api/dich_vu';
import { CHE_DO_GIA_LAP, laLoiApi, luuTapTin, thongBaoLoi } from '@/api/may_khach';
import { IconThuMucBang } from '@/icons3d';
import type { KetQuaNhapExcel } from '@/kieu/api';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { HopThoai } from '@/thanh_phan/HopThoai';
import { Nut, NutTron } from '@/thanh_phan/Nut';
import { OTong } from '@/thanh_phan/OTong';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import s from './ChuyenBay.module.css';

// máy chủ thật chỉ đọc .xlsx; bộ giả lập trả tập tin mẫu dạng .csv nên nhận thêm .csv
const DUOI_HOP_LE = CHE_DO_GIA_LAP ? ['.xlsx', '.csv'] : ['.xlsx'];

function dungLuong(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(byte / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function HopThoaiNhapExcel({ mo, onDong }: { mo: boolean; onDong: () => void }) {
  const boTruyVan = useQueryClient();
  const oChon = useRef<HTMLInputElement>(null);
  const [tapTin, datTapTin] = useState<File | null>(null);
  const [keo, datKeo] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [demLoi, datDemLoi] = useState(0);
  const [dangNhap, datDangNhap] = useState(false);
  const [dangTaiMau, datDangTaiMau] = useState(false);
  const [ketQua, datKetQua] = useState<KetQuaNhapExcel | null>(null);

  // mở lại hộp thoại thì bắt đầu từ đầu
  useEffect(() => {
    if (mo) {
      datTapTin(null);
      datLoi(null);
      datKetQua(null);
      datKeo(false);
    }
  }, [mo]);

  const baoLoiTapTin = (chu: string) => {
    datLoi(chu);
    datDemLoi((n) => n + 1);
  };

  const nhanTapTin = (f: File | undefined | null) => {
    if (!f) return;
    const ten = f.name.toLowerCase();
    if (!DUOI_HOP_LE.some((d) => ten.endsWith(d))) {
      datTapTin(null);
      baoLoiTapTin(`Tập tin ${f.name} không đúng định dạng. Hãy chọn tập tin Excel (.xlsx) theo tập tin mẫu.`);
      return;
    }
    datLoi(null);
    datTapTin(f);
  };

  const taiMau = async () => {
    datDangTaiMau(true);
    try {
      luuTapTin(await apiChuyenBay.taiMauExcel());
      hienToast.thongTin('Đã tải tập tin mẫu lịch chuyến bay.');
    } catch (e) {
      hienToast.loi(thongBaoLoi(e));
    } finally {
      datDangTaiMau(false);
    }
  };

  const nhap = async () => {
    if (!tapTin) {
      baoLoiTapTin('Vui lòng chọn tập tin Excel cần nhập.');
      return;
    }
    datDangNhap(true);
    try {
      const kq = await apiChuyenBay.nhapExcel(tapTin);
      datKetQua(kq);
      window.setTimeout(() => document.querySelector<HTMLElement>('[role="dialog"] [data-tu-focus]')?.focus(), 60);
      if (kq.soDaThem > 0) {
        hienToast.thanhCong(`Đã thêm ${kq.soDaThem} chuyến bay từ tập tin Excel.`);
        boTruyVan.invalidateQueries({ queryKey: ['chuyen-bay'] });
      }
    } catch (e) {
      baoLoiTapTin(laLoiApi(e) ? (e.chiTiet?.tapTin ?? e.thongBao) : thongBaoLoi(e));
    } finally {
      datDangNhap(false);
    }
  };

  // nút Nhập bị khóa lúc đang gửi nên con trỏ rơi ra ngoài hộp thoại; Esc vẫn phải đóng được
  dungPhimTat({ esc: () => !dangNhap && onDong() }, { batTat: mo, keCaHopThoai: true });

  const lamLai = () => {
    datKetQua(null);
    datTapTin(null);
    datLoi(null);
  };

  return (
    <HopThoai
      mo={mo}
      onDong={onDong}
      rong={680}
      icon={<IconThuMucBang kichThuoc={56} />}
      tieuDe="Nhập lịch chuyến bay từ Excel"
      moTa="Mỗi dòng của tập tin là một chuyến bay. Hệ thống kiểm tra từng dòng như khi thêm chuyến bay (mã chưa tồn tại, lịch hợp lệ, QĐ1) và chỉ lưu các dòng hợp lệ."
      dongKhiBamNen={!dangNhap}
      chan={
        ketQua ? (
          <>
            <Nut bienThe="phu" muiTen={false} iconTrai={<RotateCcw size={17} />} onClick={lamLai}>
              Nhập tập tin khác
            </Nut>
            <Nut bienThe="lang" muiTen={false} onClick={onDong} data-tu-focus>
              Đóng
            </Nut>
          </>
        ) : (
          <>
            <Nut bienThe="nguy-hiem" muiTen={false} onClick={onDong} disabled={dangNhap}>
              Hủy
            </Nut>
            <Nut onClick={nhap} dangXuLy={dangNhap} disabled={!tapTin}>
              Nhập lịch chuyến bay
            </Nut>
          </>
        )
      }
    >
      {ketQua ? (
        <div className={s.ketQuaNhap} role="status">
          <div className={s.tongNhap}>
            <OTong nhan="Chuyến bay đã thêm" giaTri={ketQua.soDaThem} donVi="chuyến" className={s.oNhapXanh} thoiGian={700} />
            <OTong
              nhan="Dòng bị lỗi"
              giaTri={ketQua.dongLoi.length}
              donVi="dòng"
              className={ketQua.dongLoi.length ? s.oNhapDo : undefined}
              nhanManh={ketQua.dongLoi.length > 0}
              thoiGian={700}
            />
          </div>
          {ketQua.dongLoi.length > 0 ? (
            <>
              <p className={s.tieuDeLoi}>Các dòng không được nhập và lý do</p>
              <BangDuLieu
                nhan="Các dòng bị lỗi"
                duLieu={ketQua.dongLoi}
                khoaDong={(d) => `${d.dong}-${d.lyDo}`}
                chieuCaoToiDa={260}
                cot={[
                  { khoa: 'dong', tieuDe: 'Dòng', rong: 80, hien: (d) => <span className={s.soDong}>{d.dong}</span> },
                  { khoa: 'lyDo', tieuDe: 'Lý do', hien: (d) => <span className={s.lyDo}>{d.lyDo}</span> },
                ]}
              />
            </>
          ) : (
            <p className={s.tieuDeLoi}>Mọi dòng trong tập tin đều hợp lệ và đã được lưu.</p>
          )}
        </div>
      ) : (
        <>
          <div className={s.buocNhap}>
            <p>
              <b>Bước 1. Tải tập tin mẫu</b>
              Trang ChuyenBay mỗi dòng một chuyến bay, trang TrungGian mỗi dòng một sân bay trung gian.
            </p>
            <Nut bienThe="phu" kichThuoc="nho" muiTen={false} iconTrai={<Download size={16} />} onClick={taiMau} dangXuLy={dangTaiMau}>
              Tải tập tin mẫu
            </Nut>
          </div>
          <div
            key={demLoi}
            className={[s.vungTha, keo ? s.dangKeo : '', loi ? s.vungLoi : ''].join(' ')}
            role="button"
            tabIndex={0}
            aria-label="Chọn hoặc kéo thả tập tin Excel vào đây"
            onClick={() => oChon.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                oChon.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              datKeo(true);
            }}
            onDragLeave={() => datKeo(false)}
            onDrop={(e) => {
              e.preventDefault();
              datKeo(false);
              nhanTapTin(e.dataTransfer.files?.[0]);
            }}
          >
            <span className={s.iconTha}>
              <IconThuMucBang kichThuoc={64} />
            </span>
            {tapTin ? (
              <div className={s.tapTinChon} onClick={(e) => e.stopPropagation()}>
                <span className={s.iconSheet}>
                  <FileSpreadsheet size={22} />
                </span>
                <div>
                  <b>{tapTin.name}</b>
                  <small>{dungLuong(tapTin.size)} · sẵn sàng nhập</small>
                </div>
                <NutTron nhan="Bỏ chọn tập tin" bienThe="trong" kichThuoc="nho" onClick={() => datTapTin(null)}>
                  <X size={16} />
                </NutTron>
              </div>
            ) : (
              <>
                <strong>Bước 2. Kéo thả tập tin vào đây</strong>
                <span>
                  hoặc <em>bấm để chọn tập tin</em> {DUOI_HOP_LE.join(', ')} từ máy tính
                </span>
              </>
            )}
            <input
              ref={oChon}
              type="file"
              accept={DUOI_HOP_LE.join(',')}
              hidden
              onChange={(e) => {
                nhanTapTin(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {loi && (
            <p className={s.chuLoiTha} role="alert">
              <AlertCircle size={16} /> {loi}
            </p>
          )}
        </>
      )}
    </HopThoai>
  );
}
