import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    const apiBaseUrl = loadEnv(mode, process.cwd(), '').VITE_API_BASE_URL?.trim();
    if (!apiBaseUrl) {
      throw new Error('VITE_API_BASE_URL is required to build the production frontend.');
    }

    let apiUrl: URL;
    try {
      apiUrl = new URL(apiBaseUrl);
    } catch {
      throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL for production builds.');
    }
    if (!['http:', 'https:'].includes(apiUrl.protocol)
      || ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname)
      || apiUrl.hostname.endsWith('.localhost')) {
      throw new Error('VITE_API_BASE_URL must use a non-local HTTP(S) URL for production builds.');
    }
  }

  return {
    plugins: [react(), tailwindcss()],
  };
});
