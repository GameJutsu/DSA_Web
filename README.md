# NeetCode 250 Tracker + SRS

A personal dashboard to track LeetCode progress, integrated with a Spaced Repetition System (SRS) to ensure long-term retention of algorithmic patterns.

## Features
- **Spaced Repetition:** Uses a modified SuperMemo-2 algorithm to schedule reviews based on your confidence level.
- **Auto Notes:** The app auto-generates "My Approach" and complexity drafts from minimal inputs (date, problem, difficulty, code).
- **Strict Schema:** Data integrity enforced by JSON schema and validation scripts.
- **Visual Analytics:** Heatmaps, progress bars, and timeline views.

## 🚀 Getting Started

### 1. Requirements
- **Node.js**: Required to run the commit script.
- **Python** (optional): For running the local web server.

### 2. Local Setup
Serve the root directory. You can use any static file server.
```bash
# Option A: Python
python -m http.server 5500

# Option B: Node http-server
npx http-server .
```
Open `http://localhost:5500` in your browser.

## 📝 Workflow: Adding a Problem

We avoid editing `data/solved.json` directly to prevent syntax errors and ensure schema compliance.

1.  **Fill the Form**:
  *   Navigate to `Add Entry` (Floating Action Button).
  *   Provide only: date, problem number/name, difficulty, and your C++ code. (Optional: solved in Python?)
  *   The app auto-generates approach and complexity drafts.
  *   Click "Generate Payload".

2.  **Enhance & Commit**:
    *   **Copy** the draft JSON payload from the browser.
    *   **Paste** it into a temporary file (e.g., `temp.json`) or share it with the AI agent.
    *   **Ask the AI** to "Enhance this entry". The AI will replace the "Auto-generated draft" text with a proper analysis.
    *   **Save** the enhanced JSON to `temp.json`.
    *   **Run the script**:
    ```powershell
    # Windows PowerShell
    node scripts/commit-entry.js temp.json
    ```
    *   *The script will validate the data, check for duplicates, and append it to `data/solved.json`.*

3.  **Review**:
    *   Check specific problem entries in the dashboard timeline.
    *   Visit the **Review Tab** to clear due SRS cards (Coming Soon).

## 📂 Project Structure

- `data/`
  - `solved.json`: The main database. **Do not edit manually.**
  - `schema.json`: Strict definition of the data model.
- `scripts/`
  - `commit-entry.js`: Logic for validating and appending new entries.
  - `data.js`: Frontend data fetching and processing.
  - `main.js`: Dashboard rendering logic.
- `styles/`
  - `base.css`: Global variables and typography.
  - `layout.css`: Grid systems and page structure.
  - `components.css`: Reusable widgets (Cards, Pills, Buttons).

## 🛠 For the User (You)
- **Backup**: Periodically backup `data/solved.json`.
- **Review**: Try to clear your "Due for Review" queue daily to maximize retention.
- **Consistency**: The system thrives on regular inputs.
