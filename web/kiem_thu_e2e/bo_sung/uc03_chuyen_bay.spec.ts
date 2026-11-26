// Bổ sung UC03 Quản lý chuyến bay: các ca biên, ngoại lệ và đoán lỗi cho thêm, sửa, xóa, tra cứu, xuất và nhập Excel.
import { expect, test, xemCsdl, type Locator, type Page } from '../tien_ich/trinh_dien';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { ApiThu, bamTrongHopThoai, chonTrongOChon, dangNhap, hopThoai, maMoi, mocVN, nhapNgay, toast } from '../tien_ich/chung';
import { docExcel, taoExcel, type TrangTinh } from '../tien_ich/excel';

/* ---------------- biểu mẫu thêm, sửa chuyến bay ---------------- */

type TruongBatBuoc = 'ma' | 'giaVe' | 'di' | 'den' | 'ngayGio' | 'thoiGianBay';

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

interface ThamSoQd1 {
  thoiGianBayToiThieu: number;
  soSanBayTrungGianToiDa: number;
  thoiGianDungToiThieu: number;
  thoiGianDungToiDa: number;
}

/** Ô số ghế theo đúng tên hạng, không lẫn với hạng vé thử khác (ví dụ Hạng 10). */
const oGhe = (page: Page, tenHang: 'Hạng 1' | 'Hạng 2') => page.getByLabel(`Số lượng ghế ${tenHang}`, { exact: true });
const nutLuu = (page: Page) => page.getByRole('button', { name: 'Lưu chuyến bay' });
/** Dòng báo lỗi dưới một ô của biểu mẫu, theo khóa lỗi (maChuyenBay, giaVe, ghe.H1...). */
const loiO = (page: Page, khoa: string) => page.locator(`#cb-${khoa.replace(/\./g, '-')}-loi`);

async function dienBieuMau(page: Page, d: DuLieuBieuMau, boTrong?: TruongBatBuoc) {
  if (boTrong !== 'ma') await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(d.ma);
  if (boTrong !== 'giaVe') await page.getByRole('textbox', { name: 'Giá vé (VND)' }).fill(d.giaVe ?? '1500000');
  const di = d.di ?? 'SGN';
  const den = d.den ?? 'HAN';
  if (boTrong !== 'di') await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đi' }), di, new RegExp(`^${di}`));
  if (boTrong !== 'den') await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đến' }), den, new RegExp(`^${den}`));
  if (boTrong !== 'ngayGio') await nhapNgay(page, 'Ngày giờ khởi hành', d.ngayGio ?? mocVN(15, 9, 0).vnGio);
  if (boTrong !== 'thoiGianBay') await page.getByRole('textbox', { name: 'Thời gian bay (phút)' }).fill(d.thoiGianBay ?? '130');
  await oGhe(page, 'Hạng 1').fill(d.gheH1 ?? '10');
  await oGhe(page, 'Hạng 2').fill(d.gheH2 ?? '60');
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

/** Bấm Lưu chuyến bay và chờ báo thêm thành công, quay về danh sách. */
async function luuThanhCong(page: Page, ma: string) {
  await nutLuu(page).click();
  await expect(toast(page, `Thêm chuyến bay ${ma} thành công.`)).toBeVisible();
  await expect(page).toHaveURL(/\/chuyen-bay$/);
}

async function trangThaiChuyenBay(page: Page, ma: string): Promise<number> {
  return (await page.request.get(`/api/chuyen-bay/${ma}`)).status();
}

async function layThamSo(): Promise<ThamSoQd1> {
  const api = await ApiThu.moi();
  try {
    return (await api.thamSo()) as unknown as ThamSoQd1;
  } finally {
    await api.dong();
  }
}

/** Dọn các chuyến bay thử (chưa có vé, phiếu) để danh sách tra cứu không dài thêm sau mỗi lần chạy. */
async function xoaChuyenBayThu(page: Page, ...cacMa: string[]) {
  for (const ma of cacMa) await page.request.delete(`/api/chuyen-bay/${ma}`);
}

const soCoCham = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/* ---------------- danh sách, tra cứu chuyến bay ---------------- */

const bangChuyenBay = (page: Page) => page.getByRole('table', { name: 'Danh sách chuyến bay' });

/** Bấm Tìm rồi đọc mọi dòng kết quả qua tất cả các trang (mỗi dòng là mảng chữ của các ô). */
async function timVaDocKetQua(page: Page): Promise<string[][]> {
  // chờ máy chủ trả kết quả mới để không đọc nhầm kết quả của lần tìm trước
  const choKetQua = page.waitForResponse((ph) => /\/api\/chuyen-bay(\?|$)/.test(ph.url()) && ph.request().method() === 'GET');
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await choKetQua;
  const tomTat = page.getByText(/^Tìm thấy [\d.]+ chuyến bay thỏa tiêu chí\.$/);
  await expect(tomTat).toBeVisible();
  const tong = Number((await tomTat.textContent())!.match(/[\d.]+/)![0].replace(/\./g, ''));
  const ketQua: string[][] = [];
  for (let lan = 0; lan < 100; lan++) {
    const trang = await bangChuyenBay(page)
      .locator('tbody tr')
      .evaluateAll((ds) => ds.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim())));
    ketQua.push(...trang.filter((o) => o.length > 1));
    const sau = page.getByRole('button', { name: 'Trang sau' });
    if ((await sau.count()) === 0 || (await sau.isDisabled())) break;
    await sau.click();
  }
  expect(ketQua.length, 'số dòng đọc được qua các trang bằng số chuyến bay tìm thấy').toBe(tong);
  return ketQua;
}

/** Mở danh sách, bỏ trống Từ ngày, lọc theo mã rồi trả về dòng của chuyến bay. */
async function dongTheoMa(page: Page, ma: string): Promise<Locator> {
  await page.goto('/chuyen-bay');
  await nhapNgay(page, 'Từ ngày', '');
  await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(ma);
  await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  const dong = bangChuyenBay(page).getByRole('row').filter({ hasText: ma });
  await expect(dong).toHaveCount(1);
  return dong;
}

async function kiemGhe(page: Page, ma: string, trong: number, dat: number) {
  const dong = await dongTheoMa(page, ma);
  // cột: STT, Mã, Sân bay đi, Sân bay đến, Khởi hành, Thời gian bay, Số ghế trống, Số ghế đặt, Thao tác
  await expect(dong.getByRole('cell').nth(6)).toHaveText(trong <= 0 ? 'Hết chỗ' : `${trong} ghế trống`);
  await expect(dong.getByRole('cell').nth(7)).toHaveText(String(dat));
}

/* ---------------- nhập Excel ---------------- */

const COT_CB = ['Mã chuyến bay', 'Giá vé', 'Mã sân bay đi', 'Mã sân bay đến', 'Ngày giờ khởi hành', 'Thời gian bay (phút)', 'Số ghế H1', 'Số ghế H2'];
const COT_TG = ['Mã chuyến bay', 'Thứ tự dừng', 'Mã sân bay', 'Thời gian dừng (phút)', 'Ghi chú'];

/** Một dòng hợp lệ của trang ChuyenBay, ghi đè từng ô nếu cần. */
function dongCB(ma: string, ghiDe: Partial<Record<'giaVe' | 'di' | 'den' | 'ngayGio' | 'thoiGianBay', string | number>> = {}, lechNgay = 33) {
  return [
    ma,
    ghiDe.giaVe ?? 1350000,
    ghiDe.di ?? 'HAN',
    ghiDe.den ?? 'PQC',
    ghiDe.ngayGio ?? mocVN(lechNgay, 10, 15).vnGio,
    ghiDe.thoiGianBay ?? 130,
    8,
    60,
  ];
}

/** Ghi tập tin thử vào thư mục kết quả của ca (không ghi vào thư mục mã nguồn). */
async function ghiTapTinThu(ten: string, noiDung: Buffer | string): Promise<string> {
  const duongDan = test.info().outputPath(ten);
  await mkdir(dirname(duongDan), { recursive: true });
  await writeFile(duongDan, noiDung);
  return duongDan;
}

async function ghiExcelThu(ten: string, cacTrang: TrangTinh[]) {
  return ghiTapTinThu(ten, taoExcel(cacTrang));
}

async function moHopNhapExcel(page: Page): Promise<Locator> {
  await dangNhap(page, 'quanLy', '/chuyen-bay');
  await page.getByRole('button', { name: 'Nhập Excel' }).click();
  const hop = hopThoai(page, 'Nhập lịch chuyến bay từ Excel');
  await expect(hop).toBeVisible();
  return hop;
}

