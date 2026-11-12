// UC02 Phân quyền: Quản lý thêm tài khoản, đổi nhóm quyền, khóa và mở khóa tài khoản (BMT02).
import { expect, request, test, type Locator, type Page } from '@playwright/test';
import { ApiThu, DIA_CHI, bamTrongHopThoai, dangNhap, hopThoai, tenDangNhapMoi, toast } from './tien_ich/chung';

const MAT_KHAU = 'Kiemthu@123';

async function thuDangNhapApi(ten: string, matKhau: string): Promise<number> {
  const yc = await request.newContext({ baseURL: DIA_CHI });
  const ph = await yc.post('/api/dang-nhap', { data: { tenDangNhap: ten, matKhau } });
  await yc.dispose();
  return ph.status();
}

/** Lọc danh sách theo tên đăng nhập (danh sách có phân trang) rồi trả về dòng của tài khoản. */
async function dongTaiKhoan(page: Page, ten: string) {
  const o = page.getByRole('textbox', { name: 'Tìm tài khoản' });
  if ((await o.inputValue()) !== ten) await o.fill(ten);
  const dong = page.getByRole('table', { name: 'Danh sách tài khoản' }).getByRole('row').filter({ hasText: ten });
  await expect(dong).toHaveCount(1);
  return dong;
}

/** Chọn nhóm quyền bằng cách bấm vào thẻ nhóm quyền (ô radio gốc được ẩn dưới thẻ). */
async function chonNhomQuyen(hop: Locator, giaTri: 'QuanLy' | 'NhanVien') {
  const o = hop.locator(`input[type="radio"][value="${giaTri}"]`);
  await hop.locator(`label:has(input[type="radio"][value="${giaTri}"])`).click();
  await expect(o).toBeChecked();
}

async function moThemTaiKhoan(page: Page) {
  await page.getByRole('button', { name: 'Thêm tài khoản' }).click();
  const hop = hopThoai(page, 'Thêm tài khoản');
  await expect(hop).toBeVisible();
  return hop;
}

