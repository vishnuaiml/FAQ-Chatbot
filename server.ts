import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { FAQEngine } from "./src/lib/nlp";
import { FAQItem } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure JSON and URL encoded body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Load FAQ dataset from data file
  const faqsPath = path.join(process.cwd(), "src/data/faqs.json");
  let faqs: FAQItem[] = [];
  try {
    const rawData = fs.readFileSync(faqsPath, "utf-8");
    faqs = JSON.parse(rawData);
    console.log(`Successfully loaded ${faqs.length} FAQ questions from database.`);
  } catch (error) {
    console.error("Error reading faqs.json database, fallback to empty array.", error);
  }

  // Initialize NLP matching engine
  const nlpEngine = new FAQEngine(faqs);

  // API 1: Fetch list of all FAQs with categorizations
  app.get("/api/faqs", (req, res) => {
    res.json({
      success: true,
      count: faqs.length,
      faqs: faqs
    });
  });

  // API 2: Chat similarity matching endpoint
  // Supports both POST /chat and POST /api/chat
  const handleChatRequest = (req: express.Request, res: express.Response) => {
    const { question, threshold } = req.body;

    if (!question || typeof question !== "string") {
       res.status(400).json({
        success: false,
        error: "Missing required string parameter: 'question'"
      });
      return;
    }

    // Default threshold is 0.15 to allow flexible matching but filter out completely unrelated queries
    const matchThreshold = typeof threshold === "number" ? threshold : 0.15;
    const result = nlpEngine.query(question, matchThreshold);

    console.log(`[CHAT LOG] Question: "${question}" | Best Match: "${result.matchedQuestion}" | Similarity: ${result.similarity}`);

    res.json({
      success: true,
      user_question: question,
      matched_question: result.matchedQuestion,
      similarity: result.similarity,
      answer: result.answer
    });
  };

  app.post("/chat", handleChatRequest);
  app.post("/api/chat", handleChatRequest);

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Serving application in Development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving application in Production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FAQ Chatbot Server booted! Listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start full-stack server:", error);
});
