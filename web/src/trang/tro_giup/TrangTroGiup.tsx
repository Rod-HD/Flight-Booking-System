// Trang Trợ giúp: hướng dẫn theo chức năng (accordion), bảng phím tắt, quy định đang áp dụng
import { Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Keyboard } from 'lucide-react';
import { apiQuyDinh, khoaTruyVan } from '@/api/dich_vu';
import {
  IconBanhRangDanhSach,
  IconBiaKepDongHo,
  IconBieuDoXu,
  IconChiaKhoa,
  IconKhienChia,
  IconKinhLup,
  IconLichDongHo,
  IconMayBay,
  IconTaiNghe,
  IconVeSao,
} from '@/icons3d';
import { dungPhien } from '@/phien/NguCanhPhien';
import { Accordion, type MucAccordion } from '@/thanh_phan/Accordion';
import { KhungTrang, TieuDeMuc } from '@/thanh_phan/KhungTrang';
import { NhanTrangThai } from '@/thanh_phan/NhanTrangThai';
import { Nut } from '@/thanh_phan/Nut';
import { OTong } from '@/thanh_phan/OTong';
import { BANG_PHIM_TAT } from '@/tien_ich/phim_tat';
import s from './TrangTroGiup.module.css';

interface ChuDe {
  khoa: string;
  tieuDe: string;
  icon: React.ReactNode;
  chiQuanLy?: boolean;
  buoc: React.ReactNode[];
}