test.describe('UC02 Phân quyền', () => {
  test('UC02.1 Thêm tài khoản Nhân viên bán vé rồi đăng nhập được (BMT02)', async ({ page }) => {
    const ten = tenDangNhapMoi('nv');
    await dangNhap(page, 'quanLy', '/tai-khoan');
    const hop = await moThemTaiKhoan(page);
    await hop.getByRole('textbox', { name: 'Tên đăng nhập' }).fill(ten);
    await hop.getByLabel('Mật khẩu', { exact: false }).first().fill(MAT_KHAU);
    await hop.getByLabel('Nhập lại mật khẩu').fill(MAT_KHAU);
    await chonNhomQuyen(hop, 'NhanVien');
    await hop.getByRole('button', { name: 'Lưu' }).click();
    await expect(toast(page, `Thêm tài khoản ${ten} thành công.`)).toBeVisible();
    await expect(await dongTaiKhoan(page, ten)).toContainText('Nhân viên bán vé');
    await expect(await dongTaiKhoan(page, ten)).toContainText('Hoạt động');
    expect(await thuDangNhapApi(ten, MAT_KHAU)).toBe(200);
  });

  test('UC02.2 Không thêm được tài khoản trùng tên đăng nhập (BMT02)', async ({ page }) => {
    await dangNhap(page, 'quanLy', '/tai-khoan');
    const hop = await moThemTaiKhoan(page);
    await hop.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('nhanvien');
    await hop.getByLabel('Mật khẩu', { exact: false }).first().fill(MAT_KHAU);
    await hop.getByLabel('Nhập lại mật khẩu').fill(MAT_KHAU);
    await chonNhomQuyen(hop, 'NhanVien');
    await hop.getByRole('button', { name: 'Lưu' }).click();
    await expect(page.getByText(/đã tồn tại|đã có/i).first()).toBeVisible();
    // tài khoản nhanvien vẫn chỉ có một dòng
    await hopThoai(page, 'Thêm tài khoản').getByRole('button', { name: 'Hủy' }).click();
    // biểu mẫu đang nhập dở nên được hỏi lại trước khi đóng
    await bamTrongHopThoai(page, 'Hủy thông tin đang nhập?', 'Hủy thay đổi');
    await expect(hopThoai(page, 'Thêm tài khoản')).toBeHidden();
    await page.getByRole('textbox', { name: 'Tìm tài khoản' }).fill('nhanvien');
    await expect(page.getByRole('table', { name: 'Danh sách tài khoản' }).getByRole('row').filter({ has: page.getByText('nhanvien', { exact: true }) })).toHaveCount(1);
  });

  test('UC02.3 Đổi nhóm quyền của tài khoản sang Quản lý (BMT02)', async ({ page }) => {
    const ten = tenDangNhapMoi('nv');
    const api = await ApiThu.moi();
    await api.themTaiKhoan(ten, MAT_KHAU, 'NhanVien');
    await api.dong();

    await dangNhap(page, 'quanLy', '/tai-khoan');
    await (await dongTaiKhoan(page, ten)).getByRole('button', { name: 'Sửa' }).click();
    const hop = hopThoai(page, `Sửa tài khoản ${ten}`);
    await expect(hop).toBeVisible();
    await chonNhomQuyen(hop, 'QuanLy');
    await hop.getByRole('button', { name: 'Lưu' }).click();
    await expect(toast(page, `Cập nhật tài khoản ${ten} thành công.`)).toBeVisible();
    await expect(await dongTaiKhoan(page, ten)).toContainText('Quản lý');

    // tài khoản vừa đổi nhóm đăng nhập vào được trang Báo cáo
    const yc = await request.newContext({ baseURL: DIA_CHI });
    await yc.post('/api/dang-nhap', { data: { tenDangNhap: ten, matKhau: MAT_KHAU } });
    expect((await yc.get(`/api/bao-cao/nam?nam=${new Date().getFullYear()}`)).status()).toBe(200);
    await yc.dispose();
  });

  test('UC02.4 Khóa rồi mở khóa tài khoản (BMT02, BMT01)', async ({ page }) => {
    const ten = tenDangNhapMoi('nv');
    const api = await ApiThu.moi();
    await api.themTaiKhoan(ten, MAT_KHAU, 'NhanVien');
    await api.dong();

    await dangNhap(page, 'quanLy', '/tai-khoan');
    await (await dongTaiKhoan(page, ten)).getByRole('button', { name: 'Khóa', exact: true }).click();
    await bamTrongHopThoai(page, `Khóa tài khoản ${ten}?`, 'Khóa');
    await expect(toast(page, `Đã khóa tài khoản ${ten}.`)).toBeVisible();
    await expect(await dongTaiKhoan(page, ten)).toContainText('Đã khóa');
    expect(await thuDangNhapApi(ten, MAT_KHAU)).toBe(403);

    await (await dongTaiKhoan(page, ten)).getByRole('button', { name: 'Mở khóa' }).click();
    await bamTrongHopThoai(page, `Mở khóa tài khoản ${ten}?`, 'Mở khóa');
    await expect(toast(page, `Đã mở khóa tài khoản ${ten}.`)).toBeVisible();
    await expect(await dongTaiKhoan(page, ten)).toContainText('Hoạt động');
    expect(await thuDangNhapApi(ten, MAT_KHAU)).toBe(200);
  });

  test('UC02.5 Không tự khóa hoặc đổi nhóm quyền của chính mình (BMT02)', async ({ page }) => {
    await dangNhap(page, 'quanLy', '/tai-khoan');
    const dong = await dongTaiKhoan(page, 'quanly');
    await expect(dong).toContainText('đang đăng nhập');
    await expect(dong.getByRole('button', { name: 'Khóa', exact: true })).toBeDisabled();
    await dong.getByRole('button', { name: 'Sửa' }).click();
    const hop = hopThoai(page, 'Sửa tài khoản quanly');
    await expect(hop.getByRole('radio', { name: /Nhân viên bán vé/ })).toBeDisabled();
    await hop.getByRole('button', { name: 'Hủy' }).click();
  });
});
