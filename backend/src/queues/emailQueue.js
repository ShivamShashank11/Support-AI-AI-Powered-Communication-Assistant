// src/queues/emailQueue.js
// DEV-SAFE: No Redis/BullMQ imports. Always process inline.

module.exports = {
  addEmailJob: async function (emailId, priority = "normal") {
    try {
      console.log(`⚡ Inline processing (queue disabled): ${emailId} (priority=${priority})`);
      const { processEmail } = require("../controllers/emailProcessor");
      const result = await processEmail(emailId);
      console.log(`✅ Inline processed: ${emailId} (priority=${result.priority}, sentiment=${result.sentiment})`);
      return { ok: true, inline: true, email: result };
    } catch (err) {
      console.error("❌ Inline processing failed:", err);
      return { ok: false, error: err?.message || String(err) };
    }
  }
};
