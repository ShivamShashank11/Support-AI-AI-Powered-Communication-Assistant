// src/services/kbService.js
const mongoose = require("mongoose");
const OpenAI = require("openai");
require("dotenv").config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// KB schema (one collection for KB snippets)
const kbSchema = new mongoose.Schema({
  title: String,
  content: String,
  tags: [String],
  embedding: { type: [Number], index: false },
  createdAt: { type: Date, default: Date.now },
});
const KB = mongoose.models.KB || mongoose.model("KB", kbSchema);

// helper: get embedding for text
async function embedText(text) {
  if (!text || !text.trim()) return [];
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

// cosine similarity
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

// add snippet
async function addSnippet({ title, content, tags = [] }) {
  const embedding = await embedText(content);
  return KB.create({ title, content, tags, embedding });
}

// query top-k relevant snippets
async function queryKB(query, topK = 3) {
  if (!query || !query.trim()) return [];
  const qEmb = await embedText(query);
  // load candidates (for production use a vector DB)
  const candidates = await KB.find({}).lean();
  const scored = candidates.map(c => {
    return { ...c, score: cosine(qEmb, c.embedding || []) };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => ({ id: s._id, title: s.title, content: s.content, score: s.score }));
}

module.exports = { addSnippet, queryKB, embedText, KB };
