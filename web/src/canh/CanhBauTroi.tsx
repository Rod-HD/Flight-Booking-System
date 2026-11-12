// Key visual tự dựng bằng SVG và CSS: trời xanh, mây trôi thị sai, Vút bay kèm vệt chấm,
// thêm vật minh họa theo chủ đề (tấm vé, lịch giữ chỗ, biểu đồ báo cáo...).
import { IconBieuDoXu, IconKinhLup, IconLichDongHo, IconMayBay, IconVeSao } from '@/icons3d';
import { LinhVat, type TuTheLinhVat } from '@/thanh_phan/LinhVat';
import { May, NenMay } from './May';
import s from './CanhBauTroi.module.css';

export type ChuDeCanh = 'ban-ve' | 'giu-cho' | 'bao-cao' | 'chao' | 'tra-cuu';

interface ViTriMay {
  x: number;
  y: number;
  w: number;
}

const MAY_XA: ViTriMay[] = [
  { x: 4, y: 10, w: 150 },
  { x: 30, y: 4, w: 110 },
  { x: 56, y: 16, w: 170 },
  { x: 82, y: 6, w: 130 },
];
const MAY_GIUA: ViTriMay[] = [
  { x: 8, y: 34, w: 230 },
  { x: 44, y: 26, w: 190 },
  { x: 74, y: 40, w: 250 },
];
const MAY_GAN: ViTriMay[] = [
  { x: -4, y: 66, w: 420 },
  { x: 34, y: 74, w: 360 },
  { x: 66, y: 64, w: 440 },
];

function LopMay({ ds, lop }: { ds: ViTriMay[]; lop: string }) {
  const nua = (
    <div className={s.nua}>
      {ds.map((m, i) => (
        <May key={i} rong={m.w} className={s.may} style={{ left: `${m.x}%`, top: `${m.y}%` }} />
      ))}
    </div>
  );
  return (
    <div className={`${s.lop} ${lop}`} aria-hidden>
      {nua}
      {nua}
    </div>
  );
}

const TU_THE: Record<ChuDeCanh, TuTheLinhVat> = {
  'ban-ve': 'ban_ve',
  'giu-cho': 'cho',
  'bao-cao': 'thanh_cong',
  chao: 'chao',
  'tra-cuu': 'tra_cuu',
};

