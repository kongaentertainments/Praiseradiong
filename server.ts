import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function startServer() {
  const app = express();
  app.use(express.json());
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const { amount } = req.body;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Donation to PraiseRadioNG",
                description: "Thank you for supporting our ministry!",
              },
              unit_amount: amount * 100, // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}?donation=success`,
        cancel_url: `${appUrl}?donation=cancel`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Track listeners per station
  // Map<stationId, Set<WebSocket>>
  const stationListeners = new Map<string, Set<WebSocket>>();

  // Track metadata per station
  const stationMetadata = new Map<string, any>();

  // Poll for metadata for the main station
  const pollMetadata = async () => {
    const stationId = "praiseradio-live";
    const mountId = "9xwv2tuzoqsuv"; // From the URL
    
    try {
      // Zeno FM metadata endpoint
      const response = await fetch(`https://api.zeno.fm/mounts/metadata/subscribe/${mountId}`);
      if (response.ok) {
        // This is actually an SSE endpoint, but we can try to get the first chunk or use a simpler one if it exists
        // Let's try to find a simpler one or just use a timeout fetch
        // Actually, Zeno FM has a public page we can scrape or a better API
        // Let's try this one: https://api.zeno.fm/mounts/metadata/subscribe/9xwv2tuzoqsuv
        // For now, let's use a mock or a simpler fetch if possible
        // Actually, let's try to fetch it and see what we get
        const text = await response.text();
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
    } catch (e) {
      console.error("Metadata fetch error:", e);
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

  wss.on("connection", (ws) => {
    let currentStationId: string | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
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
      } catch (e) {
        console.error("WS error:", e);
      }
    });

    ws.on("close", () => {
      if (currentStationId && stationListeners.has(currentStationId)) {
        stationListeners.get(currentStationId)?.delete(ws);
        broadcastCount(currentStationId);
      }
    });

    function broadcastCount(stationId: string) {
      const count = stationListeners.get(stationId)?.size || 0;
      const payload = JSON.stringify({ type: "count", stationId, count });
      
      // Broadcast to all clients interested in this station
      // For simplicity, we can broadcast to everyone or just those in the "room"
      // Let's broadcast to everyone so they see updates in the list too if we wanted
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
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
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
