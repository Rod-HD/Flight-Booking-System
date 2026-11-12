// Accordion: mỗi mục mở ra mượt bằng grid-template-rows, chỉ một mục mở một lúc (tùy chọn)
import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import s from './Accordion.module.css';

export interface MucAccordion {
  khoa: string;
  tieuDe: React.ReactNode;
  icon?: React.ReactNode;
  phu?: React.ReactNode;
  noiDung: React.ReactNode;
}

export function Accordion({ muc, moSan, motMuc = true }: { muc: MucAccordion[]; moSan?: string; motMuc?: boolean }) {
  const goc = useId().replace(/:/g, '');
  const [dangMo, datDangMo] = useState<string[]>(moSan ? [moSan] : []);
  const bat = (k: string) =>
    datDangMo((ds) => (ds.includes(k) ? ds.filter((x) => x !== k) : motMuc ? [k] : [...ds, k]));

  return (
    <div className={s.ds}>
      {muc.map((m) => {
        const mo = dangMo.includes(m.khoa);
        const idThan = `${goc}-${m.khoa}`;
        return (
          <div key={m.khoa} className={`${s.muc} ${mo ? s.mo : ''}`}>
            <h3 style={{ margin: 0 }}>
              <button type="button" className={s.dau} aria-expanded={mo} aria-controls={idThan} onClick={() => bat(m.khoa)}>
                {m.icon && <span className={s.icon}>{m.icon}</span>}
                <span className={s.chu}>{m.tieuDe}</span>
                {m.phu && <span className={s.phu}>{m.phu}</span>}
                <span className={s.mui} aria-hidden>
                  <ChevronDown size={18} />
                </span>
              </button>
            </h3>
            <div className={s.than} id={idThan} role="region" aria-hidden={!mo}>
              <div className={s.thanTrong}>
                <div className={s.noiDung}>{m.noiDung}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
