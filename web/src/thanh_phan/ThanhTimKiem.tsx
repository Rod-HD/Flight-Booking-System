// Thanh tìm kiếm nổi viền đỏ có hàng tab đỏ (giống thanh tìm chuyến bay của trang tham chiếu).
// Dùng: <ThanhTimKiem tab={...}><ThanhTimKiem.O>...</ThanhTimKiem.O><ThanhTimKiem.Nut>...</ThanhTimKiem.Nut></ThanhTimKiem>
// Các ô bên trong nên truyền className={LOP_O_PHANG} để có kiểu phẳng.
import { TabTruot, type MucTab } from './TabTruot';
import { kieuONhap } from './ONhap';
import s from './ThanhTimKiem.module.css';

export const LOP_O_PHANG = kieuONhap.phang;

export interface ThuocTinhThanhTimKiem<K extends string> {
  tab?: MucTab<K>[];
  giaTriTab?: K;
  onDoiTab?: (k: K) => void;
  nhanTab?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  chuThich?: React.ReactNode;
  className?: string;
}

export function ThanhTimKiem<K extends string>({ tab, giaTriTab, onDoiTab, nhanTab = 'Chọn nghiệp vụ', children, onSubmit, chuThich, className }: ThuocTinhThanhTimKiem<K>) {
  return (
    <form
      className={`${s.thanh} ${className ?? ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      role="search"
    >
      {tab && giaTriTab && onDoiTab && (
        <div className={s.dai}>
          <TabTruot muc={tab} giaTri={giaTriTab} onDoi={onDoiTab} kieu="dai-do" nhan={nhanTab} />
        </div>
      )}
      <div className={s.hang}>{children}</div>
      {chuThich && <div className={s.chuThich}>{chuThich}</div>}
    </form>
  );
}

function O({ children, rong, className }: { children: React.ReactNode; rong?: number | string; className?: string }) {
  return (
    <div className={`${s.o} ${className ?? ''}`} style={rong ? { flex: `0 0 ${typeof rong === 'number' ? rong + 'px' : rong}` } : undefined}>
      {children}
    </div>
  );
}

function Nut({ children }: { children: React.ReactNode }) {
  return <div className={s.nut}>{children}</div>;
}

ThanhTimKiem.O = O;
ThanhTimKiem.Nut = Nut;
