
const Email = require("../models/Email");
const { processEmail } = require("./emailProcessor");
const { sendDraftResponse } = require("./sendController");
const mongoose = require("mongoose");
require("dotenv").config();


let sendMail = null;
try {
  ({ sendMail } = require("../services/mailer"));
} catch (e) {
  console.warn("mailer service not available; direct send will fail unless sendMail is provided elsewhere.");
  sendMail = null;
}


function buildMessage(emailDoc) {
  const subject = (emailDoc.draftResponseSubject && String(emailDoc.draftResponseSubject).trim()) ||
    `Re: ${String(emailDoc.subject || "").trim()}`;
  const bodyText = String(emailDoc.draftResponse || emailDoc.responseText || "Thanks for contacting support. We'll get back to you soon.");
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;white-space:pre-wrap">${escapeHtml(bodyText)}</div>`;
  return { subject, text: bodyText, html };
}

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseRecipient(fromField = "") {
  if (!fromField || typeof fromField !== "string") return null;
  const angleMatch = fromField.match(/<([^>]+)>/);
  if (angleMatch && angleMatch[1]) return angleMatch[1].trim();
  const plainMatch = fromField.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (plainMatch) return plainMatch[0].trim();
  return null;
}

function safeNumber(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return false;
}


async function sendEmailReply(req, res) {
  const id = req.params.id;
  const force = req.body?.force === true;
  const overrideFrom = req.body?.from;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ ok: false, error: "invalid id" });
  }

  try {
    const email = await Email.findById(id);
    if (!email) return res.status(404).json({ ok: false, error: "not found" });

    if (!email.draftResponse) {
      return res.status(400).json({ ok: false, error: "no draft response present" });
    }

    if (email.status === "responded" && !force) {
      return res.status(409).json({ ok: false, error: "already responded (use force=true to resend)" });
    }

    
    const to = parseRecipient(email.from) || (Array.isArray(email.to) ? email.to[0] : null) || email.from;
    if (!to || !to.includes("@")) {
      return res.status(400).json({ ok: false, error: `Invalid recipient: "${email.from}"` });
    }

   
    const msg = buildMessage(email);
    const from = overrideFrom || process.env.DEFAULT_FROM || process.env.SMTP_USER || "support@example.com";

    
    if (typeof sendMail !== "function") {
      return res.status(500).json({ ok: false, error: "sendMail service not available on server" });
    }

    const info = await sendMail({ to, subject: msg.subject, text: msg.text, html: msg.html, from });

    
    const messageId = info?.messageId || info?.message_id || null;

    
    email.status = "responded";
    email.sentAt = new Date();
    email.messageId = messageId;
    email.sentInfo = { raw: info };
    await email.save();

    return res.json({ ok: true, messageId, id: email._id });
  } catch (err) {
    console.error("sendEmailReply error:", err);
    return res.status(500).json({ ok: false, error: err.message || "send failed" });
  }
}


