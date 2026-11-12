// UC08 Thay đổi quy định (QĐ6): tham số QĐ1, QĐ3 có hiệu lực ngay; thêm, sửa, xóa sân bay và hạng vé (TH01 đến TH07, AT02).
import { expect, test, type Page } from '@playwright/test';
import { ApiThu, bamTrongHopThoai, dangNhap, hopThoai, toast } from './tien_ich/chung';

/** Mã gồm chữ cái in hoa, khác nhau giữa các lần chạy (dùng cho mã sân bay, mã hạng vé). */
function maChu(tienTo: string, doDai: number): string {
  let n = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
  let duoi = '';
  for (let i = tienTo.length; i < doDai; i++) {
    duoi += String.fromCharCode(65 + (n % 26));
    n = Math.floor(n / 26);
  }
  return tienTo + duoi;
}

async function doiThamSoGiaoDien(page: Page, tieuDe: string, giaTri: number, donVi: string) {
  await page.getByRole('button', { name: new RegExp(`^${tieuDe}: .*Bấm để thay đổi$`) }).click();
  const hop = hopThoai(page, 'Cập nhật quy định');
  await expect(hop).toBeVisible();
  await hop.getByRole('textbox', { name: `Giá trị mới (${donVi})` }).fill(String(giaTri));
  await hop.getByRole('button', { name: 'Lưu' }).click();
  await expect(toast(page, `Cập nhật quy định thành công: ${tieuDe.toLowerCase()} là ${giaTri} ${donVi}.`)).toBeVisible();
  await expect(hop).toBeHidden();
}

function bangSanBay(page: Page) {
  return page.getByRole('table', { name: 'Danh sách sân bay' });
}

function bangHangVe(page: Page) {
  return page.getByRole('table', { name: 'Danh sách hạng vé' });
}

