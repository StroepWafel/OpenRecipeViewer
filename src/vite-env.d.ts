/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIBRARY_OWNER: string;
  readonly VITE_LIBRARY_REPO: string;
  readonly VITE_LIBRARY_REF: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_BASE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
