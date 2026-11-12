// Hộp thoại thêm, sửa tài khoản (MH_ThemSuaTaiKhoan)
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Ticket, User } from 'lucide-react';
import { apiTaiKhoan, khoaTruyVan } from '@/api/dich_vu';
import { laLoiApi, thongBaoLoi } from '@/api/may_khach';
import { IconKhienChia } from '@/icons3d';
import type { NhomQuyen, TaiKhoan } from '@/kieu/api';
import { HopThoai } from '@/thanh_phan/HopThoai';
import { baoLoi } from '@/thanh_phan/hop_thoai_kho';
import { Nut } from '@/thanh_phan/Nut';
import { ONhap } from '@/thanh_phan/ONhap';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import s from './TaiKhoan.module.css';

/** Đưa con trỏ về ô đang báo lỗi trong hộp thoại */
function veOLoi() {
  window.setTimeout(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus(), 40);
}

export type CheDoTaiKhoan = { loai: 'them' } | { loai: 'sua'; taiKhoan: TaiKhoan } | null;

const MAU_TEN = /^[A-Za-z0-9._-]+$/;

/** Điểm mạnh mật khẩu từ 0 đến 4 */
function doManh(mk: string): number {
  if (!mk) return 0;
  let d = 0;
  if (mk.length >= 6) d += 1;
  if (mk.length >= 10) d += 1;
  if (/[a-z]/.test(mk) && /[A-Z]/.test(mk)) d += 1;
  if (/\d/.test(mk) && /[^A-Za-z0-9]/.test(mk)) d += 1;
  return Math.max(1, Math.min(4, d));
}
const CHU_MANH = ['', 'Yếu', 'Trung bình', 'Khá mạnh', 'Rất mạnh'];

