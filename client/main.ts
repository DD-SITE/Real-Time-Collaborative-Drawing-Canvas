import { nanoid } from "nanoid";
import type { Point, Stroke } from "./canvas";
import { CanvasBoard } from "./canvas";
import { Wire } from "./wire";

// ---- ROOM FROM URL ----
// The URL looks like:  /board/ABC123
// We extract "ABC123" to know which shared board (room) to join.
// If someone opens /board/xyz, they join the same room xyz.
const boardId = window.location.pathname.split("/")[2] || "default";

// ---- USER IDENTITY (Persisted Locally) ----
// Each user has a name and a color that stays the same across refreshes.
let username = localStorage.getItem("username");
if (!username) {
  username = prompt("Enter your name")?.trim() || "Guest";
  localStorage.setItem("username", username);
}

// Assign each user a random color (kept the same on reload).
let userColor = localStorage.getItem("userColor");
if (!userColor) {
  userColor = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  localStorage.setItem("userColor", userColor);
}

// ---- ELEMENT REFERENCES ----
const canvas = document.getElementById("board") as HTMLCanvasElement;
const cursorLayer = document.getElementById("cursor-layer") as HTMLDivElement;
const avatarBar = document.getElementById("avatars") as HTMLDivElement;

const board = new CanvasBoard(canvas);  // Manages drawing logic
const wire = new Wire();                // Handles WebSocket communication
const userId = nanoid(6);               // Unique ID per user (not username)

const toolEl = document.getElementById("tool") as HTMLSelectElement;
const colorEl = document.getElementById("color") as HTMLInputElement;
const sizeEl = document.getElementById("size") as HTMLInputElement;
const presenceEl = document.getElementById("presence")!;

// ---- CONNECT TO SERVER + REQUEST INITIAL CANVAS ----
// "hello" introduces this user to the board so others can see our name+color.
// "get-snapshot" asks for all existing strokes to draw the current board state.
wire.on("open", () => {
  wire.send({ type: "hello", boardId, userId, username, color: userColor });
  wire.send({ type: "get-snapshot", boardId });
});

// ---- USER PRESENCE / AVATAR BAR ----
// Server sends a list of all users in the board.
// We show a colored dot for each user at the top.
wire.on("presence", (m: any) => {
  presenceEl.textContent = `online: ${m.users.length}`;
  avatarBar.innerHTML = "";

  for (const u of m.users) {
    const dot = document.createElement("div");
    dot.className = "avatar-dot";
    dot.style.background = u.color;
    dot.title = u.username;
    avatarBar.appendChild(dot);
  }
});

// ---- FULL CANVAS LOAD ----
// Happens when joining or after undo/redo.
wire.on("snapshot", (m: any) => {
  board.setSnapshot(m.strokes);
});

// ---- REMOTE DRAW EVENTS ----
// Remote users starting, updating and finishing strokes.
wire.on("begin", (m: any) => board.applyRemoteStroke(m.stroke));
wire.on("point", (m: any) => {
  const s = board.ops.find(s => s.id === m.id);
  if (s) board.updateRemotePoint(s.userId, m.pts[0]);
});
wire.on("end", (m: any) => board.finishRemoteStroke(m.id));

// ---- GLOBAL UNDO / REDO ----
// Undo or redo anywhere re-syncs the whole canvas.
wire.on("undo", () => wire.send({ type: "get-snapshot", boardId }));
wire.on("redo", () => wire.send({ type: "get-snapshot", boardId }));

// ---- LOCAL DRAWING STATE ----
let drawing = false;
let current: Omit<Stroke, "points"> | null = null;
let lastSend = 0;

// Get mouse/touch position relative to canvas
function pos(e: MouseEvent | TouchEvent) {
  const r = canvas.getBoundingClientRect();
  const p = "touches" in e ? e.touches[0] : e;
  return { x: p.clientX - r.left, y: p.clientY - r.top };
}

// Start a new stroke
function begin(e: MouseEvent | TouchEvent) {
  e.preventDefault();
  drawing = true;

  const p = pos(e);

  // Stroke metadata (sent once)
  current = {
    id: nanoid(10),
    userId,
    color: toolEl.value === "eraser" ? "#000000" : colorEl.value,
    size: parseInt(sizeEl.value, 10),
    tool: toolEl.value as Stroke["tool"]
  };

  board.beginLocalStroke(current, { ...p, t: performance.now() });

  // Announce new stroke to others
  wire.send({ type: "op-begin", boardId, ...current });
  wire.send({ type: "op-points", boardId, id: current.id, pts: [{ ...p, t: performance.now() }] });
}

// Add stroke points while moving
function move(e: MouseEvent | TouchEvent) {
  const r = canvas.getBoundingClientRect();
  const p = pos(e);
  const now = performance.now();

  // Send cursor location continuously (lightweight)
  wire.send({
    type: "cursor",
    boardId,
    userId,
    username,
    color: userColor,
    nx: p.x / r.width,
    ny: p.y / r.height
  });

  if (!drawing || !current) return;

  const point: Point = { ...p, t: performance.now() };
  board.pushLocalPoint(point);

  // Send draw updates at ~60 FPS to avoid flooding network
  if (now - lastSend > 16) {
    lastSend = now;
    wire.send({ type: "op-points", boardId, id: current.id, pts: [point] });
  }
}

// Finish stroke
function end() {
  if (!drawing || !current) return;
  drawing = false;

  board.endLocalStroke();
  wire.send({ type: "op-end", boardId, id: current.id });

  current = null;
}

// ---- INPUT BINDINGS ----
canvas.addEventListener("mousedown", begin);
canvas.addEventListener("mousemove", move);
window.addEventListener("mouseup", end);

canvas.addEventListener("touchstart", begin, { passive: false });
canvas.addEventListener("touchmove", move, { passive: false });
window.addEventListener("touchend", end);

// ---- KEYBOARD UNDO / REDO ----
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    wire.send({ type: e.shiftKey ? "redo" : "undo", boardId });
  }
});

// ---- REMOTE CURSOR DISPLAY ----
const cursors = new Map<string, { nx: number; ny: number; username: string; color: string }>();

wire.on("cursor", (m: any) => {
  cursors.set(m.userId, m);
  drawCursors();
});

// Draw every remote cursor + label
function drawCursors() {
  cursorLayer.innerHTML = "";
  const r = canvas.getBoundingClientRect();

  for (const [uid, { nx, ny, username, color }] of cursors) {
    if (uid === userId) continue; // Don't show your own cursor

    const x = nx * r.width;
    const y = ny * r.height;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.style.background = color;
    dot.style.left = x + "px";
    dot.style.top = y + "px";

    const label = document.createElement("div");
    label.textContent = username;
    label.className = "cursor-label";
    label.style.left = x + 14 + "px";
    label.style.top = y - 6 + "px";
    label.style.color = color;

    cursorLayer.appendChild(dot);
    cursorLayer.appendChild(label);
  }
}

// ---- SHARE LINK BUTTON ----
(document.getElementById("share") as HTMLButtonElement).onclick = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  alert("Board link copied:\n" + url);
};
