// src/services/mailer.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const DEFAULT_FROM = process.env.DEFAULT_FROM || `${SMTP_USER}`;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

async function verify() {
  try {
    await transporter.verify();
    console.log("✅ Nodemailer SMTP verified");
  } catch (err) {
    console.warn("⚠️ SMTP verify failed:", err.message || err);
  }
}

async function sendMail({ to, subject, text, html, from = DEFAULT_FROM }) {
  const info = await transporter.sendMail({ from, to, subject, text, html });
  return info;
}

module.exports = { transporter, verify, sendMail };
