/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' để chạy với máy chủ giả lập trong trình duyệt */
  readonly VITE_GIA_LAP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
