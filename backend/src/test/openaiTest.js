const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [{ role: "user", content: "Say hello world politely" }],
    });
    console.log("AI reply:", res.choices[0].message.content);
  } catch (err) {
    console.error("OpenAI test error:", err);
  }
}

test();
