// Cấu hình bộ kiểm thử giao diện đầu cuối (Playwright).
// Máy chủ phải đang chạy và phục vụ giao diện đã dựng (npm run dung-may-chu), cơ sở dữ liệu vừa nạp dữ liệu mẫu.
// Địa chỉ máy chủ lấy từ biến môi trường DIA_CHI, mặc định http://localhost:5080.
import { defineConfig, devices } from '@playwright/test';

const DIA_CHI = process.env.DIA_CHI ?? 'http://localhost:5080';

export default defineConfig({
  testDir: './kiem_thu_e2e',
  outputDir: 'test-results',
  // các ca dùng chung một cơ sở dữ liệu và có ca đổi tham số quy định nên chạy tuần tự
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: DIA_CHI,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
});
