// UC04 Quản lý bán vé: bán trực tiếp (BM2, QĐ2), bán từ phiếu đặt chỗ, tra cứu, sửa và hủy vé (BMT04).
import { expect, test, type Page } from '@playwright/test';
import { ApiThu, bamTrongHopThoai, dangNhap, hanhKhachMoi, hopThoai, soCanCuocMoi, toast } from './tien_ich/chung';

async function nhapHanhKhach(page: Page, hoTen: string, soGiayTo: string, dienThoai = '0912345678') {
  const form = page.getByRole('form', { name: 'Vé chuyến bay BM2' });
  await form.getByRole('textbox', { name: 'Hành khách' }).fill(hoTen);
  await form.getByRole('textbox', { name: 'CCCD/Hộ chiếu' }).fill(soGiayTo);
  await form.getByRole('textbox', { name: 'Điện thoại' }).fill(dienThoai);
}

async function chonHang(page: Page, tenHang: string) {
  const o = page.getByRole('radiogroup', { name: 'Hạng vé' }).getByRole('radio', { name: new RegExp(`^${tenHang}`) });
  // ô radio gốc có thể được ẩn dưới thẻ hạng vé, bấm vào nhãn của nó
  await page.locator('label').filter({ has: o }).or(o).first().click();
  await expect(o).toBeChecked();
}

/** Bấm Bán vé, xác nhận, đọc mã vé trong hộp thoại kết quả rồi đóng hộp thoại. */
async function banVaLayMa(page: Page): Promise<{ maVe: string; giaTien: string }> {
  await page.getByRole('form', { name: 'Vé chuyến bay BM2' }).getByRole('button', { name: 'Bán vé', exact: true }).click();
  await bamTrongHopThoai(page, 'Xác nhận bán vé?', 'Bán vé');
  const kq = hopThoai(page, 'Bán vé thành công');
  await expect(kq).toBeVisible();
  const maVe = (await kq.getByText(/^VE\d{8}$/).textContent())!.trim();
  const giaTien = (await kq.locator('dd').last().textContent())!.trim();
  await kq.getByRole('button').last().press('Escape');
  await expect(kq).toBeHidden();
  return { maVe, giaTien };
}

async function timVe(page: Page, maVe: string) {
  await page.goto('/ve');
  await page.getByRole('textbox', { name: 'Mã vé' }).fill(maVe);
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  const dong = page.getByRole('table', { name: 'Danh sách vé' }).getByRole('row').filter({ hasText: maVe });
  await expect(dong).toHaveCount(1);
  return dong;
}

