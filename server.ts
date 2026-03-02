import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Track listeners per station
  // Map<stationId, Set<WebSocket>>
  const stationListeners = new Map<string, Set<WebSocket>>();

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
