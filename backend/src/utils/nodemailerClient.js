// src/utils/nodemailerClient.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.SMTP_SECURE === "true"); // true for 465

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn("⚠️ SMTP not fully configured in .env. Emails cannot be sent until SMTP_HOST/SMTP_USER/SMTP_PASS are set.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // you can add tls: { rejectUnauthorized: false } if using self-signed in dev
});

async function sendMail({ from, to, subject, text, html }) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing).");
  }
  const msg = {
    from,
    to,
    subject,
    text,
    html,
  };
  const info = await transporter.sendMail(msg);
  return info;
}

module.exports = { sendMail, transporter };
