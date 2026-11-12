// Đếm ngược tới hạn thanh toán: dưới 1 giờ màu đỏ, dưới 6 giờ màu hổ phách
import s from './DemNguoc.module.css';

const hai = (n: number) => String(n).padStart(2, '0');

export function DemNguoc({ moc, bayGio }: { moc: Date; bayGio: Date }) {
  const giay = Math.floor((moc.getTime() - bayGio.getTime()) / 1000);
  if (giay <= 0) return <small className={`${s.dem} ${s.het}`}>đã quá hạn</small>;
  const g = Math.floor(giay / 3600);
  const p = Math.floor((giay % 3600) / 60);
  const lop = giay < 3600 ? s.gap : giay < 6 * 3600 ? s.sapGap : '';
  const chu = g >= 48 ? `còn ${Math.floor(g / 24)} ngày` : `còn ${hai(g)}:${hai(p)}:${hai(giay % 60)}`;
  return (
    <small className={`${s.dem} ${lop}`} aria-label={`còn ${g} giờ ${p} phút`}>
      <span className={s.cham} aria-hidden />
      {chu}
    </small>
  );
}
