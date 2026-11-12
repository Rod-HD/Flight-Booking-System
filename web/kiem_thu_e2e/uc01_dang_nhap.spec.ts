// UC01 Đăng nhập, đăng xuất và bảo vệ đường dẫn khi chưa đăng nhập.
import { expect, test } from '@playwright/test';
import { TAI_KHOAN, dangNhapGiaoDien } from './tien_ich/chung';

test.describe('UC01 Đăng nhập', () => {
  test('UC01.1 Đăng nhập đúng tên và mật khẩu thì vào trang chính (BMT01)', async ({ page }) => {
    await dangNhapGiaoDien(page, TAI_KHOAN.quanLy.ten, TAI_KHOAN.quanLy.matKhau);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: /quanly/ })).toBeVisible();
    await expect(page.getByRole('banner').getByText('Quản lý', { exact: true })).toBeVisible();
  });

  test('UC01.2 Sai mật khẩu thì báo lỗi và ở lại trang đăng nhập (BMT01)', async ({ page }) => {
    await dangNhapGiaoDien(page, TAI_KHOAN.quanLy.ten, 'SaiMatKhau@1');
    const loi = page.getByRole('alert').filter({ hasText: /không đúng|sai/i });
    await expect(loi).toBeVisible();
    await expect(page).toHaveURL(/\/dang-nhap/);
  });

  test('UC01.3 Tài khoản bị khóa thì không đăng nhập được (BMT01, BMT02)', async ({ page }) => {
    await dangNhapGiaoDien(page, TAI_KHOAN.biKhoa.ten, TAI_KHOAN.biKhoa.matKhau);
    await expect(page.getByRole('alert').filter({ hasText: /khóa/i })).toBeVisible();
    await expect(page).toHaveURL(/\/dang-nhap/);
  });

  test('UC01.4 Đăng xuất rồi vào lại trang cần quyền thì bị đưa về đăng nhập (BMT01)', async ({ page }) => {
    await dangNhapGiaoDien(page, TAI_KHOAN.nhanVien.ten, TAI_KHOAN.nhanVien.matKhau);
    await expect(page.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/dang-nhap/);
    await page.goto('/ban-ve');
    await expect(page).toHaveURL(/\/dang-nhap/);
    expect((await page.request.get('/api/phien')).status()).toBe(401);
  });

  test('UC01.5 Chưa đăng nhập mà mở thẳng một trang thì bị đưa về đăng nhập (BMT01)', async ({ page }) => {
    for (const duongDan of ['/', '/chuyen-bay', '/bao-cao', '/quy-dinh']) {
      await page.goto(duongDan);
      await expect(page).toHaveURL(/\/dang-nhap/);
    }
    await expect(page.getByRole('heading', { name: 'Đăng nhập', level: 1 })).toBeVisible();
  });
});
