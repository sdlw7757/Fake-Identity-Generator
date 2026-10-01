import { defineConfig } from 'vite';

// GitHub Pages 项目站点默认部署在 https://<user>.github.io/<repo>/
// 本地开发与自定义域名下使用相对路径即可，这里统一用 './' 保证任何子路径都能正常加载资源。
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    open: false,
  },
});
