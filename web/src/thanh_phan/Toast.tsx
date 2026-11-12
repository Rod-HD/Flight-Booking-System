// Vùng hiện toast ở góc phải dưới; đặt một lần ở gốc ứng dụng
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { NutTron } from './Nut';
import { anToast, ngheToast, type LoaiToast, type MucToast } from './toast_kho';
import s from './Toast.module.css';

const LOP: Record<LoaiToast, string> = {
  'thanh-cong': s.thanhCong,
  loi: s.loi,
  'canh-bao': s.canhBao,
  'thong-tin': s.thongTin,
};

const ICON: Record<LoaiToast, React.ReactNode> = {
  'thanh-cong': <CheckCircle2 size={20} strokeWidth={2.4} />,
  loi: <XCircle size={20} strokeWidth={2.4} />,
  'canh-bao': <AlertTriangle size={19} strokeWidth={2.4} />,
  'thong-tin': <Info size={20} strokeWidth={2.4} />,
};

function MotToast({ t }: { t: MucToast }) {
  const [dangAn, datDangAn] = useState(false);
  useEffect(() => {
    if (dangAn) {
      const id = window.setTimeout(() => anToast(t.id), 220);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => datDangAn(true), t.thoiGian);
    return () => window.clearTimeout(id);
  }, [dangAn, t.id, t.thoiGian]);

  return (
    <div className={`${s.toast} ${LOP[t.loai]} ${dangAn ? s.dangAn : ''}`} role={t.loai === 'loi' ? 'alert' : 'status'}>
      <span className={s.icon}>{ICON[t.loai]}</span>
      <span className={s.noiDung}>{t.noiDung}</span>
      <NutTron nhan="Ẩn thông báo" bienThe="trong" kichThuoc="nho" onClick={() => datDangAn(true)}>
        <X size={16} />
      </NutTron>
      <span className={s.tienDo} style={{ animationDuration: `${t.thoiGian}ms` }} aria-hidden />
    </div>
  );
}

export function VungToast() {
  const [ds, datDs] = useState<MucToast[]>([]);
  useEffect(() => ngheToast(datDs), []);
  return (
    <div className={s.vung} aria-live="polite">
      {ds.map((t) => (
        <MotToast key={t.id} t={t} />
      ))}
    </div>
  );
}
