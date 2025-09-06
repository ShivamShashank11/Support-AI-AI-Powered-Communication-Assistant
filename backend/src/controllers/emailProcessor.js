

const Email = require("../models/Email");
const { extractContactInfo, detectPriority, detectSentiment } = require("../services/extractor");
const { generateDraftReply } = require("../services/llmService");
const kbService = require("../services/kbService");


let sendMail = null;
try {
  ({ sendMail } = require("../services/mailer")); 
} catch (_) {
  try {
    ({ sendMail } = require("../services/mailerService")); 
  } catch (_) {
    sendMail = null;
  }
}

const SUPPORT_KEYWORDS = ["support", "query", "request", "help"];


function parseRecipient(fromField = "") {
  if (!fromField || typeof fromField !== "string") return null;
  const angle = fromField.match(/<([^>]+)>/);
  if (angle && angle[1]) return angle[1].trim();
  const plain = fromField.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return plain ? plain[0].trim() : null;
}

function escapeHtml(unsafe = "") {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Process a single email
 * @param {String|ObjectId} emailId
 * @param {Object} opts
 *   - autoSendUrgent: boolean | undefined (if undefined, read process.env.AUTO_SEND_URGENT === "true")
 * @returns {Object} email.toObject()
 */
async function processEmail(emailId, { autoSendUrgent = undefined } = {}) {
  if (!emailId) throw new Error("emailId required");

  
  const envAuto = process.env.AUTO_SEND_URGENT === "true";
  const doAutoSend = typeof autoSendUrgent === "boolean" ? autoSendUrgent : envAuto;

  const email = await Email.findById(emailId);
  if (!email) throw new Error("Email not found");

  const subjectText = String(email.subject || "");
  const bodyText = String(email.bodyText || "");
  const combined = `${subjectText} ${bodyText}`.toLowerCase();

  
  email.isFiltered = SUPPORT_KEYWORDS.some((k) => combined.includes(k));

  
  let extracted = {};
  try {
    extracted = extractContactInfo(bodyText || "");
  } catch (err) {
    console.warn("extractContactInfo failed:", err?.message || err);
    extracted = { phones: [], emails: [], orderIds: [] };
  }

  
  let sentiment = "neutral";
  let priority = "normal";
  try {
    sentiment = detectSentiment(bodyText || "");
    priority = detectPriority(bodyText || "");
  } catch (err) {
    console.warn("sentiment/priority detection failed:", err?.message || err);
  }


  if (
    priority !== "urgent" &&
    /immediately|urgent|asap|cannot access|critical|down|can't access|can't login|unable to login/i.test(combined)
  ) {
    priority = "urgent";
  }

  
  let kbSnips = [];
  try {
    const q = `${subjectText}\n\n${bodyText}`.slice(0, 2000);
    if (kbService && typeof kbService.queryKB === "function") {
      const raw = await kbService.queryKB(q, 3);
      if (Array.isArray(raw)) kbSnips = raw;
      else if (raw) kbSnips = [String(raw)];
    }
  } catch (err) {
    console.warn("KB retrieval failed:", err?.message || err);
    kbSnips = [];
  }

  
  let draft = "";
  try {
   
    draft = await generateDraftReply(`Subject: ${subjectText}\n\n${bodyText}`, kbSnips, sentiment);
    if (!draft || typeof draft !== "string") draft = String(draft || "").trim();
  } catch (err) {
    console.warn("Draft generation failed for emailId=", emailId, err?.message || err);
    draft = "We couldn't generate an automated reply for this request. A human agent will respond shortly.";
  }

  
  email.extractedInfo = extracted;
  email.sentiment = sentiment;
  email.priority = priority;
  email.draftResponse = draft;
  email.kbMatches = kbSnips;
  email.status = email.status || "pending";
  email.isFiltered = !!email.isFiltered;

  try {
    await email.save();
  } catch (err) {
    console.error("Failed to save email after processing:", err?.message || err);
    
  }

  
  if (String(priority).toLowerCase() === "urgent" && doAutoSend) {
    
    const toAddr =
      (extracted && Array.isArray(extracted.emails) && extracted.emails[0]) ||
      parseRecipient(email.from) ||
      null;

    if (!toAddr) {
      console.warn("No recipient address found for auto-send, emailId=", emailId);
      email.autoSent = false;
      email.sendError = "No recipient address found for auto-send";
      try { await email.save(); } catch (_) {}
      return email.toObject();
    }

    
    const subject = `Re: ${subjectText || "Support"}`;
    const text = draft;
    const html = `<div style="white-space:pre-wrap;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">${escapeHtml(draft)}</div>`;

    if (typeof sendMail !== "function") {
      console.warn("sendMail service not available; cannot auto-send emailId=", emailId);
      email.autoSent = false;
      email.sendError = "sendMail service not available";
      try { await email.save(); } catch (_) {}
      return email.toObject();
    }

    try {
      
      const sendRes = await sendMail({ to: toAddr, subject, text, html });

      const ok = sendRes && (sendRes.ok === true || sendRes.messageId || sendRes.accepted);
      if (ok) {
        email.status = "responded";
        email.autoSent = true;
        email.sentAt = new Date();
        email.sentInfo = {
          messageId: sendRes.messageId || null,
          accepted: sendRes.accepted || null,
          response: sendRes.response || null,
          raw: sendRes,
        };
        try { await email.save(); } catch (err) { console.warn("save after send error:", err?.message || err); }
        console.log("Auto-response sent for emailId=", emailId);
      } else {
        email.autoSent = false;
        email.sentInfo = { error: sendRes && sendRes.error ? sendRes.error : "unknown send result", raw: sendRes };
        try { await email.save(); } catch (_) {}
        console.warn("Auto-send returned non-success for emailId=", emailId, sendRes);
      }
    } catch (err) {
      console.error("Auto-send failed for emailId=", emailId, err?.message || err);
      email.autoSent = false;
      email.lastSendError = (err?.message || String(err)).slice(0, 2000);
      email.sendErrorAt = new Date();
      try { await email.save(); } catch (_) {}
      
    }
  }

  return email.toObject();
}

module.exports = { processEmail };
