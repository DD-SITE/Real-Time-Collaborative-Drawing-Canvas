import { nanoid } from "nanoid";
import type { Point, Stroke } from "./canvas";
import { CanvasBoard } from "./canvas";
import { Wire } from "./wire";

// ---- ROOM FROM URL ----
const boardId = window.location.pathname.split("/")[2] || "default";

// ---- USER IDENTITY (Persisted) ----
let username = localStorage.getItem("username");
if (!username) {
  username = prompt("Enter your name")?.trim() || "Guest";
  localStorage.setItem("username", username);
}

let userColor = localStorage.getItem("userColor");
if (!userColor) {
  userColor = "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  localStorage.setItem("userColor", userColor);
}

// ---- ELEMENTS ----
const canvas = document.getElementById("board") as HTMLCanvasElement;
const cursorLayer = document.getElementById("cursor-layer") as HTMLDivElement;
const board = new CanvasBoard(canvas);
const wire = new Wire();
const userId = nanoid(6);

const toolEl = document.getElementById("tool") as HTMLSelectElement;
const colorEl = document.getElementById("color") as HTMLInputElement;
const sizeEl = document.getElementById("size") as HTMLInputElement;
const presenceEl = document.getElementById("presence")!;
const avatarBar = document.getElementById("avatars") as HTMLDivElement;

// ---- CONNECTION + INITIAL SYNC ----
wire.on("open", () => {
  wire.send({ type: "hello", boardId, userId, username, color: userColor });
  wire.send({ type: "get-snapshot", boardId });
});

wire.on("presence", (m: any) => {
  presenceEl.textContent = `online: ${m.users}`;
});

wire.on("snapshot", (m: any) => {
  board.setSnapshot(m.strokes);
});

// ---- REMOTE STROKES ----
wire.on("begin", (m: any) => board.applyRemoteStroke(m.stroke));
wire.on("point", (m: any) => {
  const s = board.ops.find(s => s.id === m.id);
  if (s) board.updateRemotePoint(s.userId, m.pts[0]);
});
wire.on("end", (m: any) => board.finishRemoteStroke(m.id));

// ---- UNDO/REDO SYNC ----
wire.on("undo", () => wire.send({ type: "get-snapshot", boardId }));
wire.on("redo", () => wire.send({ type: "get-snapshot", boardId }));

// ---- LOCAL DRAWING ----
let drawing = false;
let current: Omit<Stroke, "points"> | null = null;
let lastSend = 0;

function pos(e: MouseEvent | TouchEvent) {
  const r = canvas.getBoundingClientRect();
  const p = "touches" in e ? e.touches[0] : e;
  return { x: p.clientX - r.left, y: p.clientY - r.top };
}

function begin(e: MouseEvent | TouchEvent) {
  e.preventDefault();
  drawing = true;

  const p = pos(e);
  current = {
    id: nanoid(10),
    userId,
    color: toolEl.value === "eraser" ? "#000000" : colorEl.value,
    size: parseInt(sizeEl.value, 10),
    tool: toolEl.value as Stroke["tool"]
  };

  board.beginLocalStroke(current, { ...p, t: performance.now() });
  wire.send({ type: "op-begin", boardId, ...current });
  wire.send({ type: "op-points", boardId, id: current.id, pts: [{ ...p, t: performance.now() }] });
}

function move(e: MouseEvent | TouchEvent) {
  const r = canvas.getBoundingClientRect();
  const p = pos(e);
  const now = performance.now();

  // Cursor sync
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

  if (now - lastSend > 16) {
    lastSend = now;
    wire.send({ type: "op-points", boardId, id: current.id, pts: [point] });
  }
}

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

// ---- UNDO/REDO ----
(document.getElementById("undo") as HTMLButtonElement).onclick = () =>
  wire.send({ type: "undo", boardId });

(document.getElementById("redo") as HTMLButtonElement).onclick = () =>
  wire.send({ type: "redo", boardId });

window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    wire.send({ type: e.shiftKey ? "redo" : "undo", boardId });
  }
});

// ---- REMOTE CURSORS ----
const cursors = new Map<string, { nx: number; ny: number; username: string; color: string }>();

wire.on("cursor", (m: any) => {
  cursors.set(m.userId, { nx: m.nx, ny: m.ny, username: m.username, color: m.color });
  drawCursors();
});

function drawCursors() {
  cursorLayer.innerHTML = "";
  const r = canvas.getBoundingClientRect();

  for (const [uid, { nx, ny, username, color }] of cursors) {
    if (uid === userId) continue;

    const x = nx * r.width;
    const y = ny * r.height;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    dot.style.background = color;
    dot.style.left = x + "px";
    dot.style.top = y + "px";

    const label = document.createElement("div");
    label.textContent = username;
    label.style.position = "absolute";
    label.style.left = x + 14 + "px";
    label.style.top = y - 6 + "px";
    label.style.fontSize = "12px";
    label.style.color = color;

    cursorLayer.appendChild(dot);
    cursorLayer.appendChild(label);
  }
}

wire.on("users", (m: any) => {
  avatarBar.innerHTML = "";
  for (const u of m.users) {
    if (u.userId === userId) continue;
    const dot = document.createElement("div");
    dot.className = "avatar-dot";
    dot.style.background = u.color;
    dot.title = u.username;
    avatarBar.appendChild(dot);
  }
});

(document.getElementById("share") as HTMLButtonElement).onclick = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  alert("Board link copied to clipboard:\n" + url);
};
