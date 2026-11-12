// Báo cáo doanh thu (MH_BaoCao, UC07): báo cáo tháng theo chuyến bay (BM5.1), báo cáo năm theo tháng (BM5.2), xuất Excel, PDF
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, CalendarDays, CalendarRange, FileSpreadsheet, FileText, Plane, Ticket, TrendingUp, Wallet } from 'lucide-react';
import { apiBaoCao, khoaTruyVan } from '@/api/dich_vu';
import { luuTapTin, thongBaoLoi } from '@/api/may_khach';
import type { BaoCaoNam, BaoCaoThang, DinhDangXuat } from '@/kieu/api';
import { IconBieuDoXu } from '@/icons3d';
import { baoLoi, chayKemCho } from '@/thanh_phan/hop_thoai_kho';
import { KhungTrang } from '@/thanh_phan/KhungTrang';
import { Nut } from '@/thanh_phan/Nut';
import { OChonGoc } from '@/thanh_phan/ONhap';
import { OTong } from '@/thanh_phan/OTong';
import { TabTruot } from '@/thanh_phan/TabTruot';
import { TrangThaiRong } from '@/thanh_phan/TrangThaiRong';
import { hienToast } from '@/thanh_phan/toast_kho';
import { dinhDangPhanTram, dinhDangSo, dinhDangTien } from '@/tien_ich/dinh_dang';
import { dungPhimTat } from '@/tien_ich/phim_tat';
import { useNavigate } from 'react-router-dom';
import s from './TrangBaoCao.module.css';

type Loai = 'thang' | 'nam';
type KetQua = { loai: 'thang'; bc: BaoCaoThang } | { loai: 'nam'; bc: BaoCaoNam };

const NAM_HIEN_TAI = new Date().getFullYear();
const DS_THANG = Array.from({ length: 12 }, (_, i) => ({ giaTri: String(i + 1), nhan: `Tháng ${i + 1}` }));
const DS_NAM = Array.from({ length: 6 }, (_, i) => NAM_HIEN_TAI + 1 - i).map((n) => ({ giaTri: String(n), nhan: String(n) }));

/** Thanh ngang dài theo tỉ lệ so với dòng cao nhất để dễ so sánh, con số bên phải là tỉ lệ thật */
function ThanhTiLe({ tiLe, chiSo, caoNhat }: { tiLe: number; chiSo: number; caoNhat: number }) {
  const phan = caoNhat > 0 ? Math.min(1, Math.max(0, tiLe / caoNhat)) : 0;
  return (
    <span className={s.tiLe}>
      <span className={s.raiTiLe} aria-hidden>
        <span className={s.thanh} style={{ transform: `scaleX(${phan})`, animationDelay: `${120 + chiSo * 45}ms` }} />
      </span>
      <b>{dinhDangPhanTram(tiLe)}</b>
    </span>
  );
}

