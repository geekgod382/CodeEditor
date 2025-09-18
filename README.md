## Code Editor — Live In-Browser (HTML/CSS/JS)

Minimal, self-contained code editor that runs entirely in the browser. Edit HTML, CSS, and JavaScript with Ace Editor, preview instantly, and optionally run inline JS tests. Save and load your work as a JSON file.

### Features
- **Three editors**: HTML, CSS, JavaScript (Ace Editor with Dracula theme)
- **Live preview**: Run output in a sandboxed `<iframe>`
- **Inline tests**: Execute optional JS tests alongside your code
- **Save/Load**: Persist to `localStorage` and download/upload a `.json` project file
- **Keyboard shortcuts**: `Ctrl+Enter` run, `Ctrl+S` save
- **Accessible tabs**: Arrow-key navigation and proper ARIA roles

### Quick start
1. Open `App/index.html` in a modern browser (Chrome/Edge/Firefox). Internet is required the first time to load Ace from CDN.
2. Start typing in the HTML/CSS/JS tabs.
3. Click "Run" (or press `Ctrl+Enter`) to update the preview.

### Usage
- Write your task in the left "Task" panel. Optionally add JS tests in "Validation tests".
- Use the middle panel editors to write HTML/CSS/JS.
- Use the right "Output" panel to view logs and messages.
- Click "Run with tests" to execute your code plus the test block.
- Click "Open preview in window" to pop out the rendered page.

### Save and Load
- Save: Click "Save" (or press `Ctrl+S`). Your work is saved to `localStorage` and downloaded as `codeweb.json`.
- Load: Click "Load" and choose a previously saved `.json` file.

### Tech stack
- Vanilla HTML/CSS/JS
- [Ace Editor](https://ace.c9.io/) via CDN

### Notes
- All code runs client-side inside a sandboxed iframe; no backend required.
- If the CDN is unavailable, the script tag falls back to jsDelivr automatically.

### Project structure
- `App/index.html` — UI layout and script/style includes
- `App/style.css` — UI styles (dark theme)
- `App/script.js` — Editor setup, preview, tests, save/load logic


