# Problem Statement: Real-Time Collaborative Drawing Canvas

Modern remote collaboration tools such as Miro, Figma Whiteboard, and Google Jamboard enable users to brainstorm, sketch ideas, and visually communicate concepts together in real time. However, these platforms are either paid, limited in features, or not easily customizable for specific use cases. Educational institutions, student clubs, project teams, and developers often require a simpler, open-source, lightweight whiteboard system that supports real-time drawing and can be tailored based on their needs.

This project aims to build a **real-time collaborative drawing canvas** where multiple users can sketch, annotate, and interact together on the same board simultaneously. Each user sees others’ drawing strokes, cursor movements, and actions as they occur, providing an intuitive shared visual workspace.

---

## Objectives

1. **Real-Time Synchronization**
   Enable multiple users to draw on a shared canvas with updates broadcast instantly using WebSockets.

2. **Multi-User Awareness**
   Each user should have:
   - A unique color identity
   - Visible cursor movement
   - Displayed username for clarity

3. **Drawing Tools & Interactions**
   Provide core tools including:
   - Brush with adjustable color and stroke size
   - Eraser tool
   - Undo and Redo actions without permanently deleting data

4. **Board Session Management**
   Allow users to:
   - Create new boards
   - View and join existing boards
   - Share board links for collaboration

5. **Scalability & Deployment**
   - Frontend deployed on **Vercel**
   - Backend WebSocket server deployed on **Render**

---

## Challenges Addressed

- Synchronizing multiple cursor and stroke events without lag
- Ensuring smooth line rendering (Bezier smoothing over raw points)
- Preventing data loss during undo/redo (using tombstone-based reversible operations)
- Efficient state broadcasting and snapshot syncing
- Handling board persistence only in-memory (no database required)

---

## Outcome

The system successfully provides:
- A minimal and efficient collaborative whiteboard
- Smooth multi-user real-time drawing updates
- Undo/redo and eraser support
- Real-time cursor sharing and identity labeling
- Easy link-based session sharing

This open-source real-time canvas can be used for:
- Classroom concept explanation
- Remote team brainstorming
- UI/UX wireframing discussions
- Peer tutoring and collaborative problem solving

---

## Future Enhancements

- Database integration
- Export as image/PDF
- Chat or voice chat integration
- Shape tools (lines, rectangles, circles)

---
