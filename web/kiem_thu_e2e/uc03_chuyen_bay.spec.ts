// UC03 Quản lý chuyến bay: thêm (BM1, QĐ1), sửa, xóa (AT02), tra cứu (BM4), xuất và nhập Excel (TT01, TT02).
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  ApiThu,
  bamTrongHopThoai,
  chonTrongOChon,
  dangNhap,
  hopThoai,
  maMoi,
  mocVN,
  nhapNgay,
  toast,
} from './tien_ich/chung';
import { docExcel, taoExcel } from './tien_ich/excel';

interface DuLieuBieuMau {
  ma: string;
  giaVe?: string;
  di?: string;
  den?: string;
  ngayGio?: string;
  thoiGianBay?: string;
  gheH1?: string;
  gheH2?: string;
}

async function dienBieuMau(page: Page, d: DuLieuBieuMau) {
  await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(d.ma);
  await page.getByRole('textbox', { name: 'Giá vé (VND)' }).fill(d.giaVe ?? '1500000');
  await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đi' }), d.di ?? 'SGN', new RegExp(`^${d.di ?? 'SGN'}`));
  await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đến' }), d.den ?? 'HAN', new RegExp(`^${d.den ?? 'HAN'}`));
  await nhapNgay(page, 'Ngày giờ khởi hành', d.ngayGio ?? mocVN(15, 9, 0).vnGio);
  await page.getByRole('textbox', { name: 'Thời gian bay (phút)' }).fill(d.thoiGianBay ?? '130');
  await page.getByLabel('Số lượng ghế Hạng 1').fill(d.gheH1 ?? '10');
  await page.getByLabel('Số lượng ghế Hạng 2').fill(d.gheH2 ?? '60');
}

function bangTrungGian(page: Page) {
  return page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Sân bay trung gian' }) });
}

async function themTrungGian(page: Page, maSanBay: string, thoiGianDung: string, ghiChu = '') {
  await page.getByRole('button', { name: 'Thêm sân bay trung gian' }).click();
  const bang = bangTrungGian(page);
  const i = (await bang.getByRole('combobox').count()) - 1;
  await chonTrongOChon(bang.getByRole('combobox').nth(i), maSanBay, new RegExp(`^${maSanBay}`));
  await bang.getByLabel('Thời gian dừng (phút)').nth(i).fill(thoiGianDung);
  if (ghiChu) await bang.getByLabel('Ghi chú').nth(i).fill(ghiChu);
}

async function timTheoMa(page: Page, ma: string) {
  await page.goto('/chuyen-bay');
  await nhapNgay(page, 'Từ ngày', '');
  await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(ma);
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Danh sách chuyến bay' }).getByRole('row').filter({ hasText: ma })).toHaveCount(1);
}

