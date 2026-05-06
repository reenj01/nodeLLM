import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(".")); // serves index.html, script.js, styles.css

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "Missing ANTHROPIC_API_KEY. Add it to your local .env (do not commit)."
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error:
          "Server misconfigured: missing ANTHROPIC_API_KEY (check your local .env)",
      });
    }

    const { message } = req.body ?? {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string" });
    }

    const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 600,
      messages: [{ role: "user", content: message }],
    });

    const text =
      resp.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("") || "";

    res.json({ text });
  } catch (err) {
    const status = typeof err?.status === "number" ? err.status : 500;
    const name = typeof err?.name === "string" ? err.name : "Error";
    const message =
      typeof err?.message === "string" ? err.message : "Unknown error";

    // Safe to log: does not include API key.
    console.error("Claude request failed", { status, name, message });

    res.status(status).json({
      error: "Claude request failed",
      details: `${name}: ${message}`,
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));