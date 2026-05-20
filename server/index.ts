import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { polishCopyWithGemini } from "./gemini";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory rate limiting for F2 safety requirements
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "64kb" }));

  app.post("/api/polish-copy", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    
    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      clientData.count++;
    }
    rateLimitMap.set(ip, clientData);

    if (clientData.count > RATE_LIMIT_MAX_REQUESTS) {
      res.status(429).json({ error: "請求次數過多，請稍後再試" });
      return;
    }

    try {
      const result = await polishCopyWithGemini(req.body);
      res.status(result.status).json(result.body);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "伺服器錯誤" });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
