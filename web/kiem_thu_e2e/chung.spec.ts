// Chức năng chung: phím tắt (TD01 đến TD06) và chuông thông báo hủy phiếu tự động (UC06).
import { expect, test } from '@playwright/test';
import { dangNhap } from './tien_ich/chung';

test.describe('Chức năng chung', () => {
  test('CHUNG.1 Phím F1 mở trang Trợ giúp (TD02, TD04)', async ({ page }) => {
    await dangNhap(page, 'nhanVien', '/');
    await expect(page.getByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    await page.keyboard.press('F1');
    await expect(page).toHaveURL(/\/tro-giup$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Trợ giúp' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quy định đang áp dụng' })).toBeVisible();
  });

  test('CHUNG.2 Phím Alt+1, Alt+2, Alt+3 mở Chuyến bay, Bán vé, Đặt vé; Alt+4 chỉ dành cho Quản lý (TD04, BMT07)', async ({ page }) => {
    await dangNhap(page, 'nhanVien', '/');
    await expect(page.getByRole('navigation', { name: 'Menu chính' })).toBeVisible();
    await page.keyboard.press('Alt+1');
    await expect(page).toHaveURL(/\/chuyen-bay$/);
    await page.keyboard.press('Alt+2');
    await expect(page).toHaveURL(/\/ban-ve$/);
    await page.keyboard.press('Alt+3');
    await expect(page).toHaveURL(/\/dat-ve$/);
    await page.keyboard.press('Alt+4');
    await expect(page.getByText('Báo cáo doanh thu chỉ dành cho Quản lý.')).toBeVisible();
    await expect(page).toHaveURL(/\/dat-ve$/);
  });

  test('CHUNG.3 Chuông thông báo mở danh sách nhật ký tự động hủy phiếu (UC06, AT03)', async ({ page }) => {
    await dangNhap(page, 'quanLy', '/');
    const chuong = page.getByRole('banner').getByRole('button', { name: /^Thông báo(,|$)/ });
    await chuong.click();
    const bang = page.getByRole('dialog', { name: 'Danh sách thông báo' });
    await expect(bang).toBeVisible();
    await expect(bang).toContainText('Nhật ký tự động hủy phiếu đặt chỗ quá hạn');
    // dữ liệu mẫu có phiếu quá 24 giờ, máy chủ tự hủy khi khởi động; nếu chưa có thì hiện dòng trống
    await expect(bang.getByText(/Hệ thống đã tự động hủy \d+ phiếu đặt chỗ quá hạn|Chưa có thông báo nào/).first()).toBeVisible();
    // bấm lại chuông thì bảng đóng
    await chuong.click();
    await expect(bang).toBeHidden();
    await expect(chuong).toHaveAttribute('aria-expanded', 'false');
  });
});
