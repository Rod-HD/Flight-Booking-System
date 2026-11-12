// Phân quyền (MH_PhanQuyen): danh sách tài khoản, thêm, sửa, khóa và mở khóa (chỉ Quản lý)
import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Lock, LockOpen, Pencil, Plus, Search, ShieldCheck, Ticket, UserX, Users, X } from 'lucide-react';
import { apiTaiKhoan, khoaTruyVan } from '@/api/dich_vu';
import { thongBaoLoi } from '@/api/may_khach';
import { IconKhienChia } from '@/icons3d';
import type { TaiKhoan } from '@/kieu/api';
import { dungPhien } from '@/phien/NguCanhPhien';
import { BangDuLieu } from '@/thanh_phan/BangDuLieu';
import { baoLoi, hoiXacNhan } from '@/thanh_phan/hop_thoai_kho';
import { KhungTrang, TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { NhanNhomQuyen, NhanTrangThaiTaiKhoan } from '@/thanh_phan/NhanTrangThai';
import { Nut } from '@/thanh_phan/Nut';
import { ONhap } from '@/thanh_phan/ONhap';
import { OTong } from '@/thanh_phan/OTong';
import { hienToast } from '@/thanh_phan/toast_kho';
import { chuCaiDau, khopTuKhoa, tenNhomQuyen } from '@/tien_ich/dinh_dang';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { HopThoaiTaiKhoan, type CheDoTaiKhoan } from './HopThoaiTaiKhoan';
import s from './TaiKhoan.module.css';

export function TrangTaiKhoan() {
  const boTruyVan = useQueryClient();
  const { nguoiDung } = dungPhien();
  const { data, isPending, error } = useQuery({ queryKey: khoaTruyVan.taiKhoan, queryFn: apiTaiKhoan.danhSach });
  const [cheDo, datCheDo] = useState<CheDoTaiKhoan>(null);
  const [chon, datChon] = useState<string | null>(null);
  const [tuKhoa, datTuKhoa] = useState('');
  const oTim = useRef<HTMLInputElement>(null);

  const laToi = (tk: TaiKhoan) => tk.tenDangNhap.toLowerCase() === nguoiDung?.tenDangNhap.toLowerCase();
  const daLoc = useMemo(() => data?.filter((tk) => khopTuKhoa(`${tk.tenDangNhap} ${tenNhomQuyen[tk.nhomQuyen]}`, tuKhoa)), [data, tuKhoa]);

  const doiTrangThai = useMutation({
    mutationFn: ({ tk, khoa }: { tk: TaiKhoan; khoa: boolean }) => (khoa ? apiTaiKhoan.khoa(tk.tenDangNhap) : apiTaiKhoan.moKhoa(tk.tenDangNhap)),
    onSuccess: (_, { tk, khoa }) => {
      hienToast.thanhCong(khoa ? `Đã khóa tài khoản ${tk.tenDangNhap}.` : `Đã mở khóa tài khoản ${tk.tenDangNhap}.`);
      boTruyVan.invalidateQueries({ queryKey: khoaTruyVan.taiKhoan });
    },
    onError: (e, { khoa }) => baoLoi(khoa ? 'Không thể khóa tài khoản' : 'Không thể mở khóa tài khoản', thongBaoLoi(e)),
  });

  const khoa = async (tk: TaiKhoan) => {
    datChon(tk.tenDangNhap);
    if (laToi(tk)) {
      baoLoi('Không thể khóa tài khoản', 'Không được khóa tài khoản đang đăng nhập.');
      return;
    }
    const dongY = await hoiXacNhan({
      tieuDe: `Khóa tài khoản ${tk.tenDangNhap}?`,
      noiDung: 'Tài khoản bị khóa không đăng nhập được cho tới khi được mở khóa. Phiên đang mở của tài khoản này sẽ kết thúc ở thao tác kế tiếp.',
      nutDongY: 'Khóa',
    });
    if (dongY) doiTrangThai.mutate({ tk, khoa: true });
  };

  const moKhoa = async (tk: TaiKhoan) => {
    datChon(tk.tenDangNhap);
    const dongY = await hoiXacNhan({
      loai: 'xac-nhan',
      tieuDe: `Mở khóa tài khoản ${tk.tenDangNhap}?`,
      noiDung: 'Tài khoản chuyển sang trạng thái Hoạt động và đăng nhập lại được.',
      nutDongY: 'Mở khóa',
    });
    if (dongY) doiTrangThai.mutate({ tk, khoa: false });
  };

  dungPhimTat({
    'ctrl+n': () => datCheDo({ loai: 'them' }),
    'ctrl+f': () => oTim.current?.focus(),
  });

  const dem = (f: (tk: TaiKhoan) => boolean) => data?.filter(f).length ?? 0;

  return (
    <KhungTrang
      tieuDe="Phân quyền"
      icon={<IconKhienChia kichThuoc={56} />}
      moTa="Tài khoản người dùng, nhóm quyền Quản lý và Nhân viên bán vé"
      duongDan={[{ nhan: 'Tài khoản' }]}
      nut={
        <>
          <Nut iconTrai={<Plus size={18} strokeWidth={2.6} />} onClick={() => datCheDo({ loai: 'them' })} title="Thêm tài khoản (Ctrl+N)">
            Thêm tài khoản
          </Nut>
          <Nut bienThe="lang" muiTen={false} iconTrai={<X size={18} />} den="/">
            Đóng
          </Nut>
        </>
      }
    >
      <div className={s.thongKe}>
        <OTong
          nhan="Tổng tài khoản"
          giaTri={data?.length ?? 0}
          icon={
            <span className={s.iconThongKe}>
              <Users size={22} />
            </span>
          }
        />
        <OTong
          nhan="Quản lý"
          giaTri={dem((t) => t.nhomQuyen === 'QuanLy')}
          icon={
            <span className={s.iconThongKe}>
              <ShieldCheck size={22} />
            </span>
          }
        />
        <OTong
          nhan="Nhân viên bán vé"
          giaTri={dem((t) => t.nhomQuyen === 'NhanVien')}
          icon={
            <span className={s.iconThongKe}>
              <Ticket size={22} />
            </span>
          }
        />
        <OTong
          nhan="Đã khóa"
          giaTri={dem((t) => t.trangThai === 'DaKhoa')}
          icon={
            <span className={s.iconThongKe}>
              <UserX size={22} />
            </span>
          }
        />
      </div>

      <div className={s.thanhTren}>
        <TieuDeMuc tieuDe="Danh sách tài khoản" phu="Nhấp đúp một dòng để sửa. Tài khoản bị khóa vẫn được giữ lại và có thể mở khóa." />
        <ONhap
          ref={oTim}
          className={s.oTim}
          aria-label="Tìm tài khoản"
          placeholder="Tìm theo tên đăng nhập (Ctrl+F)"
          iconTrai={<Search size={17} />}
          value={tuKhoa}
          onChange={(e) => datTuKhoa(e.target.value)}
        />
      </div>

      <BangDuLieu<TaiKhoan>
        nhan="Danh sách tài khoản"
        duLieu={daLoc}
        dangTai={isPending}
        loi={error}
        khoaDong={(d) => d.tenDangNhap}
        dongDangChon={chon}
        onChonDong={(d) => datChon(d.tenDangNhap)}
        onMoDong={(d) => datCheDo({ loai: 'sua', taiKhoan: d })}
        kichThuocTrang={10}
        donVi="tài khoản"
        rong={{
          tieuDe: tuKhoa ? 'Không có tài khoản phù hợp' : 'Chưa có tài khoản',
          goiY: tuKhoa ? 'Thử gõ tên đăng nhập khác.' : undefined,
          linhVat: 'tra_cuu',
        }}
        cot={[
          { khoa: 'stt', tieuDe: 'STT', rong: 64, hien: (_, i) => <span className={s.stt}>{String(i + 1).padStart(2, '0')}</span> },
          {
            khoa: 'ten',
            tieuDe: 'Tên đăng nhập',
            hien: (d) => (
              <span className={`${s.nguoi} ${d.trangThai === 'DaKhoa' ? s.daKhoa : ''}`}>
                <span className={[s.anhDaiDien, d.trangThai === 'DaKhoa' ? s.anhKhoa : d.nhomQuyen === 'QuanLy' ? s.anhQuanLy : ''].join(' ')} aria-hidden>
                  {chuCaiDau(d.tenDangNhap)}
                </span>
                <span className={s.tenNguoi}>
                  <b>{d.tenDangNhap}</b>
                  {laToi(d) && <small>(đang đăng nhập)</small>}
                </span>
              </span>
            ),
          },
          { khoa: 'nhom', tieuDe: 'Nhóm quyền', hien: (d) => <NhanNhomQuyen giaTri={d.nhomQuyen} /> },
          { khoa: 'tt', tieuDe: 'Trạng thái', hien: (d) => <NhanTrangThaiTaiKhoan giaTri={d.trangThai} /> },
          {
            khoa: 'hd',
            tieuDe: 'Thao tác',
            canh: 'phai',
            rong: 260,
            hien: (d) => {
              const dangXuLy = doiTrangThai.isPending && doiTrangThai.variables?.tk.tenDangNhap === d.tenDangNhap;
              return (
                <span className={s.hanhDong} onDoubleClick={(e) => e.stopPropagation()}>
                  <Nut bienThe="lang" kichThuoc="nho" muiTen={false} iconTrai={<Pencil size={15} />} onClick={() => datCheDo({ loai: 'sua', taiKhoan: d })}>
                    Sửa
                  </Nut>
                  {d.trangThai === 'HoatDong' ? (
                    <span className={s.boc} title={laToi(d) ? 'Không được khóa tài khoản đang đăng nhập' : undefined}>
                      <Nut
                        bienThe="nguy-hiem"
                        kichThuoc="nho"
                        muiTen={false}
                        iconTrai={<Lock size={15} />}
                        disabled={laToi(d)}
                        dangXuLy={dangXuLy}
                        onClick={() => void khoa(d)}
                      >
                        Khóa
                      </Nut>
                    </span>
                  ) : (
                    <Nut bienThe="phu" kichThuoc="nho" muiTen={false} iconTrai={<LockOpen size={15} />} dangXuLy={dangXuLy} onClick={() => void moKhoa(d)}>
                      Mở khóa
                    </Nut>
                  )}
                </span>
              );
            },
          },
        ]}
      />
      <p className={s.chuGiai}>
        <Info size={15} /> Không được khóa hoặc đổi nhóm quyền của tài khoản đang đăng nhập, để hệ thống luôn còn ít nhất một Quản lý đang hoạt động.
      </p>

      <HopThoaiTaiKhoan cheDo={cheDo} tenDangDangNhap={nguoiDung?.tenDangNhap} onDong={() => datCheDo(null)} />
    </KhungTrang>
  );
}
