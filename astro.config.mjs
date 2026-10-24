import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://verver-vadya.github.io',
  base: process.env.GITHUB_PAGES === 'true' ? '/site-pelagos' : '/',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [react()],
  vite: { build: { chunkSizeWarningLimit: 900 } },
});
