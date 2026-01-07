# Personal DSA Tracker

A dashboard to track progress on LeetCode/NeetCode problems, focused on the NeetCode 250 list.

## Features
- **Progress Tracking:** Visual progress bars for each difficulty and category.
- **Heatmap:** GitHub-style submission activity heatmap.
- **Projections:** Estimates for completion based on current velocity.
- **Notes:** Store solution code, complexity analysis, and alternative approaches.

## Setup
1. Clone the repository.
2. Serve the root directory using a simple HTTP server.
   ```bash
   python -m http.server 5500
   ```
3. Open `http://localhost:5500` in your browser.

## Data
- `data/solved.json`: Stores your solved problems.
- `nc250.json`: The curriculum structure.

## Workflow
- Add new solutions via the `instructions.md` protocol (using AI assistance).
