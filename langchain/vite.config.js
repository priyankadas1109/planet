import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [
      {
        name: 'handle-html',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/' || req.url === '/index.html') {
              req.url = '/layout.html';
            }
            next();
          });
        },
        transformIndexHtml(html, { filename }) {
          if (isDev && path.basename(filename) === 'index.html') {
            return fs.readFileSync('./layout.html', 'utf-8');
          }
          return html;
        },
      },
      {
        name: 'rename-html',
        apply: 'build',
        writeBundle() {
          const oldPath = path.resolve(__dirname, 'trade/layout.html');
          const newPath = path.resolve(__dirname, 'trade/index.html');

          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
          }
        },
      },
    ],
    base: '',
    build: {
      outDir: 'trade',
      rollupOptions: {
        input: {
          app: path.resolve(__dirname, 'layout.html'),
          widget: path.resolve(__dirname, 'src/main.js'),
        },
        output: {
          assetFileNames: 'assets/[name].[ext]',
          chunkFileNames: 'assets/[name].js',
          entryFileNames: 'assets/[name].js',
        },
      },
    },
  };
});