const CHU_DE: ChuDe[] = [
  {
    khoa: 'dang-nhap',
    tieuDe: 'Đăng nhập và đăng xuất',
    icon: <IconChiaKhoa kichThuoc={40} />,
    buoc: [
      <>Nhập <b>tên đăng nhập</b> và <b>mật khẩu</b> do Quản lý cấp, rồi nhấn Enter hoặc nút Đăng nhập.</>,
      <>Nếu báo sai thông tin, kiểm tra phím Caps Lock (ô mật khẩu sẽ nhắc khi Caps Lock đang bật).</>,
      <>Tài khoản bị khóa thì không đăng nhập được, vui lòng liên hệ Quản lý để mở khóa.</>,
      <>Kết thúc ca làm việc, bấm <b>Đăng xuất</b> ở góc phải thanh trên cùng.</>,
    ],
  },
  {
    khoa: 'chuyen-bay',
    tieuDe: 'Nhận lịch và tra cứu chuyến bay',
    icon: <IconMayBay kichThuoc={40} />,
    buoc: [
      <>Vào <b>Chuyến bay</b> (Alt+1), lọc theo sân bay đi, sân bay đến, khoảng ngày hoặc mã chuyến bay (Ctrl+F để tới ô tìm).</>,
      <>Quản lý bấm <b>Thêm chuyến bay</b> (Ctrl+N), nhập theo biểu mẫu Lịch chuyến bay; thời gian bay, số sân bay trung gian và thời gian dừng phải đúng quy định.</>,
      <>Có thể <b>Nhập Excel</b> theo tập tin mẫu; các dòng không hợp lệ được liệt kê kèm lý do.</>,
      <>Chỉ xóa được chuyến bay chưa có vé hoặc phiếu đặt chỗ. Nhân viên chỉ xem chi tiết chuyến bay.</>,
    ],
  },
  {
    khoa: 'ban-ve',
    tieuDe: 'Bán vé',
    icon: <IconVeSao kichThuoc={40} />,
    buoc: [
      <>Vào <b>Bán vé</b> (Alt+2), chọn <b>Bán trực tiếp</b> hoặc <b>Bán từ phiếu đặt chỗ</b>.</>,
      <>Chọn chuyến bay (gõ mã hoặc tên sân bay để lọc), hệ thống hiện số ghế trống theo từng hạng.</>,
      <>Nhập họ tên, loại và số giấy tờ (CCCD 12 số hoặc hộ chiếu), điện thoại; chọn hạng vé, giá tiền tự tính theo tỉ lệ đơn giá.</>,
      <>Nhấn <b>Bán vé</b> hoặc Ctrl+S. Chỉ bán khi còn chỗ và chuyến bay chưa khởi hành.</>,
    ],
  },
  {
    khoa: 'dat-ve',
    tieuDe: 'Đặt vé (giữ chỗ)',
    icon: <IconLichDongHo kichThuoc={40} />,
    buoc: [
      <>Vào <b>Đặt vé</b> (Alt+3), nhập thông tin như khi bán vé.</>,
      <>Chỉ nhận đặt vé trước ngày khởi hành theo quy định về thời gian đặt vé chậm nhất.</>,
      <>Phiếu được giữ đến <b>hạn thanh toán</b>; quá hạn, hệ thống tự hủy phiếu và báo trên thanh thông báo.</>,
      <>Khi hành khách thanh toán, dùng <b>Bán vé từ phiếu</b> để lập vé.</>,
    ],
  },
  {
    khoa: 'danh-sach',
    tieuDe: 'Danh sách vé và phiếu đặt chỗ',
    icon: <IconBiaKepDongHo kichThuoc={40} />,
    buoc: [
      <>Tra cứu vé theo mã vé, giấy tờ, chuyến bay hoặc ngày bán; mặc định hiện vé bán trong ngày.</>,
      <>Chọn một dòng rồi bấm <b>Sửa</b> để cập nhật thông tin hành khách.</>,
      <>Bấm <b>Hủy vé</b> (nút đỏ) khi chuyến bay chưa khởi hành; hệ thống hỏi lại trước khi hủy.</>,
      <>Phiếu đặt chỗ đang chờ thanh toán có thể sửa hoặc hủy theo yêu cầu của hành khách.</>,
    ],
  },
  {
    khoa: 'bao-cao',
    tieuDe: 'Báo cáo doanh thu',
    icon: <IconBieuDoXu kichThuoc={40} />,
    chiQuanLy: true,
    buoc: [
      <>Vào <b>Báo cáo</b> (Alt+4), chọn báo cáo tháng hoặc báo cáo năm.</>,
      <>Chọn tháng, năm rồi bấm <b>Lập báo cáo</b>; cột tỉ lệ có thanh ngang để so sánh.</>,
      <>Bấm <b>Xuất Excel</b> hoặc <b>Xuất PDF</b> để lưu tập tin.</>,
      <>Doanh thu chỉ tính các vé đã bán, không tính vé đã hủy.</>,
    ],
  },
  {
    khoa: 'quy-dinh',
    tieuDe: 'Thay đổi quy định',
    icon: <IconBanhRangDanhSach kichThuoc={40} />,
    chiQuanLy: true,
    buoc: [
      <>Vào <b>Quy định</b>, chọn tham số cần đổi và bấm <b>Thay đổi</b>.</>,
      <>Thời gian dừng tối thiểu không lớn hơn tối đa; thời gian đặt vé chậm nhất phải lớn hơn thời gian hủy đặt vé.</>,
      <>Thêm, sửa tên hoặc xóa sân bay, hạng vé; không xóa được mục đang được dùng.</>,
      <>Tỉ lệ đơn giá chỉ nhập khi thêm hạng vé, không sửa sau khi lưu.</>,
    ],
  },
  {
    khoa: 'phan-quyen',
    tieuDe: 'Phân quyền tài khoản',
    icon: <IconKhienChia kichThuoc={40} />,
    chiQuanLy: true,
    buoc: [
      <>Vào <b>Tài khoản</b>, bấm <b>Thêm tài khoản</b> và chọn nhóm quyền Quản lý hoặc Nhân viên bán vé.</>,
      <>Bấm <b>Sửa</b> để đổi nhóm quyền hoặc đặt lại mật khẩu.</>,
      <>Bấm <b>Khóa</b> để tạm ngưng tài khoản, <b>Mở khóa</b> để dùng lại.</>,
      <>Không thể tự khóa hoặc tự đổi nhóm quyền của tài khoản đang đăng nhập.</>,
    ],
  },
];

