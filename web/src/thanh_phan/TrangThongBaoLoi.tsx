// Các trang báo: không đủ quyền, không tìm thấy, trang đang hoàn thiện
import { KhungTrang } from './KhungTrang';
import { Nut } from './Nut';
import { TrangThaiRong } from './TrangThaiRong';
import type { TuTheLinhVat } from './LinhVat';

const theNen: React.CSSProperties = {
  background: 'var(--nen-0)',
  border: '1px solid var(--vien)',
  borderRadius: 'var(--bo-the)',
  padding: '24px',
};

export function TrangKhongDuQuyen() {
  return (
    <KhungTrang tieuDe="Không có quyền truy cập">
      <div style={theNen}>
        <TrangThaiRong
          linhVat="tra_cuu"
          kichThuocHinh={140}
          tieuDe="Chức năng này chỉ dành cho Quản lý"
          goiY="Tài khoản của bạn thuộc nhóm Nhân viên bán vé. Vui lòng liên hệ Quản lý nếu cần được cấp quyền."
          hanhDong={<Nut den="/">Về trang chính</Nut>}
        />
      </div>
    </KhungTrang>
  );
}

export function TrangKhongTimThay() {
  return (
    <KhungTrang tieuDe="Không tìm thấy trang">
      <div style={theNen}>
        <TrangThaiRong
          linhVat="tra_cuu"
          kichThuocHinh={140}
          tieuDe="Trang bạn tìm không tồn tại"
          goiY="Đường dẫn có thể đã thay đổi. Hãy quay về trang chính để tiếp tục làm việc."
          hanhDong={<Nut den="/">Về trang chính</Nut>}
        />
      </div>
    </KhungTrang>
  );
}

export interface ThuocTinhTrangGiuCho {
  tieuDe: string;
  icon: React.ReactNode;
  moTa?: string;
  duongDan?: { nhan: string; den?: string }[];
  /** các việc trang sẽ làm, hiện dạng danh sách ngắn */
  noiDungSe?: string[];
  linhVat?: TuTheLinhVat;
}

/** Trang giữ chỗ tử tế cho các trang chưa làm xong */
export function TrangGiuCho({ tieuDe, icon, moTa, duongDan, noiDungSe, linhVat = 'cho' }: ThuocTinhTrangGiuCho) {
  return (
    <KhungTrang tieuDe={tieuDe} icon={icon} moTa={moTa} duongDan={duongDan} nut={<Nut bienThe="lang" muiTen={false} den="/">Đóng</Nut>}>
      <div style={theNen}>
        <TrangThaiRong
          linhVat={linhVat}
          kichThuocHinh={150}
          tieuDe="Đang hoàn thiện"
          goiY={
            noiDungSe?.length ? (
              <span style={{ display: 'block' }}>
                Trang này sẽ có:
                <span style={{ display: 'block', marginTop: 8, textAlign: 'left' }}>
                  {noiDungSe.map((n) => (
                    <span key={n} style={{ display: 'block' }}>
                      • {n}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              'Chức năng đang được xây dựng và sẽ có trong phiên bản tới.'
            )
          }
          hanhDong={<Nut den="/">Về trang chính</Nut>}
        />
      </div>
    </KhungTrang>
  );
}