test.describe('UC08 Thay đổi quy định', () => {
  test('UC08.1 Đổi thời gian bay tối thiểu có hiệu lực ngay ở màn hình thêm chuyến bay, rồi trả về giá trị cũ (QĐ6, TH02, QĐ1)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cu = (await api.thamSo()).thoiGianBayToiThieu;
    const moi = cu + 15;
    try {
      await dangNhap(page, 'quanLy', '/quy-dinh');
      await expect(page.getByRole('button', { name: `Thời gian bay tối thiểu: ${cu} phút. Bấm để thay đổi` })).toBeVisible();
      await doiThamSoGiaoDien(page, 'Thời gian bay tối thiểu', moi, 'phút');
      await expect(page.getByRole('button', { name: `Thời gian bay tối thiểu: ${moi} phút. Bấm để thay đổi` })).toBeVisible();

      // màn hình thêm chuyến bay đọc ngay giá trị mới
      await page.getByRole('navigation', { name: 'Menu chính' }).getByRole('link', { name: 'Chuyến bay', exact: true }).click();
      await page.getByRole('link', { name: 'Thêm chuyến bay' }).click();
      await expect(page.getByText(`Tối thiểu ${moi} phút (QĐ1).`)).toBeVisible();
      const o = page.getByRole('textbox', { name: 'Thời gian bay (phút)' });
      await expect(o).toHaveAttribute('placeholder', `Từ ${moi} phút`);
      await o.fill(String(moi - 5));
      await o.blur();
      await expect(page.getByText(`Thời gian bay phải từ ${moi} phút trở lên (QĐ1).`)).toBeVisible();
      await o.fill(String(moi));
      await expect(page.getByText(`Thời gian bay phải từ ${moi} phút trở lên (QĐ1).`)).toBeHidden();

      // trả về giá trị cũ bằng giao diện
      await page.goto('/quy-dinh');
      await doiThamSoGiaoDien(page, 'Thời gian bay tối thiểu', cu, 'phút');
      await expect(page.getByRole('button', { name: `Thời gian bay tối thiểu: ${cu} phút. Bấm để thay đổi` })).toBeVisible();
    } finally {
      await api.doiThamSo('thoiGianBayToiThieu', cu);
      await api.dong();
    }
  });

  test('UC08.2 Đổi số sân bay trung gian tối đa thì giới hạn ở biểu mẫu chuyến bay đổi theo (QĐ6, TH03)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cu = (await api.thamSo()).soSanBayTrungGianToiDa;
    try {
      await dangNhap(page, 'quanLy', '/quy-dinh');
      await doiThamSoGiaoDien(page, 'Số sân bay trung gian tối đa', 1, 'sân bay');
      await page.goto('/chuyen-bay/them');
      await expect(page.getByText('Còn thêm được 1 sân bay trung gian.')).toBeVisible();
      await page.getByRole('button', { name: 'Thêm sân bay trung gian' }).click();
      await expect(page.getByText('Đã đủ 1 sân bay trung gian theo quy định.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Thêm sân bay trung gian' })).toBeDisabled();
    } finally {
      await api.doiThamSo('soSanBayTrungGianToiDa', cu);
      await api.dong();
    }
  });

  test('UC08.3 Giá trị tham số không hợp lệ thì không lưu (QĐ6, TH04)', async ({ page }) => {
    const api = await ApiThu.moi();
    const ts = await api.thamSo();
    await api.dong();
    await dangNhap(page, 'quanLy', '/quy-dinh');
    await page.getByRole('button', { name: /^Thời gian dừng tối thiểu: .*Bấm để thay đổi$/ }).click();
    const hop = hopThoai(page, 'Cập nhật quy định');
    await hop.getByRole('textbox', { name: 'Giá trị mới (phút)' }).fill(String(ts.thoiGianDungToiDa + 5));
    await hop.getByRole('button', { name: 'Lưu' }).click();
    await expect(hop.getByRole('alert')).toBeVisible();
    await hop.getByRole('button', { name: 'Hủy' }).click();
    await expect(page.getByRole('button', { name: `Thời gian dừng tối thiểu: ${ts.thoiGianDungToiThieu} phút. Bấm để thay đổi` })).toBeVisible();
  });

  test('UC08.4 Thêm, sửa tên và xóa sân bay (QĐ6, TH01)', async ({ page }) => {
    const ma = maChu('Q', 3);
    const api = await ApiThu.moi();
    await api.xoaSanBayNeuCo(ma);
    try {
      await dangNhap(page, 'quanLy', '/quy-dinh');
      await expect(bangSanBay(page).getByRole('row').filter({ hasText: 'SGN' })).toBeVisible();
      const soCu = await bangSanBay(page).locator('tbody tr').count();

      await page.getByRole('button', { name: 'Thêm sân bay' }).click();
      const them = hopThoai(page, 'Thêm sân bay');
      await them.getByRole('textbox', { name: 'Mã sân bay' }).fill(ma);
      await them.getByRole('textbox', { name: 'Tên sân bay' }).fill(`Kiểm thử ${ma}`);
      await them.getByRole('button', { name: 'Lưu' }).click();
      await expect(toast(page, `Thêm sân bay ${ma} · Kiểm thử ${ma} thành công.`)).toBeVisible();
      await expect(bangSanBay(page).locator('tbody tr')).toHaveCount(soCu + 1);

      await page.getByRole('button', { name: `Sửa tên sân bay ${ma}` }).click();
      const sua = hopThoai(page, 'Sửa tên sân bay');
      await expect(sua.getByRole('textbox', { name: 'Mã sân bay' })).toHaveValue(ma);
      await sua.getByRole('textbox', { name: 'Tên sân bay' }).fill(`Kiểm thử ${ma} đã sửa`);
      await sua.getByRole('button', { name: 'Lưu' }).click();
      await expect(toast(page, `Cập nhật sân bay ${ma} thành công.`)).toBeVisible();
      await expect(bangSanBay(page).getByRole('row').filter({ hasText: ma })).toContainText('đã sửa');

      // sân bay mới dùng được ngay ở biểu mẫu chuyến bay
      await page.goto('/chuyen-bay/them');
      await page.getByRole('combobox', { name: 'Sân bay đi' }).click();
      await page.getByRole('combobox', { name: 'Sân bay đi' }).fill(ma);
      await expect(page.getByRole('option', { name: new RegExp(`^${ma}`) })).toBeVisible();

      await page.goto('/quy-dinh');
      await page.getByRole('button', { name: `Xóa sân bay ${ma}` }).click();
      await bamTrongHopThoai(page, `Xóa sân bay ${ma}?`, 'Xóa');
      await expect(toast(page, `Xóa sân bay ${ma} thành công.`)).toBeVisible();
      await expect(bangSanBay(page).locator('tbody tr')).toHaveCount(soCu);
    } finally {
      await api.xoaSanBayNeuCo(ma);
      await api.dong();
    }
  });

  test('UC08.5 Không xóa được sân bay đang có chuyến bay sử dụng (AT02, TH01)', async ({ page }) => {
    await dangNhap(page, 'quanLy', '/quy-dinh');
    await page.getByRole('button', { name: 'Xóa sân bay SGN' }).click();
    await bamTrongHopThoai(page, 'Xóa sân bay SGN?', 'Xóa');
    await bamTrongHopThoai(page, 'Không thể xóa sân bay', 'Đóng');
    await expect(bangSanBay(page).getByRole('row').filter({ hasText: 'SGN' })).toHaveCount(1);
  });

  test('UC08.6 Thêm hạng vé kèm tỉ lệ đơn giá, sửa tên rồi xóa; không xóa được hạng đang dùng (QĐ6, TH05, QĐ2, AT02)', async ({ page }) => {
    const ma = maChu('K', 4);
    const api = await ApiThu.moi();
    await api.xoaHangVeNeuCo(ma);
    try {
      await dangNhap(page, 'quanLy', '/quy-dinh');
      await page.getByRole('button', { name: 'Thêm hạng vé' }).click();
      const them = hopThoai(page, 'Thêm hạng vé');
      await them.getByRole('textbox', { name: 'Mã hạng vé' }).fill(ma);
      await them.getByRole('textbox', { name: 'Tên hạng vé' }).fill(`Hạng thử ${ma}`);
      await them.getByRole('textbox', { name: 'Tỉ lệ đơn giá (%)' }).fill('120');
      await them.getByRole('button', { name: 'Lưu' }).click();
      await expect(toast(page, `Thêm hạng vé Hạng thử ${ma} thành công.`)).toBeVisible();
      const dong = bangHangVe(page).getByRole('row').filter({ hasText: ma });
      await expect(dong).toContainText('120%');

      await page.getByRole('button', { name: `Sửa tên hạng vé ${ma}` }).click();
      const sua = hopThoai(page, 'Sửa tên hạng vé');
      await expect(sua.getByRole('textbox', { name: 'Tỉ lệ đơn giá (%)' })).toBeDisabled();
      await sua.getByRole('textbox', { name: 'Tên hạng vé' }).fill(`Hạng sửa ${ma}`);
      await sua.getByRole('button', { name: 'Lưu' }).click();
      await expect(toast(page, `Cập nhật hạng vé ${ma} thành công.`)).toBeVisible();
      await expect(dong).toContainText(`Hạng sửa ${ma}`);

      await page.getByRole('button', { name: `Xóa hạng vé ${ma}` }).click();
      await bamTrongHopThoai(page, `Xóa hạng vé Hạng sửa ${ma}?`, 'Xóa');
      await expect(toast(page, `Xóa hạng vé Hạng sửa ${ma} thành công.`)).toBeVisible();
      await expect(dong).toHaveCount(0);

      await page.getByRole('button', { name: 'Xóa hạng vé H1' }).click();
      await bamTrongHopThoai(page, /^Xóa hạng vé .*\?$/, 'Xóa');
      await bamTrongHopThoai(page, 'Không thể xóa hạng vé', 'Đóng');
      await expect(bangHangVe(page).getByRole('row').filter({ hasText: 'H1' })).toHaveCount(1);
    } finally {
      // hạng vé thử không được để lại vì biểu mẫu chuyến bay của các ca khác sẽ có thêm một hạng
      await api.xoaHangVeNeuCo(ma);
      await api.dong();
    }
  });
});
