import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Get the worker URL from environment or use a default
  const WORKER_URL = process.env.WORKER_URL || 'https://threads-downloader-api.workers.dev';

  // API Route for Threads Downloader (Proxying to the worker)
  app.get("/api/fetch-media", async (req, res) => {
    const threadUrl = req.query.url as string;
    if (!threadUrl) return res.status(400).json({ success: false, error: "URL is required" });

    try {
      const workerUrl = `${WORKER_URL}/?url=${encodeURIComponent(threadUrl)}`;
      const workerResponse = await axios.get(workerUrl, { timeout: 10000 });
      return res.json(workerResponse.data);
    } catch (error: any) {
      console.error("Worker Error:", error.message);
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ success: false, error: "Request to media worker timed out." });
      }
      return res.status(500).json({ success: false, error: "Failed to fetch media from worker: " + error.message });
    }
  });

  // API Route to proxy media for preview (bypassing hotlinking protections)
  app.get("/api/proxy", async (req, res) => {
    const mediaUrl = req.query.url as string;
    if (!mediaUrl) return res.status(400).send("URL is required");

    try {
      const response = await axios({
        method: 'get',
        url: mediaUrl,
        responseType: 'stream',
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.threads.net/',
          'Origin': 'https://www.threads.net'
        }
      });

      const contentType = response.headers['content-type'];
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      response.data.pipe(res);
      
      response.data.on('error', (err: any) => {
        console.error("Stream Error (Proxy):", err.message);
        if (!res.headersSent) res.status(500).send("Stream error");
      });
    } catch (error: any) {
      console.error("Proxy Error for URL:", mediaUrl, error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Headers:", error.response.headers);
      }
      res.status(500).send("Failed to proxy media: " + error.message);
    }
  });

  // API Route to force download by proxying the media file
  app.get("/api/download", async (req, res) => {
    const mediaUrl = req.query.url as string;
    const type = req.query.type as string;

    if (!mediaUrl) return res.status(400).send("URL is required");

    try {
      const response = await axios({
        method: 'get',
        url: mediaUrl,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.threads.net/',
          'Origin': 'https://www.threads.net'
        }
      });

      const extension = type === 'video' ? 'mp4' : 'jpg';
      const contentType = response.headers['content-type'] || (type === 'video' ? 'video/mp4' : 'image/jpeg');
      
      res.setHeader('Content-Disposition', `attachment; filename="threads_media_${Date.now()}.${extension}"`);
      res.setHeader('Content-Type', contentType);
      
      response.data.pipe(res);

      response.data.on('error', (err: any) => {
        console.error("Stream Error (Download):", err.message);
        if (!res.headersSent) res.status(500).send("Stream error during download");
      });
    } catch (error: any) {
      console.error("Download Error:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
      }
      res.status(500).send("Failed to download file: " + error.message);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
