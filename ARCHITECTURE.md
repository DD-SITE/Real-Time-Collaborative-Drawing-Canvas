## Overview

This project implements a **real-time collaborative drawing board** where multiple users can draw simultaneously on a shared canvas.

The system uses:

- **HTML Canvas** for rendering drawing strokes.
- **Native WebSockets** for real-time bi-directional communication.
- **Operation-based synchronization**, where each drawing action (stroke or point) is streamed as an event to all other connected clients.

The goal is to maintain a **consistent shared canvas** across all active users while ensuring smooth, low-latency drawing performance.

## System Components

| Component         | Location                    | Responsibility                                                     |
|------------------|-----------------------------|-------------------------------------------------------------------|
| WebSocket Server  | `server/server.ts`          | Manages rooms, broadcasts drawing events, maintains shared stroke history |
| Drawing State     | In-memory (`rooms[roomId].strokes`) | Stores stroke logs and tombstones for undo/redo                   |
| Client UI         | `public/board.html` & CSS   | Canvas and tools interface                                         |
| Canvas Renderer   | `client/canvas.ts`          | Renders all strokes + incremental updates for performance          |
| WebSocket Client  | `client/wire.ts`            | Connects to server + routes messages to handlers                   |
| App Logic         | `client/main.ts`            | User input, event sending, undo/redo, cursor presence, avatars     |

## Data Flow Diagram
```
      User Input (mouse/touch)
                │
                ▼
         client/main.ts
  (creates stroke + emits events)
                │
                │  WebSocket Messages
                ▼
          WebSocket Server
    (stores strokes, broadcasts events)
                │
                │  Broadcast to all clients
                ▼
         client/main.ts
      (receives events & updates UI)
                │
                ▼
        Canvas Rendering (canvas.ts)
```
## WebSocket Protocol

### Messages Sent From Client → Server

| Type          | Purpose                        | Example Payload                                      |
|---------------|--------------------------------|------------------------------------------------------|
| `hello`       | Identify user on join          | `{userId, username, color, boardId}`                 |
| `get-snapshot`| Request full canvas state      | `{boardId}`                                          |
| `op-begin`    | Start new stroke               | `{id, userId, color, size, tool}`                    |
| `op-points`   | Stream stroke points           | `{id, pts: [{x,y,t}]}`                               |
| `op-end`      | Finish stroke                  | `{id}`                                               |
| `undo`        | Undo global stroke             | `{}`                                                 |
| `redo`        | Redo last undone stroke        | `{}`                                                 |
| `cursor`      | Real-time cursor presence      | `{userId, nx, ny, username, color}`                  |

### Messages Sent From Server → Clients

| Type        | Meaning                                   |
|-------------|--------------------------------------------|
| `snapshot`  | Full stroke history when joining           |
| `begin`     | A new stroke has started                   |
| `point`     | More stroke points were added              |
| `end`       | A stroke has finished                      |
| `undo` / `redo` | Global undo/redo state changed        |
| `cursor`    | Show remote user cursor position           |
| `users`     | Update avatar list when users join         |

## Undo/Redo Strategy (Global)

The system uses a **stroke log with tombstones**:

- Each stroke remains in history.
- Undo does **not** delete strokes — it marks the most recent visible one with `tombstone = true`.
- Redo finds the most recent tombstoned stroke and restores it.

[stroke1] [stroke2] [stroke3]        ← visible
undo →
[stroke1] [stroke2] [stroke3*]       ← tombstoned
redo →
[stroke1] [stroke2] [stroke3]        ← restored

This ensures **global synchronization**:

- Everyone sees the same undo and redo results.
- Snapshot reloads always reflect correct state.

## Performance Decisions

| Area                 | Choice                                      | Reason                                                |
|----------------------|---------------------------------------------|-------------------------------------------------------|
| Incremental drawing  | Draw newest stroke segments only            | Avoid full-canvas redraw every mouse move             |
| Snapshot rendering   | Full redraw only when needed (join/undo/redo)| Efficient for real-time drawing                       |
| Cursor coordinates   | Normalized (nx, ny ∈ [0,1])                 | Works on different screen sizes and zoom levels       |
| Stroke smoothing     | Quadratic Bézier midpoints                  | Smoother strokes with minimal math                    |

## Conflict Resolution

Multiple users drawing simultaneously is allowed.  
No locking is required because each stroke is independent.

Conflict handling cases:

| Case                                | Resolution                                                                 |
|------------------------------------|----------------------------------------------------------------------------|
| Users draw overlapping             | Allowed visually — considered a valid scenario                             |
| Undo removes another user's stroke | Global undo design intentionally does this (explicit in assignment)       |
| New users join mid-session         | They request `snapshot`, redraw full canvas from server                    |

The system avoids complex CRDT/OT since **the assignment value is in correctness, not merging semantics.**
