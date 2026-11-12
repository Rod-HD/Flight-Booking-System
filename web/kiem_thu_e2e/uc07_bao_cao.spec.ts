// UC07 Lập báo cáo doanh thu: báo cáo tháng (BM5.1), báo cáo năm (BM5.2), xuất Excel và PDF (TT03, NV05).
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ApiThu, dangNhap, mocVN } from './tien_ich/chung';
import { docExcel } from './tien_ich/excel';

function bangBaoCao(page: Page) {
  return page.getByRole('region').filter({ has: page.locator('#tieu-de-bang-bao-cao') }).locator('table');
}

async function lapBaoCao(page: Page, loai: 'thang' | 'nam', nam: number, thang?: number) {
  await page.getByRole('tab', { name: loai === 'thang' ? 'Báo cáo tháng' : 'Báo cáo năm' }).click();
  if (thang) await page.getByRole('combobox', { name: 'Tháng' }).selectOption(String(thang));
  await page.getByRole('combobox', { name: 'Năm' }).selectOption(String(nam));
  await page.getByRole('button', { name: 'Lập báo cáo' }).click();
  await expect(bangBaoCao(page)).toBeVisible();
}

function soTien(chu: string): number {
  return Number(chu.replace(/[^\d]/g, ''));
}

test.describe('UC07 Lập báo cáo doanh thu', () => {
  test('UC07.1 Báo cáo tháng có từng chuyến bay, dòng tổng cộng và tỉ lệ (BM5.1, NV05)', async ({ page }) => {
    // một chuyến bay thử có 1 vé Hạng 1 và 2 vé Hạng 2, giá vé 1.000.000: doanh thu 3.050.000
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay({ lechNgay: 12, giaVe: 1_000_000 });
    await api.banVe(cb.maChuyenBay, 'H1');
    await api.banVe(cb.maChuyenBay, 'H2');
    await api.banVe(cb.maChuyenBay, 'H2');
    await api.dong();
    const ky = mocVN(12);

    await dangNhap(page, 'quanLy', '/bao-cao');
    await lapBaoCao(page, 'thang', ky.nam, ky.thang);
    await expect(page.getByText(`Tháng: ${ky.thang}/${ky.nam}`)).toBeVisible();
    const bang = bangBaoCao(page);
    const dong = bang.locator('tbody tr').filter({ hasText: cb.maChuyenBay });
    await expect(dong).toContainText('3');
    await expect(dong).toContainText('3.050.000');
    await expect(dong).toContainText('%');

    // dòng tổng cộng bằng tổng các dòng, tỉ lệ cộng lại xấp xỉ 100%
    const tong = bang.locator('tfoot tr');
    await expect(tong).toContainText(/Tổng cộng \(\d+ chuyến bay\)/);
    await expect(tong).toContainText('100');
    const cacDong = await bang.locator('tbody tr').all();
    let tongDoanhThu = 0;
    let tongTiLe = 0;
    for (const d of cacDong) {
      const o = await d.locator('td').allTextContents();
      tongDoanhThu += soTien(o[3]);
      tongTiLe += Number((o[4].match(/([\d,.]+)\s*%/)?.[1] ?? '0').replace(',', '.'));
    }
    const oTong = await tong.locator('td').allTextContents();
    expect(tongDoanhThu).toBe(soTien(oTong[3]));
    expect(Math.abs(tongTiLe - 100)).toBeLessThan(1);
  });

  test('UC07.2 Báo cáo năm có đủ 12 tháng và tổng doanh thu (BM5.2, NV05)', async ({ page }) => {
    const nam = mocVN(0).nam;
    await dangNhap(page, 'quanLy', '/bao-cao');
    await lapBaoCao(page, 'nam', nam);
    await expect(page.getByText(`Năm: ${nam}`)).toBeVisible();
    const bang = bangBaoCao(page);
    await expect(bang.locator('tbody tr')).toHaveCount(12);
    for (let t = 1; t <= 12; t++) await expect(bang.locator('tbody tr').nth(t - 1)).toContainText(String(t));
    await expect(bang.locator('tfoot tr')).toContainText(/Tổng cộng/);
    await expect(page.getByText('Tháng doanh thu cao nhất')).toBeVisible();
  });

  test('UC07.3 Xuất báo cáo ra tập tin Excel và PDF (TT03)', async ({ page }) => {
    const hienTai = mocVN(0);
    await dangNhap(page, 'quanLy', '/bao-cao');
    await expect(page.getByRole('button', { name: 'Xuất Excel' })).toBeDisabled();
    await lapBaoCao(page, 'thang', hienTai.nam, hienTai.thang);

    const choExcel = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất Excel' }).click();
    const excel = await choExcel;
    expect(excel.suggestedFilename()).toMatch(/\.xlsx$/);
    const noiDung = docExcel(await readFile((await excel.path())!));
    expect(noiDung.chu.join(' ')).toMatch(/Chuyến bay|Doanh thu/);

    const choPdf = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Xuất PDF' }).click();
    const pdf = await choPdf;
    expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
    const dauPdf = (await readFile((await pdf.path())!)).subarray(0, 5).toString('latin1');
    expect(dauPdf).toBe('%PDF-');
  });
});
