// Mô tả sáu tham số quy định: tên, đơn vị, quy định gốc, icon và ràng buộc giá trị mới
import { CalendarClock, CalendarX2, Hourglass, MapPinned, Timer, TimerReset } from 'lucide-react';
import type { TenThamSo, ThamSoQuyDinh } from '@/kieu/api';

export interface MoTaThamSo {
  ten: TenThamSo;
  tieuDe: string;
  donVi: string;
  qd: 'QĐ1' | 'QĐ3';
  icon: React.ReactNode;
  moTa: (ts: ThamSoQuyDinh) => string;
  /** giới hạn của giá trị mới, tính theo các tham số khác đang áp dụng */
  khoang: (ts: ThamSoQuyDinh) => { nhoNhat: number; lonNhat: number; goiY: string };
}

const PHUT_TOI_DA = 100000;
const NGAY_TOI_DA = 365;

export const THAM_SO: MoTaThamSo[] = [
  {
    ten: 'thoiGianBayToiThieu',
    tieuDe: 'Thời gian bay tối thiểu',
    donVi: 'phút',
    qd: 'QĐ1',
    icon: <Timer size={26} strokeWidth={2.2} />,
    moTa: () => 'Mỗi chuyến bay phải có thời gian bay không nhỏ hơn giá trị này.',
    khoang: () => ({ nhoNhat: 0, lonNhat: PHUT_TOI_DA, goiY: 'Số nguyên không âm (phút).' }),
  },
  {
    ten: 'soSanBayTrungGianToiDa',
    tieuDe: 'Số sân bay trung gian tối đa',
    donVi: 'sân bay',
    qd: 'QĐ1',
    icon: <MapPinned size={26} strokeWidth={2.2} />,
    moTa: () => 'Số điểm dừng nhiều nhất trên một chuyến bay. Nhập 0 nếu chỉ nhận chuyến bay thẳng.',
    khoang: () => ({ nhoNhat: 0, lonNhat: 255, goiY: 'Số nguyên từ 0 đến 255.' }),
  },
  {
    ten: 'thoiGianDungToiThieu',
    tieuDe: 'Thời gian dừng tối thiểu',
    donVi: 'phút',
    qd: 'QĐ1',
    icon: <Hourglass size={26} strokeWidth={2.2} />,
    moTa: () => 'Thời gian dừng ngắn nhất tại mỗi sân bay trung gian.',
    khoang: (ts) => ({
      nhoNhat: 0,
      lonNhat: ts.thoiGianDungToiDa,
      goiY: `Số nguyên không âm, không lớn hơn thời gian dừng tối đa (${ts.thoiGianDungToiDa} phút).`,
    }),
  },
  {
    ten: 'thoiGianDungToiDa',
    tieuDe: 'Thời gian dừng tối đa',
    donVi: 'phút',
    qd: 'QĐ1',
    icon: <TimerReset size={26} strokeWidth={2.2} />,
    moTa: () => 'Thời gian dừng dài nhất tại mỗi sân bay trung gian.',
    khoang: (ts) => ({
      nhoNhat: ts.thoiGianDungToiThieu,
      lonNhat: PHUT_TOI_DA,
      goiY: `Số nguyên không nhỏ hơn thời gian dừng tối thiểu (${ts.thoiGianDungToiThieu} phút).`,
    }),
  },
  {
    ten: 'thoiGianDatVeChamNhat',
    tieuDe: 'Thời gian chậm nhất khi đặt vé',
    donVi: 'ngày',
    qd: 'QĐ3',
    icon: <CalendarClock size={26} strokeWidth={2.2} />,
    moTa: (ts) => `Chỉ nhận đặt vé chậm nhất ${ts.thoiGianDatVeChamNhat} ngày trước ngày khởi hành.`,
    khoang: (ts) => ({
      nhoNhat: ts.thoiGianHuyDatVe + 1,
      lonNhat: NGAY_TOI_DA,
      goiY: `Số nguyên lớn hơn thời gian hủy đặt vé (${ts.thoiGianHuyDatVe} ngày), tối đa ${NGAY_TOI_DA} ngày.`,
    }),
  },
  {
    ten: 'thoiGianHuyDatVe',
    tieuDe: 'Thời gian hủy đặt vé',
    donVi: 'ngày',
    qd: 'QĐ3',
    icon: <CalendarX2 size={26} strokeWidth={2.2} />,
    moTa: (ts) =>
      ts.thoiGianHuyDatVe === 0
        ? 'Phiếu chưa thanh toán bị hủy từ 0 giờ của chính ngày khởi hành.'
        : `Phiếu chưa thanh toán bị hủy ${ts.thoiGianHuyDatVe} ngày trước ngày khởi hành.`,
    khoang: (ts) => ({
      nhoNhat: 0,
      lonNhat: ts.thoiGianDatVeChamNhat - 1,
      goiY: `Số nguyên không âm, nhỏ hơn thời gian chậm nhất khi đặt vé (${ts.thoiGianDatVeChamNhat} ngày). 0 là hủy vào ngày khởi hành.`,
    }),
  },
];
