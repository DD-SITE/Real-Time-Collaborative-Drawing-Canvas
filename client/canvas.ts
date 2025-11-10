// A single point in a stroke (x/y are canvas coordinates, t is timestamp used for smoothing)
export type Point = { x: number; y: number; t: number };

// Supported drawing tools
export type Tool = "brush" | "eraser";

// A stroke is one continuous drawing movement from mouse-down to mouse-up
export type Stroke = {
  id: string;        // Unique ID for the stroke (used to sync across clients)
  userId: string;    // Which user created this stroke
  color: string;     // Stroke color (ignored when using eraser)
  size: number;      // Line thickness
  tool: Tool;        // Brush or Eraser
  points: Point[];   // The actual drawn path (list of points)
  tombstone?: boolean; // If true, stroke is hidden (used for undo/redo)
};

export class CanvasBoard {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // Device Pixel Ratio (handles high-res displays so drawing does not look blurry)
  dpr = Math.max(1, window.devicePixelRatio || 1);

  // All strokes currently on the canvas
  ops: Stroke[] = [];

  // Tracks the active stroke for each remote user during live drawing
  private activeByUser = new Map<string, Stroke>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;

    // Prepare canvas resolution scaling
    this.resize();

    // Resize when window size changes (keeps canvas crisp)
    window.addEventListener("resize", () => this.resize());
  }

  // Matches canvas pixel size to CSS size and redraws everything
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = r.width * this.dpr;
    this.canvas.height = r.height * this.dpr;

    // Apply scaling so drawing coordinates remain correct
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.redraw();
  }

  // Called when the local user begins drawing
  beginLocalStroke(meta: Omit<Stroke, "points">, first: Point) {
    const s: Stroke = { ...meta, points: [first] };
    this.ops.push(s);
  }

  // Adds a new point to local stroke and draws just the new segment (for efficiency)
  pushLocalPoint(p: Point) {
    const s = this.ops[this.ops.length - 1];
    if (!s) return;
    s.points.push(p);
    this.drawIncremental(s);
  }

  // Local stroke ends — no need to do anything here (server sync handles it)
  endLocalStroke() {}

  // When a remote user starts drawing, create a stroke entry for them
  applyRemoteStroke(s: Stroke) {
    this.ops.push({ ...s, points: [] });
    this.activeByUser.set(s.userId, this.ops[this.ops.length - 1]);
  }

  // When a remote user moves the mouse, add a point to their active stroke
  updateRemotePoint(uid: string, p: Point) {
    const s = this.activeByUser.get(uid);
    if (!s) return;
    s.points.push(p);
    this.drawIncremental(s);
  }

  // Remote user finished stroke → no longer track their active stroke
  finishRemoteStroke(uid: string) {
    this.activeByUser.delete(uid);
  }

  // Called when loading full canvas state (e.g., joining a room or undo/redo refresh)
  setSnapshot(strokes: Stroke[]) {
    // Clone stroke arrays so editing the live array doesn't mutate the snapshot input
    this.ops = strokes.map(s => ({ ...s, points: s.points.slice() }));
    this.redraw();
  }

  // Applies brush/eraser settings to the drawing context
  private styleFor(s: Stroke) {
    this.ctx.lineWidth = s.size;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    if (s.tool === "eraser") {
      // Eraser works by removing pixels instead of drawing color
      this.ctx.globalCompositeOperation = "destination-out";
    } else {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.strokeStyle = s.color;
      this.ctx.fillStyle = s.color;
    }
  }

  // Draws just the new segment at the end of a stroke for smooth real-time performance
  private drawIncremental(s: Stroke) {
    const pts = s.points;
    if (pts.length < 2) return;

    this.styleFor(s);

    const i = pts.length - 2;
    const p0 = pts[i], p1 = pts[i + 1];

    // Midpoint between last two points → used for smooth curve
    const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;

    this.ctx.beginPath();

    // If this is the first segment, start at the exact first point
    if (i === 0) {
      this.ctx.moveTo(p0.x, p0.y);
    } else {
      // Otherwise continue from midpoint of the previous segment
      const pPrev = pts[i - 1];
      this.ctx.moveTo((pPrev.x + p0.x) / 2, (pPrev.y + p0.y) / 2);
    }

    // Draw smooth curve
    this.ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
    this.ctx.stroke();
  }

  // Full redraw of the canvas (used after resize and undo/redo)
  private redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const s of this.ops) {
      if (s.tombstone) continue;    // Deleted via undo
      const pts = s.points;
      if (pts.length < 2) continue;

      this.styleFor(s);
      this.ctx.beginPath();

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        if (i === 0) this.ctx.moveTo(p0.x, p0.y);

        const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
        this.ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
      }

      this.ctx.stroke();
    }
  }
}
