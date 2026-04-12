import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer as createViteServer } from "vite";
import { collectDay, todayInSaoPaulo } from "./whu-collector";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function setupVite(app: express.Express, server: import("http").Server) {
  const vite = await createViteServer({
    configFile: path.join(projectRoot, "vite.config.ts"),
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
    root: path.join(projectRoot, "client"),
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.join(projectRoot, "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

function serveStatic(app: express.Express) {
  const distPath = path.join(projectRoot, "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(`Build não encontrado: ${distPath}. Rode npm run build antes do start.`);
  }
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "access-token"],
    })
  );
  app.use(express.json({ limit: "10mb" }));

  let collectorRunning = false;
  let collectorStartedAt: number | null = null;
  let lastCollectorResult: unknown = null;
  let lastCollectorTime: string | null = null;
  const COLLECTOR_TIMEOUT_MS = 30 * 60 * 1000;

  function isCollectorStuck(): boolean {
    if (!collectorRunning || !collectorStartedAt) return false;
    return Date.now() - collectorStartedAt > COLLECTOR_TIMEOUT_MS;
  }

  const secretOk = (bodySecret: unknown) =>
    bodySecret === (process.env.COLLECTOR_SECRET || "change-me-in-production");

  app.post("/api/collect", (req, res) => {
    const { date, secret } = (req.body || {}) as { date?: string; secret?: string };
    if (!secretOk(secret)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (collectorRunning && isCollectorStuck()) {
      console.log("[Collector] Auto-reset: timeout 30min");
      collectorRunning = false;
      collectorStartedAt = null;
      lastCollectorResult = { error: "Coleta anterior expirou e foi resetada." };
      lastCollectorTime = new Date().toISOString();
    }

    if (collectorRunning) {
      const runningFor = collectorStartedAt
        ? Math.round((Date.now() - collectorStartedAt) / 1000 / 60)
        : 0;
      return res.json({
        status: "already_running",
        message: `Coleta em andamento há ${runningFor} min. Aguarde.`,
      });
    }

    const targetDate = date || todayInSaoPaulo();
    collectorRunning = true;
    collectorStartedAt = Date.now();
    res.json({
      status: "started",
      message: `Coleta iniciada para ${targetDate}. Veja GET /api/collect/status.`,
    });

    collectDay(targetDate)
      .then((result) => {
        lastCollectorResult = result;
        lastCollectorTime = new Date().toISOString();
        console.log("[Collector] OK", result);
      })
      .catch((err: Error) => {
        lastCollectorResult = { error: err.message };
        lastCollectorTime = new Date().toISOString();
        console.error("[Collector] Erro:", err);
      })
      .finally(() => {
        collectorRunning = false;
        collectorStartedAt = null;
      });
  });

  app.post("/api/collect/reset", (req, res) => {
    const { secret } = (req.body || {}) as { secret?: string };
    if (!secretOk(secret)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const wasRunning = collectorRunning;
    collectorRunning = false;
    collectorStartedAt = null;
    lastCollectorResult = { reset: true, message: "Flag resetada." };
    lastCollectorTime = new Date().toISOString();
    res.json({ status: "reset", wasRunning });
  });

  app.get("/api/collect/status", (_req, res) => {
    const runningFor =
      collectorRunning && collectorStartedAt
        ? Math.round((Date.now() - collectorStartedAt) / 1000 / 60)
        : null;
    res.json({
      status: "ok",
      collectorRunning,
      runningForMinutes: runningFor,
      lastRun: lastCollectorTime,
      lastResult: lastCollectorResult,
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "whu-dashboard" });
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Porta ${preferredPort} ocupada, usando ${port}`);
  }

  server.listen(port, () => {
    console.log(`WHU Dashboard: http://localhost:${port}/`);
  });
}

startServer().catch((e) => {
  console.error(e);
  process.exit(1);
});
