import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import fs from "fs/promises";

async function startServer() {
  console.log(`[SERVER] Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  const app = express();
  app.use(express.json());
  const server = createServer(app);
  const wss = new WebSocketServer({ 
    noServer: true, // We will handle the upgrade manually
    perMessageDeflate: false 
  });
  const PORT = 3000;

  // Log all upgrade requests
  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const pathname = url.pathname;
      console.log(`[WS-UPGRADE] Request for ${pathname} from ${request.socket.remoteAddress}`);
      
      if (pathname === '/ws') {
        console.log(`[WS-UPGRADE] Handling /ws upgrade`);
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        // Let other upgrades (like Vite) pass through
        console.log(`[WS-UPGRADE] Passing through: ${pathname}`);
      }
    } catch (err) {
      console.error('[WS-UPGRADE] Error during upgrade:', err);
      socket.destroy();
    }
  });

  // Config Status Check
  app.get("/api/config-status", (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    res.json({
      stripeConfigured: !!stripeKey,
      stripeKeyValid: stripeKey ? (stripeKey.startsWith('sk_test_') || stripeKey.startsWith('sk_live_')) : false,
      adminConfigured: !!process.env.ADMIN_PASSWORD
    });
  });

  // Content API
  app.get("/api/content", async (req, res) => {
    try {
      const data = await fs.readFile(path.join(process.cwd(), "data.json"), "utf-8");
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ error: "Failed to load content" });
    }
  });

  // Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ error: "Admin password not configured in environment variables." });
    }

    if (password === adminPassword) {
      // In a real app, we'd use a JWT or session. For this demo, we'll just return a success.
      res.json({ success: true, token: "demo-admin-token" });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  // Update Content (Admin Only)
  app.post("/api/admin/update-content", async (req, res) => {
    const { token, content } = req.body;
    
    // Simple token check for demo
    if (token !== "demo-admin-token") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      await fs.writeFile(path.join(process.cwd(), "data.json"), JSON.stringify(content, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save content" });
    }
  });

  // WebSocket URL endpoint
  app.get("/api/ws-url", (req, res) => {
    // Use APP_URL if available, otherwise fallback to request host
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const wsUrl = appUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
    res.json({ url: wsUrl });
  });

  // Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      console.error("Stripe Error: STRIPE_SECRET_KEY is missing from environment variables.");
      return res.status(500).json({ 
        error: "Stripe is not configured. Please add a valid STRIPE_SECRET_KEY (starting with sk_test_ or sk_live_) to your environment variables in the AI Studio settings." 
      });
    }

    const stripeInstance = new Stripe(stripeKey);
    const { amount } = req.body;
    // Use APP_URL if available, otherwise fallback to origin or host
    const appUrl = process.env.APP_URL || req.headers.origin || `https://${req.headers.host}`;

    try {
      console.log(`[STRIPE] Initiating session creation. Amount: ${amount}, AppURL: ${appUrl}`);
      
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Donation to PraiseRadioNG",
                description: "Thank you for supporting our ministry!",
              },
              unit_amount: Math.round(amount * 100), // Amount in cents, must be integer
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl.replace(/\/$/, "")}/?donation=success`,
        cancel_url: `${appUrl.replace(/\/$/, "")}/?donation=cancel`,
      });

      console.log(`[STRIPE] Session created successfully. ID: ${session.id}, URL: ${session.url?.substring(0, 30)}...`);
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("[STRIPE] Error creating session:", error.message || error);
      
      let clientMessage = error.message;
      if (error.type === 'StripeAuthenticationError') {
        clientMessage = "Invalid Stripe API Key. Please ensure your STRIPE_SECRET_KEY starts with 'sk_test_' or 'sk_live_'.";
      }
      
      res.status(500).json({ error: clientMessage });
    }
  });

  // Track listeners per station
  // Map<stationId, Set<WebSocket>>
  const stationListeners = new Map<string, Set<WebSocket>>();

  // Track metadata per station
  const stationMetadata = new Map<string, any>();

  // Poll for metadata for the main station
  const pollMetadata = async () => {
    if (typeof fetch === 'undefined') {
      console.warn("[METADATA] fetch is not available in this Node.js version. Skipping metadata polling.");
      return;
    }
    
    const stationId = "praiseradio-live";
    const mountId = "9xwv2tuzoqsuv"; // From the URL
    
    try {
      // Use a timeout to avoid hanging on long-lived SSE streams
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://api.zeno.fm/mounts/metadata/subscribe/${mountId}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        // We only want to read a small part of the stream to see if there's metadata
        // Since it's an SSE stream, we can't just await response.text() if it's infinite
        const reader = response.body?.getReader();
        if (reader) {
          const { value } = await reader.read();
          const text = new TextDecoder().decode(value);
          reader.cancel(); // Stop reading immediately

          // SSE format: data: {"title": "Artist - Song", ...}
          const match = text.match(/data: (\{.*\})/);
          if (match) {
            const data = JSON.parse(match[1]);
            if (data.streamTitle) {
              const [artist, title] = data.streamTitle.split(" - ").map((s: string) => s.trim());
              const metadata = { artist: artist || "PraiseRadioNG", title: title || "Live Stream" };
              
              if (JSON.stringify(stationMetadata.get(stationId)) !== JSON.stringify(metadata)) {
                stationMetadata.set(stationId, metadata);
                broadcastMetadata(stationId, metadata);
              }
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("Metadata fetch error:", e.message || e);
      }
    }
  };

  // Run poll every 15 seconds
  setInterval(pollMetadata, 15000);
  pollMetadata();

  function broadcastMetadata(stationId: string, metadata: any) {
    const payload = JSON.stringify({ type: "metadata", stationId, metadata });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  wss.on("connection", (ws: any, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`New WebSocket connection from ${ip}`);
    
    let currentStationId: string | null = null;
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`WS message received: ${data.type} from ${ip}`);
        
        if (data.type === "join") {
          const { stationId } = data;
          
          // Leave previous station
          if (currentStationId && stationListeners.has(currentStationId)) {
            stationListeners.get(currentStationId)?.delete(ws);
            broadcastCount(currentStationId);
          }

          // Join new station
          currentStationId = stationId;
          if (!stationListeners.has(stationId)) {
            stationListeners.set(stationId, new Set());
          }
          stationListeners.get(stationId)?.add(ws);
          broadcastCount(stationId);

          // Send current metadata if available
          if (stationMetadata.has(stationId)) {
            ws.send(JSON.stringify({ 
              type: "metadata", 
              stationId, 
              metadata: stationMetadata.get(stationId) 
            }));
          }
        }
      } catch (e: any) {
        console.error("WS message error:", e.message || "Unknown error");
      }
    });

    ws.on("close", () => {
      if (currentStationId && stationListeners.has(currentStationId)) {
        stationListeners.get(currentStationId)?.delete(ws);
        broadcastCount(currentStationId);
      }
    });

    ws.on("error", (error: any) => {
      console.error("WS socket error:", error.message || "Unknown error");
    });

    function broadcastCount(stationId: string) {
      const count = stationListeners.get(stationId)?.size || 0;
      const payload = JSON.stringify({ type: "count", stationId, count });
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  console.log(`[SERVER] Environment: ${isProd ? 'Production' : 'Development'}`);

  if (!isProd) {
    try {
      console.log("[SERVER] Initializing Vite middleware...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[SERVER] Vite middleware initialized.");
    } catch (err) {
      console.error("[SERVER] Failed to create Vite server:", err);
    }
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    console.log(`[SERVER] Serving static files from: ${distPath}`);
    
    if (await fs.access(distPath).then(() => true).catch(() => false)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"), (err) => {
          if (err) {
            console.error("[SERVER] Error sending index.html:", err);
            res.status(500).send("Error loading application. Please ensure the build is complete.");
          }
        });
      });
    } else {
      console.error("[SERVER] dist directory not found! Static serving will fail.");
      app.get("*", (req, res) => {
        res.status(500).send("Application build not found. Please run build first.");
      });
    }
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
