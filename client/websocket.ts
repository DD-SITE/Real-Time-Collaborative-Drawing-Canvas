// This file defines the shape of messages we expect to receive
// from the WebSocket server. Each message has a "type" which tells
// the client what kind of update it represents.

export type ServerMsg =
  | { type: "snapshot"; strokes: any[] }           // Full board sync (used when joining or undo/redo)
  | { type: "begin"; stroke: any }                // Someone started a new stroke
  | { type: "point"; userId: string; p: any }     // A new point was added to an existing stroke
  | { type: "end"; userId: string }               // A stroke has finished (mouse up)
  | { type: "undo" }                              // Undo happened somewhere in the board
  | { type: "redo" };                             // Redo happened somewhere in the board



// The Wire class abstracts WebSocket communication.
// This class:
//  - Opens a connection to the server.
//  - Provides helper functions for sending and receiving typed messages.

export class Wire {
  private ws: WebSocket;

  constructor(url: string) {
    // Connect to the WebSocket server
    this.ws = new WebSocket(url);
  }

  // Called when the connection is fully open.
  // Useful for sending initial "hello" or requesting the board snapshot.
  onOpen(fn: () => void) {
    this.ws.addEventListener("open", fn);
  }

  // Sends a JavaScript object over the WebSocket.
  // Everything is converted to JSON before being sent.
  send(msg: any) {
    this.ws.send(JSON.stringify(msg));
  }

  // Subscribe to a specific type of message coming from the server.
  // Example usage:
  //     wire.on("begin", (data) => { ... });
  //
  // This ensures we only react to messages of that exact type.
  on<T extends ServerMsg["type"]>(
    type: T,
    fn: (data: Extract<ServerMsg, { type: T }>) => void
  ) {
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);

      // If the message type matches what we are listening for,
      // call the supplied callback.
      if (msg.type === type) fn(msg);
    });
  }
}
