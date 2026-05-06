import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(".")); // serves index.html, script.js, styles.css

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string" });
    }

    const resp = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
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
    res.status(500).json({ error: "Claude request failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));