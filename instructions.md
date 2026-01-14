# AI Agent Instructions & Architecture

These instructions guide the AI (GitHub Copilot) in maintaining and extending the High-Retention DSA Tracker.

## 1. Core Philosophy
- **Data Integrity First**: Never modify `data/solved.json` with regex or sloppy edits. Always treat it as a database.
- **Strict Typing**: All new data must conform to `data/schema.json`.
- **Spaced Repetition**: We are building a learning system, not just a logger. Prioritize features that aid memory retention (SRS).

## 2. Project Architecture

### Data Layer
- **Source of Truth**: `data/solved.json`.
- **Schema**: `data/schema.json` defines all allowed fields.
  - `review`: Object containing SRS state (`easeFactor`, `interval`, `nextReviewDate`, `repetitions`).
  - `myApproach` / `myComplexity`: Auto-generated drafts; optional in schema but should be populated by the AI before commit.
- **Validation**: All writes must pass through `scripts/commit-entry.js` or be strictly validated against the schema before file creation.

### Style System (CSS)
- **Modular Approach**:
  - `base.css`: Variables, resets, typography.
  - `layout.css`: Page structure, grids, containers.
  - `components.css`: Reusable UI elements (cards, buttons, chips).
- **Guidelines**:
  - Use CSS Variables (`--brand-accent`, etc.) defined in `base.css`.
  - Avoid inline styles where possible.
  - No new CSS files without explicit architectural reason.

### JavaScript
- **Vanilla ES Modules**: No bundlers (Webpack/Vite) to keep it simple and editable.
- **Roles**:
  - `scripts/data.js`: Pure functions for fetching and reshaping data.
  - `scripts/main.js`: DOM manipulation and rendering.
  - `scripts/commit-entry.js`: Node.js backend logic.

## 3. Operations Manual

### Adding a Feature
1. **Check Schema**: Does the new feature require data changes? Update `schema.json` first.
2. **Update Types**: Ensure `scripts/data.js` JSDoc types match.
3. **Implement UI**: Add to `index.html` or new page.

### Modifying Data
- **Batch Updates**: If the user needs to refactor old data (e.g., adding a new field), creating a migration script (`scripts/migrate-vX.js`) is preferred over manual editing.

### Generating Notes for New Entries
- Collect only: `date`, `number`/`name` (from `problemLine`), `difficulty`, and `code` from the user.
- The AI must generate `myApproach`, `myComplexity`, and optional `better*` fields before payload commit; use safe placeholders if high-confidence generation is not possible.

## 4. Spaced Repetition (SRS)
- Algorithm: SuperMemo-2 (SM-2).
- **New Entry**: Starts with `interval: 0` (Due immediately or tomorrow).
- **Review**: User rates difficulty (Again, Hard, Good, Easy).
- **Update**:
  - New Interval = Old Interval * Ease Factor.
  - Ease Factor update logic is standard SM-2.

## 5. User Interaction Guidelines
- When the user asks to "Add this problem", **do not** crudely append to JSON.
- Guide them to the **HTML Form** (`add-entry.html`) OR help them construct the JSON payload to run with the commit script.
- If editing code, always maintain the file headers and comments.
