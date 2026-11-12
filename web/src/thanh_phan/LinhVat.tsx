// Linh vật Vút (máy bay giấy đỏ) ở sáu tư thế, ảnh nằm trong public/linh_vat
export type TuTheLinhVat = 'chao' | 'ban_ve' | 'tra_cuu' | 'thanh_cong' | 'cho' | 'ngu';

export interface ThuocTinhLinhVat {
  tuThe: TuTheLinhVat;
  kichThuoc?: number;
  className?: string;
  /** chữ thay thế; bỏ trống thì ảnh chỉ để trang trí */
  moTa?: string;
}

export function LinhVat({ tuThe, kichThuoc = 120, className, moTa }: ThuocTinhLinhVat) {
  return (
    <img
      src={`/linh_vat/vut_${tuThe}.svg`}
      width={kichThuoc}
      height={kichThuoc}
      alt={moTa ?? ''}
      aria-hidden={moTa ? undefined : true}
      className={className}
      draggable={false}
      loading="lazy"
    />
  );
}