export function TrangBaoCao() {
  const qc = useQueryClient();
  const dieuHuong = useNavigate();
  const [loai, datLoai] = useState<Loai>('thang');
  const [thang, datThang] = useState(new Date().getMonth() + 1);
  const [nam, datNam] = useState(NAM_HIEN_TAI);
  const [ketQua, datKetQua] = useState<KetQua | null>(null);
  const [lanLap, datLanLap] = useState(0);
  const [dangXuat, datDangXuat] = useState<DinhDangXuat | null>(null);

  const lap = async () => {
    try {
      if (loai === 'thang') {
        const bc = await chayKemCho('Đang lập báo cáo, vui lòng chờ', () =>
          qc.fetchQuery({ queryKey: khoaTruyVan.baoCaoThang(thang, nam), queryFn: () => apiBaoCao.thang(thang, nam), staleTime: 0 }),
        );
        datKetQua({ loai: 'thang', bc });
      } else {
        const bc = await chayKemCho('Đang lập báo cáo, vui lòng chờ', () =>
          qc.fetchQuery({ queryKey: khoaTruyVan.baoCaoNam(nam), queryFn: () => apiBaoCao.nam(nam), staleTime: 0 }),
        );
        datKetQua({ loai: 'nam', bc });
      }
      datLanLap((x) => x + 1);
    } catch (e) {
      baoLoi('Không lập được báo cáo', thongBaoLoi(e));
    }
  };

  const coDuLieu = !!ketQua && (ketQua.loai === 'thang' ? ketQua.bc.soChuyenBay > 0 : ketQua.bc.dong.some((d) => d.soChuyenBay > 0));

  const xuat = async (dinhDang: DinhDangXuat) => {
    if (!ketQua || !coDuLieu) return;
    datDangXuat(dinhDang);
    try {
      const tapTin = await chayKemCho(`Đang xuất báo cáo ra ${dinhDang === 'excel' ? 'Excel' : 'PDF'}`, () =>
        ketQua.loai === 'thang' ? apiBaoCao.xuatThang(ketQua.bc.thang, ketQua.bc.nam, dinhDang) : apiBaoCao.xuatNam(ketQua.bc.nam, dinhDang),
      );
      luuTapTin(tapTin);
      hienToast.thanhCong(`Đã xuất báo cáo ra tập tin ${tapTin.tenTapTin}`);
    } catch (e) {
      baoLoi('Không xuất được tập tin', thongBaoLoi(e));
    } finally {
      datDangXuat(null);
    }
  };

  dungPhimTat({ esc: () => dieuHuong('/'), 'ctrl+s': () => lap() });

  const doiLoai = (k: Loai) => {
    datLoai(k);
    datKetQua(null);
  };

  const kyBaoCao = ketQua ? (ketQua.loai === 'thang' ? `tháng ${ketQua.bc.thang}/${ketQua.bc.nam}` : `năm ${ketQua.bc.nam}`) : '';

  return (
    <KhungTrang
      tieuDe="Báo cáo doanh thu"
      icon={<IconBieuDoXu kichThuoc={56} />}
      moTa="Doanh thu bán vé tính theo ngày khởi hành của chuyến bay, chỉ gồm vé Đã bán"
      nut={
        <>
          <Nut bienThe="phu" muiTen={false} iconTrai={<FileSpreadsheet size={18} />} disabled={!coDuLieu} dangXuLy={dangXuat === 'excel'} onClick={() => xuat('excel')}>
            Xuất Excel
          </Nut>
          <Nut bienThe="phu" muiTen={false} iconTrai={<FileText size={18} />} disabled={!coDuLieu} dangXuLy={dangXuat === 'pdf'} onClick={() => xuat('pdf')}>
            Xuất PDF
          </Nut>
          <Nut bienThe="lang" muiTen={false} den="/">
            Đóng
          </Nut>
        </>
      }
    >
      <form
        className={s.boLoc}
        onSubmit={(e) => {
          e.preventDefault();
          lap();
        }}
      >
        <TabTruot<Loai>
          nhan="Loại báo cáo"
          muc={[
            { khoa: 'thang', nhan: 'Báo cáo tháng', icon: <CalendarDays size={18} /> },
            { khoa: 'nam', nhan: 'Báo cáo năm', icon: <CalendarRange size={18} /> },
          ]}
          giaTri={loai}
          onDoi={doiLoai}
        />
        <span className={s.vach} aria-hidden />
        <OChonGoc
          className={s.oLoc}
          nhan="Tháng"
          luaChon={DS_THANG}
          value={String(thang)}
          disabled={loai === 'nam'}
          onChange={(e) => datThang(Number(e.target.value))}
        />
        <OChonGoc className={s.oLoc} nhan="Năm" luaChon={DS_NAM} value={String(nam)} onChange={(e) => datNam(Number(e.target.value))} />
        <Nut type="submit" kichThuoc="lon" iconTrai={<BarChart3 size={18} />}>
          Lập báo cáo
        </Nut>
      </form>

      {!ketQua ? (
        <div className={s.khungRong}>
          <TrangThaiRong
            linhVat="cho"
            kichThuocHinh={140}
            tieuDe="Chọn kỳ báo cáo rồi bấm Lập báo cáo"
            goiY={
              loai === 'thang'
                ? 'Báo cáo tháng (BM5.1) liệt kê từng chuyến bay khởi hành trong tháng, kể cả chuyến chưa có vé.'
                : 'Báo cáo năm (BM5.2) tổng hợp số chuyến bay và doanh thu của từng tháng trong năm.'
            }
          />
        </div>
      ) : !coDuLieu ? (
        <div className={s.khungRong}>
          <TrangThaiRong
            linhVat="ngu"
            kichThuocHinh={140}
            tieuDe="Không có dữ liệu"
            goiY={`Không có chuyến bay nào khởi hành trong ${kyBaoCao}, báo cáo rỗng.`}
          />
        </div>
      ) : (
        <div key={lanLap} className={s.ketQua}>
          <div className={s.luoiTong}>
            {ketQua.loai === 'thang' ? (
              <>
                <OTong nhan="Số chuyến bay" giaTri={ketQua.bc.soChuyenBay} donVi="chuyến" icon={<span className={s.iconTong}><Plane size={22} /></span>} />
                <OTong nhan="Số vé đã bán" giaTri={ketQua.bc.tongSoVe} donVi="vé" icon={<span className={s.iconTong}><Ticket size={22} /></span>} />
              </>
            ) : (
              <>
                <OTong
                  nhan="Số chuyến bay"
                  giaTri={ketQua.bc.dong.reduce((t, d) => t + d.soChuyenBay, 0)}
                  donVi="chuyến"
                  icon={<span className={s.iconTong}><Plane size={22} /></span>}
                />
                <ThangCaoNhat bc={ketQua.bc} />
              </>
            )}
            <OTong nhan="Tổng doanh thu" giaTri={ketQua.bc.tongDoanhThu} donVi="₫" nhanManh icon={<span className={`${s.iconTong} ${s.iconDo}`}><Wallet size={22} /></span>} />
          </div>

          <section className={s.theBang} aria-labelledby="tieu-de-bang-bao-cao">
            <header className={s.dauBang}>
              <div>
                <span className={s.nhanBieuMau}>{ketQua.loai === 'thang' ? 'BM5.1' : 'BM5.2'}</span>
                <h2 id="tieu-de-bang-bao-cao" className={s.tieuDeBang}>
                  {ketQua.loai === 'thang' ? 'Báo cáo doanh thu bán vé các chuyến bay' : 'Báo cáo doanh thu năm'}
                </h2>
              </div>
              <span className={s.ky}>{ketQua.loai === 'thang' ? `Tháng: ${ketQua.bc.thang}/${ketQua.bc.nam}` : `Năm: ${ketQua.bc.nam}`}</span>
            </header>
            <div className={s.cuon}>
              {ketQua.loai === 'thang' ? <BangThang bc={ketQua.bc} /> : <BangNam bc={ketQua.bc} />}
            </div>
          </section>
        </div>
      )}
    </KhungTrang>
  );
}

