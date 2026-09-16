import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function preserveChatPageRoutes(): Plugin {
  return {
    name: "kairos-chat-page-routes",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.method === "GET" && request.url?.startsWith("/chat")) {
          request.url = "/";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [preserveChatPageRoutes(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  server: {
    proxy: {
      "/chat": "http://127.0.0.1:8000",
      "/v1": "http://127.0.0.1:8765",
      "/health": "http://127.0.0.1:8765",
    },
  },
});
