import type { Plugin } from "vite";

/** Opt-in loopback development uses the exact bounded Preview assistant handler. */
export function localPreviewAssistant(): Plugin {
  return {
    name: "kipp-local-preview-assistant",
    apply: "serve",
    configureServer(server) {
      // Only this local dev process is affected; no hosted/IAM settings change.
      process.env.VERCEL_ENV = "preview";
      process.env.VERCEL_URL = "local-preview.vercel.app";
      process.env.VERCEL_BRANCH_URL = "local-preview.vercel.app";
      server.middlewares.use("/api/assistant", async (request, response) => {
        const port = server.config.server.port;
        const origins = [
          `http://127.0.0.1:${port}`,
          `http://localhost:${port}`,
        ];
        if (
          typeof request.headers.origin !== "string" ||
          !origins.includes(request.headers.origin)
        ) {
          response.statusCode = 403;
          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              error: {
                code: "ORIGIN_NOT_ALLOWED",
                message: "Use the local application to ask KIPP.",
              },
            }),
          );
          return;
        }
        // Normalize only after validating the actual browser Origin. Reuse the
        // production-tested bounds, interface guide and fixed public destination.
        request.headers.origin = "https://local-preview.vercel.app";
        request.headers["x-real-ip"] = request.socket.remoteAddress;
        try {
          const { default: handler } =
            await server.ssrLoadModule("/api/assistant.ts");
          await handler(request, response);
        } catch {
          if (!response.headersSent) {
            response.statusCode = 503;
            response.setHeader("Content-Type", "application/json");
          }
          response.end(
            JSON.stringify({
              error: {
                code: "LOCAL_ASSISTANT_UNAVAILABLE",
                message:
                  "KIPP could not complete this request. Please try again.",
              },
            }),
          );
        }
      });
    },
  };
}
