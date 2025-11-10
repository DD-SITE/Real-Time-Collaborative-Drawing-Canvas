# Real-Time Collaborative Drawing Canvas

A real-time collaborative whiteboard application where multiple users can draw on the same canvas simultaneously. The application synchronizes strokes, cursor positions, and undo/redo operations across all connected users using WebSockets.

---

## Features

- Brush and Eraser tools
- Adjustable color and stroke size
- Real-time drawing synchronization
- Remote cursor indicators with usernames
- Global Undo/Redo across all users
- Multiple rooms/boards (shareable via unique link)
- Online user presence indicator
- Works on desktop & touch devices

---

##  Setup Instructions

### 1. Install Dependencies
```bash
npm install
```
### 2. Start the Application
```bash
npm run dev
```
This runs:
Vite dev server for the frontend at http://localhost:5173/
WebSocket server at ws://localhost:3000/ws

##  Testing with Multiple Users

### 1. Open a Board
Open a drawing board by navigating to a unique board URL, for example:
```bash
http://localhost:5173/board/ABC123
```
### 2. Share the Link
-Copy the link and open it:
-In another browser, OR
-In private/incognito mode, OR
-On your phone (connected to the same Wi-Fi network)

### 3. Start Drawing
Draw on both screens — your strokes should sync in real time across all connected clients.

## Folder Structure
collaborative-canvas/
├── client/                               # Frontend (Vanilla JS/TS + Canvas)
│   ├── canvas.ts                         # Canvas rendering + stroke smoothing + redraw logic
│   ├── counter.ts                        # (Template placeholder, not used in final app)
│   ├── home.ts                           # Home screen: create / list boards (localStorage-based)
│   ├── main.ts                           # Core app logic: drawing, undo/redo, presence, cursors
│   ├── websocket.ts                      # (Old typed WS wrapper - optional-unused)
│   ├── wire.ts                           # WebSocket wrapper (reconnect + event dispatch system)
│   ├── style.css                         # UI styling for toolbar, board layout, avatars, cursors
│   └── typescript.svg                    # Asset (unused)
│
├── public/
│   ├── index.html                        # Home page UI for selecting/creating boards
│   └── board.html                        # Collaborative drawing canvas UI
│
├── server/
│   ├── server.ts                         # WebSocket server: rooms, stroke state, user presence
│   └── drawing-state.ts                  # Central stroke state placeholder (not always required)
│
├── node_modules/
│
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── README.md                             # Setup instructions, testing, limitations
└── ARCHITECTURE.md                       # Data flow diagram, protocol design, undo/redo strategy



## Known Limitations / Future Improvements

-Strokes are stored in memory (not persistent after server restart).
-No authentication — usernames are local to the browser.
-Performance may degrade with extremely large stroke history.
-Undo/Redo is global per board (not per-user stack).

## ⏱️ Time Spent

| Task                                      | Time       |
|-------------------------------------------|------------|
| Canvas Rendering & Drawing Logic          | ~4 hours   |
| WebSocket Sync + Cursor Presence          | ~3 hours   |
| Undo/Redo Global State Handling           | ~2 hours   |
| Room Management + Sharable Links          | ~2 hours |
| UI Styling + Testing Multiple Users       | ~2 hours   |
| Documentation & Cleanup                   | ~1 hour    |

**Total:** ~14 hours

##Project Goal

This project was built to demonstrate:
-Efficient canvas drawing & incremental rendering
-Real-time event streaming over WebSockets
-Shared global state synchronization (undo/redo)
-Room-based collaboration architecture
-Clean, maintainable TypeScript without frameworks
