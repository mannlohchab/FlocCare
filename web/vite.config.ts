import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0 + :: so localhost works on IPv4/IPv6
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      // Must not use "/s" alone — that also matches "/src/*" and breaks the app
      "^/s(?:/|$)": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
