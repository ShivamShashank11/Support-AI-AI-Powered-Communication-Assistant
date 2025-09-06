
const mongoose = require("mongoose");
const Email = require("../models/Email");
const { sendMail } = require("../services/mailer");

async function sendDraftEmail(emailId, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(emailId)) {
    throw new Error("Invalid email id");
  }
  const email = await Email.findById(emailId);
  if (!email) throw new Error("Email not found");

  
  if (!email.draftResponse) {
    throw new Error("No draft response available. Process the email first.");
  }

  
  const from = process.env.DEFAULT_FROM || process.env.SMTP_USER;
  const to = email.from || (options.to || process.env.SMTP_USER);
  const subject = `Re: ${email.subject || "(no subject)"}`;
  const text = email.draftResponse;

  const mailOptions = {
    from,
    to,
    subject,
    text
  };

 
  if (options.override && options.override.to) mailOptions.to = options.override.to;
  if (options.override && options.override.from) mailOptions.from = options.override.from;

  const info = await sendMail(mailOptions);

  
  email.status = "sent";
  email.sentAt = new Date();
  email.sentInfo = { messageId: info.messageId, accepted: info.accepted || null };
  await email.save();

  return { ok: true, messageId: info.messageId, accepted: info.accepted };
}

module.exports = { sendDraftEmail };