function OMatKhau(p: {
  nhan: string;
  batBuoc?: boolean;
  giaTri: string;
  onDoi: (v: string) => void;
  loi?: string;
  goiY?: string;
  tuFocus?: boolean;
  placeholder?: string;
}) {
  const [hien, datHien] = useState(false);
  return (
    <ONhap
      nhan={p.nhan}
      batBuoc={p.batBuoc}
      type={hien ? 'text' : 'password'}
      autoComplete="new-password"
      iconTrai={<Lock size={17} />}
      data-tu-focus={p.tuFocus || undefined}
      placeholder={p.placeholder}
      maxLength={100}
      value={p.giaTri}
      loi={p.loi}
      goiY={p.goiY}
      onChange={(e) => p.onDoi(e.target.value)}
      ben={
        <button
          type="button"
          className={s.nutMat}
          aria-label={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          title={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          onClick={() => datHien(!hien)}
        >
          {hien ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}

function ThanhDoManh({ matKhau }: { matKhau: string }) {
  const d = doManh(matKhau);
  if (!matKhau) return null;
  return (
    <div className={`${s.doManh} ${s[`muc${d}` as 'muc1']}`} aria-live="polite">
      <span className={s.vach} aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} data-bat={i <= d} />
        ))}
      </span>
      <span className={s.chuManh}>{CHU_MANH[d]}</span>
    </div>
  );
}

const QUYEN: { giaTri: NhomQuyen; ten: string; moTa: string; icon: React.ReactNode }[] = [
  { giaTri: 'QuanLy', ten: 'Quản lý', moTa: 'Toàn quyền: chuyến bay, báo cáo, quy định và phân quyền.', icon: <ShieldCheck size={20} /> },
  { giaTri: 'NhanVien', ten: 'Nhân viên bán vé', moTa: 'Tra cứu chuyến bay, bán vé, đặt vé và phiếu đặt chỗ.', icon: <Ticket size={20} /> },
];

export function HopThoaiTaiKhoan({ cheDo, tenDangDangNhap, onDong }: { cheDo: CheDoTaiKhoan; tenDangDangNhap?: string; onDong: () => void }) {
  const boTruyVan = useQueryClient();
  const [cuoi, datCuoi] = useState<CheDoTaiKhoan>(cheDo);
  const [ten, datTen] = useState('');
  const [matKhau, datMatKhau] = useState('');
  const [nhapLai, datNhapLai] = useState('');
  const [nhom, datNhom] = useState<NhomQuyen>('NhanVien');
  const [loiMayChu, datLoiMayChu] = useState<Record<string, string>>({});
  const [daGui, datDaGui] = useState(false);
  const [dangLuu, datDangLuu] = useState(false);

  useEffect(() => {
    if (!cheDo) return;
    datCuoi(cheDo);
    datTen(cheDo.loai === 'sua' ? cheDo.taiKhoan.tenDangNhap : '');
    datNhom(cheDo.loai === 'sua' ? cheDo.taiKhoan.nhomQuyen : 'NhanVien');
    datMatKhau('');
    datNhapLai('');
    datLoiMayChu({});
    datDaGui(false);
  }, [cheDo]);

  const cd = cheDo ?? cuoi;
  const laSua = cd?.loai === 'sua';
  const laChinhMinh = laSua && cd.taiKhoan.tenDangNhap.toLowerCase() === tenDangDangNhap?.toLowerCase();
  const truongMk = laSua ? 'matKhauMoi' : 'matKhau';

  const kiemTra = () => {
    const l: Record<string, string> = {};
    if (!laSua) {
      const t = ten.trim();
      if (!t) l.tenDangNhap = 'Chưa nhập tên đăng nhập.';
      else if (t.length > 30 || !MAU_TEN.test(t))
        l.tenDangNhap = 'Tên đăng nhập tối đa 30 ký tự, không chứa khoảng trắng, chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới, gạch nối.';
    }
    if (!matKhau) {
      if (!laSua) l.matKhau = 'Chưa nhập mật khẩu.';
    } else if (matKhau.length < 6) l[truongMk] = 'Mật khẩu phải có từ 6 đến 100 ký tự.';
    if ((matKhau || nhapLai) && nhapLai !== matKhau) l.nhapLai = 'Mật khẩu nhập lại không khớp.';
    return l;
  };
  const loi = { ...(daGui ? kiemTra() : {}), ...loiMayChu };
  const boLoi = (k: string) => datLoiMayChu(({ [k]: _, ...c }) => c);

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
        await apiTaiKhoan.sua(cd.taiKhoan.tenDangNhap, { nhomQuyen: nhom, matKhauMoi: matKhau || undefined });
        hienToast.thanhCong(`Cập nhật tài khoản ${cd.taiKhoan.tenDangNhap} thành công.`);
      } else {
        await apiTaiKhoan.them({ tenDangNhap: ten.trim(), matKhau, nhomQuyen: nhom });
        hienToast.thanhCong(`Thêm tài khoản ${ten.trim()} thành công.`);
      }
      await boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.taiKhoan });
      onDong();
    } catch (e) {
      if (!laLoiApi(e)) {
        baoLoi('Không lưu được tài khoản', thongBaoLoi(e));
      } else if (e.ma === 'KHONG_DUOC_TU_DOI_QUYEN' || e.ma === 'DU_LIEU_DA_THAY_DOI') {
        baoLoi('Không thể đổi nhóm quyền', e.thongBao);
      } else if (e.ma === 'TRUNG_MA') {
        datLoiMayChu({ tenDangNhap: e.chiTiet?.tenDangNhap ?? e.thongBao });
      } else if (e.chiTiet && Object.keys(e.chiTiet).length) {
        datLoiMayChu(e.chiTiet);
      } else {
        baoLoi('Không lưu được tài khoản', e.thongBao);
      }
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
      rong={580}
      icon={<IconKhienChia kichThuoc={56} />}
      tieuDe={laSua ? `Sửa tài khoản ${cd.taiKhoan.tenDangNhap}` : 'Thêm tài khoản'}
      moTa={
        laSua
          ? 'Đổi nhóm quyền hoặc đặt lại mật khẩu. Để trống mật khẩu thì giữ mật khẩu cũ.'
          : 'Tài khoản mới ở trạng thái Hoạt động, mật khẩu được mã hóa một chiều khi lưu.'
      }
      dongKhiBamNen={!dangLuu}
      chan={
        <>
          <Nut bienThe="nguy-hiem" muiTen={false} onClick={onDong} disabled={dangLuu}>
            Hủy
          </Nut>
          <Nut type="submit" form="form-tai-khoan" dangXuLy={dangLuu}>
            Lưu
          </Nut>
        </>
      }
    >
      <form
        id="form-tai-khoan"
        className={`${s.form} ${s.rung}`}
        noValidate
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          void luu();
        }}
      >
        <ONhap
          nhan="Tên đăng nhập"
          batBuoc={!laSua}
          readOnly={laSua}
          iconTrai={laSua ? <Lock size={16} /> : <User size={17} />}
          data-tu-focus={laSua ? undefined : true}
          placeholder="Ví dụ banve04"
          maxLength={30}
          autoComplete="off"
          value={ten}
          loi={loi.tenDangNhap}
          goiY={laSua ? 'Tên đăng nhập không sửa được.' : 'Tối đa 30 ký tự, không dấu, không khoảng trắng.'}
          onChange={(e) => {
            datTen(e.target.value.replace(/\s/g, ''));
            boLoi('tenDangNhap');
          }}
        />

        {laSua ? (
          <div className={s.phanMatKhau}>
            <h3>
              <KeyRound size={17} /> Đặt lại mật khẩu
            </h3>
            <p>Không bắt buộc. Chỉ nhập khi người dùng quên mật khẩu.</p>
            <OMatKhau
              nhan="Mật khẩu mới"
              giaTri={matKhau}
              placeholder="Để trống để giữ mật khẩu cũ"
              onDoi={(v) => {
                datMatKhau(v);
                boLoi('matKhauMoi');
              }}
              loi={loi.matKhauMoi}
            />
            <ThanhDoManh matKhau={matKhau} />
            {matKhau && <OMatKhau nhan="Nhập lại mật khẩu mới" batBuoc giaTri={nhapLai} onDoi={datNhapLai} loi={loi.nhapLai} />}
          </div>
        ) : (
          <>
            <OMatKhau
              nhan="Mật khẩu"
              batBuoc
              giaTri={matKhau}
              onDoi={(v) => {
                datMatKhau(v);
                boLoi('matKhau');
              }}
              loi={loi.matKhau}
              goiY="Từ 6 đến 100 ký tự; nên có chữ hoa, chữ thường, số và ký tự đặc biệt."
            />
            <ThanhDoManh matKhau={matKhau} />
            <OMatKhau nhan="Nhập lại mật khẩu" batBuoc giaTri={nhapLai} onDoi={datNhapLai} loi={loi.nhapLai} />
          </>
        )}

        <fieldset className={s.nhomQuyen}>
          <legend>
            Nhóm quyền<span aria-hidden>*</span>
          </legend>
          <div className={s.haiThe} role="radiogroup">
            {QUYEN.map((q) => (
              <label key={q.giaTri} className={s.theQuyen}>
                <input type="radio" name="nhomQuyen" value={q.giaTri} checked={nhom === q.giaTri} disabled={laChinhMinh} onChange={() => datNhom(q.giaTri)} />
                <span className={s.dauQuyen}>
                  {q.icon}
                  <span className={s.dauTich} aria-hidden>
                    <Check size={14} strokeWidth={3} />
                  </span>
                </span>
                <span className={s.tenQuyen}>{q.ten}</span>
                <span className={s.moTaQuyen}>{q.moTa}</span>
              </label>
            ))}
          </div>
          {laChinhMinh && (
            <p className={s.ghiChuQuyen}>
              <AlertTriangle size={15} /> Không được đổi nhóm quyền của tài khoản đang đăng nhập.
            </p>
          )}
          {loi.nhomQuyen && (
            <p className={s.ghiChuQuyen} style={{ color: 'var(--do-500)' }}>
              {loi.nhomQuyen}
            </p>
          )}
        </fieldset>
      </form>
    </HopThoai>
  );
}
