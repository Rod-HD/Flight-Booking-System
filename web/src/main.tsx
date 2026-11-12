// Điểm vào: nạp kiểu chung, bộ truy vấn, phiên đăng nhập, định tuyến, nơi hiện hộp thoại và toast
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/styles/goc.css';
import { laLoiApi } from '@/api/may_khach';
import { NhaCungCapPhien } from '@/phien/NguCanhPhien';
import { NoiHienHopThoai } from '@/thanh_phan/HopThoai';
import { VungToast } from '@/thanh_phan/Toast';
import { App } from './App';

const boTruyVan = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      refetchOnWindowFocus: false,
      // lỗi nghiệp vụ, lỗi quyền thì không thử lại
      retry: (lan, loi) => !(laLoiApi(loi) && loi.trangThai >= 400 && loi.trangThai < 500) && lan < 2,
    },
  },
});

createRoot(document.getElementById('goc')!).render(
  <StrictMode>
    <QueryClientProvider client={boTruyVan}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NhaCungCapPhien>
          <App />
          <NoiHienHopThoai />
          <VungToast />
        </NhaCungCapPhien>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