function ThangCaoNhat({ bc }: { bc: BaoCaoNam }) {
  const cao = bc.dong.reduce((m, d) => (d.doanhThu > m.doanhThu ? d : m), bc.dong[0]);
  return (
    <div className={s.oCao}>
      <span className={s.iconTong}>
        <TrendingUp size={22} />
      </span>
      <div>
        <div className={s.oCaoNhan}>Tháng doanh thu cao nhất</div>
        <div className={s.oCaoSo}>
          Tháng {cao.thang} <small>{dinhDangPhanTram(cao.tiLe)}</small>
        </div>
      </div>
    </div>
  );
}

function BangThang({ bc }: { bc: BaoCaoThang }) {
  const caoNhat = Math.max(0, ...bc.dong.map((d) => d.tiLe));
  return (
    <table className={s.bang}>
      <thead>
        <tr>
          <th scope="col" className={s.cotStt}>STT</th>
          <th scope="col">Chuyến bay</th>
          <th scope="col" className={s.phai}>Số vé</th>
          <th scope="col" className={s.phai}>Doanh thu</th>
          <th scope="col" className={s.cotTiLe}>Tỉ lệ</th>
        </tr>
      </thead>
      <tbody>
        {bc.dong.map((d, i) => (
          <tr key={d.maChuyenBay} className={d.soVe === 0 ? s.dongKhong : undefined}>
            <td className={s.cotStt}>{d.stt}</td>
            <td>
              <span className={s.ma}>{d.maChuyenBay}</span>
            </td>
            <td className={`${s.phai} ${s.so}`}>{dinhDangSo(d.soVe)}</td>
            <td className={`${s.phai} ${s.so}`}>{dinhDangTien(d.doanhThu)}</td>
            <td>
              <ThanhTiLe tiLe={d.tiLe} chiSo={i} caoNhat={caoNhat} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td />
          <td>Tổng cộng ({dinhDangSo(bc.soChuyenBay)} chuyến bay)</td>
          <td className={s.phai}>{dinhDangSo(bc.tongSoVe)}</td>
          <td className={`${s.phai} ${s.tongTien}`}>{dinhDangTien(bc.tongDoanhThu)}</td>
          <td>{dinhDangPhanTram(bc.tongDoanhThu > 0 ? 100 : 0)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function BangNam({ bc }: { bc: BaoCaoNam }) {
  const tongChuyen = bc.dong.reduce((t, d) => t + d.soChuyenBay, 0);
  const caoNhat = Math.max(0, ...bc.dong.map((d) => d.tiLe));
  return (
    <table className={s.bang}>
      <thead>
        <tr>
          <th scope="col" className={s.cotStt}>STT</th>
          <th scope="col">Tháng</th>
          <th scope="col" className={s.phai}>Số chuyến bay</th>
          <th scope="col" className={s.phai}>Doanh thu</th>
          <th scope="col" className={s.cotTiLe}>Tỉ lệ</th>
        </tr>
      </thead>
      <tbody>
        {bc.dong.map((d, i) => (
          <tr key={d.thang} className={d.soChuyenBay === 0 ? s.dongKhong : undefined}>
            <td className={s.cotStt}>{i + 1}</td>
            <td>
              <b className={s.tenThang}>Tháng {d.thang}</b>
            </td>
            <td className={`${s.phai} ${s.so}`}>{dinhDangSo(d.soChuyenBay)}</td>
            <td className={`${s.phai} ${s.so}`}>{dinhDangTien(d.doanhThu)}</td>
            <td>
              <ThanhTiLe tiLe={d.tiLe} chiSo={i} caoNhat={caoNhat} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td />
          <td>Tổng cộng</td>
          <td className={s.phai}>{dinhDangSo(tongChuyen)}</td>
          <td className={`${s.phai} ${s.tongTien}`}>{dinhDangTien(bc.tongDoanhThu)}</td>
          <td>{dinhDangPhanTram(bc.tongDoanhThu > 0 ? 100 : 0)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
