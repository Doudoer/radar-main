import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/radar/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/order_attachments': 'http://localhost:3001',
      '/payment_receipts': 'http://localhost:3001',
      '/delivery_proofs': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
      '/radar/order_attachments': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/radar/, '')
      },
      '/radar/payment_receipts': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/radar/, '')
      },
      '/radar/delivery_proofs': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/radar/, '')
      }
    }
  }
});

