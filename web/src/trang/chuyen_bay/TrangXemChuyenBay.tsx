// Xem chi tiết chuyến bay (MH_ThemSuaChuyenBay ở chế độ xem): mọi vai trò, mọi ô chỉ đọc
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Pencil, ShieldCheck, X } from 'lucide-react';
import { apiChuyenBay, apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import { CHI_QUAN_LY } from '@/dinh_tuyen';
import { IconMayBay } from '@/icons3d';
import type { ChuyenBayChiTiet, QuyDinh } from '@/kieu/api';
import { ChiKhiCoQuyen } from '@/thanh_phan/BaoVeDuongDan';
import { KhungTrang } from '@/thanh_phan/KhungTrang';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { Nut } from '@/thanh_phan/Nut';
import { dinhDangSo, dinhDangTien } from '@/tien_ich/dinh_dang';
import { dungBayGio } from '@/tien_ich/hook';
import { conLai, dinhDangNgayGio, dinhDangThoiLuong, docIso } from '@/tien_ich/thoi_gian';
import { KhongTimThayChuyenBay, KhungChoChuyenBay } from './KhungChoChuyenBay';
import { TheHanhTrinh } from './TheHanhTrinh';
import s from './ChuyenBay.module.css';

function GiaTri({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return (
    <div className={s.giaTriXem}>
      <dt>{nhan}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function NoiDungXem({ cb, quyDinh }: { cb: ChuyenBayChiTiet; quyDinh: QuyDinh }) {
  const bayGio = dungBayGio(30000);
  const ten = (ma: string) => quyDinh.sanBay.find((x) => x.maSanBay === ma)?.tenSanBay ?? ma;
  const tiLe = (ma: string) => quyDinh.hangVe.find((h) => h.maHangVe === ma)?.tiLeDonGia ?? 100;
  const hang = cb.gheTheoHang.filter((g) => g.soLuongGhe > 0 || g.soDaBanVaDat > 0);
  const tong = hang.reduce((t, g) => t + g.soLuongGhe, 0);
  const trong = hang.reduce((t, g) => t + g.soGheTrong, 0);
  const daDung = hang.reduce((t, g) => t + g.soDaBanVaDat, 0);
  const cl = conLai(cb.ngayGioKhoiHanh, bayGio);

  return (
    <div className={s.luoi}>
      <div className={s.cot}>
        <section className={s.the} aria-labelledby="xem-thong-tin">
          <div className={s.dauThe}>
            <div className={s.dauTheTrai}>
              <span className={s.soMuc}>1</span>
              <div>
                <h2 className={s.tieuDeThe} id="xem-thong-tin">
                  Thông tin chuyến bay
                </h2>
                <p className={s.phuThe}>Chế độ xem, các ô chỉ đọc</p>
              </div>
            </div>
            {cl.phut < 0 ? (
              <NhanTrangThai loai="trung-tinh">Đã khởi hành</NhanTrangThai>
            ) : trong <= 0 ? (
              <NhanTrangThai loai="do">Hết chỗ</NhanTrangThai>
            ) : (
              <NhanTrangThai loai="thanh-cong">Khởi hành {cl.chu}</NhanTrangThai>
            )}
          </div>
          <dl className={s.luoiO} style={{ margin: 0 }}>
            <GiaTri nhan="Mã chuyến bay">{cb.maChuyenBay}</GiaTri>
            <GiaTri nhan="Giá vé">{dinhDangTien(cb.giaVe)}</GiaTri>
            <GiaTri nhan="Sân bay đi">
              {cb.maSanBayDi} <small>{ten(cb.maSanBayDi)}</small>
            </GiaTri>
            <GiaTri nhan="Sân bay đến">
              {cb.maSanBayDen} <small>{ten(cb.maSanBayDen)}</small>
            </GiaTri>
            <GiaTri nhan="Ngày giờ khởi hành">{dinhDangNgayGio(cb.ngayGioKhoiHanh)}</GiaTri>
            <GiaTri nhan="Thời gian bay">
              {cb.thoiGianBay} phút <small>{cb.thoiGianBay >= 60 ? dinhDangThoiLuong(cb.thoiGianBay) : ''}</small>
            </GiaTri>
          </dl>
        </section>

        <section className={s.the} aria-labelledby="xem-ghe">
          <div className={s.dauThe}>
            <div className={s.dauTheTrai}>
              <span className={s.soMuc}>2</span>
              <div>
                <h2 className={s.tieuDeThe} id="xem-ghe">
                  Số lượng ghế theo hạng vé
                </h2>
                <p className={s.phuThe}>Số đã bán và đặt gồm vé Đã bán và phiếu đặt chỗ Chờ thanh toán.</p>
              </div>
            </div>
          </div>
          <table className={s.bangNhap}>
            <thead>
              <tr>
                <th>Hạng vé</th>
                <th className={s.phai}>Giá vé hạng</th>
                <th className={s.phai}>Số lượng ghế</th>
                <th className={s.phai}>Đã bán và đặt</th>
                <th style={{ width: 200 }}>Còn trống</th>
              </tr>
            </thead>
            <tbody>
              {hang.map((g) => (
                <tr key={g.maHangVe}>
                  <td>
                    <span className={s.tenHang}>
                      <span className={s.maHang}>{g.maHangVe}</span>
                      <b>{g.tenHangVe}</b>
                    </span>
                  </td>
                  <td className={`${s.giaHang} ${s.phai}`}>{dinhDangTien(Math.round((cb.giaVe * tiLe(g.maHangVe)) / 100))}</td>
                  <td className={`${s.soDung} ${s.phai}`}>
                    <b>{dinhDangSo(g.soLuongGhe)}</b>
                  </td>
                  <td className={`${s.soDung} ${s.phai}`}>{dinhDangSo(g.soDaBanVaDat)}</td>
                  <td className={s.soDung}>
                    <b>{dinhDangSo(g.soGheTrong)}</b> ghế
                    <span className={s.thanhGhe} aria-hidden>
                      <span style={{ width: `${g.soLuongGhe ? (g.soDaBanVaDat / g.soLuongGhe) * 100 : 0}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Tổng cộng</td>
                <td />
                <td className={s.phai}>{dinhDangSo(tong)}</td>
                <td className={s.phai}>{dinhDangSo(daDung)}</td>
                <td>{dinhDangSo(trong)} ghế trống</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className={s.the} aria-labelledby="xem-tg">
          <div className={s.dauThe}>
            <div className={s.dauTheTrai}>
              <span className={s.soMuc}>3</span>
              <div>
                <h2 className={s.tieuDeThe} id="xem-tg">
                  Sân bay trung gian
                </h2>
                <p className={s.phuThe}>Theo thứ tự dừng</p>
              </div>
            </div>
          </div>
          {cb.trungGian.length === 0 ? (
            <div className={s.trongTg}>
              <MapPin size={28} color="var(--do-500)" />
              <span>
                <b>Chuyến bay bay thẳng</b>
                Không có sân bay trung gian.
              </span>
            </div>
          ) : (
            <table className={s.bangNhap}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>STT</th>
                  <th>Sân bay trung gian</th>
                  <th className={s.phai}>Thời gian dừng</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {[...cb.trungGian]
                  .sort((a, b) => a.thuTu - b.thuTu)
                  .map((t) => (
                    <tr key={t.thuTu}>
                      <td>
                        <span className={s.sttTg} style={{ marginTop: 0 }}>
                          {t.thuTu}
                        </span>
                      </td>
                      <td className={s.soDung} style={{ paddingTop: 13 }}>
                        <b>{t.maSanBay}</b> {t.tenSanBay || ten(t.maSanBay)}
                      </td>
                      <td className={`${s.soDung} ${s.phai}`}>
                        <b>{t.thoiGianDung}</b> phút
                      </td>
                      <td className={s.soDung}>{t.ghiChu || <span style={{ color: 'var(--muc-400)' }}>Không có</span>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <aside className={s.cotPhai}>
        <TheHanhTrinh
          maChuyenBay={cb.maChuyenBay}
          di={{ ma: cb.maSanBayDi, ten: ten(cb.maSanBayDi) }}
          den={{ ma: cb.maSanBayDen, ten: ten(cb.maSanBayDen) }}
          soDiemDung={cb.trungGian.length}
          ngayGio={cb.ngayGioKhoiHanh}
          thoiGianBay={cb.thoiGianBay}
          tongGhe={tong}
          gheTrong={trong}
          giaVe={cb.giaVe}
        />
        <section className={s.theQuyDinh} aria-labelledby="xem-qd">
          <h3 id="xem-qd">
            <ShieldCheck size={18} /> Quy định đang áp dụng (QĐ1)
          </h3>
          <ul className={s.dsQuyDinh}>
            <li>
              Thời gian bay tối thiểu <b>{quyDinh.thamSo.thoiGianBayToiThieu} phút</b>
            </li>
            <li>
              Sân bay trung gian tối đa <b>{quyDinh.thamSo.soSanBayTrungGianToiDa}</b>
            </li>
            <li>
              Thời gian dừng
              <b>
                {quyDinh.thamSo.thoiGianDungToiThieu} đến {quyDinh.thamSo.thoiGianDungToiDa} phút
              </b>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

export function TrangXemChuyenBay() {
  const { ma = '' } = useParams();
  const bayGio = dungBayGio(30000);
  const quyDinh = useQuery({ queryKey: khoaTruyVan.quyDinh, queryFn: apiQuyDinh.lay });
  const chiTiet = useQuery({ queryKey: khoaTruyVan.chuyenBayChiTiet(ma), queryFn: () => apiChuyenBay.chiTiet(ma) });
  const cb = chiTiet.data;
  const trong = cb?.gheTheoHang.reduce((t, g) => t + g.soGheTrong, 0) ?? 0;
  const khongBan = !cb || docIso(cb.ngayGioKhoiHanh) <= bayGio || trong <= 0;
  const lyDo = cb && docIso(cb.ngayGioKhoiHanh) <= bayGio ? 'Chuyến bay đã khởi hành' : 'Chuyến bay đã hết chỗ';

  return (
    <KhungTrang
      tieuDe={`Chuyến bay ${ma}`}
      icon={<IconMayBay kichThuoc={56} />}
      moTa="Lịch chuyến bay theo biểu mẫu BM1, số ghế trống theo từng hạng vé"
      duongDan={[{ nhan: 'Chuyến bay', den: '/chuyen-bay' }, { nhan: ma }]}
      nut={
        <>
          {cb && (
            <>
              <Nut den={`/ban-ve?maChuyenBay=${ma}`} disabled={khongBan} title={khongBan ? lyDo : undefined}>
                Bán vé
              </Nut>
              <Nut bienThe="phu" den={`/dat-ve?maChuyenBay=${ma}`} disabled={khongBan} title={khongBan ? lyDo : undefined}>
                Đặt vé
              </Nut>
              <ChiKhiCoQuyen quyen={CHI_QUAN_LY}>
                <Nut bienThe="phu" muiTen={false} iconTrai={<Pencil size={17} />} den={`/chuyen-bay/${ma}/sua`} disabled={!cb}>
                  Sửa
                </Nut>
              </ChiKhiCoQuyen>
            </>
          )}
          <Nut bienThe="lang" muiTen={false} iconTrai={<X size={18} />} den="/chuyen-bay">
            Đóng
          </Nut>
        </>
      }
    >
      {chiTiet.isPending || quyDinh.isPending ? (
        <KhungChoChuyenBay />
      ) : chiTiet.error || quyDinh.error || !cb || !quyDinh.data ? (
        <KhongTimThayChuyenBay loi={chiTiet.error ?? quyDinh.error} ma={ma} />
      ) : (
        <NoiDungXem cb={cb} quyDinh={quyDinh.data} />
      )}
    </KhungTrang>
  );
}