/** Đuôi máy bay đỏ có sọc vàng, vẽ ở mép phải */
function DuoiMayBay({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 260 340" className={s.duoi} style={style} aria-hidden focusable="false">
      <defs>
        <linearGradient id="duoi-do" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF4B52" />
          <stop offset="1" stopColor="#C8121A" />
        </linearGradient>
        <linearGradient id="duoi-vang" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFE14A" />
          <stop offset="1" stopColor="#F9A51A" />
        </linearGradient>
      </defs>
      <path d="M150 0h110v340H20C70 250 110 140 150 0z" fill="url(#duoi-do)" />
      <path d="M118 120c50 30 100 40 142 36v34c-50 6-108-6-156-36z" fill="url(#duoi-vang)" />
      <path d="M86 214c58 30 120 40 174 34v26c-60 8-128-4-186-34z" fill="#FFFFFF" opacity="0.9" />
      <path d="M156 10c-10 50-28 110-52 168" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function TheBieuDo({ style }: { style: React.CSSProperties }) {
  const cot = [38, 54, 46, 70, 62, 88];
  return (
    <div className={s.theBieuDo} style={style} aria-hidden>
      <svg viewBox="0 0 220 120" width="100%" focusable="false">
        <defs>
          <linearGradient id="cot-do" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF4B52" />
            <stop offset="1" stopColor="#D5141C" />
          </linearGradient>
        </defs>
        {[30, 60, 90].map((y) => (
          <line key={y} x1="0" x2="220" y1={y} y2={y} stroke="#E8E8E8" strokeDasharray="3 5" />
        ))}
        {cot.map((h, i) => (
          <rect key={i} className={s.cot} style={{ animationDelay: `${i * 90}ms` }} x={10 + i * 35} y={116 - h} width="22" height={h} rx="6" fill={i === cot.length - 1 ? 'url(#cot-do)' : '#F6C9CB'} />
        ))}
        <path className={s.duongXu} d="M21 74 L56 58 L91 66 L126 42 L161 50 L196 22" stroke="#F9A51A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="196" cy="22" r="6" fill="#FFE14A" stroke="#fff" strokeWidth="3" />
      </svg>
    </div>
  );
}

function VongDem({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 120" className={s.vongDem} style={style} aria-hidden focusable="false">
      <circle cx="60" cy="60" r="56" fill="rgba(255,255,255,0.85)" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#FDE3E4" strokeWidth="9" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#EC2029" strokeWidth="9" strokeLinecap="round" strokeDasharray="302" />
    </svg>
  );
}

export interface ThuocTinhCanh {
  chuDe: ChuDeCanh;
  /** dung: khung cao (trang đăng nhập); ngang: băng rộng thấp (trang chính) */
  bo?: 'dung' | 'ngang';
  /** phủ tối phía dưới (dung) hoặc bên trái (ngang) để chữ trắng dễ đọc */
  phuToi?: boolean;
  className?: string;
}

export function CanhBauTroi({ chuDe, bo = 'dung', phuToi = true, className }: ThuocTinhCanh) {
  const dung = bo === 'dung';
  // vị trí theo phần trăm khung; ngang thì dồn vật sang phải để chừa chỗ cho chữ
  const vt = dung
    ? {
        linhVat: { left: '54%', top: '17%', width: 'min(28%, 240px)' },
        vet: { left: '20%', top: '26%', width: '40%', height: '18%' },
        vat: { left: '12%', top: '21%', width: 'min(24%, 200px)' },
        vatPhu: { left: '78%', top: '40%', width: 'min(12%, 110px)' },
        bieuDo: { left: '9%', top: '22%', width: 'min(34%, 290px)' },
      }
    : {
        linhVat: { right: '5%', top: '6%', width: 'min(17%, 200px)' },
        vet: { right: '20%', top: '18%', width: '26%', height: '40%' },
        vat: { right: '25%', top: '26%', width: 'min(12%, 140px)' },
        vatPhu: { right: '40%', top: '12%', width: 'min(7%, 84px)' },
        bieuDo: { right: '22%', top: '18%', width: 'min(20%, 240px)' },
      };
  const kt = 220;

  const vatChinh: Record<ChuDeCanh, React.ReactNode> = {
    'ban-ve': <IconVeSao kichThuoc={kt} />,
    'giu-cho': <IconLichDongHo kichThuoc={kt} />,
    'bao-cao': null,
    chao: <IconMayBay kichThuoc={kt} />,
    'tra-cuu': <IconKinhLup kichThuoc={kt} />,
  };

  return (
    <div className={`${s.canh} ${className ?? ''}`} aria-hidden>
      <div className={s.mat} />
      <div className={s.tia} />
      <LopMay ds={MAY_XA} lop={s.lopXa} />
      <LopMay ds={MAY_GIUA} lop={s.lopGiua} />
      {chuDe === 'ban-ve' && <DuoiMayBay style={dung ? { right: '-2%', top: '-4%', height: '84%' } : { right: '-1%', top: '-10%', height: '120%', opacity: 0.95 }} />}
      <svg className={s.vet} style={vt.vet} viewBox="0 0 300 120" preserveAspectRatio="none" focusable="false">
        <path d="M4 110 C 70 110, 110 30, 180 50 S 270 70, 296 12" stroke="#EC2029" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 16" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {chuDe === 'bao-cao' ? (
        <>
          <TheBieuDo style={vt.bieuDo} />
          <div className={`${s.vat} ${s.vatPhu}`} style={vt.vatPhu}>
            <IconBieuDoXu kichThuoc={120} />
          </div>
        </>
      ) : (
        <div className={s.vat} style={vt.vat}>
          {vatChinh[chuDe]}
        </div>
      )}
      {chuDe === 'giu-cho' && <VongDem style={{ ...vt.vatPhu }} />}
      <div className={s.linhVat} style={vt.linhVat}>
        <LinhVat tuThe={TU_THE[chuDe]} kichThuoc={260} />
      </div>
      <LopMay ds={MAY_GAN} lop={s.lopGan} />
      <NenMay className={s.nenMay} />
      {phuToi && <div className={dung ? s.phuToi : s.phuTrai} />}
    </div>
  );
}