test.describe('UC03 Quản lý chuyến bay', () => {
  test('UC03.1 Thêm chuyến bay hợp lệ có sân bay trung gian (BM1, QĐ1, NV01)', async ({ page }) => {
    const ma = maMoi('KT');
    await dangNhap(page, 'quanLy', '/chuyen-bay/them');
    await dienBieuMau(page, { ma, di: 'SGN', den: 'HAN' });
    await themTrungGian(page, 'DAD', '15', 'Đón khách');
    await expect(page.getByText('Còn thêm được 1 sân bay trung gian.')).toBeVisible();
    await page.getByRole('button', { name: 'Lưu chuyến bay' }).click();
    await expect(toast(page, `Thêm chuyến bay ${ma} thành công.`)).toBeVisible();
    await expect(page).toHaveURL(/\/chuyen-bay$/);

    await page.goto(`/chuyen-bay/${ma}`);
    await expect(page.getByRole('heading', { level: 1, name: `Chuyến bay ${ma}` })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('DAD');
    await expect(page.getByRole('main')).toContainText('Đón khách');
    await expect(page.getByRole('main')).toContainText('1.500.000');
  });

  test('UC03.2 Thời gian bay dưới mức tối thiểu thì không lưu được (QĐ1)', async ({ page }) => {
    const ma = maMoi('KT');
    await dangNhap(page, 'quanLy', '/chuyen-bay/them');
    await dienBieuMau(page, { ma, thoiGianBay: '20' });
    await page.getByRole('button', { name: 'Lưu chuyến bay' }).click();
    await expect(page.getByText('Thời gian bay phải từ 30 phút trở lên (QĐ1).')).toBeVisible();
    await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
    expect((await page.request.get(`/api/chuyen-bay/${ma}`)).status()).toBe(404);
  });

  test('UC03.3 Không thêm quá số sân bay trung gian tối đa (QĐ1)', async ({ page }) => {
    await dangNhap(page, 'quanLy', '/chuyen-bay/them');
    await dienBieuMau(page, { ma: maMoi('KT'), di: 'SGN', den: 'HAN' });
    await themTrungGian(page, 'DAD', '15');
    await themTrungGian(page, 'HUI', '10');
    await expect(page.getByText('Đã đủ 2 sân bay trung gian theo quy định.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thêm sân bay trung gian' })).toBeDisabled();
    await expect(bangTrungGian(page).getByRole('combobox')).toHaveCount(2);
  });

  test('UC03.4 Thời gian dừng ngoài khoảng cho phép thì báo lỗi (QĐ1)', async ({ page }) => {
    const ma = maMoi('KT');
    await dangNhap(page, 'quanLy', '/chuyen-bay/them');
    await dienBieuMau(page, { ma });
    await themTrungGian(page, 'DAD', '25');
    await page.getByRole('button', { name: 'Lưu chuyến bay' }).click();
    const loiDung = bangTrungGian(page).getByRole('alert').filter({ hasText: 'Từ 10 đến 20 phút (QĐ1).' });
    await expect(loiDung).toBeVisible();
    await bangTrungGian(page).getByLabel('Thời gian dừng (phút)').first().fill('5');
    await expect(loiDung).toBeVisible();
    await bangTrungGian(page).getByLabel('Thời gian dừng (phút)').first().fill('15');
    await expect(loiDung).toBeHidden();
    expect((await page.request.get(`/api/chuyen-bay/${ma}`)).status()).toBe(404);
  });

  test('UC03.5 Trùng mã chuyến bay đã có thì báo lỗi (BM1)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    await api.dong();
    await dangNhap(page, 'quanLy', '/chuyen-bay/them');
    await dienBieuMau(page, { ma: cb.maChuyenBay });
    await page.getByRole('button', { name: 'Lưu chuyến bay' }).click();
    await bamTrongHopThoai(page, 'Mã chuyến bay đã tồn tại', 'Đóng');
    await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
  });

  test('UC03.6 Sửa giá vé và thời gian bay của chuyến bay (UC03.2, QĐ1)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay({ giaVe: 1_000_000 });
    await api.dong();
    await dangNhap(page, 'quanLy', `/chuyen-bay/${cb.maChuyenBay}/sua`);
    await expect(page.getByRole('textbox', { name: 'Mã chuyến bay' })).toHaveValue(cb.maChuyenBay);
    await page.getByRole('textbox', { name: 'Giá vé (VND)' }).fill('2000000');
    await page.getByRole('textbox', { name: 'Thời gian bay (phút)' }).fill('140');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page, `Cập nhật chuyến bay ${cb.maChuyenBay} thành công.`)).toBeVisible();
    await page.goto(`/chuyen-bay/${cb.maChuyenBay}`);
    await expect(page.getByRole('main')).toContainText('2.000.000');
    await expect(page.getByRole('main')).toContainText('2 giờ 20 phút');
  });

  test('UC03.7 Xóa chuyến bay chưa có vé (UC03.3, AT02)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    await api.dong();
    await dangNhap(page, 'quanLy', '/chuyen-bay');
    await timTheoMa(page, cb.maChuyenBay);
    await page.getByRole('button', { name: `Xóa chuyến bay ${cb.maChuyenBay}` }).click();
    await bamTrongHopThoai(page, `Xóa chuyến bay ${cb.maChuyenBay}?`, 'Xóa');
    await expect(toast(page, `Xóa chuyến bay ${cb.maChuyenBay} thành công.`)).toBeVisible();
    expect((await page.request.get(`/api/chuyen-bay/${cb.maChuyenBay}`)).status()).toBe(404);
  });

  test('UC03.8 Không xóa được chuyến bay đã có vé (UC03.3, AT02)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    await api.banVe(cb.maChuyenBay, 'H2');
    await api.dong();
    await dangNhap(page, 'quanLy', '/chuyen-bay');
    await timTheoMa(page, cb.maChuyenBay);
    await page.getByRole('button', { name: `Xóa chuyến bay ${cb.maChuyenBay}` }).click();
    await bamTrongHopThoai(page, `Xóa chuyến bay ${cb.maChuyenBay}?`, 'Xóa');
    await bamTrongHopThoai(page, 'Không thể xóa chuyến bay', 'Đóng');
    expect((await page.request.get(`/api/chuyen-bay/${cb.maChuyenBay}`)).status()).toBe(200);
  });

  test('UC03.9 Tra cứu chuyến bay theo sân bay đi, sân bay đến và ngày (UC03.4, BM4, NV04)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay({ maSanBayDi: 'VCA', maSanBayDen: 'VII', lechNgay: 25, gio: 7 });
    await api.dong();
    const ngay = mocVN(25);
    await dangNhap(page, 'nhanVien', '/chuyen-bay');
    await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đi' }), 'VCA', /^VCA/);
    await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đến' }), 'VII', /^VII/);
    await nhapNgay(page, 'Từ ngày', ngay.vn);
    await nhapNgay(page, 'Đến ngày', ngay.vn);
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    const bang = page.getByRole('table', { name: 'Danh sách chuyến bay' });
    await expect(bang.getByRole('row').filter({ hasText: cb.maChuyenBay })).toHaveCount(1);
    // mọi dòng kết quả đều đúng tuyến và đúng ngày
    const cacDong = bang.locator('tbody tr');
    const soDong = await cacDong.count();
    expect(soDong).toBeGreaterThan(0);
    for (let i = 0; i < soDong; i++) {
      await expect(cacDong.nth(i)).toContainText(/VCA.*VII/);
      await expect(cacDong.nth(i)).toContainText(ngay.vn);
    }
    await expect(page.getByText(/Tìm thấy \d+ chuyến bay/)).toBeVisible();
  });

  test('UC03.10 Xuất danh sách chuyến bay ra tập tin Excel (UC03.4, TT02)', async ({ page }) => {
    await dangNhap(page, 'nhanVien', '/chuyen-bay');
    await expect(page.getByRole('table', { name: 'Danh sách chuyến bay' }).locator('tbody tr').first()).toBeVisible();
    const choTai = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất Excel' }).click();
    const tai = await choTai;
    expect(tai.suggestedFilename()).toMatch(/\.xlsx$/);
    const noiDung = await readFile((await tai.path())!);
    const { chu } = docExcel(noiDung);
    expect(chu.join(' ')).toContain('Mã chuyến bay');
    expect(chu.some((c) => /^CB\d+/.test(c))).toBeTruthy();
    await expect(toast(page, /Đã xuất \d+ chuyến bay ra tập tin Excel/)).toBeVisible();
  });

  test('UC03.11 Nhập lịch chuyến bay từ tập tin Excel theo tập tin mẫu (UC03.1, TT01, QĐ1)', async ({ page }) => {
    await dangNhap(page, 'quanLy', '/chuyen-bay');
    await page.getByRole('button', { name: 'Nhập Excel' }).click();
    const hop = hopThoai(page, 'Nhập lịch chuyến bay từ Excel');
    await expect(hop).toBeVisible();

    // bước 1: tải tập tin mẫu và đọc tiêu đề cột
    const choTai = page.waitForEvent('download');
    await hop.getByRole('button', { name: 'Tải tập tin mẫu' }).click();
    const tai = await choTai;
    expect(tai.suggestedFilename()).toMatch(/\.xlsx$/);
    const mau = docExcel(await readFile((await tai.path())!));
    expect(mau.trang).toEqual(expect.arrayContaining(['ChuyenBay', 'TrungGian']));
    const COT_CB = ['Mã chuyến bay', 'Giá vé', 'Mã sân bay đi', 'Mã sân bay đến', 'Ngày giờ khởi hành', 'Thời gian bay (phút)', 'Số ghế H1', 'Số ghế H2'];
    const COT_TG = ['Mã chuyến bay', 'Thứ tự dừng', 'Mã sân bay', 'Thời gian dừng (phút)', 'Ghi chú'];
    for (const cot of [...COT_CB, ...COT_TG]) expect(mau.chu).toContain(cot);

    // bước 2: điền một dòng hợp lệ (có sân bay trung gian) và một dòng vi phạm QĐ1 rồi nhập
    const maDung = maMoi('KT');
    const maSai = maMoi('KT');
    const tapTin = taoExcel([
      {
        ten: 'ChuyenBay',
        dong: [
          COT_CB,
          [maDung, 1350000, 'HAN', 'PQC', mocVN(30, 10, 15).vnGio, 130, 8, 60],
          [maSai, 1350000, 'SGN', 'DAD', mocVN(30, 11, 0).vnGio, 10, 8, 60],
        ],
      },
      { ten: 'TrungGian', dong: [COT_TG, [maDung, 1, 'DAD', 15, 'Đón khách']] },
    ]);
    await hop.locator('input[type="file"]').setInputFiles({
      name: 'lich_chuyen_bay.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: tapTin,
    });
    await expect(hop.getByText('lich_chuyen_bay.xlsx')).toBeVisible();
    await hop.getByRole('button', { name: 'Nhập lịch chuyến bay' }).click();
    const ketQua = hop.getByRole('status');
    await expect(ketQua).toContainText('Chuyến bay đã thêm');
    await expect(hop.getByRole('table', { name: 'Các dòng bị lỗi' })).toContainText('Thời gian bay');
    await expect(hop.getByRole('table', { name: 'Các dòng bị lỗi' }).locator('tbody tr')).toHaveCount(1);
    await hop.getByRole('button', { name: 'Đóng', exact: true }).last().click();

    const ct = await page.request.get(`/api/chuyen-bay/${maDung}`);
    expect(ct.status()).toBe(200);
    expect(JSON.stringify(await ct.json())).toContain('DAD');
    expect((await page.request.get(`/api/chuyen-bay/${maSai}`)).status()).toBe(404);
  });
});