async function sendPending(req, res) {
  const limit = Math.max(1, Math.min(500, Number(req.body?.limit || req.query?.limit || 50)));
  const force = req.body?.force === true;
  const concurrency = Math.max(1, Math.min(10, Number(req.body?.concurrency || req.query?.concurrency || 3)));

  if (typeof sendMail !== "function") {
    return res.status(500).json({ ok: false, error: "sendMail service not available on server" });
  }

  try {
    const query = force ? {} : { status: { $in: ["pending", "to_send", null] } };
    query.draftResponse = { $exists: true, $ne: "" };

    const emails = await Email.find(query).sort({ priority: -1, receivedAt: -1 }).limit(limit).lean();
    const results = [];

    const queue = emails.slice();

    async function worker() {
      while (queue.length) {
        const e = queue.shift();
        try {
          const to = parseRecipient(e.from) || (Array.isArray(e.to) ? e.to[0] : null) || e.from;
          if (!to || !to.includes("@")) {
            results.push({ id: e._id, ok: false, error: "invalid recipient" });
            continue;
          }

          const { subject, text, html } = buildMessage(e);
          const from = process.env.DEFAULT_FROM || process.env.SMTP_USER || "support@example.com";

          const info = await sendMail({ to, subject, text, html, from });

          
          await Email.findByIdAndUpdate(e._id, {
            status: "responded",
            sentAt: new Date(),
            messageId: info?.messageId || null,
            sentInfo: { raw: info },
          });

          results.push({ id: e._id, ok: true, messageId: info?.messageId || null });
        } catch (err) {
          console.error("bulk send error for", e._id, err.message || err);
          // record failure on document
          try {
            await Email.findByIdAndUpdate(e._id, { sendError: { message: err.message || String(err), at: new Date() } });
          } catch (uErr) {
            console.warn("failed to record send error for", e._id, uErr);
          }
          results.push({ id: e._id, ok: false, error: err.message || String(err) });
        }
      }
    }

    await Promise.all(new Array(concurrency).fill(0).map(() => worker()));

    return res.json({ ok: true, count: results.length, results });
  } catch (err) {
    console.error("sendPending error:", err);
    return res.status(500).json({ ok: false, error: err.message || "bulk send failed" });
  }
}


async function listEmails(req, res) {
  try {
    const limit = safeNumber(req.query.limit, 200);
    const skip = safeNumber(req.query.skip, 0);
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.priority) q.priority = req.query.priority;

    const emails = await Email.find(q).sort({ receivedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean();
    const count = await Email.countDocuments(q);
    return res.json({ ok: true, count, emails });
  } catch (err) {
    console.error("listEmails error:", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
}


async function getEmail(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, error: "invalid id" });
    const email = await Email.findById(id).lean();
    if (!email) return res.status(404).json({ ok: false, error: "not found" });
    return res.json({ ok: true, email });
  } catch (err) {
    console.error("getEmail error:", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
}


async function createEmail(req, res) {
  try {
    const payload = req.body || {};
    if (!payload.receivedAt) payload.receivedAt = new Date();
    const e = await Email.create(payload);

  
    if (parseBool(req.query.process)) {
      try {
        await processEmail(e._id);
      } catch (procErr) {
        console.warn("createEmail: processEmail failed:", procErr?.message || procErr);
      }
    }

    return res.json({ ok: true, email: e });
  } catch (err) {
    console.error("createEmail error:", err);
    return res.status(500).json({ ok: false, error: "create failed" });
  }
}


async function processEmailHandler(req, res) {
  try {
    const { id } = req.params;
    const result = await processEmail(id);
    return res.json({ ok: true, email: result });
  } catch (err) {
    console.error(`processEmailHandler error for id=${req.params.id}:`, err);
    return res.status(500).json({ ok: false, error: err.message || "process failed" });
  }
}


async function sendDraftHandler(req, res) {
  try {
    const { id } = req.params;
    const force = !!req.body && !!req.body.force;

    
    if (typeof sendDraftResponse === "function") {
      const result = await sendDraftResponse(id, { force });
      return res.json({ ok: true, info: result.info || result, email: result.email });
    }

   
    return await sendEmailReply(req, res);
  } catch (err) {
    console.error(`sendDraftHandler error for id=${req.params.id}:`, err);
    return res.status(500).json({ ok: false, error: err.message || "send failed" });
  }
}


async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ ok: false, error: "status required" });

    const allowed = ["pending", "responded", "resolved", "archived"];
    if (!allowed.includes(status)) return res.status(400).json({ ok: false, error: "invalid status" });

    const email = await Email.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!email) return res.status(404).json({ ok: false, error: "not found" });
    return res.json({ ok: true, email });
  } catch (err) {
    console.error("updateStatus error:", err);
    return res.status(500).json({ ok: false, error: "update failed" });
  }
}

module.exports = {
  
  listEmails,
  getEmail,
  createEmail,
  processEmailHandler,
  sendDraftHandler,
  updateStatus,
 
  sendEmailReply,
  sendPending,
};
