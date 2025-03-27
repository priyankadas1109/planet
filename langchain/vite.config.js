import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext',
    outDir: "dist", // Output folder for static files
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false
      }
    },
  },
  optimizeDeps: {
    include: ["@langchain/openai", "@langchain/core/prompts", "@pinecone-database/pinecone"],
  },
})

