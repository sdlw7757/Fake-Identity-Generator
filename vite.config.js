import { defineConfig } from 'vite';

// GitHub Pages 项目站点默认部署在 https://<user>.github.io/<repo>/
// 本地开发与自定义域名下使用相对路径即可，这里统一用 './' 保证任何子路径都能正常加载资源。
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsDir: 'assets',
    // 63 个国家的姓名 / 城市素材库体积较大（压缩前约 1.2 MB），
    // 这里把它单独拆成一个 chunk：
    //   1. 应用代码更新时，庞大的素材库 chunk 仍可命中浏览器缓存
    //   2. 两个 chunk 并行下载，解析更快
    // 因此把体积告警阈值相应调高，避免 CI 每次构建都刷警告。
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data')) return 'country-data';
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
