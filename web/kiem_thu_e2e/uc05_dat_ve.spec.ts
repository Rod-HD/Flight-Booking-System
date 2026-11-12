// UC05 Quản lý đặt vé: lập phiếu (BM3, QĐ3), tra cứu, sửa, hủy phiếu và xóa phiếu đã hủy (AT04, BMT05, BMT09).
import { expect, test, type Page } from '@playwright/test';
import { ApiThu, bamTrongHopThoai, dangNhap, hanhKhachMoi, hopThoai, mocVN, nhapNgay, soCanCuocMoi, toast } from './tien_ich/chung';

async function timPhieu(page: Page, maPhieuDat: string) {
  await page.goto('/phieu-dat');
  await page.getByRole('textbox', { name: 'Mã phiếu đặt' }).fill(maPhieuDat);
  // mặc định chỉ hiện phiếu Chờ thanh toán; chọn Tất cả để thấy cả phiếu Đã hủy
  await page.getByRole('combobox', { name: 'Tình trạng' }).selectOption('');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  const dong = page.getByRole('table', { name: 'Danh sách phiếu đặt chỗ' }).getByRole('row').filter({ hasText: maPhieuDat });
  await expect(dong).toHaveCount(1);
  return dong;
}

test.describe('UC05 Quản lý đặt vé', () => {
  test('UC05.1 Lập phiếu đặt chỗ, phiếu ở tình trạng Chờ thanh toán (BM3, NV03)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    await api.dong();
    const soGiayTo = soCanCuocMoi();
    await dangNhap(page, 'nhanVien', `/dat-ve?maChuyenBay=${cb.maChuyenBay}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt vé' })).toBeVisible();
    const form = page.getByRole('form');
    await form.getByRole('textbox', { name: 'Hành khách' }).fill('Võ Thị Giữ Chỗ');
    await form.getByRole('textbox', { name: 'CCCD/Hộ chiếu' }).fill(soGiayTo);
    await form.getByRole('textbox', { name: 'Điện thoại' }).fill('0934567890');
    const hang2 = form.getByRole('radio', { name: /^Hạng 2/ });
    await page.locator('label').filter({ has: hang2 }).or(hang2).first().click();
    await form.getByRole('button', { name: 'Đặt vé', exact: true }).click();
    await bamTrongHopThoai(page, 'Xác nhận đặt vé?', 'Đặt vé');
    const kq = hopThoai(page, 'Đặt vé thành công');
    await expect(kq).toContainText('Chờ thanh toán');
    await expect(kq).toContainText('Hạn thanh toán');
    await expect(kq).toContainText('1.000.000');
    const maPhieu = (await kq.getByText(/^PD\d{8}$/).textContent())!.trim();
    await expect(toast(page, `Đã lập phiếu đặt chỗ ${maPhieu}`)).toBeVisible();

    await page.goto('/phieu-dat');
    await expect(page.getByRole('heading', { name: 'Phiếu đang chờ thanh toán' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Mã phiếu đặt' }).fill(maPhieu);
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    const dong = page.getByRole('table', { name: 'Danh sách phiếu đặt chỗ' }).getByRole('row').filter({ hasText: maPhieu });
    await expect(dong).toContainText('Võ Thị Giữ Chỗ');
    await expect(dong).toContainText('Chờ thanh toán');
  });

  test('UC05.2 Không đặt được vé trễ hơn thời gian chậm nhất trước ngày khởi hành (QĐ3)', async ({ page }) => {
    const api = await ApiThu.moi();
    const thamSoCu = await api.thamSo();
    // chuyến bay khởi hành sau 2 ngày, thời gian chậm nhất khi đặt vé tạm đổi thành 5 ngày
    const cb = await api.themChuyenBay({ lechNgay: 2 });
    await api.doiThamSo('thoiGianDatVeChamNhat', 5);
    try {
      await dangNhap(page, 'nhanVien', `/dat-ve?maChuyenBay=${cb.maChuyenBay}`);
      const canhBao = hopThoai(page, 'Quá thời hạn đặt vé');
      await expect(canhBao).toBeVisible();
      await expect(canhBao).toContainText('Vui lòng chọn chuyến bay khác.');
      await canhBao.getByRole('button').last().click();
      const ph = await page.request.post('/api/phieu-dat', { data: { maChuyenBay: cb.maChuyenBay, maHangVe: 'H2', hanhKhach: hanhKhachMoi() } });
      expect(ph.status()).toBe(409);
      expect(await ph.text()).toContain('QUA_HAN_DAT_VE');
      // vẫn bán vé trực tiếp được cho chuyến bay này
      await page.goto(`/ban-ve?maChuyenBay=${cb.maChuyenBay}`);
      await expect(page.getByRole('radio', { name: /^Hạng 2/ })).toBeEnabled();
    } finally {
      await api.doiThamSo('thoiGianDatVeChamNhat', thamSoCu.thoiGianDatVeChamNhat);
      await api.dong();
    }
  });

  test('UC05.3 Tra cứu phiếu đặt chỗ theo CCCD của hành khách (UC05.2)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    const hk = hanhKhachMoi('Đặng Văn Tra Cứu');
    const { maPhieuDat } = await api.datVe(cb.maChuyenBay, 'H2', hk);
    await api.dong();
    await dangNhap(page, 'nhanVien', '/phieu-dat');
    await page.getByRole('textbox', { name: 'CCCD/Hộ chiếu' }).fill(hk.soGiayTo);
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    const bang = page.getByRole('table', { name: 'Danh sách phiếu đặt chỗ' });
    await expect(bang.locator('tbody tr')).toHaveCount(1);
    await expect(bang.getByRole('row').filter({ hasText: maPhieuDat })).toContainText('Đặng Văn Tra Cứu');
    await expect(bang.getByRole('row').filter({ hasText: maPhieuDat })).toContainText(cb.maChuyenBay);
  });

  test('UC05.4 Sửa thông tin hành khách trên phiếu đặt chỗ (UC05.3)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    const { maPhieuDat } = await api.datVe(cb.maChuyenBay, 'H2', hanhKhachMoi('Bùi Văn Cũ'));
    await api.dong();
    await dangNhap(page, 'nhanVien', '/phieu-dat');
    const dong = await timPhieu(page, maPhieuDat);
    await dong.getByRole('button', { name: `Sửa phiếu ${maPhieuDat}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sửa phiếu đặt chỗ' })).toBeVisible();
    const form = page.getByRole('form');
    await form.getByRole('textbox', { name: 'Hành khách' }).fill('Bùi Văn Mới');
    await form.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(toast(page, new RegExp(`Đã cập nhật thông tin hành khách của phiếu.*${maPhieuDat}`))).toBeVisible();
    await expect(await timPhieu(page, maPhieuDat)).toContainText('Bùi Văn Mới');
  });

  test('UC05.5 Hủy phiếu đặt chỗ thì phiếu chuyển sang Đã hủy (UC05.4, AT03)', async ({ page }) => {
    const api = await ApiThu.moi();
    const cb = await api.themChuyenBay();
    const { maPhieuDat } = await api.datVe(cb.maChuyenBay, 'H2');
    await api.dong();
    await dangNhap(page, 'nhanVien', '/phieu-dat');
    const dong = await timPhieu(page, maPhieuDat);
    await dong.getByRole('button', { name: `Hủy phiếu ${maPhieuDat}` }).click();
    await bamTrongHopThoai(page, `Hủy phiếu ${maPhieuDat}?`, 'Hủy phiếu');
    await expect(toast(page, `Đã hủy phiếu ${maPhieuDat}`)).toBeVisible();
    await expect(dong).toContainText('Đã hủy');
    const dongSau = await timPhieu(page, maPhieuDat);
    await expect(dongSau).toContainText('Đã hủy');
    await expect(dongSau.getByRole('button', { name: `Hủy phiếu ${maPhieuDat}` })).toBeDisabled();
  });

  test('UC05.6 Quản lý xóa các phiếu đã hủy trước một ngày, Nhân viên không có chức năng này (UC05.5, AT04, BMT09)', async ({ page }) => {
    await dangNhap(page, 'nhanVien', '/phieu-dat');
    await expect(page.getByRole('table', { name: 'Danh sách phiếu đặt chỗ' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Dọn dẹp phiếu đặt chỗ đã hủy/ })).toHaveCount(0);

    await dangNhap(page, 'quanLy', '/phieu-dat');
    const khoi = page.locator('#xoa-phieu-da-huy');
    await expect(khoi.getByRole('heading', { name: /Dọn dẹp phiếu đặt chỗ đã hủy/ })).toBeVisible();
    await nhapNgay(khoi, 'Xóa phiếu đã hủy trước ngày', mocVN(0).vn);
    await khoi.getByRole('button', { name: 'Xóa phiếu đã hủy' }).click();
    // lần đầu sau khi nạp dữ liệu mẫu có phiếu để xóa; lần chạy lại có thể đã hết
    const hoi = hopThoai(page, /^Xóa [\d.]+ phiếu đã hủy\?$/);
    const khongCo = hopThoai(page, 'Không có phiếu nào để xóa');
    await expect(hoi.or(khongCo)).toBeVisible();
    if (await hoi.isVisible()) {
      await hoi.getByRole('button', { name: 'Xóa phiếu đã hủy' }).click();
      await bamTrongHopThoai(page, 'Đã xóa phiếu đã hủy', 'Đóng');
      await khoi.getByRole('button', { name: 'Xóa phiếu đã hủy' }).click();
    }
    // sau khi xóa, không còn phiếu Đã hủy nào trước mốc
    await bamTrongHopThoai(page, 'Không có phiếu nào để xóa', 'Đã hiểu');
    const dem = await (await page.request.get(`/api/phieu-dat/da-huy/dem?truocNgay=${mocVN(0).iso}`)).json();
    expect(dem.soPhieu).toBe(0);
  });
});
