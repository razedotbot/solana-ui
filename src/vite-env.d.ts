/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
    readonly SSR: boolean;
    // Add more env variables as needed
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export { }
