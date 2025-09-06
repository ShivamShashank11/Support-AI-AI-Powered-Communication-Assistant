
const imaps = require("imap-simple");
const { simpleParser } = require("mailparser");
const Email = require("../models/Email");
const { addEmailJob } = require("../queues/emailQueue");
require("dotenv").config();

const SEARCH_CRITERIA = ["UNSEEN"];
const FETCH_OPTIONS = { bodies: ["HEADER", "TEXT"], markSeen: true };

const FILTER_KEYWORDS = ["support", "query", "request", "help"];

async function fetchEmails() {
  const config = {
    imap: {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: process.env.IMAP_PORT || 993,
      tls: process.env.IMAP_TLS === "true",
      authTimeout: 10000,
    },
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const messages = await connection.search(SEARCH_CRITERIA, FETCH_OPTIONS);

    for (const item of messages) {
      const all = item.parts.find(part => part.which === "TEXT");
      const parsed = await simpleParser(all.body);

      const subject = parsed.subject || "";
      const from = parsed.from?.text || "";
      const bodyText = parsed.text || "";
      const date = parsed.date || new Date();

     
      const combined = `${subject} ${bodyText}`.toLowerCase();
      if (!FILTER_KEYWORDS.some(k => combined.includes(k))) continue;

      
      const exists = await Email.findOne({ messageId: parsed.messageId });
      if (exists) continue;

      const saved = await Email.create({
        messageId: parsed.messageId,
        from,
        subject,
        bodyText,
        receivedAt: date,
        isFiltered: true,
      });

     
      await addEmailJob(saved._id.toString(), "normal");

      console.log("Saved & queued new email:", subject);
    }

    connection.end();
  } catch (err) {
    console.error("IMAP fetch error:", err.message);
  }
}

module.exports = { fetchEmails };
