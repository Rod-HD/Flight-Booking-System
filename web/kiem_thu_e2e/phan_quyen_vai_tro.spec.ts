// Phân quyền theo vai trò (BMT01 đến BMT09): Nhân viên bán vé chỉ dùng được BMT01, BMT04, BMT05, BMT06.
import { expect, test } from '@playwright/test';
import { dangNhap } from './tien_ich/chung';

const MENU_QUAN_LY = ['Báo cáo', 'Quy định', 'Tài khoản'];
const MENU_CHUNG = ['Trang chính', 'Chuyến bay', 'Bán vé', 'Đặt vé'];

test.describe('Phân quyền theo vai trò', () => {
  test('UC02.6 Nhân viên không thấy menu Báo cáo, Quy định, Tài khoản (BMT07, BMT08, BMT02)', async ({ page }) => {
    await dangNhap(page, 'nhanVien', '/');
    const menu = page.getByRole('navigation', { name: 'Menu chính' });
    for (const ten of MENU_CHUNG) await expect(menu.getByRole('link', { name: ten, exact: true })).toBeVisible();
    for (const ten of MENU_QUAN_LY) await expect(menu.getByRole('link', { name: ten, exact: true })).toHaveCount(0);
    await expect(page.getByRole('banner').getByText('Nhân viên bán vé')).toBeVisible();
  });

  test('UC02.7 Nhân viên mở thẳng đường dẫn của Quản lý thì bị chặn (BMT02, BMT07, BMT08)', async ({ page }) => {
    await dangNhap(page, 'nhanVien', '/');
    for (const duongDan of ['/bao-cao', '/quy-dinh', '/tai-khoan', '/chuyen-bay/them']) {
      await page.goto(duongDan);
      await expect(page.getByRole('heading', { name: 'Không có quyền truy cập', level: 1 })).toBeVisible();
      await expect(page.getByText('Chức năng này chỉ dành cho Quản lý')).toBeVisible();
    }
    // máy chủ cũng từ chối khi gọi thẳng API
    expect((await page.request.get('/api/tai-khoan')).status()).toBe(403);
  });

  test('UC02.8 Nhân viên không có nút Thêm, Sửa, Xóa, Nhập Excel chuyến bay (BMT03, BMT06)', async ({ page }) => {
    await dangNhap(page, 'nhanVien', '/chuyen-bay');
    await expect(page.getByRole('table', { name: 'Danh sách chuyến bay' })).toBeVisible();
    await expect(page.getByRole('row').nth(1)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Thêm chuyến bay' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nhập Excel' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Sửa chuyến bay/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Xóa chuyến bay/ })).toHaveCount(0);
    // vẫn được tra cứu, xem và xuất danh sách (BMT06)
    await expect(page.getByRole('button', { name: 'Xuất Excel' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Xem chuyến bay/ }).first()).toBeVisible();
  });

  test('UC02.9 Quản lý thấy đủ menu và các nút quản lý chuyến bay (BMT01 đến BMT09)', async ({ page }) => {
    await dangNhap(page, 'quanLy', '/chuyen-bay');
    const menu = page.getByRole('navigation', { name: 'Menu chính' });
    for (const ten of [...MENU_CHUNG, ...MENU_QUAN_LY]) await expect(menu.getByRole('link', { name: ten, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Thêm chuyến bay' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nhập Excel' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sửa chuyến bay/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Xóa chuyến bay/ }).first()).toBeVisible();
  });
});
