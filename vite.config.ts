import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';
  const isHttps = Boolean(process.env.APP_URL && process.env.APP_URL.startsWith('https://'));

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      strictPort: true,
      allowedHosts: true as const,
      cors: true,
      hmr: isHmrDisabled
        ? false
        : {
            protocol: isHttps ? 'wss' : undefined,
            clientPort: isHttps ? 443 : undefined,
            port: isHttps ? 443 : undefined,
          },
      ws: isHmrDisabled
        ? (false as const)
        : {
            protocol: isHttps ? 'wss' : undefined,
            clientPort: isHttps ? 443 : undefined,
            port: isHttps ? 443 : undefined,
          },
      watch: isHmrDisabled ? null : {},
    },
  };
});
