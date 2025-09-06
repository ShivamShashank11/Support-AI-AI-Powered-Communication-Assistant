// src/services/llmService.js
const OpenAI = require("openai");
const kbService = require("./kbService");
require("dotenv").config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateDraftReply(emailText, sentiment = "neutral") {
  // fetch KB snippets relevant to emailText
  let kbSnippets = [];
  try {
    const kb = await kbService.queryKB(emailText, 3);
    kbSnippets = kb.map(s => `- ${s.title}: ${s.content}`).join("\n\n");
  } catch (err) {
    console.warn("KB query error (continuing without KB):", err.message || err);
    kbSnippets = "";
  }

  const prompt = `You are a professional, empathetic customer support assistant.

Customer sentiment: ${sentiment}
Customer email:
${emailText}

Relevant Knowledge Base:
${kbSnippets || "(none)"}

Write a concise, helpful draft reply. Keep tone friendly and professional. Mention any KB-relevant steps if appropriate.`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
    });

    const draft = res.choices?.[0]?.message?.content?.trim() || "";
    return draft;
  } catch (err) {
    console.error("OpenAI error in generateDraftReply:", err?.message || err);
    return "Sorry, we could not generate a draft reply (AI error).";
  }
}

module.exports = { generateDraftReply };