/** Chọn tập tin .xlsx rồi bấm Nhập lịch chuyến bay. */
async function nhapTapTin(hop: Locator, duongDan: string) {
  await hop.locator('input[type="file"]').setInputFiles(duongDan);
  await expect(hop.getByText(basename(duongDan))).toBeVisible();
  await hop.getByRole('button', { name: 'Nhập lịch chuyến bay' }).click();
}

/** Các dòng của bảng lỗi sau khi nhập: [số dòng, lý do]. */
async function docDongLoi(hop: Locator): Promise<[number, string][]> {
  const bang = hop.getByRole('table', { name: 'Các dòng bị lỗi' });
  const cacDong = await bang
    .locator('tbody tr')
    .evaluateAll((ds) => ds.map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim())));
  return cacDong.map((o) => [Number(o[0]), o[1]] as [number, string]);
}

/* =================================================================== */

test.describe('Bổ sung UC03 Quản lý chuyến bay', () => {
  test.describe('4.1 Thêm chuyến bay', () => {
    test('UC03.12 Thời gian bay 29, 30, 31 phút: chỉ 29 bị từ chối (QĐ1)', async ({ page }) => {
      const { thoiGianBayToiThieu: toiThieu } = await layThamSo();
      const maSai = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma: maSai, thoiGianBay: String(toiThieu - 1) });
      await nutLuu(page).click();
      await expect(loiO(page, 'thoiGianBay')).toContainText(`Thời gian bay phải từ ${toiThieu} phút trở lên (QĐ1).`);
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, maSai)).toBe(404);

      const daLuu: { ma: string; phut: number }[] = [];
      for (const phut of [toiThieu, toiThieu + 1]) {
        const ma = maMoi('KT');
        await page.goto('/chuyen-bay/them');
        await dienBieuMau(page, { ma, thoiGianBay: String(phut) });
        await luuThanhCong(page, ma);
        daLuu.push({ ma, phut });
      }
      await xemCsdl(page, `${toiThieu - 1} phút không lưu; ${toiThieu} và ${toiThieu + 1} phút lưu được`,
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maSai, soDong: 0 },
        ...daLuu.map((x) => ({ bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: x.ma, soDong: 1, dung: { ThoiGianBay: x.phut } })));
    });

    test('UC03.13 Thời gian dừng 9, 10, 20, 21 phút: 9 và 21 bị từ chối (QĐ1)', async ({ page }) => {
      const ts = await layThamSo();
      const loiDung = `Từ ${ts.thoiGianDungToiThieu} đến ${ts.thoiGianDungToiDa} phút (QĐ1).`;
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      const tuChoi: string[] = [];
      for (const phut of [ts.thoiGianDungToiThieu - 1, ts.thoiGianDungToiDa + 1]) {
        const ma = maMoi('KT');
        await page.goto('/chuyen-bay/them');
        await dienBieuMau(page, { ma });
        await themTrungGian(page, 'DAD', String(phut));
        await nutLuu(page).click();
        await expect(bangTrungGian(page).getByRole('alert').filter({ hasText: loiDung })).toBeVisible();
        await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
        expect(await trangThaiChuyenBay(page, ma), `dừng ${phut} phút không được lưu`).toBe(404);
        tuChoi.push(ma);
      }
      const daLuu: { ma: string; phut: number }[] = [];
      for (const phut of [ts.thoiGianDungToiThieu, ts.thoiGianDungToiDa]) {
        const ma = maMoi('KT');
        await page.goto('/chuyen-bay/them');
        await dienBieuMau(page, { ma });
        await themTrungGian(page, 'DAD', String(phut));
        await luuThanhCong(page, ma);
        daLuu.push({ ma, phut });
      }
      await xemCsdl(page, 'dừng ngoài khoảng không lưu, dừng đúng biên lưu được',
        ...tuChoi.map((ma) => ({ bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: ma, soDong: 0 })),
        ...daLuu.map((x) => ({ bang: 'CHITIETSANBAYTRUNGGIAN', cot: 'MaChuyenBay', giaTri: x.ma, soDong: 1, dung: { MaSanBay: 'DAD', ThoiGianDung: x.phut } })));
    });

    test('UC03.14 Lưu được với 0 sân bay trung gian và với đúng số tối đa (QĐ1)', async ({ page }) => {
      const ts = await layThamSo();
      const maThang = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma: maThang });
      await expect(page.getByText('Chuyến bay bay thẳng')).toBeVisible();
      await luuThanhCong(page, maThang);

      const maDu = maMoi('KT');
      const cacSanBay = ['DAD', 'HUI', 'VII', 'CXR', 'DLI', 'HPH', 'VCA', 'PQC'].slice(0, ts.soSanBayTrungGianToiDa);
      await page.goto('/chuyen-bay/them');
      await dienBieuMau(page, { ma: maDu, di: 'SGN', den: 'HAN' });
      for (const sb of cacSanBay) await themTrungGian(page, sb, String(ts.thoiGianDungToiThieu));
      await expect(page.getByText(`Đã đủ ${ts.soSanBayTrungGianToiDa} sân bay trung gian theo quy định.`)).toBeVisible();
      await luuThanhCong(page, maDu);
      await xemCsdl(page, `chuyến ${maThang} bay thẳng, chuyến ${maDu} có ${cacSanBay.length} sân bay trung gian`,
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maThang, soDong: 1 },
        { bang: 'CHITIETSANBAYTRUNGGIAN', cot: 'MaChuyenBay', giaTri: maThang, soDong: 0 },
        { bang: 'CHITIETSANBAYTRUNGGIAN', cot: 'MaChuyenBay', giaTri: maDu, soDong: cacSanBay.length, dung: { ThuTu: 1, MaSanBay: cacSanBay[0] } });
    });

    test('UC03.15 Sân bay đến trùng sân bay đi thì báo lỗi, không lưu (giả định 12)', async ({ page }) => {
      const ma = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma, di: 'SGN', den: 'SGN' });
      await nutLuu(page).click();
      await expect(loiO(page, 'maSanBayDen')).toContainText('Sân bay đến phải khác sân bay đi.');
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, ma)).toBe(404);
      await xemCsdl(page, `chuyến bay ${ma} không được lưu`, { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: ma, soDong: 0 });
    });

    test('UC03.16 Sân bay trung gian trùng nhau hoặc trùng sân bay đi, đến thì báo lỗi tại dòng trung gian (giả định 12)', async ({ page }) => {
      const dongTg = (i: number) => bangTrungGian(page).locator('tbody tr').nth(i);
      // hai sân bay trung gian trùng nhau
      const maTrung = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma: maTrung, di: 'SGN', den: 'HAN' });
      await themTrungGian(page, 'DAD', '15');
      await themTrungGian(page, 'DAD', '15');
      await nutLuu(page).click();
      await expect(dongTg(1).getByRole('alert')).toContainText('Trùng với sân bay trung gian thứ 1.');
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, maTrung)).toBe(404);

      // sân bay trung gian là sân bay đi và sân bay đến
      const maDiDen = maMoi('KT');
      await page.goto('/chuyen-bay/them');
      await dienBieuMau(page, { ma: maDiDen, di: 'SGN', den: 'HAN' });
      await themTrungGian(page, 'SGN', '15');
      await themTrungGian(page, 'HAN', '15');
      await nutLuu(page).click();
      await expect(dongTg(0).getByRole('alert')).toContainText('Phải khác sân bay đi và sân bay đến.');
      await expect(dongTg(1).getByRole('alert')).toContainText('Phải khác sân bay đi và sân bay đến.');
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, maDiDen)).toBe(404);
      await xemCsdl(page, 'hai chuyến bay có sân bay trung gian sai không được lưu',
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maTrung, soDong: 0 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maDiDen, soDong: 0 });
    });

    test('UC03.17 Ngày giờ khởi hành đã qua hoặc đúng lúc hiện tại thì báo phải sau thời điểm hiện tại (giả định 12)', async ({ page }) => {
      const loiMongDoi = /sau thời điểm hiện tại|Phải từ .+ trở đi/;
      // đã qua: hôm qua
      const maQua = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma: maQua, ngayGio: mocVN(-1, 9, 0).vnGio });
      const oNgay = page.getByRole('textbox', { name: 'Ngày giờ khởi hành' });
      await expect.soft(oNgay, 'vừa nhập ngày đã qua').toHaveAccessibleDescription(loiMongDoi);
      await nutLuu(page).click();
      await expect.soft(oNgay, 'sau khi bấm Lưu vẫn báo đúng lý do (không phải "chưa nhập")').toHaveAccessibleDescription(loiMongDoi);
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, maQua)).toBe(404);

      // đúng phút hiện tại
      const maNay = maMoi('KT');
      await page.goto('/chuyen-bay/them');
      await dienBieuMau(page, { ma: maNay, ngayGio: mocVN(0).vnGio });
      await nutLuu(page).click();
      await expect(loiO(page, 'ngayGioKhoiHanh')).toContainText('Ngày giờ khởi hành phải sau thời điểm hiện tại.');
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, maNay)).toBe(404);
      await xemCsdl(page, 'hai chuyến bay khởi hành không sau hiện tại không được lưu',
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maQua, soDong: 0 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maNay, soDong: 0 });
    });

    test('UC03.18 Giá vé 0, số âm, chữ, số lẻ thì báo lỗi số nguyên dương (giả định 12)', async ({ page }) => {
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      const cacMa: string[] = [];
      try {
        for (const giaVe of ['0', '-500000', 'abc', '1500000.5']) {
          const ma = maMoi('KT');
          cacMa.push(ma);
          await page.goto('/chuyen-bay/them');
          await dienBieuMau(page, { ma, giaVe });
          const hienThi = await page.getByRole('textbox', { name: 'Giá vé (VND)' }).inputValue();
          await nutLuu(page).click();
          await expect.soft(loiO(page, 'giaVe'), `giá vé "${giaVe}" (ô hiện "${hienThi}") phải báo lỗi`).toContainText(/số nguyên dương|Chưa nhập giá vé/);
          await expect.soft(page, `giá vé "${giaVe}" không được lưu`).toHaveURL(/\/chuyen-bay\/them$/);
          expect.soft(await trangThaiChuyenBay(page, ma), `giá vé "${giaVe}" (ô hiện "${hienThi}") không được lưu`).toBe(404);
        }
        await xemCsdl(page, 'các chuyến bay có giá vé sai không được lưu',
          ...cacMa.map((ma) => ({ bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: ma, soDong: 0 })));
      } finally {
        // dọn chuyến bay lỡ được lưu với giá vé bị đổi
        await xoaChuyenBayThu(page, ...cacMa);
      }
    });

    test('UC03.19 Giá vé lớn nhất mà giá tiền hạng đắt nhất còn vừa cột tiền thì lưu được, lớn hơn thì báo lỗi (cột decimal(12,0))', async ({ page }) => {
      // Hạng 1 có tỉ lệ 105%: giá vé lớn nhất là 952.380.952.380 (x 105% = 999.999.999.999)
      const ma = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma, giaVe: '952380952380' });
      await luuThanhCong(page, ma);
      await page.goto(`/chuyen-bay/${ma}`);
      await expect(page.getByRole('main')).toContainText('952.380.952.380');

      const maVuot = maMoi('KT');
      await page.goto('/chuyen-bay/them');
      await dienBieuMau(page, { ma: maVuot, giaVe: '999999999999' });
      await nutLuu(page).click();
      await expect(loiO(page, 'giaVe')).toContainText('Giá vé quá lớn: giá tiền Hạng 1');
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, maVuot)).toBe(404);
      // ô không nhận chữ số thứ 13
      const oGia = page.getByRole('textbox', { name: 'Giá vé (VND)' });
      await oGia.press('End');
      await oGia.pressSequentially('9');
      expect((await oGia.inputValue()).replace(/\D/g, '')).toBe('999999999999');
      await xemCsdl(page, `chuyến bay ${ma} lưu giá vé lớn nhất, chuyến bay ${maVuot} không được lưu`,
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: ma, soDong: 1, dung: { GiaVe: 952380952380 } },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maVuot, soDong: 0 });
    });

    test('UC03.20 Số ghế: cả hai hạng 0 bị từ chối, một hạng 0 lưu được và hạng đó không bán, số âm bị từ chối (giả định 12)', async ({ page }) => {
      // cả hai hạng bằng 0
      const maHai0 = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma: maHai0, gheH1: '0', gheH2: '0' });
      await nutLuu(page).click();
      await expect(page.locator('#cb-gheTheoHang')).toContainText('Phải có ít nhất một hạng vé có số lượng ghế lớn hơn 0.');
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      expect(await trangThaiChuyenBay(page, maHai0)).toBe(404);

      // một hạng bằng 0: lưu được, Hạng 1 không bán
      const maMot0 = maMoi('KT');
      await page.goto('/chuyen-bay/them');
      await dienBieuMau(page, { ma: maMot0, gheH1: '0', gheH2: '60' });
      await luuThanhCong(page, maMot0);
      await page.goto(`/chuyen-bay/${maMot0}`);
      const bangGhe = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Còn trống' }) });
      await expect(bangGhe).toContainText('Hạng 2');
      await expect(bangGhe.locator('tbody tr').filter({ hasText: /^H1/ })).toHaveCount(0);
      const api = await ApiThu.moi();
      try {
        await expect(api.banVe(maMot0, 'H1'), 'không bán được Hạng 1 của chuyến bay này').rejects.toThrow();
      } finally {
        await api.dong();
      }

      // số âm
      const maAm = maMoi('KT');
      try {
        await page.goto('/chuyen-bay/them');
        await dienBieuMau(page, { ma: maAm, gheH1: '-5', gheH2: '60' });
        const hienThi = await oGhe(page, 'Hạng 1').inputValue();
        await nutLuu(page).click();
        await expect.soft(loiO(page, 'ghe.H1'), `số ghế "-5" (ô hiện "${hienThi}") phải báo lỗi`).toBeVisible();
        await expect.soft(page, `số ghế "-5" không được lưu`).toHaveURL(/\/chuyen-bay\/them$/);
        expect.soft(await trangThaiChuyenBay(page, maAm), `số ghế "-5" (ô hiện "${hienThi}") không được lưu`).toBe(404);
        await xemCsdl(page, 'hai hạng 0 không lưu; một hạng 0 chỉ có dòng ghế Hạng 2; số âm không lưu',
          { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maHai0, soDong: 0 },
          { bang: 'GHETHEOHANG', cot: 'MaChuyenBay', giaTri: maMot0, soDong: 1, dung: { MaHangVe: 'H2', SoLuongGhe: 60 } },
          { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maAm, soDong: 0 });
      } finally {
        // dọn chuyến bay lỡ được lưu với số ghế bị đổi dấu
        await xoaChuyenBayThu(page, maAm);
      }
    });

    test('UC03.21 Mã chuyến bay có chữ thường, dấu, ký tự đặc biệt, khoảng trắng được tự chuẩn hóa (ràng buộc CHUYENBAY)', async ({ page }) => {
      // hành vi hiện tại: ô mã tự đổi sang chữ in hoa và bỏ ký tự không phải chữ A-Z hoặc số
      const ma = maMoi('K');
      const oMa = page.getByRole('textbox', { name: 'Mã chuyến bay' });
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      const cacKieu: [string, string][] = [
        ['chữ thường', ma.toLowerCase()],
        ['có dấu', ma.slice(0, 1) + 'Ắđ' + ma.slice(1)],
        ['ký tự đặc biệt', ma.slice(0, 1) + '-#' + ma.slice(1)],
        ['khoảng trắng', ma.slice(0, 1) + ' ' + ma.slice(1)],
      ];
      for (const [kieu, chuoi] of cacKieu) {
        await oMa.fill(chuoi);
        await expect(oMa, `mã ${kieu} "${chuoi}"`).toHaveValue(ma);
      }
      await dienBieuMau(page, { ma: ma.toLowerCase() });
      await expect(oMa).toHaveValue(ma);
      await luuThanhCong(page, ma);
      await xemCsdl(page, `mã nhập chữ thường được lưu thành ${ma}`, { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: ma, soDong: 1, dung: { MaChuyenBay: ma } });
    });

    test('UC03.22 Mã chuyến bay 10 ký tự lưu được, ký tự thứ 11 bị chặn (cột varchar(10))', async ({ page }) => {
      const ma10 = (maMoi('KTD') + 'XXXXXXXXXX').slice(0, 10);
      const oMa = page.getByRole('textbox', { name: 'Mã chuyến bay' });
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma: ma10 });
      await expect(oMa).toHaveValue(ma10);
      await oMa.press('End');
      await oMa.pressSequentially('Z');
      await expect(oMa, 'ký tự thứ 11 không vào được ô').toHaveValue(ma10);
      await luuThanhCong(page, ma10);
      await xemCsdl(page, `mã 10 ký tự ${ma10} được lưu`, { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: ma10, soDong: 1 });
    });

    test('UC03.23 Bỏ trống lần lượt từng trường bắt buộc thì báo lỗi đúng ô và đưa con trỏ tới ô đó (BM1)', async ({ page }) => {
      const cacTruong: { truong: TruongBatBuoc; khoa: string; loi: string; o: Locator }[] = [
        { truong: 'ma', khoa: 'maChuyenBay', loi: 'Chưa nhập mã chuyến bay.', o: page.getByRole('textbox', { name: 'Mã chuyến bay' }) },
        { truong: 'giaVe', khoa: 'giaVe', loi: 'Chưa nhập giá vé.', o: page.getByRole('textbox', { name: 'Giá vé (VND)' }) },
        { truong: 'di', khoa: 'maSanBayDi', loi: 'Chưa chọn sân bay đi.', o: page.getByRole('combobox', { name: 'Sân bay đi' }) },
        { truong: 'den', khoa: 'maSanBayDen', loi: 'Chưa chọn sân bay đến.', o: page.getByRole('combobox', { name: 'Sân bay đến' }) },
        { truong: 'ngayGio', khoa: 'ngayGioKhoiHanh', loi: 'Chưa nhập ngày giờ khởi hành.', o: page.getByRole('textbox', { name: 'Ngày giờ khởi hành' }) },
        { truong: 'thoiGianBay', khoa: 'thoiGianBay', loi: 'Chưa nhập thời gian bay.', o: page.getByRole('textbox', { name: 'Thời gian bay (phút)' }) },
      ];
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      const cacMa: string[] = [];
      for (const t of cacTruong) {
        const ma = maMoi('KT');
        if (t.truong !== 'ma') cacMa.push(ma);
        await page.goto('/chuyen-bay/them');
        await dienBieuMau(page, { ma }, t.truong);
        await nutLuu(page).click();
        await expect(loiO(page, t.khoa), `bỏ trống ${t.truong}`).toContainText(t.loi);
        // chỉ ô bị bỏ trống có lỗi
        await expect(page.locator('form').getByRole('alert'), `bỏ trống ${t.truong}: chỉ một ô báo lỗi`).toHaveCount(1);
        await expect(t.o, `bỏ trống ${t.truong}: con trỏ ở ô lỗi`).toBeFocused();
        await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      }
      for (const ma of cacMa) expect(await trangThaiChuyenBay(page, ma)).toBe(404);
    });

    test('UC03.24 Gõ mã sân bay không có trong danh sách thì không chọn được (TD01)', async ({ page }) => {
      const ma = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma }, 'di');
      const oDi = page.getByRole('combobox', { name: 'Sân bay đi' });
      await oDi.click();
      await oDi.fill('XQZ9');
      await expect(page.getByRole('listbox')).toContainText('Không có kết quả phù hợp');
      await expect(page.getByRole('option')).toHaveCount(0);
      await oDi.press('Enter');
      await oDi.press('Tab');
      await expect(oDi, 'chữ gõ tự do không thành lựa chọn').toHaveValue('');
      await nutLuu(page).click();
      await expect(loiO(page, 'maSanBayDi')).toContainText('Chưa chọn sân bay đi.');
      expect(await trangThaiChuyenBay(page, ma)).toBe(404);
    });

    test('UC03.25 Bấm Lưu chuyến bay hai lần thật nhanh chỉ tạo một chuyến bay (Chương 7, tr. 46)', async ({ page }) => {
      const ma = maMoi('KT');
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma });
      await nutLuu(page).dblclick();
      await expect(toast(page, `Thêm chuyến bay ${ma} thành công.`)).toBeVisible();
      await expect(page).toHaveURL(/\/chuyen-bay$/);
      // chờ thêm cho yêu cầu thứ hai (nếu có) trả về
      await page.waitForTimeout(1500);
      await expect(hopThoai(page, 'Mã chuyến bay đã tồn tại')).toHaveCount(0);
      await expect(page.locator('[role="dialog"], [role="alertdialog"]')).toHaveCount(0);
      expect(await trangThaiChuyenBay(page, ma)).toBe(200);
      await xemCsdl(page, `chỉ có một chuyến bay ${ma}`, { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: ma, soDong: 1 });
    });

    test('UC03.26 Đang nhập dở mà bấm menu khác hoặc nút Back thì hỏi xác nhận (Ch.5 nguyên lý khôi phục)', async ({ page }) => {
      // gõ mã chuyến bay đến khi biểu mẫu nhận là đang có thay đổi chưa lưu (vừa chuyển trang mà gõ ngay thì có lúc chưa nhận)
      const goDoDang = async (p: Page) => {
        const ma = maMoi('KT');
        await expect(async () => {
          await p.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(ma);
          await expect(p.getByText('Có thay đổi chưa lưu.')).toBeVisible({ timeout: 1000 });
        }).toPass();
      };
      const coHoi = async (p: Page, soHopGoc: number) =>
        soHopGoc > 0 || (await p.locator('[role="dialog"], [role="alertdialog"]').count()) > 0;

      // bấm menu khác
      let hopGoc1 = 0;
      page.on('dialog', (d) => {
        hopGoc1 += 1;
        void d.dismiss();
      });
      await dangNhap(page, 'quanLy', '/chuyen-bay');
      await page.getByRole('link', { name: 'Thêm chuyến bay' }).first().click();
      await expect(page).toHaveURL(/\/chuyen-bay\/them$/);
      await goDoDang(page);
      await page.getByRole('navigation', { name: 'Menu chính' }).getByRole('link', { name: 'Bán vé', exact: true }).click();
      await page.waitForTimeout(800);
      expect.soft(await coHoi(page, hopGoc1), 'bấm menu Bán vé khi đang nhập dở phải hỏi xác nhận').toBe(true);
      expect.soft(page.url(), 'chưa xác nhận thì vẫn ở biểu mẫu').toMatch(/\/chuyen-bay\/them$/);

      // nút Back của trình duyệt (thẻ mới, cùng phiên đăng nhập)
      const the = await page.context().newPage();
      let hopGoc2 = 0;
      the.on('dialog', (d) => {
        hopGoc2 += 1;
        void d.dismiss();
      });
      await the.goto('/chuyen-bay');
      await the.getByRole('link', { name: 'Thêm chuyến bay' }).first().click();
      await expect(the).toHaveURL(/\/chuyen-bay\/them$/);
      await goDoDang(the);
      await the.goBack({ timeout: 5000 }).catch(() => undefined);
      await the.waitForTimeout(800);
      expect.soft(await coHoi(the, hopGoc2), 'bấm Back khi đang nhập dở phải hỏi xác nhận').toBe(true);
      expect.soft(the.url(), 'chưa xác nhận thì vẫn ở biểu mẫu').toMatch(/\/chuyen-bay\/them$/);
      await the.close({ runBeforeUnload: false });
    });

    test('UC03.27 Ghi chú 200 ký tự lưu được, ký tự thứ 201 bị chặn, <script> hiện như chữ (cột nvarchar(200))', async ({ page }) => {
      const ma = maMoi('KT');
      const ghiChu200 = 'Đ'.repeat(200);
      const ghiChuScript = '<script>window.__ktXss = 1</script>';
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma, di: 'SGN', den: 'HAN' });
      await themTrungGian(page, 'DAD', '15', ghiChu200);
      const oGhiChu = bangTrungGian(page).getByLabel('Ghi chú').first();
      await oGhiChu.press('End');
      await oGhiChu.pressSequentially('X');
      await expect(oGhiChu, 'ký tự thứ 201 không vào được ô').toHaveValue(ghiChu200);
      await themTrungGian(page, 'HUI', '15', ghiChuScript);
      await luuThanhCong(page, ma);

      await page.goto(`/chuyen-bay/${ma}`);
      await expect(page.getByText(ghiChuScript, { exact: true })).toBeVisible();
      await expect(page.getByText(ghiChu200, { exact: true })).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { __ktXss?: number }).__ktXss), 'đoạn <script> không được chạy').toBeUndefined();
      const ct = await (await page.request.get(`/api/chuyen-bay/${ma}`)).json();
      expect(ct.trungGian.map((t: { ghiChu: string }) => t.ghiChu)).toEqual([ghiChu200, ghiChuScript]);
      await xemCsdl(page, 'ghi chú 200 ký tự và ghi chú có <script> lưu nguyên văn',
        { bang: 'CHITIETSANBAYTRUNGGIAN', cot: 'MaChuyenBay', giaTri: ma, soDong: 2, dung: { ThuTu: 1, GhiChu: ghiChu200 } });
    });
  });

  test.describe('4.2 Sửa và xóa chuyến bay', () => {
    test('UC03.28 Không xóa được chuyến bay chỉ có phiếu đặt chỗ (AT02)', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay();
      const phieu = await api.datVe(cb.maChuyenBay, 'H2');
      await api.dong();
      await dangNhap(page, 'quanLy', '/chuyen-bay');
      await dongTheoMa(page, cb.maChuyenBay);
      await page.getByRole('button', { name: `Xóa chuyến bay ${cb.maChuyenBay}` }).click();
      await bamTrongHopThoai(page, `Xóa chuyến bay ${cb.maChuyenBay}?`, 'Xóa');
      await bamTrongHopThoai(page, 'Không thể xóa chuyến bay', 'Đóng');
      expect(await trangThaiChuyenBay(page, cb.maChuyenBay)).toBe(200);
      await xemCsdl(page, `chuyến bay ${cb.maChuyenBay} vẫn còn vì đã có phiếu đặt chỗ`,
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 1 },
        { bang: 'PHIEUDATCHO', cot: 'MaPhieuDat', giaTri: phieu.maPhieuDat, soDong: 1, dung: { MaChuyenBay: cb.maChuyenBay } },
        { bang: 'VE', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 0 });
    });

    test('UC03.29 Bấm Xóa rồi chọn Không trong hộp xác nhận thì chuyến bay còn nguyên (nguyên lý xác nhận thao tác xóa)', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay();
      await api.dong();
      await dangNhap(page, 'quanLy', '/chuyen-bay');
      const dong = await dongTheoMa(page, cb.maChuyenBay);
      await page.getByRole('button', { name: `Xóa chuyến bay ${cb.maChuyenBay}` }).click();
      await bamTrongHopThoai(page, `Xóa chuyến bay ${cb.maChuyenBay}?`, 'Không');
      await expect(dong).toBeVisible();
      await expect(toast(page, `Xóa chuyến bay ${cb.maChuyenBay} thành công.`)).toHaveCount(0);
      expect(await trangThaiChuyenBay(page, cb.maChuyenBay)).toBe(200);
      await xemCsdl(page, `chuyến bay ${cb.maChuyenBay} còn nguyên`,
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 1 },
        { bang: 'GHETHEOHANG', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 2 });
    });

    test('UC03.30 Màn hình Sửa chuyến bay không cho sửa mã chuyến bay (UC03 luồng S)', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay();
      await api.dong();
      await dangNhap(page, 'quanLy', `/chuyen-bay/${cb.maChuyenBay}/sua`);
      const oMa = page.getByRole('textbox', { name: 'Mã chuyến bay' });
      await expect(oMa).toHaveValue(cb.maChuyenBay);
      await expect(oMa).not.toBeEditable();
      await expect(page.getByText('Mã chuyến bay không sửa được sau khi lưu.')).toBeVisible();
    });

    test('UC03.31 Sửa giá vé của chuyến bay đã có vé: vé cũ giữ giá cũ, vé bán sau dùng giá mới (QĐ2, giả định 3)', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay({ giaVe: 1_000_000 });
      const veCu = await api.banVe(cb.maChuyenBay, 'H2');
      await dangNhap(page, 'quanLy', `/chuyen-bay/${cb.maChuyenBay}/sua`);
      await page.getByRole('textbox', { name: 'Giá vé (VND)' }).fill('2000000');
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(toast(page, `Cập nhật chuyến bay ${cb.maChuyenBay} thành công.`)).toBeVisible();
      const veMoi = await api.banVe(cb.maChuyenBay, 'H2');
      await api.dong();
      expect(veMoi.giaTien, 'vé bán sau tính theo giá mới').toBe(veCu.giaTien * 2);

      for (const [maVe, giaTien] of [[veCu.maVe, veCu.giaTien], [veMoi.maVe, veMoi.giaTien]] as const) {
        await page.goto('/ve');
        await page.getByRole('textbox', { name: 'Mã vé' }).fill(maVe);
        await page.getByRole('button', { name: 'Tìm', exact: true }).click();
        const dong = page.getByRole('table', { name: 'Danh sách vé' }).getByRole('row').filter({ hasText: maVe });
        await expect(dong).toHaveCount(1);
        await expect(dong).toContainText(soCoCham(giaTien));
      }
      await xemCsdl(page, 'vé cũ giữ giá cũ, vé mới theo giá mới',
        { bang: 'VE', cot: 'MaVe', giaTri: veCu.maVe, soDong: 1, dung: { GiaTien: veCu.giaTien } },
        { bang: 'VE', cot: 'MaVe', giaTri: veMoi.maVe, soDong: 1, dung: { GiaTien: veMoi.giaTien } },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 1, dung: { GiaVe: 2000000 } });
    });

    test('UC03.32 Sửa số ghế một hạng xuống thấp hơn số đã bán và đặt thì báo lỗi (giả định 1, 2)', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay(); // Hạng 2 có 5 ghế
      await api.banVe(cb.maChuyenBay, 'H2');
      await api.banVe(cb.maChuyenBay, 'H2');
      await api.datVe(cb.maChuyenBay, 'H2');
      await api.dong();
      await dangNhap(page, 'quanLy', `/chuyen-bay/${cb.maChuyenBay}/sua`);
      await oGhe(page, 'Hạng 2').fill('2');
      // hành vi hiện tại: báo ngay dưới ô số ghế, không lưu
      await expect(loiO(page, 'ghe.H2')).toContainText('Tối thiểu 3 ghế (đã bán và đặt).');
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(loiO(page, 'ghe.H2')).toContainText('Tối thiểu 3 ghế (đã bán và đặt).');
      await expect(page).toHaveURL(new RegExp(`/chuyen-bay/${cb.maChuyenBay}/sua$`));
      const ct = await (await page.request.get(`/api/chuyen-bay/${cb.maChuyenBay}`)).json();
      expect(ct.gheTheoHang.find((g: { maHangVe: string }) => g.maHangVe === 'H2').soLuongGhe).toBe(5);
      await xemCsdl(page, 'số ghế Hạng 2 giữ nguyên 5',
        { bang: 'GHETHEOHANG', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 2 });
    });

    test('UC03.33 Sửa thời gian bay hoặc thời gian dừng vi phạm QĐ1 thì báo lỗi như khi thêm (QĐ1)', async ({ page }) => {
      const ts = await layThamSo();
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay({ trungGian: [{ thuTu: 1, maSanBay: 'DAD', thoiGianDung: ts.thoiGianDungToiThieu }] });
      await api.dong();
      await dangNhap(page, 'quanLy', `/chuyen-bay/${cb.maChuyenBay}/sua`);
      const nutLuuSua = page.getByRole('button', { name: 'Lưu thay đổi' });

      await page.getByRole('textbox', { name: 'Thời gian bay (phút)' }).fill(String(ts.thoiGianBayToiThieu - 1));
      await nutLuuSua.click();
      await expect(loiO(page, 'thoiGianBay')).toContainText(`Thời gian bay phải từ ${ts.thoiGianBayToiThieu} phút trở lên (QĐ1).`);
      await expect(page).toHaveURL(/\/sua$/);

      await page.getByRole('textbox', { name: 'Thời gian bay (phút)' }).fill('120');
      await bangTrungGian(page).getByLabel('Thời gian dừng (phút)').first().fill(String(ts.thoiGianDungToiDa + 1));
      await nutLuuSua.click();
      await expect(bangTrungGian(page).getByRole('alert').filter({ hasText: `Từ ${ts.thoiGianDungToiThieu} đến ${ts.thoiGianDungToiDa} phút (QĐ1).` })).toBeVisible();
      await expect(page).toHaveURL(/\/sua$/);

      const ct = await (await page.request.get(`/api/chuyen-bay/${cb.maChuyenBay}`)).json();
      expect(ct.thoiGianBay).toBe(cb.thoiGianBay);
      expect(ct.trungGian[0].thoiGianDung).toBe(ts.thoiGianDungToiThieu);
      await xemCsdl(page, `chuyến bay ${cb.maChuyenBay} giữ nguyên thời gian bay và thời gian dừng`,
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 1, dung: { ThoiGianBay: cb.thoiGianBay } },
        { bang: 'CHITIETSANBAYTRUNGGIAN', cot: 'MaChuyenBay', giaTri: cb.maChuyenBay, soDong: 1, dung: { ThoiGianDung: ts.thoiGianDungToiThieu } });
    });

    test('UC03.34 Mở chuyến bay không tồn tại thì báo không tìm thấy, không trắng trang', async ({ page }) => {
      for (const duongDan of ['/chuyen-bay/KHONGCO', '/chuyen-bay/KHONGCO/sua']) {
        await dangNhap(page, 'quanLy', duongDan);
        await expect(page.getByText('Không tìm thấy chuyến bay KHONGCO'), duongDan).toBeVisible();
        await expect(page.getByRole('link', { name: 'Về danh sách chuyến bay' })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Menu chính' })).toBeVisible();
      }
    });
  });

  test.describe('4.3 Tra cứu và xuất danh sách', () => {
    test('UC03.35 Tra cứu theo một tiêu chí: chỉ mã, chỉ sân bay đi, chỉ sân bay đến, chỉ khoảng ngày (TD04)', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay({ maSanBayDi: 'VII', maSanBayDen: 'PQC', lechNgay: 47, gio: 6 });
      await api.dong();
      const ngay = mocVN(47);
      try {
        await dangNhap(page, 'quanLy', '/chuyen-bay');
        const coChuyenNay = (ds: string[][]) => ds.some((o) => o[1] === cb.maChuyenBay);

        // chỉ mã
        await nhapNgay(page, 'Từ ngày', '');
        await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(cb.maChuyenBay);
        let ds = await timVaDocKetQua(page);
        expect(coChuyenNay(ds)).toBe(true);
        for (const o of ds) expect(o[1]).toContain(cb.maChuyenBay);

        // chỉ sân bay đi
        await page.goto('/chuyen-bay');
        await nhapNgay(page, 'Từ ngày', '');
        await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đi' }), 'VII', /^VII/);
        ds = await timVaDocKetQua(page);
        expect(coChuyenNay(ds)).toBe(true);
        for (const o of ds) expect(o[2].startsWith('VII'), `dòng ${o[1]} đi từ VII`).toBe(true);

        // chỉ sân bay đến
        await page.goto('/chuyen-bay');
        await nhapNgay(page, 'Từ ngày', '');
        await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đến' }), 'PQC', /^PQC/);
        ds = await timVaDocKetQua(page);
        expect(coChuyenNay(ds)).toBe(true);
        for (const o of ds) expect(o[3].startsWith('PQC'), `dòng ${o[1]} đến PQC`).toBe(true);

        // chỉ khoảng ngày
        await page.goto('/chuyen-bay');
        await nhapNgay(page, 'Từ ngày', ngay.vn);
        await nhapNgay(page, 'Đến ngày', ngay.vn);
        ds = await timVaDocKetQua(page);
        expect(coChuyenNay(ds)).toBe(true);
        for (const o of ds) expect(o[4], `dòng ${o[1]} khởi hành ngày ${ngay.vn}`).toContain(ngay.vn);
      } finally {
        await xoaChuyenBayThu(page, cb.maChuyenBay);
      }
    });

    test('UC03.36 Tra cứu không có kết quả thì báo không tìm thấy, bảng trống, không lỗi (NV04)', async ({ page }) => {
      await dangNhap(page, 'nhanVien', '/chuyen-bay');
      await nhapNgay(page, 'Từ ngày', '');
      await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill('ZQKHONGCO');
      await page.getByRole('button', { name: 'Tìm', exact: true }).click();
      await expect(page.getByText('Tìm thấy 0 chuyến bay thỏa tiêu chí.')).toBeVisible();
      await expect(page.getByText('Không tìm thấy chuyến bay', { exact: true })).toBeVisible();
      await expect(bangChuyenBay(page).locator('tbody tr')).toHaveCount(0);
      await expect(page.getByText('Không tải được')).toHaveCount(0);
    });

    test('UC03.37 Từ ngày sau Đến ngày thì báo lỗi khoảng ngày (NV04)', async ({ page }) => {
      const tu = mocVN(20);
      const den = mocVN(18);
      const oDen = page.getByRole('textbox', { name: 'Đến ngày' });
      const loiKhoang = /Phải từ ngày .+ trở đi|Đến ngày phải sau hoặc bằng Từ ngày/;

      // nhập Từ ngày trước rồi Đến ngày
      await dangNhap(page, 'nhanVien', '/chuyen-bay');
      await nhapNgay(page, 'Từ ngày', tu.vn);
      await nhapNgay(page, 'Đến ngày', den.vn);
      await page.getByRole('button', { name: 'Tìm', exact: true }).click();
      await expect(oDen).toHaveAccessibleDescription(loiKhoang);
      expect(page.url()).not.toContain(`denNgay=${den.iso}`);

      // nhập Đến ngày trước rồi Từ ngày
      await page.goto('/chuyen-bay');
      await nhapNgay(page, 'Đến ngày', den.vn);
      await nhapNgay(page, 'Từ ngày', tu.vn);
      await page.getByRole('button', { name: 'Tìm', exact: true }).click();
      await expect(oDen).toHaveAccessibleDescription(loiKhoang);
      expect(page.url()).not.toContain(`tuNgay=${tu.iso}`);
    });

    test('UC03.38 Bán vé, đặt chỗ, hủy vé thì số ghế trống và số ghế đặt trên danh sách đổi đúng (BM4, giả định 2, công thức (1.5))', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb = await api.themChuyenBay(); // 2 ghế Hạng 1 và 5 ghế Hạng 2
      try {
        await dangNhap(page, 'quanLy', '/chuyen-bay');
        await kiemGhe(page, cb.maChuyenBay, 7, 0);

        const ve = await api.banVe(cb.maChuyenBay, 'H2');
        await kiemGhe(page, cb.maChuyenBay, 6, 1);

        const phieu = await api.datVe(cb.maChuyenBay, 'H1');
        await kiemGhe(page, cb.maChuyenBay, 5, 2);

        const huy = await page.request.post(`/api/ve/${ve.maVe}/huy`);
        expect(huy.ok(), `hủy vé ${ve.maVe}`).toBeTruthy();
        await kiemGhe(page, cb.maChuyenBay, 6, 1);

        await xemCsdl(page, 'một vé đã hủy và một phiếu chờ thanh toán',
          { bang: 'VE', cot: 'MaVe', giaTri: ve.maVe, soDong: 1, dung: { TinhTrang: 'Đã hủy' } },
          { bang: 'PHIEUDATCHO', cot: 'MaPhieuDat', giaTri: phieu.maPhieuDat, soDong: 1, dung: { TinhTrang: 'Chờ thanh toán' } });
      } finally {
        await api.dong();
      }
    });

    test('UC03.40 Xuất Excel sau khi lọc có đúng các dòng đang lọc; danh sách trống thì có thông báo (TT02)', async ({ page }) => {
      const api = await ApiThu.moi();
      const cb1 = await api.themChuyenBay({ maSanBayDi: 'VII', maSanBayDen: 'CXR', lechNgay: 53, gio: 7 });
      const cb2 = await api.themChuyenBay({ maSanBayDi: 'VII', maSanBayDen: 'CXR', lechNgay: 53, gio: 9 });
      await api.dong();
      const ngay = mocVN(53);
      try {
        await dangNhap(page, 'nhanVien', '/chuyen-bay');
        await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đi' }), 'VII', /^VII/);
        await chonTrongOChon(page.getByRole('combobox', { name: 'Sân bay đến' }), 'CXR', /^CXR/);
        await nhapNgay(page, 'Từ ngày', ngay.vn);
        await nhapNgay(page, 'Đến ngày', ngay.vn);
        const ds = await timVaDocKetQua(page);
        const maTrenManHinh = ds.map((o) => o[1]).sort();
        expect(maTrenManHinh).toEqual(expect.arrayContaining([cb1.maChuyenBay, cb2.maChuyenBay]));

        const choTai = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Xuất Excel' }).click();
        const tai = await choTai;
        expect(tai.suggestedFilename()).toMatch(/\.xlsx$/);
        const { chu } = docExcel(await readFile((await tai.path())!));
        const maTrongTapTin = chu.filter((c) => /^[A-Z0-9]{3,10}$/.test(c) && c !== 'STT').sort();
        expect(maTrongTapTin, 'tập tin có đúng các chuyến bay đang lọc').toEqual(maTrenManHinh);
        await expect(toast(page, `Đã xuất ${ds.length} chuyến bay ra tập tin Excel.`)).toBeVisible();

        // danh sách trống
        await page.goto('/chuyen-bay');
        await nhapNgay(page, 'Từ ngày', '');
        await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill('ZQKHONGCO');
        await page.getByRole('button', { name: 'Tìm', exact: true }).click();
        await expect(page.getByText('Tìm thấy 0 chuyến bay thỏa tiêu chí.')).toBeVisible();
        await expect(page.getByText('Không tìm thấy chuyến bay', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Xuất Excel' })).toBeDisabled();
      } finally {
        await dangNhap(page, 'quanLy', '/');
        await xoaChuyenBayThu(page, cb1.maChuyenBay, cb2.maChuyenBay);
      }
    });
  });

  test.describe('4.4 Nhập lịch từ Excel', () => {
    test('UC03.42 Chọn tập tin không phải Excel (.txt, .pdf, ảnh) thì báo sai định dạng, không thêm gì (TT01)', async ({ page }) => {
      const hop = await moHopNhapExcel(page);
      let soLanGui = 0;
      page.on('request', (yc) => {
        if (yc.url().includes('/api/chuyen-bay/nhap-excel')) soLanGui += 1;
      });
      const anhPng = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA63F8FFFF3F0005FE02FEA7D6A4E10000000049454E44AE426082', 'hex');
      const cacTapTin: [string, Buffer | string][] = [
        ['lich_bay.txt', `${maMoi('KT')}\t1350000\tHAN\tPQC\n`],
        ['lich_bay.pdf', '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n'],
        ['lich_bay.png', anhPng],
      ];
      for (const [ten, noiDung] of cacTapTin) {
        await hop.locator('input[type="file"]').setInputFiles(await ghiTapTinThu(ten, noiDung));
        await expect(hop.getByRole('alert')).toContainText(`Tập tin ${ten} không đúng định dạng`);
        await expect(hop.getByText('sẵn sàng nhập')).toHaveCount(0);
        await expect(hop.getByRole('button', { name: 'Nhập lịch chuyến bay' })).toBeDisabled();
      }
      expect(soLanGui, 'không gửi tập tin nào lên máy chủ').toBe(0);
    });

    test('UC03.43 Excel thiếu cột, sai tên trang hoặc trống thì báo sai mẫu, không thêm gì (TT01)', async ({ page }) => {
      const maThieuCot = maMoi('KT');
      const maSaiTrang = maMoi('KT');
      const hop = await moHopNhapExcel(page);
      const loi = hop.getByRole('alert');

      await nhapTapTin(hop, await ghiExcelThu('thieu_cot.xlsx', [{ ten: 'ChuyenBay', dong: [COT_CB.slice(0, 5), dongCB(maThieuCot).slice(0, 5)] }]));
      await expect(loi).toContainText('thiếu cột');

      await nhapTapTin(hop, await ghiExcelThu('sai_ten_trang.xlsx', [{ ten: 'Sheet1', dong: [COT_CB, dongCB(maSaiTrang)] }]));
      await expect(loi).toContainText('không có trang tính ChuyenBay');

      await nhapTapTin(hop, await ghiExcelThu('trang_rong.xlsx', [{ ten: 'ChuyenBay', dong: [] }]));
      await expect(loi).toBeVisible();
      await expect(hop.getByRole('status')).toHaveCount(0);

      // tập tin mẫu chưa điền dòng nào
      await nhapTapTin(hop, await ghiExcelThu('chi_tieu_de.xlsx', [{ ten: 'ChuyenBay', dong: [COT_CB] }, { ten: 'TrungGian', dong: [COT_TG] }]));
      await expect(loi.or(hop.getByRole('status'))).toBeVisible();
      await expect.soft(loi, 'tập tin không có dòng dữ liệu phải được báo').toBeVisible();
      await expect.soft(hop.getByText('Mọi dòng trong tập tin đều hợp lệ và đã được lưu.'), 'không báo nhập thành công khi tập tin trống').toHaveCount(0);

      expect(await trangThaiChuyenBay(page, maThieuCot)).toBe(404);
      expect(await trangThaiChuyenBay(page, maSaiTrang)).toBe(404);
      await xemCsdl(page, 'tập tin sai mẫu không thêm chuyến bay nào',
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maThieuCot, soDong: 0 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maSaiTrang, soDong: 0 });
    });

    test('UC03.44 Hai dòng trùng mã trong tập tin và mã trùng chuyến đã có thì báo lỗi dòng trùng, các dòng khác vẫn vào (BM1)', async ({ page }) => {
      const api = await ApiThu.moi();
      const daCo = await api.themChuyenBay({ giaVe: 1_000_000 });
      await api.dong();
      const maA = maMoi('KT');
      const maC = maMoi('KT');
      const hop = await moHopNhapExcel(page);
      await nhapTapTin(hop, await ghiExcelThu('trung_ma.xlsx', [
        { ten: 'ChuyenBay', dong: [COT_CB, dongCB(maA), dongCB(maA, { den: 'DAD' }), dongCB(daCo.maChuyenBay), dongCB(maC)] },
        { ten: 'TrungGian', dong: [COT_TG] },
      ]));
      const ketQua = hop.getByRole('status');
      await expect(ketQua.getByLabel('2 chuyến', { exact: true })).toBeVisible();
      await expect(ketQua.getByLabel('2 dòng', { exact: true })).toBeVisible();
      const dongLoi = await docDongLoi(hop);
      expect(dongLoi.map((d) => d[0])).toEqual([3, 4]);
      for (const [, lyDo] of dongLoi) expect(lyDo).toContain('Mã chuyến bay đã tồn tại');

      const ctA = await (await page.request.get(`/api/chuyen-bay/${maA}`)).json();
      expect(ctA.maSanBayDen, 'dòng đầu của mã trùng được giữ').toBe('PQC');
      expect(await trangThaiChuyenBay(page, maC)).toBe(200);
      const ctDaCo = await (await page.request.get(`/api/chuyen-bay/${daCo.maChuyenBay}`)).json();
      expect(ctDaCo.giaVe, 'chuyến bay đã có không bị ghi đè').toBe(1_000_000);
      await xemCsdl(page, 'mã trùng không tạo bản sao, các dòng khác được thêm',
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maA, soDong: 1, dung: { MaSanBayDen: 'PQC' } },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maC, soDong: 1 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: daCo.maChuyenBay, soDong: 1, dung: { GiaVe: 1000000 } });
    });

    test('UC03.45 Sân bay không tồn tại, ngày sai dạng, giá vé bằng chữ thì báo lỗi đúng dòng, đúng cột (TT01, giả định 12)', async ({ page }) => {
      const maSanBay = maMoi('KT');
      const maNgay = maMoi('KT');
      const maGia = maMoi('KT');
      const maDung = maMoi('KT');
      const hop = await moHopNhapExcel(page);
      await nhapTapTin(hop, await ghiExcelThu('sai_o.xlsx', [
        {
          ten: 'ChuyenBay',
          dong: [
            COT_CB,
            dongCB(maSanBay, { di: 'XQZ' }),
            dongCB(maNgay, { ngayGio: '32/13/2027 08:00' }),
            dongCB(maGia, { giaVe: 'một triệu' }),
            dongCB(maDung),
          ],
        },
        { ten: 'TrungGian', dong: [COT_TG] },
      ]));
      const ketQua = hop.getByRole('status');
      await expect(ketQua.getByLabel('1 chuyến', { exact: true })).toBeVisible();
      const dongLoi = new Map(await docDongLoi(hop));
      expect([...dongLoi.keys()]).toEqual([2, 3, 4]);
      expect(dongLoi.get(2)).toContain('Sân bay đi không có trong danh sách sân bay');
      expect(dongLoi.get(3)).toContain('Ngày giờ khởi hành');
      expect(dongLoi.get(4)).toContain('Giá vé');
      // mỗi dòng chỉ báo đúng cột sai của dòng đó
      expect(dongLoi.get(2)).not.toMatch(/Giá vé|Ngày giờ/);
      expect(dongLoi.get(3)).not.toMatch(/Giá vé|Sân bay/);
      expect(dongLoi.get(4)).not.toMatch(/Ngày giờ|Sân bay/);

      for (const ma of [maSanBay, maNgay, maGia]) expect(await trangThaiChuyenBay(page, ma)).toBe(404);
      expect(await trangThaiChuyenBay(page, maDung)).toBe(200);
      await xemCsdl(page, 'ba dòng sai không lưu, dòng đúng được thêm',
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maSanBay, soDong: 0 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maNgay, soDong: 0 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maGia, soDong: 0 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maDung, soDong: 1 });
    });

    test('UC03.46 Nhập lại đúng tập tin vừa nhập thành công thì mọi dòng báo trùng, không tạo bản sao (TT01)', async ({ page }) => {
      const maA = maMoi('KT');
      const maB = maMoi('KT');
      const tapTin = await ghiExcelThu('nhap_lai.xlsx', [
        { ten: 'ChuyenBay', dong: [COT_CB, dongCB(maA), dongCB(maB, { di: 'SGN', den: 'DAD' })] },
        { ten: 'TrungGian', dong: [COT_TG, [maA, 1, 'DAD', 15, 'Đón khách']] },
      ]);
      const hop = await moHopNhapExcel(page);
      await nhapTapTin(hop, tapTin);
      const ketQua = hop.getByRole('status');
      await expect(ketQua.getByLabel('2 chuyến', { exact: true })).toBeVisible();
      await expect(hop.getByText('Mọi dòng trong tập tin đều hợp lệ và đã được lưu.')).toBeVisible();

      await hop.getByRole('button', { name: 'Nhập tập tin khác' }).click();
      await nhapTapTin(hop, tapTin);
      await expect(ketQua.getByLabel('0 chuyến', { exact: true })).toBeVisible();
      await expect(ketQua.getByLabel('2 dòng', { exact: true })).toBeVisible();
      const dongLoi = await docDongLoi(hop);
      expect(dongLoi.map((d) => d[0])).toEqual([2, 3]);
      for (const [, lyDo] of dongLoi) expect(lyDo).toContain('Mã chuyến bay đã tồn tại');
      await xemCsdl(page, 'nhập lại không tạo bản sao',
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maA, soDong: 1 },
        { bang: 'CHUYENBAY', cot: 'MaChuyenBay', giaTri: maB, soDong: 1 },
        { bang: 'CHITIETSANBAYTRUNGGIAN', cot: 'MaChuyenBay', giaTri: maA, soDong: 1, dung: { MaSanBay: 'DAD' } });
    });
  });

  test('UC03.48 Bảng chuyến bay nhiều trang: 11 dòng thì có trang 2, dòng đầu và cuối đúng chỗ, tra cứu lại thì về trang 1; đúng 10 dòng thì một trang (CH-01, NV04)', async ({ page }) => {
    const api = await ApiThu.moi();
    // 5 chữ ngẫu nhiên làm phần chung của 11 mã để ô Mã chuyến bay (lọc theo chứa) chỉ ra đúng các chuyến này
    const goc = 'P' + Array.from({ length: 5 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    const cacMa = Array.from({ length: 11 }, (_, i) => `${goc}${String(i + 1).padStart(2, '0')}`);
    try {
      // khởi hành cách nhau một ngày nên thứ tự theo giờ khởi hành trùng thứ tự mã
      for (const [i, ma] of cacMa.entries()) await api.themChuyenBay({ maChuyenBay: ma, lechNgay: 10 + i });
      await dangNhap(page, 'nhanVien', '/chuyen-bay');
      const dongDuLieu = page.getByRole('table', { name: 'Danh sách chuyến bay' }).locator('tbody tr');
      const phanTrang = page.getByRole('navigation', { name: 'Phân trang' });
      const tim = page.getByRole('button', { name: 'Tìm', exact: true });

      await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(goc);
      await tim.click();
      await expect(page.getByText(/Hiển thị\s*1\s*đến\s*10\s*trong\s*11\s*chuyến bay/)).toBeVisible();
      await expect(dongDuLieu).toHaveCount(10);
      await expect(dongDuLieu.first()).toContainText(cacMa[0]);
      await expect(dongDuLieu.last()).toContainText(cacMa[9]);
      await expect(phanTrang.getByRole('button', { name: 'Trang trước' })).toBeDisabled();

      await phanTrang.getByRole('button', { name: 'Trang sau' }).click();
      await expect(page.getByText(/Hiển thị\s*11\s*đến\s*11\s*trong\s*11\s*chuyến bay/)).toBeVisible();
      await expect(dongDuLieu).toHaveCount(1);
      await expect(dongDuLieu.first()).toContainText(cacMa[10]);
      await expect(phanTrang.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(phanTrang.getByRole('button', { name: 'Trang sau' })).toBeDisabled();

      // đang ở trang 2 mà bấm Tìm lại thì kết quả mới hiện từ trang 1
      await tim.click();
      await expect(phanTrang.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(dongDuLieu.first()).toContainText(cacMa[0]);

      // lọc tới ngày khởi hành của chuyến thứ 10: đúng 10 dòng thì không còn phân trang
      await nhapNgay(page, 'Đến ngày', mocVN(19).vn);
      await tim.click();
      await expect(page.getByText(/Hiển thị\s*1\s*đến\s*10\s*trong\s*10\s*chuyến bay/)).toBeVisible();
      await expect(dongDuLieu).toHaveCount(10);
      await expect(dongDuLieu.last()).toContainText(cacMa[9]);
      await expect(phanTrang).toHaveCount(0);
    } finally {
      for (const ma of cacMa) await api.xoaChuyenBayNeuCo(ma);
      await api.dong();
    }
  });

  test('UC03.49 Nút chọn nhanh 7 ngày tới điền sẵn hai ô ngày và tìm ngay trong một thao tác; sau đó vẫn sửa tay được ô Đến ngày (TD04)', async ({ page }) => {
    const api = await ApiThu.moi();
    const goc = 'Q' + Array.from({ length: 5 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    const [gan, xa] = [`${goc}01`, `${goc}02`];
    try {
      await api.themChuyenBay({ maChuyenBay: gan, lechNgay: 2 });
      await api.themChuyenBay({ maChuyenBay: xa, lechNgay: 9 });
      await dangNhap(page, 'nhanVien', '/chuyen-bay');
      const bang = page.getByRole('table', { name: 'Danh sách chuyến bay' });
      await page.getByRole('textbox', { name: 'Mã chuyến bay' }).fill(goc);

      await page.getByRole('group', { name: 'Chọn nhanh khoảng ngày' }).getByRole('button', { name: '7 ngày tới' }).click();
      await expect(page.getByText('Tìm thấy 1 chuyến bay thỏa tiêu chí.')).toBeVisible();
      await expect(bang).toContainText(gan);
      await expect(bang).not.toContainText(xa);
      await expect(page.getByLabel('Từ ngày').first()).toHaveValue(mocVN(0).vn);
      await expect(page.getByLabel('Đến ngày').first()).toHaveValue(mocVN(6).vn);

      // khoảng tự chọn vẫn dùng được như cũ
      await nhapNgay(page, 'Đến ngày', mocVN(10).vn);
      await page.getByRole('button', { name: 'Tìm', exact: true }).click();
      await expect(page.getByText('Tìm thấy 2 chuyến bay thỏa tiêu chí.')).toBeVisible();
    } finally {
      for (const ma of [gan, xa]) await api.xoaChuyenBayNeuCo(ma);
      await api.dong();
    }
  });

  test('UC03.50 Nhấn Ctrl+S lưu biểu mẫu thêm chuyến bay hợp lệ thành công (UC03)', async ({ page }) => {
    const api = await ApiThu.moi();
    const ma = maMoi('CS');
    const ngayGio = mocVN(15, 9, 0);
    try {
      await dangNhap(page, 'quanLy', '/chuyen-bay/them');
      await dienBieuMau(page, { ma, ngayGio: ngayGio.vnGio });

      const choLuu = page.waitForResponse((ph) =>
        new URL(ph.url()).pathname === '/api/chuyen-bay' && ph.request().method() === 'POST',
      );
      await page.keyboard.press('Control+s');
      expect((await choLuu).ok()).toBeTruthy();
      await expect(toast(page, `Thêm chuyến bay ${ma} thành công.`)).toBeVisible();
      await expect(page).toHaveURL(/\/chuyen-bay$/);

      const daLuu = await page.request.get(`/api/chuyen-bay/${ma}`);
      expect(daLuu.status()).toBe(200);
      expect(await daLuu.json()).toMatchObject({
        maChuyenBay: ma, giaVe: 1_500_000, maSanBayDi: 'SGN', maSanBayDen: 'HAN',
        ngayGioKhoiHanh: ngayGio.isoGio, thoiGianBay: 130,
        gheTheoHang: expect.arrayContaining([
          expect.objectContaining({ maHangVe: 'H1', soLuongGhe: 10 }),
          expect.objectContaining({ maHangVe: 'H2', soLuongGhe: 60 }),
        ]),
      });
    } finally {
      try {
        await api.xoaChuyenBayNeuCo(ma);
      } finally {
        await api.dong();
      }
    }
    expect(await trangThaiChuyenBay(page, ma)).toBe(404);
  });
});
