// src/services/mailerService.js
const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function verifySMTP() {
  try {
    const t = getTransporter();
    await t.verify();
    console.log("✅ Nodemailer SMTP verified");
    return { ok: true };
  } catch (err) {
    console.error("❌ SMTP verify failed:", err.message || err);
    return { ok: false, error: err.message || String(err) };
  }
}

async function sendMail(to, subject, htmlOrText, from = process.env.DEFAULT_FROM || process.env.SMTP_USER) {
  try {
    const t = getTransporter();
    const isHtml = /<\/[a-z]+>/i.test(htmlOrText);
    const info = await t.sendMail({
      from,
      to,
      subject,
      [isHtml ? "html" : "text"]: htmlOrText,
    });
    console.log("📧 Email sent:", info.messageId || info);
    return { ok: true, messageId: info.messageId || null, raw: info };
  } catch (err) {
    console.error("❌ sendMail error:", err.message || err);
    return { ok: false, error: err.message || String(err) };
  }
}

module.exports = { verifySMTP, sendMail, getTransporter };
