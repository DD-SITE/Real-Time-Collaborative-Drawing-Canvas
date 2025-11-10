import http from "http";
import { WebSocketServer, WebSocket } from "ws";


/*
  A Stroke represents one continuous drawing stroke on the canvas.
  It stores the tool, color, thickness, and all (x,y) points that form it.
*/
type Point = { x: number; y: number; t: number };
type Stroke = {
  id: string;
  userId: string;
  color: string;
  size: number;
  tool: string;
  points: Point[];
  tombstone?: boolean; // Used for undo (true = stroke is hidden)
};

/*
  Each user in a room has a display name + a chosen color.
  This is used for the avatar bar and cursor labels.
*/
type UserInfo = { username: string; color: string };

/*
  A Room contains:
  - strokes drawn on that board
  - active WebSocket connections (clients)
  - info about each user in the room
*/
type Room = {
  strokes: Stroke[];
  clients: Set<WebSocket>;
  users: Map<string, UserInfo>;
};

// Stores all rooms in memory (no database needed).
// Key = roomId, Value = Room data.
const rooms = new Map<string, Room>();

/*
  Returns the room object, and creates it if it does not yet exist.
  This allows rooms to be generated on demand simply by joining them.
*/
function getRoom(id: string): Room {
  if (!rooms.has(id)) {
    rooms.set(id, { strokes: [], clients: new Set(), users: new Map() });
  }
  return rooms.get(id)!;
}

/*
  Sends a message to every client *in the same room*.
  Optional "except" lets us skip sending to the sender.
*/
function broadcast(roomId: string, msg: any, except?: WebSocket) {
  const raw = JSON.stringify(msg);
  const room = getRoom(roomId);

  for (const ws of room.clients) {
    if (ws !== except && ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  }
}

/* -------------------------------------------------------------------
   HTTP SERVER (Only used for listing available board IDs in UI).
   This is NOT required for drawing or syncing.
------------------------------------------------------------------- */
const server = http.createServer((req, res) => {
  if (req.url === "/boards") {
    // Return list of keys (room IDs) currently stored
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify([...rooms.keys()]));
    return;
  }
});

/* -------------------------------------------------------------------
   WEBSOCKET SERVER (Handles real-time communication)
------------------------------------------------------------------- */
const wss = new WebSocketServer({ server, path: "/ws" });

// Use Render's assigned PORT (important for deployment)
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Bind to 0.0.0.0 so external clients can connect
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[WS] running on port ${PORT}`);
});


wss.on("connection", (ws: WebSocket, req) => {

  // Determine which board/room this user is joining:  /ws?room=ABC123
  const params = new URLSearchParams(req.url?.split("?")[1]);
  const roomId = params.get("room") || "default";
  const room = getRoom(roomId);

  // Add user to the room
  room.clients.add(ws);

  // Update online count for everyone in the room
  broadcast(roomId, { type: "presence", users: room.clients.size });

  ws.on("close", () => {
    room.clients.delete(ws);
    broadcast(roomId, { type: "presence", users: room.clients.size });
  });

  ws.on("message", (raw) => {
    let m: any = {};
    try {
      m = JSON.parse(raw.toString());
    } catch {}

    switch (m.type) {

      /* Send full board stroke history to a new client */
      case "get-snapshot":
        ws.send(JSON.stringify({ type: "snapshot", strokes: room.strokes }));
        break;

      /* A user started drawing a stroke */
      case "op-begin":
        room.strokes.push({ ...m, points: [] });
        broadcast(roomId, { type: "begin", stroke: { ...m, points: [] } }, ws);
        break;

      /* A user added points while drawing */
      case "op-points": {
        const s = room.strokes.find(st => st.id === m.id);
        if (s) s.points.push(...m.pts);
        broadcast(roomId, { type: "point", id: m.id, pts: m.pts }, ws);
        break;
      }

      /* A user finished their stroke */
      case "op-end":
        broadcast(roomId, { type: "end", id: m.id }, ws);
        break;

      /* Undo last visible stroke (marks it as hidden, does not delete it) */
      case "undo":
        for (let i = room.strokes.length - 1; i >= 0; i--) {
          if (!room.strokes[i].tombstone) {
            room.strokes[i].tombstone = true;
            break;
          }
        }
        broadcast(roomId, { type: "undo" });
        break;

      /* Redo last undone stroke */
      case "redo": {
        const t = room.strokes.find(st => st.tombstone);
        if (t) t.tombstone = false;
        broadcast(roomId, { type: "redo" });
        break;
      }

      /* Real-time cursor sharing (like in Figma/Miro) */
      case "cursor":
        broadcast(roomId, {
          type: "cursor",
          userId: m.userId,
          username: m.username,
          color: m.color,
          nx: m.nx,
          ny: m.ny
        }, ws);
        break;

      /* When a user joins, store identity & send updated user list */
      case "hello":
        room.users.set(m.userId, { username: m.username, color: m.color });

        broadcast(roomId, {
          type: "users",
          users: [...room.users.entries()].map(([id, u]) => ({
            userId: id,
            ...u
          }))
        });
        break;
    }
  });
});
