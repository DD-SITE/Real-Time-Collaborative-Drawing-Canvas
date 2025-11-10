import { nanoid } from "nanoid";

const listEl = document.getElementById("board-list")!;
const createBtn = document.getElementById("create-btn")!;

/**
 * Loads the list of locally saved boards (rooms) and displays them.
 * 
 * We store only the board IDs in localStorage. This allows the user to come
 * back later and re-open previous boards without needing a server-side index.
 */
function loadBoards() {
  // Read list of board IDs from browser memory (or start empty)
  const boards = JSON.parse(localStorage.getItem("boards") || "[]");

  // Clear old list UI before re-rendering
  listEl.innerHTML = "";

  // Render each board ID as a clickable link
  for (const id of boards) {
    const a = document.createElement("a");
    a.href = `/board/${id}`;         // Clicking the link opens the board
    a.textContent = id;              // Display the board name (its ID)
    a.className = "board-item";
    listEl.appendChild(a);
  }
}

/**
 * Clicking "Create Board" generates a new unique board ID and stores it.
 * We do not create the board on the server — the board is created only when
 * someone opens its URL. This allows instant board creation with no backend setup.
 */
createBtn.addEventListener("click", () => {
  const id = nanoid(6); // Short unique room ID
  const boards = JSON.parse(localStorage.getItem("boards") || "[]");
  boards.push(id);
  localStorage.setItem("boards", JSON.stringify(boards));
  loadBoards(); // Refresh UI to show the new board link
});

// Load saved boards when the page first opens
loadBoards();