export function TrangTroGiup() {
  const { laQuanLy } = dungPhien();
  const { data: qd } = useQuery({ queryKey: khoaTruyVan.quyDinh, queryFn: apiQuyDinh.lay, staleTime: 300000 });
  const chuDe = CHU_DE.filter((c) => laQuanLy || !c.chiQuanLy);
  const phim = BANG_PHIM_TAT.filter((p) => laQuanLy || !p.chiQuanLy);

  const muc: MucAccordion[] = chuDe.map((c) => ({
    khoa: c.khoa,
    tieuDe: c.tieuDe,
    icon: c.icon,
    phu: c.chiQuanLy ? <NhanTrangThai loai="do" nho coCham={false}>Quản lý</NhanTrangThai> : undefined,
    noiDung: (
      <ol className={s.buoc}>
        {c.buoc.map((b, i) => (
          <li key={i}>
            <span>{b}</span>
          </li>
        ))}
      </ol>
    ),
  }));

  return (
    <KhungTrang
      tieuDe="Trợ giúp"
      icon={<IconTaiNghe kichThuoc={56} />}
      moTa="Hướng dẫn nhanh theo từng chức năng và các phím tắt hay dùng"
      nut={
        <Nut bienThe="lang" muiTen={false} den="/">
          Đóng
        </Nut>
      }
    >
      <div className={s.luoi}>
        <Accordion muc={muc} moSan={chuDe[0]?.khoa} />
        <aside className={s.the} id="phim-tat" aria-labelledby="tieu-de-phim-tat">
          <div className={s.dauThe}>
            <IconKinhLup kichThuoc={44} />
            <div>
              <h2 id="tieu-de-phim-tat">Phím tắt</h2>
              <p>Dùng được ở mọi trang sau khi đăng nhập</p>
            </div>
          </div>
          <div className={s.phim}>
            {phim.map((p) => (
              <div key={p.moTa} className={s.dong}>
                <span>{p.moTa}</span>
                <span className={s.cacPhim}>
                  {p.phim.map((k, i) => (
                    <Fragment key={k}>
                      {i > 0 && <span className={s.cong}>+</span>}
                      <kbd className={s.phimNut}>{k}</kbd>
                    </Fragment>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--muc-500)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Keyboard size={16} /> Ctrl+N, Ctrl+S, Ctrl+F hoạt động trên các trang danh sách và biểu mẫu.
          </p>
        </aside>
      </div>

      {qd && (
        <section className={s.mucQD} aria-labelledby="tieu-de-qd">
          <TieuDeMuc id="tieu-de-qd" tieuDe="Quy định đang áp dụng" phu="Lấy trực tiếp từ hệ thống, cập nhật ngay khi Quản lý thay đổi" />
          <div className={s.luoiQD}>
            <OTong nhan="Thời gian bay tối thiểu" giaTri={qd.thamSo.thoiGianBayToiThieu} donVi="phút" />
            <OTong nhan="Số sân bay trung gian tối đa" giaTri={qd.thamSo.soSanBayTrungGianToiDa} donVi="sân bay" />
            <OTong nhan="Thời gian dừng tối thiểu" giaTri={qd.thamSo.thoiGianDungToiThieu} donVi="phút" />
            <OTong nhan="Thời gian dừng tối đa" giaTri={qd.thamSo.thoiGianDungToiDa} donVi="phút" />
            <OTong nhan="Đặt vé chậm nhất trước khởi hành" giaTri={qd.thamSo.thoiGianDatVeChamNhat} donVi="ngày" />
            <OTong nhan="Hủy đặt vé trước ngày khởi hành" giaTri={qd.thamSo.thoiGianHuyDatVe} donVi="ngày" />
          </div>
          <div className={s.hang}>
            <span>Hạng vé:</span>
            {qd.hangVe.map((h) => (
              <NhanTrangThai key={h.maHangVe} loai="do" coCham={false}>
                {h.tenHangVe} · {h.tiLeDonGia}% đơn giá
              </NhanTrangThai>
            ))}
            <span style={{ marginLeft: 8 }}>Số sân bay: {qd.sanBay.length}</span>
          </div>
        </section>
      )}
    </KhungTrang>
  );
}
