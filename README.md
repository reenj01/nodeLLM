## Node LLM Graph Chat

Interactive node-based chat UI powered by a Claude backend. The frontend is plain HTML/CSS/JS, and a small Node/Express server safely proxies requests to the Anthropic Messages API using environment variables.

### Features

- **Node-based chat UI**: draggable/resizable chatboxes connected on a canvas.
- **Claude integration**: real responses via Anthropic’s Messages API.
- **Highlight & explore**: select text in assistant messages to spawn child nodes.
- **Safe secret handling**: API key stays on the server in `.env`, never in the browser or Git.

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- An **Anthropic API key** from the Claude console.

### Setup

1. **Install dependencies**

```bash
npm install
```

2. **Create env files**

Do **not** commit your real `.env`.

- Template (tracked):

```bash
cp .env.example .env
```

- Edit `.env` and fill in at least:

```bash
ANTHROPIC_API_KEY=sk-ant-...        # your real key, never commit this
# optional override (defaults to claude-sonnet-4-20250514 if unset)
CLAUDE_MODEL=claude-sonnet-4-20250514
```

3. **Run the dev server**

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

### How it works

- **Frontend** (`index.html`, `styles.css`, `script.js`):
  - Renders the node-based chat interface.
  - Calls `POST /api/chat` with the current message.
  - Renders Claude’s response in the active chatbox.
- **Backend** (`server.js`):
  - Uses `dotenv` to read `ANTHROPIC_API_KEY` (server-side only).
  - Exposes `POST /api/chat` and forwards the message to Anthropic:
    - Model: `process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514"`.
    - Returns the combined text content from the Claude response.

### Security & Git hygiene

- **Never** hardcode `ANTHROPIC_API_KEY` or any `sk-ant-...` value in code or markdown.
- `.env` is listed in `.gitignore` so it won’t be committed.
- `.env.example` documents required variables without secrets and **should** be committed.
- `node_modules/` should also be ignored by Git.

If you accidentally push a key, rotate it immediately in the Anthropic console.

### Scripts

- **`npm run dev`** – start the Express server at `http://localhost:3000`.