test.describe('UC04 Quản lý bán vé', () => {
  test('UC04.1 Bán vé trực tiếp và thấy vé trong danh sách vé bán hôm nay (BM2, NV02)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    await api.dong();
    const soGiayTo = soCanCuocMoi();
    await dangNhap(page, 'nhanVien', `/ban-ve?maChuyenBay=${cb.maChuyenBay}`);
    await expect(page.getByRole('combobox', { name: 'Chuyến bay' })).toHaveValue(new RegExp(cb.maChuyenBay));
    await nhapHanhKhach(page, 'Trần Thị Kiểm Thử', soGiayTo);
    await chonHang(page, 'Hạng 2');
    const { maVe } = await banVaLayMa(page);
    await expect(toast(page, `Đã bán vé ${maVe}`)).toBeVisible();

    await page.goto('/ve');
    await expect(page.getByRole('heading', { name: 'Vé bán hôm nay' })).toBeVisible();
    const dong = page.getByRole('table', { name: 'Danh sách vé' }).getByRole('row').filter({ hasText: maVe });
    await expect(dong).toContainText(cb.maChuyenBay);
    await expect(dong).toContainText('Trần Thị Kiểm Thử');
    await expect(dong).toContainText(soGiayTo);
    await expect(dong).toContainText('Đã bán');
  });

  test('UC04.2 Giá tiền theo hạng vé: Hạng 1 bằng 105% đơn giá, Hạng 2 bằng đơn giá (QĐ2)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay({ giaVe: 1_000_000 });
    await api.dong();
    await dangNhap(page, 'nhanVien', `/ban-ve?maChuyenBay=${cb.maChuyenBay}`);
    const giaTien = page.getByRole('form', { name: 'Vé chuyến bay BM2' }).getByRole('status');
    await chonHang(page, 'Hạng 2');
    await expect(giaTien).toHaveText(/1\.000\.000/);
    await chonHang(page, 'Hạng 1');
    await expect(giaTien).toHaveText(/1\.050\.000/);
    await nhapHanhKhach(page, 'Lê Văn Hạng Nhất', soCanCuocMoi());
    const { maVe, giaTien: giaBan } = await banVaLayMa(page);
    expect(giaBan).toMatch(/1\.050\.000/);
    const dong = await timVe(page, maVe);
    await expect(dong).toContainText('Hạng 1');
    await expect(dong).toContainText('1.050.000');
  });

  test('UC04.3 Hạng vé hết chỗ thì không chọn được (QĐ2, NV02)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay({
      gheTheoHang: [
        { maHangVe: 'H1', soLuongGhe: 1 },
        { maHangVe: 'H2', soLuongGhe: 3 },
      ],
    });
    await api.banVe(cb.maChuyenBay, 'H1');
    await api.dong();
    await dangNhap(page, 'nhanVien', `/ban-ve?maChuyenBay=${cb.maChuyenBay}`);
    const nhom = page.getByRole('radiogroup', { name: 'Hạng vé' });
    await expect(nhom.getByRole('radio', { name: /^Hạng 1.*Hết chỗ/ })).toBeDisabled();
    await expect(nhom.getByRole('radio', { name: /^Hạng 2.*3 ghế trống/ })).toBeEnabled();
  });

  test('UC04.4 Chuyến bay đã khởi hành thì không bán được vé (NV02)', async ({ page }) => {
    // CB101 trong dữ liệu mẫu đã khởi hành từ nhiều tháng trước
    await dangNhap(page, 'nhanVien', '/ban-ve?maChuyenBay=CB101');
    const loi = hopThoai(page, 'Chuyến bay đã khởi hành');
    await expect(loi).toBeVisible();
    await expect(loi).toContainText('Vui lòng chọn chuyến bay khác.');
    await loi.getByRole('button', { name: 'Đóng' }).click();
    // ô chọn chuyến bay chỉ gợi ý các chuyến bay chưa khởi hành (CB102 cũng đã khởi hành)
    const oChon = page.getByRole('combobox', { name: 'Chuyến bay' });
    await oChon.click();
    await oChon.fill('CB102');
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByRole('option', { name: /CB102/ })).toHaveCount(0);
    // máy chủ cũng từ chối
    const ph = await page.request.post('/api/ve', { data: { maChuyenBay: 'CB101', maHangVe: 'H2', hanhKhach: hanhKhachMoi() } });
    expect(ph.status()).toBe(409);
  });

  test('UC04.5 Bán vé từ phiếu đặt chỗ còn hạn, phiếu chuyển sang Đã hủy (UC04.2, giả định 5)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    const hk = hanhKhachMoi('Phạm Thị Đặt Trước');
    const { maPhieuDat } = await api.datVe(cb.maChuyenBay, 'H1', hk);
    await api.dong();

    await dangNhap(page, 'nhanVien', '/ban-ve');
    await page.getByRole('tab', { name: 'Bán từ phiếu đặt chỗ' }).click();
    await page.getByRole('tab', { name: 'Theo CCCD/Hộ chiếu' }).click();
    await page.getByRole('textbox', { name: 'CCCD/Hộ chiếu của hành khách' }).fill(hk.soGiayTo);
    await page.getByRole('button', { name: 'Tìm phiếu' }).click();
    const bang = page.getByRole('table', { name: 'Phiếu đặt chỗ còn hạn' });
    await bang.getByRole('row').filter({ hasText: maPhieuDat }).click();
    await page.getByRole('button', { name: 'Bán vé từ phiếu' }).click();
    await bamTrongHopThoai(page, `Bán vé từ phiếu ${maPhieuDat}?`, 'Bán vé');
    const kq = hopThoai(page, 'Bán vé thành công');
    await expect(kq).toContainText(`Đã lập vé từ phiếu đặt chỗ ${maPhieuDat}`);
    await expect(kq).toContainText('1.050.000');
    const maVe = (await kq.getByText(/^VE\d{8}$/).textContent())!.trim();

    const phieu = await (await page.request.get(`/api/phieu-dat?maPhieuDat=${maPhieuDat}`)).json();
    expect(JSON.stringify(phieu)).toContain('DaHuy');
    const ve = await (await page.request.get(`/api/ve?maVe=${maVe}`)).json();
    expect(JSON.stringify(ve)).toContain(maPhieuDat);
  });

  test('UC04.6 Sửa thông tin hành khách của vé (UC04.4)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    const { maVe } = await api.banVe(cb.maChuyenBay, 'H2', hanhKhachMoi('Nguyễn Văn Cũ'));
    await api.dong();
    await dangNhap(page, 'nhanVien', '/ve');
    const dong = await timVe(page, maVe);
    await dong.getByRole('button', { name: `Sửa vé ${maVe}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sửa vé' })).toBeVisible();
    const form = page.getByRole('form', { name: 'Vé chuyến bay BM2' });
    await form.getByRole('textbox', { name: 'Hành khách' }).fill('Nguyễn Văn Mới');
    await form.getByRole('textbox', { name: 'Điện thoại' }).fill('0987654321');
    await form.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toast(page, `Đã cập nhật thông tin hành khách của vé ${maVe}`)).toBeVisible();
    const dongMoi = await timVe(page, maVe);
    await expect(dongMoi).toContainText('Nguyễn Văn Mới');
    await expect(dongMoi).toContainText('0987654321');
  });

  test('UC04.7 Hủy vé thì vé chuyển sang Đã hủy và trả chỗ (UC04.5, AT03)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay({
      gheTheoHang: [
        { maHangVe: 'H1', soLuongGhe: 1 },
        { maHangVe: 'H2', soLuongGhe: 1 },
      ],
    });
    const { maVe } = await api.banVe(cb.maChuyenBay, 'H2');
    await api.dong();
    await dangNhap(page, 'nhanVien', '/ve');
    const dong = await timVe(page, maVe);
    await dong.getByRole('button', { name: 'Hủy vé' }).click();
    await bamTrongHopThoai(page, `Hủy vé ${maVe}?`, 'Hủy vé');
    await expect(toast(page, `Đã hủy vé ${maVe}`)).toBeVisible();
    await expect(dong).toContainText('Đã hủy');
    await expect(dong.getByRole('button', { name: 'Hủy vé' })).toBeDisabled();
    // ghế Hạng 2 được trả lại
    await page.goto(`/ban-ve?maChuyenBay=${cb.maChuyenBay}`);
    await expect(page.getByRole('radiogroup', { name: 'Hạng vé' }).getByRole('radio', { name: /^Hạng 2.*1 ghế trống/ })).toBeEnabled();
  });
});
