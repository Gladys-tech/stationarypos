// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true, // Allow external connections
//     port: 3000,
//     strictPort: false,
//   },
//   preview: {
//     host: true, // Allow external connections
//     port: 4173,
//     strictPort: false,
//   },
//   optimizeDeps: {
//     exclude: ['lucide-react'],
//   },
//   build: {
//     outDir: 'dist',
//     assetsDir: 'assets',
//     sourcemap: false,
//     minify: 'terser',
//     rollupOptions: {
//       output: {
//         manualChunks: {
//           vendor: ['react', 'react-dom'],
//           supabase: ['@supabase/supabase-js'],
//           utils: ['lucide-react', 'jspdf', 'xlsx']
//         }
//       }
//     }
//   }
// });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external connections
    port: 3000,
    strictPort: false,
  },
  preview: {
    host: true, // Allow external connections
    port: 4173,
    strictPort: false,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          utils: ['lucide-react', 'jspdf', 'xlsx']
        }
      }
    }
  }
});

