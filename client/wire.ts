// The Wire class is responsible for managing the WebSocket connection
// between the browser (client) and our server. It handles:
//  - Opening and reconnecting WebSocket connections
//  - Sending messages to the server in JSON format
//  - Listening for messages from the server and notifying any registered listeners

export class Wire {
  private ws!: WebSocket; // Will hold the actual WebSocket connection
  private url: string;    // WebSocket URL for this board/room
  private listeners: Record<string, Function[]> = {}; // Stores event callbacks

  constructor() {
    // Extract the room/board ID from the URL.
    // Example URL:  http://localhost:5173/board/ABC123
    // `pop()` returns "ABC123"
    const roomId = window.location.pathname.split("/").pop();

    // WebSocket server URL, including the room ID
    this.url = `wss://collaborative-canvas-server-eivx.onrender.com/ws?room=${roomId}`;


    // Establish the WebSocket connection
    this.connect();
  }

  private connect() {
    // Create the WebSocket connection
    this.ws = new WebSocket(this.url);

    // When the connection opens, notify anyone listening to "open"
    this.ws.addEventListener("open", () => this.emit("open"));

    // If the connection closes (e.g., network drop), try to reconnect after 800ms
    this.ws.addEventListener("close", () =>
      setTimeout(() => this.connect(), 800)
    );

    // When we receive a message, parse it and emit it to the correct listeners
    this.ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        // msg.type decides which event listeners get notified
        this.emit(msg.type, msg);
      } catch {
        // If JSON parsing fails, ignore the message
      }
    });
  }

  // Send an object to the server.
  // All outgoing messages are JSON.
  send(obj: object) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
    // If socket is not open yet, message is silently dropped.
    // (This is okay for real-time canvas updates.)
  }

  // Register a listener for an event type.
  // Example: wire.on("cursor", (data) => { ... })
  on(type: string, fn: Function) {
    // If no listeners exist for this event type yet, create an empty list
    (this.listeners[type] ??= []).push(fn);
  }

  // Notify all listeners of a given event type
  private emit(type: string, payload?: any) {
    (this.listeners[type] || []).forEach((fn) => fn(payload));
  }
}
