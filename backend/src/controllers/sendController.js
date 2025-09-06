

const Email = require("../models/Email");
require("dotenv").config();


let sendMailFunc = null;
try {
 
  const nmClient = require("../utils/nodemailerClient");
  if (typeof nmClient.sendMail === "function") {
    sendMailFunc = nmClient.sendMail;
  } else if (typeof nmClient === "function") {
   
    sendMailFunc = nmClient;
  }
} catch (e) {
 
  sendMailFunc = null;
}

const nodemailer = require("nodemailer");
let transporter = null;
if (!sendMailFunc) {
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: process.env.SMTP_PORT ? +process.env.SMTP_PORT : 587,
    secure: process.env.SMTP_SECURE === "true" || false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  
  sendMailFunc = async (opts) => {
   
    return transporter.sendMail(opts);
  };
}


const AUTO_SEND_URGENT = process.env.AUTO_SEND_URGENT === "true";
const DEFAULT_FROM = process.env.DEFAULT_FROM || process.env.SMTP_USER || "support@example.com";


function parseRecipient(fromField = "") {
  if (!fromField || typeof fromField !== "string") return null;
  const angleMatch = fromField.match(/<([^>]+)>/);
  if (angleMatch && angleMatch[1]) return angleMatch[1].trim();
  
  const plainMatch = fromField.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (plainMatch) return plainMatch[0].trim();
  return null;
}


async function sendDraftResponse(emailId, options = { force: false }) {
  const force = !!options.force;

  const email = await Email.findById(emailId);
  if (!email) throw new Error("email not found");

  if (!email.draftResponse) {
    throw new Error("No draftResponse available to send");
  }

 
  if (!force && email.priority !== "urgent" && !AUTO_SEND_URGENT) {
    throw new Error("Auto-send disabled for non-urgent emails. Use manual send (force=true).");
  }

 
  let recipient = parseRecipient(email.from);
  if (!recipient) {
    throw new Error(`Invalid recipient extracted from email.from: "${email.from}"`);
  }

  const subject = `Re: ${email.subject || "Support"}`;
  const text = email.draftResponse;

  try {
    const info = await sendMailFunc({
      from: DEFAULT_FROM,
      to: recipient,
      subject,
      text,
    });

    
    email.status = "responded";
    email.sentInfo = {
      messageId: info.messageId || null,
      envelope: info.envelope || null,
      response: info.response || null,
      sentAt: new Date(),
      sentBy: force ? "manual" : "auto",
    };
    email.autoSent = !force;
    await email.save();

    return { ok: true, info, email };
  } catch (err) {
    
    const errMsg = err?.message || String(err);
    email.sendError = { message: errMsg, at: new Date() };
    email.autoSent = false;
    await email.save();
    throw new Error("Send failed: " + errMsg);
  }
}


async function sendDraft(emailId) {
  const email = await Email.findById(emailId);
  if (!email) throw new Error("not found");
  if (!email.draftResponse) throw new Error("no draft to send");

  if (process.env.SEND_AUTO !== "true") {
    return { ok: false, reason: "auto-send disabled in env" };
  }

  
  const recipient = parseRecipient(email.from);
  if (!recipient) throw new Error(`Invalid recipient extracted from email.from: "${email.from}"`);

  const info = await sendMailFunc({
    from: process.env.DEFAULT_FROM || process.env.SMTP_USER || DEFAULT_FROM,
    to: recipient,
    subject: `Re: ${email.subject || "Support"}`,
    text: email.draftResponse,
  });

  email.status = "responded";
  email.sentAt = new Date();
  email.sentInfo = {
    messageId: info.messageId || null,
    envelope: info.envelope || null,
    response: info.response || null,
    sentAt: new Date(),
    sentBy: "auto",
  };
  await email.save();

  return { ok: true, messageId: info.messageId, email };
}

module.exports = { sendDraftResponse, sendDraft };
